import { requireAdmin } from "@/lib/auth";
import {
  createGalleryImage,
  listGalleryImages,
  reorderGalleryImages
} from "@/services/galleryService";
import { handleApiError, jsonSuccess } from "@/utils/apiResponse";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const result = await listGalleryImages({
      search: searchParams.get("search") || "",
      category: searchParams.get("category") || "",
      activeOnly: false,
      page: Number(searchParams.get("page") || 1),
      limit: Number(searchParams.get("limit") || 24)
    });
    return jsonSuccess(result);
  } catch (error) {
    return handleApiError(error, "Unable to load gallery items.");
  }
}

export async function POST(request) {
  try {
    const { user: admin } = await requireAdmin();
    const body = await request.json();

    if (Array.isArray(body.items)) {
      const created = [];
      for (const rawItem of body.items) {
        const item = await createGalleryImage(admin.id, rawItem);
        created.push(item);
      }
      return jsonSuccess(
        {
          items: created,
          message: `${created.length} gallery design(s) uploaded.`
        },
        201
      );
    }

    const item = await createGalleryImage(admin.id, body);
    return jsonSuccess(
      {
        item,
        message: "Gallery design created successfully."
      },
      201
    );
  } catch (error) {
    return handleApiError(error, "Unable to create gallery design.");
  }
}

export async function PATCH(request) {
  try {
    const { user: admin } = await requireAdmin();
    const body = await request.json();
    const result = await reorderGalleryImages(admin.id, body.orderedIds || []);
    return jsonSuccess({
      ...result,
      message: "Gallery order updated."
    });
  } catch (error) {
    return handleApiError(error, "Unable to reorder gallery items.");
  }
}
