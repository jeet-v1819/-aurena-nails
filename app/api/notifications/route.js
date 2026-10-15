import { requireUser } from "@/lib/auth";
import {
  listUserNotifications,
  markNotificationRead,
  markAllNotificationsRead
} from "@/services/notificationService";
import { jsonSuccess, handleApiError } from "@/utils/apiResponse";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { user } = await requireUser();
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 20);
    const result = await listUserNotifications(user.id, { page, limit });
    return jsonSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request) {
  try {
    const { user } = await requireUser();
    const body = await request.json().catch(() => ({}));
    if (body.markAll || body.markAllRead || !body.id) {
      const result = await markAllNotificationsRead(user.id);
      return jsonSuccess(result);
    }
    const notification = await markNotificationRead(
      user.id,
      body.id,
      body.read ?? true
    );
    return jsonSuccess({ notification });
  } catch (error) {
    return handleApiError(error);
  }
}
