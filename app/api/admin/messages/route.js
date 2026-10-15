import { requireAdmin } from "@/lib/auth";
import { listAdminMessages } from "@/services/contentService";
import { handleApiError, jsonSuccess } from "@/utils/apiResponse";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const result = await listAdminMessages({
      search: searchParams.get("search") || "",
      read: searchParams.get("read") || "all",
      page: Number(searchParams.get("page") || 1),
      limit: Number(searchParams.get("limit") || 20)
    });
    return jsonSuccess(result);
  } catch (error) {
    return handleApiError(error, "Unable to load contact messages.");
  }
}
