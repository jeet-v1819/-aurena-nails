import { requireAdmin } from "@/lib/auth";
import { listAdminAppointments } from "@/services/appointmentService";
import { handleApiError, jsonSuccess } from "@/utils/apiResponse";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const result = await listAdminAppointments({
      search: searchParams.get("search") || "",
      status: searchParams.get("status") || "all",
      serviceId: searchParams.get("serviceId") || "",
      date: searchParams.get("date") || "",
      page: Number(searchParams.get("page") || 1),
      limit: Number(searchParams.get("limit") || 20)
    });
    return jsonSuccess(result);
  } catch (error) {
    return handleApiError(error, "Unable to load appointments.");
  }
}
