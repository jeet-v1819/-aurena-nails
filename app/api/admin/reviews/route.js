import { requireAdmin } from "@/lib/auth";
import { listAdminReviews } from "@/services/reviewService";
import { handleApiError, jsonSuccess } from "@/utils/apiResponse";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const result = await listAdminReviews({
      search: searchParams.get("search") || "",
      rating: Number(searchParams.get("rating") || 0),
      visible: searchParams.get("visible") || "all",
      page: Number(searchParams.get("page") || 1),
      limit: Number(searchParams.get("limit") || 20)
    });
    return jsonSuccess(result);
  } catch (error) {
    return handleApiError(error, "Unable to load reviews.");
  }
}
