import { prisma, serializeService } from "@/lib/prisma";
import { AppError } from "@/lib/auth";
import { reviewSchema, reviewUpdateSchema } from "@/validators";
import { createNotificationOnce } from "@/services/notificationService";
import { invalidateServiceCache } from "@/services/serviceService";
import { invalidateAdminDashboardCache } from "@/services/contentService";

const publicReviewsCache = new Map();
const PUBLIC_REVIEWS_CACHE_TTL_MS = 60 * 1000;

export function invalidateReviewCache() {
  publicReviewsCache.clear();
  try {
    invalidateServiceCache();
    invalidateAdminDashboardCache();
  } catch {}
}

export async function getEligibleCompletedAppointments(userId, serviceId = "") {
  const where = {
    userId,
    status: "COMPLETED",
    review: null,
    ...(serviceId ? { serviceId } : {})
  };

  const appointments = await prisma.appointment.findMany({
    where,
    orderBy: { start: "desc" },
    include: {
      service: true
    }
  });

  return appointments.map((a) => ({
    ...a,
    service: a.service ? serializeService(a.service) : null
  }));
}

export async function listPublicReviews({ serviceId = "", limit = 12 } = {}) {
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 12));
  const cacheKey = `rev:${serviceId}:${safeLimit}`;
  const cached = publicReviewsCache.get(cacheKey);
  if (cached && Date.now() - cached.time < PUBLIC_REVIEWS_CACHE_TTL_MS) {
    return cached.data;
  }

  const where = {
    visible: true,
    ...(serviceId ? { serviceId } : {})
  };

  const reviews = await prisma.review.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: safeLimit,
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          image: true
        }
      },
      service: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      }
    }
  });

  publicReviewsCache.set(cacheKey, { time: Date.now(), data: reviews });
  return reviews;
}

export async function createCustomerReview(user, rawInput) {
  const parsed = reviewSchema.parse(rawInput);

  const appointment = await prisma.appointment.findUnique({
    where: { id: parsed.appointmentId },
    include: {
      review: true,
      service: true
    }
  });

  if (!appointment) {
    throw new AppError("Completed appointment not found.", 404, "NOT_FOUND");
  }

  if (appointment.userId !== user.id) {
    throw new AppError(
      "Forbidden: You can only review your own appointments.",
      403,
      "FORBIDDEN"
    );
  }

  if (appointment.status !== "COMPLETED") {
    throw new AppError(
      "You can only review a service after your appointment is marked COMPLETED.",
      403,
      "REVIEW_NOT_ELIGIBLE"
    );
  }

  if (appointment.serviceId !== parsed.serviceId) {
    throw new AppError(
      "This appointment does not match the selected service.",
      400,
      "SERVICE_MISMATCH"
    );
  }

  if (appointment.review) {
    throw new AppError(
      "You have already submitted a review for this appointment.",
      409,
      "DUPLICATE_REVIEW"
    );
  }

  const review = await prisma.$transaction(async (tx) => {
    const created = await tx.review.create({
      data: {
        appointmentId: appointment.id,
        userId: user.id,
        serviceId: appointment.serviceId,
        rating: parsed.rating,
        comment: parsed.comment,
        visible: true
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            image: true
          }
        },
        service: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });

    await createNotificationOnce(
      {
        userId: user.id,
        title: "Thank you for your review",
        message: `Your ${parsed.rating}-star review for ${appointment.serviceName} has been published.`,
        eventKey: `review:${created.id}`
      },
      tx
    );

    return created;
  });

  invalidateReviewCache();
  return review;
}

export async function updateCustomerReview(user, reviewId, rawInput) {
  const parsed = reviewUpdateSchema.parse(rawInput);

  const existing = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!existing) {
    throw new AppError("Review not found.", 404, "NOT_FOUND");
  }

  if (existing.userId !== user.id) {
    throw new AppError(
      "Forbidden: You can only edit your own reviews.",
      403,
      "FORBIDDEN"
    );
  }

  return prisma.review.update({
    where: { id: reviewId },
    data: {
      rating: parsed.rating,
      comment: parsed.comment
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          image: true
        }
      },
      service: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      }
    }
  });

  invalidateReviewCache();
  return updated;
}

export async function deleteCustomerReview(user, reviewId) {
  const existing = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!existing) {
    throw new AppError("Review not found.", 404, "NOT_FOUND");
  }

  if (existing.userId !== user.id) {
    throw new AppError(
      "Forbidden: You can only delete your own reviews.",
      403,
      "FORBIDDEN"
    );
  }

  await prisma.review.delete({ where: { id: reviewId } });
  invalidateReviewCache();
  return { deleted: true };
}

export async function listAdminReviews({
  search = "",
  rating = 0,
  visible = "all",
  page = 1,
  limit = 20
} = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
  const skip = (safePage - 1) * safeLimit;
  const q = String(search || "").trim();

  const where = {
    ...(Number(rating) >= 1 && Number(rating) <= 5 ? { rating: Number(rating) } : {}),
    ...(visible === "visible" ? { visible: true } : {}),
    ...(visible === "hidden" ? { visible: false } : {}),
    ...(q
      ? {
          OR: [
            { comment: { contains: q, mode: "insensitive" } },
            { service: { name: { contains: q, mode: "insensitive" } } },
            { user: { firstName: { contains: q, mode: "insensitive" } } },
            { user: { lastName: { contains: q, mode: "insensitive" } } },
            { user: { email: { contains: q, mode: "insensitive" } } }
          ]
        }
      : {})
  };

  const [items, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: safeLimit,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        service: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    }),
    prisma.review.count({ where })
  ]);

  return {
    items,
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.max(1, Math.ceil(total / safeLimit))
  };
}

export async function moderateAdminReview(adminId, reviewId, { visible }) {
  const existing = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!existing) {
    throw new AppError("Review not found.", 404, "NOT_FOUND");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.review.update({
      where: { id: reviewId },
      data: {
        visible: Boolean(visible),
        moderatedBy: adminId,
        moderatedAt: new Date()
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        service: {
          select: { id: true, name: true, slug: true }
        }
      }
    });

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: visible ? "REVIEW_RESTORE" : "REVIEW_HIDE",
        targetId: reviewId
      }
    });

    return updated;
  });

  invalidateReviewCache();
  return updated;
}

export async function deleteAdminReview(adminId, reviewId) {
  const existing = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!existing) {
    throw new AppError("Review not found.", 404, "NOT_FOUND");
  }

  await prisma.$transaction(async (tx) => {
    await tx.review.delete({ where: { id: reviewId } });
    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "REVIEW_DELETE",
        targetId: reviewId
      }
    });
  });

  invalidateReviewCache();
  return { deleted: true };
}
