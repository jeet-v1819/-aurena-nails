import { requireAdmin } from "@/lib/auth";
import { createVideo, listVideos } from "@/services/videoService";
import { handleApiError, jsonSuccess } from "@/utils/apiResponse";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const result = await listVideos({
      search: searchParams.get("search") || "",
      category: searchParams.get("category") || "",
      activeOnly: false,
      page: Number(searchParams.get("page") || 1),
      limit: Number(searchParams.get("limit") || 20)
    });
    return jsonSuccess(result);
  } catch (error) {
    return handleApiError(error, "Unable to load videos.");
  }
}

export async function POST(request) {
  try {
    const { user: admin } = await requireAdmin();
    const body = await request.json();
    const video = await createVideo(admin.id, body);
    return jsonSuccess(
      {
        video,
        message: "Video created successfully."
      },
      201
    );
  } catch (error) {
    return handleApiError(error, "Unable to create video.");
  }
}
