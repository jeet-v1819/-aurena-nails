import { getVideoById } from "@/services/videoService";
import { AppError } from "@/lib/auth";
import { jsonSuccess, handleApiError } from "@/utils/apiResponse";

export const dynamic = "force-dynamic";

export async function GET(_request, context) {
  try {
    const params = await context.params;
    const video = await getVideoById(params.id);
    if (!video) {
      throw new AppError("Video not found.", 404, "NOT_FOUND");
    }
    return jsonSuccess({ video });
  } catch (error) {
    return handleApiError(error);
  }
}
