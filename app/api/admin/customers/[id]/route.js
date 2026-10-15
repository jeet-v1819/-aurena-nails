import { requireAdmin } from "@/lib/auth";
import {
  getCustomerProfile,
  updateAdminCustomer
} from "@/services/customerService";
import { handleApiError, jsonSuccess } from "@/utils/apiResponse";

export const dynamic = "force-dynamic";

export async function GET(_request, context) {
  try {
    await requireAdmin();
    const params = await context.params;
    const customer = await getCustomerProfile(params.id);
    return jsonSuccess({ customer });
  } catch (error) {
    return handleApiError(error, "Unable to load customer details.");
  }
}

export async function PATCH(request, context) {
  try {
    const { user: admin } = await requireAdmin();
    const params = await context.params;
    const body = await request.json();
    const customer = await updateAdminCustomer(admin.id, params.id, body);
    return jsonSuccess({
      customer,
      message: "Customer updated successfully."
    });
  } catch (error) {
    return handleApiError(error, "Unable to update customer.");
  }
}

export async function DELETE(_request, context) {
  try {
    const { user: admin } = await requireAdmin();
    const params = await context.params;
    const customer = await updateAdminCustomer(admin.id, params.id, {
      softDelete: true
    });
    return jsonSuccess({
      customer,
      message: "Customer account deactivated and archived."
    });
  } catch (error) {
    return handleApiError(error, "Unable to archive customer.");
  }
}
