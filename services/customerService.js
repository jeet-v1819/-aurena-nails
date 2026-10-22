import { prisma, serializeService } from "@/lib/prisma";
import { AppError, sanitizeUser, clearSessionCache } from "@/lib/auth";
import { normalizeIndianMobile, profileUpdateSchema } from "@/validators";
import { createNotificationOnce } from "@/services/notificationService";
import { invalidateAdminDashboardCache } from "@/services/contentService";

export async function getCustomerProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });
  if (!user || user.deletedAt) {
    throw new AppError("Customer profile not found.", 404, "NOT_FOUND");
  }
  return sanitizeUser(user);
}

export async function updateCustomerProfile(userId, rawInput) {
  const data = profileUpdateSchema.parse(rawInput);

  const currentUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!currentUser || currentUser.deletedAt) {
    throw new AppError("Account not found.", 404, "NOT_FOUND");
  }

  if (data.email !== currentUser.email) {
    const emailConflict = await prisma.user.findUnique({
      where: { email: data.email }
    });
    if (emailConflict && emailConflict.id !== userId) {
      throw new AppError(
        "An account with this email address already exists.",
        409,
        "DUPLICATE_EMAIL"
      );
    }
  }

  if (data.mobile !== currentUser.mobile) {
    const mobileConflict = await prisma.user.findUnique({
      where: { mobile: data.mobile }
    });
    if (mobileConflict && mobileConflict.id !== userId) {
      throw new AppError(
        "An account with this mobile number already exists.",
        409,
        "DUPLICATE_MOBILE"
      );
    }
  }

  const fullName = `${data.firstName} ${data.lastName}`.trim();

  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.user.update({
      where: { id: userId },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        mobile: data.mobile,
        ...(data.image !== undefined ? { image: data.image || null } : {})
      }
    });

    await tx.$executeRaw`
      UPDATE "neon_auth"."user"
      SET "name" = ${fullName}, "email" = ${data.email}, "updatedAt" = NOW()
      WHERE "id" = ${currentUser.authId}::uuid
    `.catch(() => {});

    return u;
  });

  clearSessionCache();
  return sanitizeUser(updated);
}

export async function listAdminCustomers({
  page = 1,
  limit = 15,
  search = "",
  status = "all"
} = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 15));
  const skip = (safePage - 1) * safeLimit;
  const q = String(search || "").trim();

  const where = {
    role: "CUSTOMER",
    deletedAt: null,
    ...(status === "active" ? { active: true } : {}),
    ...(status === "inactive" ? { active: false } : {}),
    ...(q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { mobile: { contains: q, mode: "insensitive" } }
          ]
        }
      : {})
  };

  const [customers, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: safeLimit,
      include: {
        _count: {
          select: {
            appointments: true,
            reviews: true
          }
        }
      }
    }),
    prisma.user.count({ where })
  ]);

  return {
    items: customers.map((c) => ({
      ...sanitizeUser(c),
      appointmentsCount: c._count.appointments,
      reviewsCount: c._count.reviews
    })),
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.max(1, Math.ceil(total / safeLimit))
  };
}

export async function updateAdminCustomer(adminId, customerId, rawInput) {
  const existing = await prisma.user.findUnique({ where: { id: customerId } });
  if (!existing || existing.deletedAt) {
    throw new AppError("Customer not found.", 404, "NOT_FOUND");
  }

  const updates = {};

  if (typeof rawInput.firstName === "string" && rawInput.firstName.trim()) {
    updates.firstName = rawInput.firstName.trim();
  }
  if (typeof rawInput.lastName === "string") {
    updates.lastName = rawInput.lastName.trim();
  }
  if (typeof rawInput.email === "string" && rawInput.email.trim()) {
    const email = rawInput.email.trim().toLowerCase();
    if (email !== existing.email) {
      const conflict = await prisma.user.findUnique({ where: { email } });
      if (conflict && conflict.id !== customerId) {
        throw new AppError("Email is already in use by another account.", 409, "DUPLICATE_EMAIL");
      }
      updates.email = email;
    }
  }
  if (typeof rawInput.mobile === "string" && rawInput.mobile.trim()) {
    const mobile = normalizeIndianMobile(rawInput.mobile);
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      throw new AppError(
        "Please enter a valid 10-digit Indian mobile number.",
        400,
        "INVALID_MOBILE"
      );
    }
    if (mobile !== existing.mobile) {
      const conflict = await prisma.user.findUnique({ where: { mobile } });
      if (conflict && conflict.id !== customerId) {
        throw new AppError(
          "Mobile number is already in use by another account.",
          409,
          "DUPLICATE_MOBILE"
        );
      }
      updates.mobile = mobile;
    }
  }

  if (typeof rawInput.active === "boolean") {
    updates.active = rawInput.active;
  }

  if (rawInput.softDelete === true) {
    updates.active = false;
    updates.deletedAt = new Date();
  }

  const updated = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: customerId },
      data: updates
    });

    if (updates.active === false) {
      await tx.$executeRaw`
        DELETE FROM "neon_auth"."session"
        WHERE "userId" = ${existing.authId}::uuid
      `.catch(() => {});

      await createNotificationOnce(
        {
          userId: customerId,
          title: "Account Deactivated",
          message: "Your account is currently inactive. Please contact Aurena Nails.",
          eventKey: `deactivated:${customerId}:${Date.now()}`
        },
        tx
      );
    }

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action:
          rawInput.softDelete === true
            ? "CUSTOMER_SOFT_DELETE"
            : typeof rawInput.active === "boolean"
            ? rawInput.active
              ? "CUSTOMER_ACTIVATE"
              : "CUSTOMER_DEACTIVATE"
            : "CUSTOMER_UPDATE",
        targetId: customerId
      }
    });

    return user;
  });

  clearSessionCache();
  invalidateAdminDashboardCache();
  return sanitizeUser(updated);
}

export async function listUserWishlist(userId) {
  const items = await prisma.wishlist.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      service: {
        include: { category: true }
      },
      galleryImage: {
        include: { category: true }
      }
    }
  });

  return items.map((item) => ({
    id: item.id,
    userId: item.userId,
    serviceId: item.serviceId,
    galleryId: item.galleryId,
    createdAt: item.createdAt,
    service: item.service ? serializeService(item.service) : null,
    galleryImage: item.galleryImage || null
  }));
}

export async function addWishlistItem(userId, { serviceId, galleryId }) {
  if ((serviceId && galleryId) || (!serviceId && !galleryId)) {
    throw new AppError(
      "Specify either a serviceId or a galleryId to save to your wishlist.",
      400,
      "INVALID_WISHLIST_TARGET"
    );
  }

  if (serviceId) {
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service || !service.active) {
      throw new AppError("Service not found.", 404, "NOT_FOUND");
    }
    const item = await prisma.wishlist.upsert({
      where: {
        userId_serviceId: { userId, serviceId }
      },
      update: {},
      create: {
        userId,
        serviceId
      },
      include: {
        service: { include: { category: true } }
      }
    });
    return {
      ...item,
      service: item.service ? serializeService(item.service) : null
    };
  }

  const gallery = await prisma.galleryImage.findUnique({ where: { id: galleryId } });
  if (!gallery || !gallery.active) {
    throw new AppError("Gallery design not found.", 404, "NOT_FOUND");
  }
  return prisma.wishlist.upsert({
    where: {
      userId_galleryId: { userId, galleryId }
    },
    update: {},
    create: {
      userId,
      galleryId
    },
    include: {
      galleryImage: { include: { category: true } }
    }
  });
}

export async function removeWishlistItem(userId, { id, serviceId, galleryId }) {
  if (id) {
    const existing = await prisma.wishlist.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      throw new AppError("Wishlist item not found.", 404, "NOT_FOUND");
    }
    await prisma.wishlist.delete({ where: { id } });
    return { removed: true };
  }

  if (serviceId) {
    await prisma.wishlist.deleteMany({
      where: { userId, serviceId }
    });
    return { removed: true };
  }

  if (galleryId) {
    await prisma.wishlist.deleteMany({
      where: { userId, galleryId }
    });
    return { removed: true };
  }

  throw new AppError("Wishlist item identifier is required.", 400, "BAD_REQUEST");
}
