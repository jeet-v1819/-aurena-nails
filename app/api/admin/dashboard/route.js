import { requireAdmin } from "@/lib/auth";
import { getAdminDashboardAnalytics } from "@/services/contentService";
import { handleApiError, jsonSuccess } from "@/utils/apiResponse";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    const analytics = await getAdminDashboardAnalytics();
    return jsonSuccess(analytics);
  } catch (error) {
    return handleApiError(error, "Unable to load admin dashboard analytics.");
  }
}
