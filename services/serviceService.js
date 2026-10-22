import { prisma, serializeService } from "@/lib/prisma";
import { AppError } from "@/lib/auth";
import { serviceSchema } from "@/validators";
import { slugify } from "@/utils/format";
import { invalidateAdminDashboardCache } from "@/services/contentService";

const publicServicesCache = new Map();
const PUBLIC_SERVICES_CACHE_TTL_MS = 60 * 1000;

export function invalidateServiceCache() {
  publicServicesCache.clear();
  try {
    invalidateAdminDashboardCache();
  } catch {}
}

async function attachRatingsToServices(services) {
  if (!services || services.length === 0) return [];
  const serviceIds = services.map((s) => s.id);

  const ratingStats = await prisma.review.groupBy({
    by: ["serviceId"],
    where: {
      serviceId: { in: serviceIds },
      visible: true
    },
    _avg: { rating: true },
    _count: { rating: true }
  });

  const statsMap = new Map();
  for (const row of ratingStats) {
    statsMap.set(row.serviceId, {
      averageRating: row._avg.rating ? Number(row._avg.rating.toFixed(1)) : 0,
      reviewCount: row._count.rating || 0
    });
  }

  return services.map((service) => {
    const serialized = serializeService(service);
    const stat = statsMap.get(service.id) || { averageRating: 0, reviewCount: 0 };
    return {
      ...serialized,
      averageRating: stat.averageRating,
      reviewCount: stat.reviewCount
    };
  });
}

export async function listPublicServices({
  search = "",
  category = "",
  style = "",
  occasion = "",
  maxDuration = 0,
  availableOnly = false,
  featuredOnly = false,
  page = 1,
  limit = 20
} = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
  const skip = (safePage - 1) * safeLimit;
  const q = String(search || "").trim();

  const isCacheable = !q && !style && !occasion && Number(maxDuration) <= 0;
  const cacheKey = isCacheable ? `pub:${category}:${availableOnly}:${featuredOnly}:${safePage}:${safeLimit}` : null;
  if (cacheKey) {
    const cached = publicServicesCache.get(cacheKey);
    if (cached && Date.now() - cached.time < PUBLIC_SERVICES_CACHE_TTL_MS) {
      return cached.data;
    }
  }

  const where = {
    active: true,
    // Exclude ephemeral E2E test services created by other runs unless explicitly searched
    ...(q
      ? {}
      : {
          NOT: {
            slug: { startsWith: "aurena-e2e-" }
          }
        }),
    ...(availableOnly ? { available: true } : {}),
    ...(featuredOnly ? { featured: true } : {}),
    ...(category
      ? {
          OR: [
            { categoryId: category },
            { category: { slug: category } },
            { category: { name: { equals: category, mode: "insensitive" } } }
          ]
        }
      : {}),
    ...(style ? { style: { contains: style, mode: "insensitive" } } : {}),
    ...(occasion ? { occasion: { contains: occasion, mode: "insensitive" } } : {}),
    ...(Number(maxDuration) > 0 ? { duration: { lte: Number(maxDuration) } } : {}),
    ...(q
      ? {
          AND: [
            {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { shortDescription: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
                { style: { contains: q, mode: "insensitive" } },
                { occasion: { contains: q, mode: "insensitive" } }
              ]
            }
          ]
        }
      : {})
  };

  const [rows, total] = await Promise.all([
    prisma.service.findMany({
      where,
      orderBy: [{ featured: "desc" }, { createdAt: "asc" }],
      skip,
      take: safeLimit,
      include: {
        category: true,
        images: { orderBy: { position: "asc" } }
      }
    }),
    prisma.service.count({ where })
  ]);

  const items = await attachRatingsToServices(rows);

  const result = {
    items,
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.max(1, Math.ceil(total / safeLimit))
  };

  if (cacheKey) {
    publicServicesCache.set(cacheKey, { time: Date.now(), data: result });
  }

  return result;
}

export async function getServiceBySlug(slug) {
  const service = await prisma.service.findUnique({
    where: { slug: String(slug || "").trim() },
    include: {
      category: true,
      images: { orderBy: { position: "asc" } },
      videos: {
        include: {
          video: true
        }
      },
      reviews: {
        where: { visible: true },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              image: true
            }
          }
        }
      }
    }
  });

  if (!service || !service.active) {
    return null;
  }

  const [enriched] = await attachRatingsToServices([service]);

  const relatedRows = await prisma.service.findMany({
    where: {
      active: true,
      id: { not: service.id },
      NOT: { slug: { startsWith: "aurena-e2e-" } },
      ...(service.categoryId ? { categoryId: service.categoryId } : {})
    },
    take: 3,
    orderBy: { featured: "desc" },
    include: { category: true }
  });

  const relatedServices = await attachRatingsToServices(relatedRows);

  return {
    ...enriched,
    associatedVideos: (service.videos || [])
      .map((sv) => sv.video)
      .filter((v) => v && v.active),
    relatedServices
  };
}

export async function listAdminServices({
  search = "",
  categoryId = "",
  status = "all",
  page = 1,
  limit = 20
} = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
  const skip = (safePage - 1) * safeLimit;
  const q = String(search || "").trim();

  const where = {
    ...(categoryId ? { categoryId } : {}),
    ...(status === "active" ? { active: true } : {}),
    ...(status === "inactive" ? { active: false } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
            { shortDescription: { contains: q, mode: "insensitive" } }
          ]
        }
      : {})
  };

  const [rows, total] = await Promise.all([
    prisma.service.findMany({
      where,
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      skip,
      take: safeLimit,
      include: {
        category: true,
        images: { orderBy: { position: "asc" } },
        videos: { include: { video: true } },
        _count: { select: { appointments: true, reviews: true } }
      }
    }),
    prisma.service.count({ where })
  ]);

  const items = await attachRatingsToServices(rows);

  return {
    items: items.map((item, idx) => ({
      ...item,
      appointmentsCount: rows[idx]._count.appointments,
      associatedVideos: (rows[idx].videos || []).map((sv) => sv.video).filter(Boolean)
    })),
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.max(1, Math.ceil(total / safeLimit))
  };
}

export async function createAdminService(adminId, rawInput) {
  const parsed = serviceSchema.parse({
    ...rawInput,
    slug: rawInput.slug ? slugify(rawInput.slug) : slugify(rawInput.name)
  });

  const slug = parsed.slug || slugify(parsed.name);
  const existingSlug = await prisma.service.findUnique({ where: { slug } });
  if (existingSlug) {
    throw new AppError("A service with this slug already exists.", 409, "DUPLICATE_SLUG");
  }

  const created = await prisma.$transaction(async (tx) => {
    const service = await tx.service.create({
      data: {
        name: parsed.name,
        slug,
        shortDescription: parsed.shortDescription,
        description: parsed.description,
        categoryId: parsed.categoryId || null,
        mainImage: parsed.mainImage || "/images/gel-nails.jpg",
        duration: parsed.duration,
        startingPrice: parsed.startingPrice,
        regularPrice: parsed.regularPrice,
        promotionalPrice: parsed.promotionalPrice,
        nailType: parsed.nailType || "",
        style: parsed.style || "",
        occasion: parsed.occasion || "",
        difficulty: parsed.difficulty || "",
        preparation: parsed.preparation || "",
        aftercare: parsed.aftercare || "",
        available: parsed.available,
        featured: parsed.featured,
        active: parsed.active
      }
    });

    if (Array.isArray(parsed.images) && parsed.images.length > 0) {
      for (let i = 0; i < parsed.images.length; i++) {
        const img = parsed.images[i];
        await tx.serviceImage.create({
          data: {
            serviceId: service.id,
            url: img.url,
            publicId: img.publicId || null,
            alt: img.alt || service.name,
            position: img.position ?? i,
            metadata: img.metadata || null
          }
        });
      }
    }

    if (Array.isArray(parsed.videoIds) && parsed.videoIds.length > 0) {
      for (const videoId of parsed.videoIds) {
        await tx.serviceVideo.create({
          data: {
            serviceId: service.id,
            videoId
          }
        });
      }
    }

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "SERVICE_CREATE",
        targetId: service.id
      }
    });

    return tx.service.findUnique({
      where: { id: service.id },
      include: {
        category: true,
        images: { orderBy: { position: "asc" } },
        videos: { include: { video: true } }
      }
    });
  });

  invalidateServiceCache();
  return serializeService(created);
}

export async function updateAdminService(adminId, serviceId, rawInput) {
  const existing = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!existing) {
    throw new AppError("Service not found.", 404, "NOT_FOUND");
  }

  const merged = {
    name: rawInput.name ?? existing.name,
    slug: rawInput.slug ? slugify(rawInput.slug) : existing.slug,
    shortDescription: rawInput.shortDescription ?? existing.shortDescription,
    description: rawInput.description ?? existing.description,
    categoryId:
      rawInput.categoryId !== undefined ? rawInput.categoryId || null : existing.categoryId,
    mainImage:
      rawInput.mainImage !== undefined ? rawInput.mainImage || null : existing.mainImage,
    duration: rawInput.duration ?? existing.duration,
    startingPrice:
      rawInput.startingPrice !== undefined
        ? rawInput.startingPrice
        : Number(existing.startingPrice),
    regularPrice:
      rawInput.regularPrice !== undefined
        ? rawInput.regularPrice
        : existing.regularPrice !== null
        ? Number(existing.regularPrice)
        : null,
    promotionalPrice:
      rawInput.promotionalPrice !== undefined
        ? rawInput.promotionalPrice
        : existing.promotionalPrice !== null
        ? Number(existing.promotionalPrice)
        : null,
    nailType: rawInput.nailType ?? existing.nailType,
    style: rawInput.style ?? existing.style,
    occasion: rawInput.occasion ?? existing.occasion,
    difficulty: rawInput.difficulty ?? existing.difficulty,
    preparation: rawInput.preparation ?? existing.preparation,
    aftercare: rawInput.aftercare ?? existing.aftercare,
    available: rawInput.available !== undefined ? Boolean(rawInput.available) : existing.available,
    featured: rawInput.featured !== undefined ? Boolean(rawInput.featured) : existing.featured,
    active: rawInput.active !== undefined ? Boolean(rawInput.active) : existing.active,
    images: rawInput.images,
    videoIds: rawInput.videoIds
  };

  const parsed = serviceSchema.parse(merged);

  if (parsed.slug && parsed.slug !== existing.slug) {
    const slugConflict = await prisma.service.findUnique({ where: { slug: parsed.slug } });
    if (slugConflict && slugConflict.id !== serviceId) {
      throw new AppError("A service with this slug already exists.", 409, "DUPLICATE_SLUG");
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const service = await tx.service.update({
      where: { id: serviceId },
      data: {
        name: parsed.name,
        slug: parsed.slug || existing.slug,
        shortDescription: parsed.shortDescription,
        description: parsed.description,
        categoryId: parsed.categoryId || null,
        mainImage: parsed.mainImage,
        duration: parsed.duration,
        startingPrice: parsed.startingPrice,
        regularPrice: parsed.regularPrice,
        promotionalPrice: parsed.promotionalPrice,
        nailType: parsed.nailType,
        style: parsed.style,
        occasion: parsed.occasion,
        difficulty: parsed.difficulty,
        preparation: parsed.preparation,
        aftercare: parsed.aftercare,
        available: parsed.available,
        featured: parsed.featured,
        active: parsed.active
      }
    });

    if (Array.isArray(parsed.images)) {
      await tx.serviceImage.deleteMany({ where: { serviceId } });
      for (let i = 0; i < parsed.images.length; i++) {
        const img = parsed.images[i];
        await tx.serviceImage.create({
          data: {
            serviceId,
            url: img.url,
            publicId: img.publicId || null,
            alt: img.alt || service.name,
            position: img.position ?? i,
            metadata: img.metadata || null
          }
        });
      }
    }

    if (Array.isArray(parsed.videoIds)) {
      await tx.serviceVideo.deleteMany({ where: { serviceId } });
      for (const videoId of parsed.videoIds) {
        await tx.serviceVideo.create({
          data: { serviceId, videoId }
        });
      }
    }

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "SERVICE_UPDATE",
        targetId: serviceId
      }
    });

    return tx.service.findUnique({
      where: { id: serviceId },
      include: {
        category: true,
        images: { orderBy: { position: "asc" } },
        videos: { include: { video: true } }
      }
    });
  });

  invalidateServiceCache();
  return serializeService(updated);
}

export async function deleteOrArchiveAdminService(adminId, serviceId) {
  const existing = await prisma.service.findUnique({
    where: { id: serviceId },
    include: {
      _count: {
        select: { appointments: true, reviews: true }
      }
    }
  });

  if (!existing) {
    throw new AppError("Service not found.", 404, "NOT_FOUND");
  }

  // Protect appointment & review history when a service has historical records
  if (existing._count.appointments > 0 || existing._count.reviews > 0) {
    const archived = await prisma.$transaction(async (tx) => {
      const s = await tx.service.update({
        where: { id: serviceId },
        data: { active: false, available: false, featured: false }
      });
      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: "SERVICE_ARCHIVE",
          targetId: serviceId
        }
      });
      return s;
    });
    invalidateServiceCache();
    return {
      deleted: false,
      archived: true,
      message:
        "Service has existing appointment history and was safely archived (deactivated) to preserve historical records.",
      service: serializeService(archived)
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.service.delete({ where: { id: serviceId } });
    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "SERVICE_DELETE",
        targetId: serviceId
      }
    });
  });

  invalidateServiceCache();
  return {
    deleted: true,
    archived: false,
    message: "Service deleted successfully."
  };
}
