import { requireAdmin } from "@/lib/auth";
import {
  deleteAdminCategory,
  updateAdminCategory
} from "@/services/galleryService";
import { handleApiError, jsonSuccess } from "@/utils/apiResponse";

export const dynamic = "force-dynamic";

export async function PUT(request, context) {
  try {
    const { user: admin } = await requireAdmin();
    const params = await context.params;
    const body = await request.json();
    const category = await updateAdminCategory(admin.id, params.id, body);
    return jsonSuccess({
      category,
      message: "Category updated successfully."
    });
  } catch (error) {
    return handleApiError(error, "Unable to update category.");
  }
}

export async function PATCH(request, context) {
  return PUT(request, context);
}

export async function DELETE(_request, context) {
  try {
    const { user: admin } = await requireAdmin();
    const params = await context.params;
    const result = await deleteAdminCategory(admin.id, params.id);
    return jsonSuccess({
      ...result,
      message: "Category deleted successfully."
    });
  } catch (error) {
    return handleApiError(error, "Unable to delete category.");
  }
}
