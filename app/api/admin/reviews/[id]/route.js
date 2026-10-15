import { requireAdmin } from "@/lib/auth";
import {
  deleteAdminReview,
  moderateAdminReview
} from "@/services/reviewService";
import { handleApiError, jsonSuccess } from "@/utils/apiResponse";

export const dynamic = "force-dynamic";

export async function PATCH(request, context) {
  try {
    const { user: admin } = await requireAdmin();
    const params = await context.params;
    const body = await request.json();
    const review = await moderateAdminReview(admin.id, params.id, {
      visible: Boolean(body.visible)
    });
    return jsonSuccess({
      review,
      message: review.visible ? "Review restored." : "Review hidden."
    });
  } catch (error) {
    return handleApiError(error, "Unable to moderate review.");
  }
}

export async function DELETE(_request, context) {
  try {
    const { user: admin } = await requireAdmin();
    const params = await context.params;
    const result = await deleteAdminReview(admin.id, params.id);
    return jsonSuccess({
      ...result,
      message: "Review deleted."
    });
  } catch (error) {
    return handleApiError(error, "Unable to delete review.");
  }
}
