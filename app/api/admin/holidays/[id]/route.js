import { requireAdmin } from "@/lib/auth";
import { deleteHoliday, updateHoliday } from "@/services/contentService";
import { handleApiError, jsonSuccess } from "@/utils/apiResponse";

export const dynamic = "force-dynamic";

export async function PATCH(request, context) {
  try {
    const { user: admin } = await requireAdmin();
    const params = await context.params;
    const body = await request.json();
    const holiday = await updateHoliday(admin.id, params.id, body);
    return jsonSuccess({
      holiday,
      message: "Holiday updated successfully."
    });
  } catch (error) {
    return handleApiError(error, "Unable to update holiday.");
  }
}

export async function DELETE(_request, context) {
  try {
    const { user: admin } = await requireAdmin();
    const params = await context.params;
    const result = await deleteHoliday(admin.id, params.id);
    return jsonSuccess({
      ...result,
      message: "Holiday removed."
    });
  } catch (error) {
    return handleApiError(error, "Unable to delete holiday.");
  }
}
