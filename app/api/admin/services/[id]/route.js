import { requireAdmin } from "@/lib/auth";
import {
  deleteOrArchiveAdminService,
  updateAdminService
} from "@/services/serviceService";
import { handleApiError, jsonSuccess } from "@/utils/apiResponse";

export const dynamic = "force-dynamic";

export async function PUT(request, context) {
  try {
    const { user: admin } = await requireAdmin();
    const params = await context.params;
    const body = await request.json();
    const service = await updateAdminService(admin.id, params.id, body);
    return jsonSuccess({
      service,
      message: "Service updated successfully."
    });
  } catch (error) {
    return handleApiError(error, "Unable to update service.");
  }
}

export async function PATCH(request, context) {
  return PUT(request, context);
}

export async function DELETE(_request, context) {
  try {
    const { user: admin } = await requireAdmin();
    const params = await context.params;
    const result = await deleteOrArchiveAdminService(admin.id, params.id);
    return jsonSuccess(result);
  } catch (error) {
    return handleApiError(error, "Unable to delete service.");
  }
}
