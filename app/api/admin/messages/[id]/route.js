import { requireAdmin } from "@/lib/auth";
import {
  deleteAdminMessage,
  markAdminMessageRead
} from "@/services/contentService";
import { handleApiError, jsonSuccess } from "@/utils/apiResponse";

export const dynamic = "force-dynamic";

export async function PATCH(request, context) {
  try {
    const { user: admin } = await requireAdmin();
    const params = await context.params;
    const body = await request.json();
    const message = await markAdminMessageRead(
      admin.id,
      params.id,
      body.read !== undefined ? Boolean(body.read) : true
    );
    return jsonSuccess({
      contactMessage: message,
      message: message.read ? "Marked as read." : "Marked as unread."
    });
  } catch (error) {
    return handleApiError(error, "Unable to update message.");
  }
}

export async function DELETE(_request, context) {
  try {
    const { user: admin } = await requireAdmin();
    const params = await context.params;
    const result = await deleteAdminMessage(admin.id, params.id);
    return jsonSuccess({
      ...result,
      message: "Message deleted."
    });
  } catch (error) {
    return handleApiError(error, "Unable to delete message.");
  }
}
