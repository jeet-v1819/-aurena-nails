import { requireUser } from "@/lib/auth";
import {
  getCustomerProfile,
  updateCustomerProfile
} from "@/services/customerService";
import { changeCustomerPassword } from "@/services/authService";
import { jsonSuccess, handleApiError } from "@/utils/apiResponse";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { user } = await requireUser();
    const profile = await getCustomerProfile(user.id);
    return jsonSuccess({ user: profile });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request) {
  try {
    const { user } = await requireUser();
    const body = await request.json();
    const updated = await updateCustomerProfile(user.id, body);
    return jsonSuccess({
      user: updated,
      message: "Profile updated successfully."
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request) {
  try {
    const { user } = await requireUser();
    const body = await request.json();
    const result = await changeCustomerPassword(user, body);
    return jsonSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request) {
  try {
    const { user } = await requireUser();
    const body = await request.json();
    const result = await changeCustomerPassword(user, body);
    return jsonSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
