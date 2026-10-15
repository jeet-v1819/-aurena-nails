import { requireAdmin } from "@/lib/auth";
import { updateCustomerProfile } from "@/services/customerService";
import { changeCustomerPassword } from "@/services/authService";
import { handleApiError, jsonSuccess } from "@/utils/apiResponse";

export const dynamic = "force-dynamic";

export async function PUT(request) {
  try {
    const { user } = await requireAdmin();
    const body = await request.json();
    const updated = await updateCustomerProfile(user.id, body);
    return jsonSuccess({
      user: updated,
      message: "Admin profile updated successfully."
    });
  } catch (error) {
    return handleApiError(error, "Unable to update admin profile.");
  }
}

export async function POST(request) {
  try {
    const { user } = await requireAdmin();
    const body = await request.json();
    const result = await changeCustomerPassword(user, body);
    return jsonSuccess(result);
  } catch (error) {
    return handleApiError(error, "Unable to update admin password.");
  }
}
