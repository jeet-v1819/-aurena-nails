import { requireAdmin } from "@/lib/auth";
import { listAdminCustomers } from "@/services/customerService";
import { handleApiError, jsonSuccess } from "@/utils/apiResponse";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const result = await listAdminCustomers({
      page: Number(searchParams.get("page") || 1),
      limit: Number(searchParams.get("limit") || 15),
      search: searchParams.get("search") || "",
      status: searchParams.get("status") || "all"
    });
    return jsonSuccess(result);
  } catch (error) {
    return handleApiError(error, "Unable to load customers.");
  }
}
