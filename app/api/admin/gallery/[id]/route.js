import { requireAdmin } from "@/lib/auth";
import {
  deleteGalleryImage,
  updateGalleryImage
} from "@/services/galleryService";
import { handleApiError, jsonSuccess } from "@/utils/apiResponse";

export const dynamic = "force-dynamic";

export async function PUT(request, context) {
  try {
    const { user: admin } = await requireAdmin();
    const params = await context.params;
    const body = await request.json();
    const item = await updateGalleryImage(admin.id, params.id, body);
    return jsonSuccess({
      item,
      message: "Gallery design updated successfully."
    });
  } catch (error) {
    return handleApiError(error, "Unable to update gallery design.");
  }
}

export async function PATCH(request, context) {
  return PUT(request, context);
}

export async function DELETE(_request, context) {
  try {
    const { user: admin } = await requireAdmin();
    const params = await context.params;
    const result = await deleteGalleryImage(admin.id, params.id);
    return jsonSuccess({
      ...result,
      message: "Gallery design deleted."
    });
  } catch (error) {
    return handleApiError(error, "Unable to delete gallery design.");
  }
}
