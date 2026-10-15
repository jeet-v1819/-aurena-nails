import { requireAdmin } from "@/lib/auth";
import { deleteVideo, updateVideo } from "@/services/videoService";
import { handleApiError, jsonSuccess } from "@/utils/apiResponse";

export const dynamic = "force-dynamic";

export async function PUT(request, context) {
  try {
    const { user: admin } = await requireAdmin();
    const params = await context.params;
    const body = await request.json();
    const video = await updateVideo(admin.id, params.id, body);
    return jsonSuccess({
      video,
      message: "Video updated successfully."
    });
  } catch (error) {
    return handleApiError(error, "Unable to update video.");
  }
}

export async function PATCH(request, context) {
  return PUT(request, context);
}

export async function DELETE(_request, context) {
  try {
    const { user: admin } = await requireAdmin();
    const params = await context.params;
    const result = await deleteVideo(admin.id, params.id);
    return jsonSuccess({
      ...result,
      message: "Video deleted."
    });
  } catch (error) {
    return handleApiError(error, "Unable to delete video.");
  }
}
