import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/auth";
import { deleteMediaByPublicId } from "@/lib/cloudinary";
import { videoSchema } from "@/validators";
import { invalidateAdminDashboardCache } from "@/services/contentService";

const videosCache = new Map();
const VIDEOS_CACHE_TTL_MS = 60 * 1000;

export function invalidateVideoCache() {
  videosCache.clear();
  try {
    invalidateAdminDashboardCache();
  } catch {}
}

export async function listVideos({
  search = "",
  category = "",
  tag = "",
  featuredOnly = false,
  activeOnly = true,
  page = 1,
  limit = 12
} = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 12));
  const skip = (safePage - 1) * safeLimit;
  const q = String(search || "").trim();

  const isCacheable = !q && !tag;
  const cacheKey = isCacheable ? `vid:${category}:${featuredOnly}:${activeOnly}:${safePage}:${safeLimit}` : null;
  if (cacheKey) {
    const cached = videosCache.get(cacheKey);
    if (cached && Date.now() - cached.time < VIDEOS_CACHE_TTL_MS) {
      return cached.data;
    }
  }

  const where = {
    ...(activeOnly ? { active: true } : {}),
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
    ...(tag ? { tags: { has: tag } } : {}),
    ...(q
      ? {
          AND: [
            {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
                { tags: { has: q.toLowerCase() } }
              ]
            }
          ]
        }
      : {})
  };

  const [items, total] = await Promise.all([
    prisma.video.findMany({
      where,
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      skip,
      take: safeLimit,
      include: { category: true }
    }),
    prisma.video.count({ where })
  ]);

  const result = {
    items,
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.max(1, Math.ceil(total / safeLimit))
  };

  if (cacheKey) {
    videosCache.set(cacheKey, { time: Date.now(), data: result });
  }

  return result;
}

export async function getVideoById(id) {
  const video = await prisma.video.findUnique({
    where: { id },
    include: {
      category: true,
      services: {
        include: { service: true }
      }
    }
  });

  if (!video || !video.active) return null;

  const related = await prisma.video.findMany({
    where: {
      active: true,
      id: { not: video.id }
    },
    take: 3,
    orderBy: { createdAt: "desc" },
    include: { category: true }
  });

  return {
    ...video,
    related
  };
}

export async function createVideo(adminId, rawInput) {
  const parsed = videoSchema.parse(rawInput);

  return prisma.$transaction(async (tx) => {
    const video = await tx.video.create({
      data: {
        title: parsed.title,
        description: parsed.description || "",
        url: parsed.url,
        publicId: parsed.publicId || null,
        thumbnail: parsed.thumbnail || "/images/hero-nails.jpg",
        categoryId: parsed.categoryId || null,
        tags: parsed.tags || [],
        featured: parsed.featured,
        active: parsed.active,
        metadata: parsed.metadata || null
      },
      include: { category: true }
    });

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "VIDEO_CREATE",
        targetId: video.id
      }
    });

    invalidateVideoCache();
    return video;
  });
}

export async function updateVideo(adminId, id, rawInput) {
  const existing = await prisma.video.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError("Video not found.", 404, "NOT_FOUND");
  }

  const parsed = videoSchema.parse({
    title: rawInput.title ?? existing.title,
    description: rawInput.description ?? existing.description,
    url: rawInput.url ?? existing.url,
    publicId:
      rawInput.publicId !== undefined ? rawInput.publicId || null : existing.publicId,
    thumbnail:
      rawInput.thumbnail !== undefined ? rawInput.thumbnail || null : existing.thumbnail,
    categoryId:
      rawInput.categoryId !== undefined ? rawInput.categoryId || null : existing.categoryId,
    tags: rawInput.tags !== undefined ? rawInput.tags : existing.tags,
    featured:
      rawInput.featured !== undefined ? Boolean(rawInput.featured) : existing.featured,
    active: rawInput.active !== undefined ? Boolean(rawInput.active) : existing.active,
    metadata: rawInput.metadata !== undefined ? rawInput.metadata : existing.metadata
  });

  const oldPublicId =
    existing.publicId && existing.publicId !== parsed.publicId ? existing.publicId : null;

  const updated = await prisma.$transaction(async (tx) => {
    const video = await tx.video.update({
      where: { id },
      data: {
        title: parsed.title,
        description: parsed.description,
        url: parsed.url,
        publicId: parsed.publicId,
        thumbnail: parsed.thumbnail,
        categoryId: parsed.categoryId,
        tags: parsed.tags,
        featured: parsed.featured,
        active: parsed.active,
        metadata: parsed.metadata
      },
      include: { category: true }
    });

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "VIDEO_UPDATE",
        targetId: id
      }
    });

    return video;
  });

  invalidateVideoCache();
  if (oldPublicId) {
    await deleteMediaByPublicId(oldPublicId, "video").catch(() => {});
  }

  return updated;
}

export async function deleteVideo(adminId, id) {
  const existing = await prisma.video.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError("Video not found.", 404, "NOT_FOUND");
  }

  await prisma.$transaction(async (tx) => {
    await tx.video.delete({ where: { id } });
    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "VIDEO_DELETE",
        targetId: id
      }
    });
  });

  invalidateVideoCache();
  if (existing.publicId) {
    await deleteMediaByPublicId(existing.publicId, "video").catch(() => {});
  }

  return { deleted: true };
}
