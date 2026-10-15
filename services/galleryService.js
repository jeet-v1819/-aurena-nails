import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/auth";
import { deleteMediaByPublicId } from "@/lib/cloudinary";
import { categorySchema, galleryImageSchema } from "@/validators";
import { slugify } from "@/utils/format";

export async function listCategories({ activeOnly = false } = {}) {
  const where = {
    ...(activeOnly ? { active: true } : {}),
    NOT: {
      slug: { startsWith: "aurena-e2e-" }
    }
  };

  const categories = await prisma.galleryCategory.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          services: true,
          galleryImages: true,
          videos: true
        }
      }
    }
  });

  return categories.map((cat) => ({
    ...cat,
    servicesCount: cat._count.services,
    galleryCount: cat._count.galleryImages,
    videosCount: cat._count.videos
  }));
}

export async function listAdminCategories({ search = "" } = {}) {
  const q = String(search || "").trim();
  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { slug: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } }
        ]
      }
    : {};

  const categories = await prisma.galleryCategory.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          services: true,
          galleryImages: true,
          videos: true
        }
      }
    }
  });

  return categories.map((cat) => ({
    ...cat,
    servicesCount: cat._count.services,
    galleryCount: cat._count.galleryImages,
    videosCount: cat._count.videos
  }));
}

export async function createAdminCategory(adminId, rawInput) {
  const parsed = categorySchema.parse({
    ...rawInput,
    slug: rawInput.slug ? slugify(rawInput.slug) : slugify(rawInput.name)
  });

  const slug = parsed.slug || slugify(parsed.name);
  const existing = await prisma.galleryCategory.findUnique({ where: { slug } });
  if (existing) {
    throw new AppError("A category with this slug already exists.", 409, "DUPLICATE_SLUG");
  }

  return prisma.$transaction(async (tx) => {
    const category = await tx.galleryCategory.create({
      data: {
        name: parsed.name,
        slug,
        description: parsed.description || "",
        image: parsed.image || null,
        active: parsed.active
      }
    });

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "CATEGORY_CREATE",
        targetId: category.id
      }
    });

    return category;
  });
}

export async function updateAdminCategory(adminId, categoryId, rawInput) {
  const existing = await prisma.galleryCategory.findUnique({
    where: { id: categoryId }
  });
  if (!existing) {
    throw new AppError("Category not found.", 404, "NOT_FOUND");
  }

  const parsed = categorySchema.parse({
    name: rawInput.name ?? existing.name,
    slug: rawInput.slug ? slugify(rawInput.slug) : existing.slug,
    description: rawInput.description ?? existing.description,
    image: rawInput.image !== undefined ? rawInput.image || null : existing.image,
    active: rawInput.active !== undefined ? Boolean(rawInput.active) : existing.active
  });

  if (parsed.slug && parsed.slug !== existing.slug) {
    const conflict = await prisma.galleryCategory.findUnique({
      where: { slug: parsed.slug }
    });
    if (conflict && conflict.id !== categoryId) {
      throw new AppError("A category with this slug already exists.", 409, "DUPLICATE_SLUG");
    }
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.galleryCategory.update({
      where: { id: categoryId },
      data: {
        name: parsed.name,
        slug: parsed.slug || existing.slug,
        description: parsed.description,
        image: parsed.image,
        active: parsed.active
      }
    });

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "CATEGORY_UPDATE",
        targetId: categoryId
      }
    });

    return updated;
  });
}

export async function deleteAdminCategory(adminId, categoryId) {
  const existing = await prisma.galleryCategory.findUnique({
    where: { id: categoryId },
    include: {
      _count: {
        select: {
          services: true,
          galleryImages: true,
          videos: true
        }
      }
    }
  });

  if (!existing) {
    throw new AppError("Category not found.", 404, "NOT_FOUND");
  }

  const linkedTotal =
    existing._count.services + existing._count.galleryImages + existing._count.videos;

  if (linkedTotal > 0) {
    throw new AppError(
      `Cannot delete category "${existing.name}" because it is linked to ${linkedTotal} existing item(s). Please reassign those items or deactivate the category instead.`,
      409,
      "CATEGORY_IN_USE"
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.galleryCategory.delete({ where: { id: categoryId } });
    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "CATEGORY_DELETE",
        targetId: categoryId
      }
    });
  });

  return { deleted: true };
}

export async function listGalleryImages({
  search = "",
  category = "",
  tag = "",
  style = "",
  occasion = "",
  featuredOnly = false,
  activeOnly = true,
  page = 1,
  limit = 18
} = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 18));
  const skip = (safePage - 1) * safeLimit;
  const q = String(search || "").trim();

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
    ...(style ? { style: { contains: style, mode: "insensitive" } } : {}),
    ...(occasion ? { occasion: { contains: occasion, mode: "insensitive" } } : {}),
    ...(q
      ? {
          AND: [
            {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
                { style: { contains: q, mode: "insensitive" } },
                { occasion: { contains: q, mode: "insensitive" } },
                { tags: { has: q.toLowerCase() } }
              ]
            }
          ]
        }
      : {})
  };

  const [items, total] = await Promise.all([
    prisma.galleryImage.findMany({
      where,
      orderBy: [{ position: "asc" }, { createdAt: "desc" }],
      skip,
      take: safeLimit,
      include: { category: true }
    }),
    prisma.galleryImage.count({ where })
  ]);

  return {
    items,
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.max(1, Math.ceil(total / safeLimit))
  };
}

export async function getGalleryImageById(id) {
  const item = await prisma.galleryImage.findUnique({
    where: { id },
    include: { category: true }
  });
  if (!item || !item.active) return null;

  const related = await prisma.galleryImage.findMany({
    where: {
      active: true,
      id: { not: item.id },
      ...(item.categoryId ? { categoryId: item.categoryId } : {})
    },
    take: 4,
    orderBy: { createdAt: "desc" },
    include: { category: true }
  });

  return {
    ...item,
    related
  };
}

export async function createGalleryImage(adminId, rawInput) {
  const parsed = galleryImageSchema.parse(rawInput);

  return prisma.$transaction(async (tx) => {
    const item = await tx.galleryImage.create({
      data: {
        title: parsed.title,
        description: parsed.description || "",
        url: parsed.url,
        publicId: parsed.publicId || null,
        categoryId: parsed.categoryId || null,
        tags: parsed.tags || [],
        style: parsed.style || "",
        occasion: parsed.occasion || "",
        featured: parsed.featured,
        active: parsed.active,
        position: parsed.position || 0,
        metadata: parsed.metadata || null
      },
      include: { category: true }
    });

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "GALLERY_CREATE",
        targetId: item.id
      }
    });

    return item;
  });
}

export async function updateGalleryImage(adminId, id, rawInput) {
  const existing = await prisma.galleryImage.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError("Gallery item not found.", 404, "NOT_FOUND");
  }

  const parsed = galleryImageSchema.parse({
    title: rawInput.title ?? existing.title,
    description: rawInput.description ?? existing.description,
    url: rawInput.url ?? existing.url,
    publicId:
      rawInput.publicId !== undefined ? rawInput.publicId || null : existing.publicId,
    categoryId:
      rawInput.categoryId !== undefined ? rawInput.categoryId || null : existing.categoryId,
    tags: rawInput.tags !== undefined ? rawInput.tags : existing.tags,
    style: rawInput.style ?? existing.style,
    occasion: rawInput.occasion ?? existing.occasion,
    featured:
      rawInput.featured !== undefined ? Boolean(rawInput.featured) : existing.featured,
    active: rawInput.active !== undefined ? Boolean(rawInput.active) : existing.active,
    position: rawInput.position !== undefined ? Number(rawInput.position) : existing.position,
    metadata: rawInput.metadata !== undefined ? rawInput.metadata : existing.metadata
  });

  const oldPublicId =
    existing.publicId && existing.publicId !== parsed.publicId ? existing.publicId : null;

  const updated = await prisma.$transaction(async (tx) => {
    const item = await tx.galleryImage.update({
      where: { id },
      data: {
        title: parsed.title,
        description: parsed.description,
        url: parsed.url,
        publicId: parsed.publicId,
        categoryId: parsed.categoryId,
        tags: parsed.tags,
        style: parsed.style,
        occasion: parsed.occasion,
        featured: parsed.featured,
        active: parsed.active,
        position: parsed.position,
        metadata: parsed.metadata
      },
      include: { category: true }
    });

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "GALLERY_UPDATE",
        targetId: id
      }
    });

    return item;
  });

  if (oldPublicId) {
    await deleteMediaByPublicId(oldPublicId, "image").catch(() => {});
  }

  return updated;
}

export async function reorderGalleryImages(adminId, orderedIds = []) {
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return { updated: 0 };
  }

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx.galleryImage.updateMany({
        where: { id: orderedIds[i] },
        data: { position: i }
      });
    }
    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "GALLERY_REORDER",
        targetId: orderedIds[0]
      }
    });
  });

  return { updated: orderedIds.length };
}

export async function deleteGalleryImage(adminId, id) {
  const existing = await prisma.galleryImage.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError("Gallery item not found.", 404, "NOT_FOUND");
  }

  await prisma.$transaction(async (tx) => {
    await tx.galleryImage.delete({ where: { id } });
    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "GALLERY_DELETE",
        targetId: id
      }
    });
  });

  if (existing.publicId) {
    await deleteMediaByPublicId(existing.publicId, "image").catch(() => {});
  }

  return { deleted: true };
}
