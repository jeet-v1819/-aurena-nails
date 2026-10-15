import { requireUser } from "@/lib/auth";
import { markNotificationRead } from "@/services/notificationService";
import { jsonSuccess, handleApiError } from "@/utils/apiResponse";

export const dynamic = "force-dynamic";

export async function PATCH(request, context) {
  try {
    const { user } = await requireUser();
    const params = await context.params;
    const body = await request.json().catch(() => ({}));
    const notification = await markNotificationRead(
      user.id,
      params.id,
      body.read ?? true
    );
    return jsonSuccess({ notification });
  } catch (error) {
    return handleApiError(error);
  }
}
