import { logoutUser } from "@/services/authService";
import { handleApiError, jsonSuccess } from "@/utils/apiResponse";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await logoutUser();
    return jsonSuccess({ success: true, message: "Signed out successfully." });
  } catch (error) {
    return handleApiError(error, "Unable to sign out.");
  }
}
