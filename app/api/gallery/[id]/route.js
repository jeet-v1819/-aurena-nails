import { getGalleryImageById } from "@/services/galleryService";
import { AppError } from "@/lib/auth";
import { jsonSuccess, handleApiError } from "@/utils/apiResponse";

export const dynamic = "force-dynamic";

export async function GET(_request, context) {
  try {
    const params = await context.params;
    const item = await getGalleryImageById(params.id);
    if (!item) {
      throw new AppError("Gallery design not found.", 404, "NOT_FOUND");
    }
    return jsonSuccess({ item });
  } catch (error) {
    return handleApiError(error);
  }
}
