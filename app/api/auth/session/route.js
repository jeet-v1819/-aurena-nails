import { getSessionAndUser } from "@/lib/auth";
import { handleApiError, jsonSuccess } from "@/utils/apiResponse";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await getSessionAndUser({ disableCookieCache: true });
    if (result.databaseError) {
      return jsonSuccess(
        {
          user: null,
          session: null,
          code: "AUTH_UNAVAILABLE",
          error:
            "Authentication is temporarily unavailable. Please try again in a moment."
        },
        503
      );
    }
    if (result.inactive) {
      return jsonSuccess(
        {
          user: null,
          session: null,
          inactive: true,
          error:
            result.error ||
            "Your account is currently inactive. Please contact Aurena Nails."
        },
        403
      );
    }
    return jsonSuccess({
      user: result.user,
      session: result.session,
      inactive: false
    });
  } catch (error) {
    return handleApiError(error, "Unable to verify session.");
  }
}
