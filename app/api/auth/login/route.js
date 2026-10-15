import { loginUser } from "@/services/authService";
import { handleApiError, jsonSuccess } from "@/utils/apiResponse";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json();
    const ipKey =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const user = await loginUser(body, { requireAdminRole: false, ipKey });
    return jsonSuccess({ user, message: "Signed in successfully." });
  } catch (error) {
    return handleApiError(error, "Unable to sign in.");
  }
}
