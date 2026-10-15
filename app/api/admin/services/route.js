import { requireAdmin } from "@/lib/auth";
import {
  createAdminService,
  listAdminServices
} from "@/services/serviceService";
import { handleApiError, jsonSuccess } from "@/utils/apiResponse";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const result = await listAdminServices({
      search: searchParams.get("search") || "",
      categoryId: searchParams.get("categoryId") || "",
      status: searchParams.get("status") || "all",
      page: Number(searchParams.get("page") || 1),
      limit: Number(searchParams.get("limit") || 20)
    });
    return jsonSuccess(result);
  } catch (error) {
    return handleApiError(error, "Unable to load services.");
  }
}

export async function POST(request) {
  try {
    const { user: admin } = await requireAdmin();
    const body = await request.json();
    const service = await createAdminService(admin.id, body);
    return jsonSuccess(
      {
        service,
        message: "Service created successfully."
      },
      201
    );
  } catch (error) {
    return handleApiError(error, "Unable to create service.");
  }
}
