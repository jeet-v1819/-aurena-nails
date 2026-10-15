import { resetPasswordWithToken } from "@/services/authService";
import { handleApiError, jsonSuccess } from "@/utils/apiResponse";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json();
    const ipKey =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const result = await resetPasswordWithToken(body, ipKey);
    return jsonSuccess(result);
  } catch (error) {
    return handleApiError(error, "Unable to reset password.");
  }
}
