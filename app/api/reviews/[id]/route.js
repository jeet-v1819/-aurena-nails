import { requireUser } from "@/lib/auth";
import {
  updateCustomerReview,
  deleteCustomerReview
} from "@/services/reviewService";
import { jsonSuccess, handleApiError } from "@/utils/apiResponse";

export const dynamic = "force-dynamic";

export async function PUT(request, context) {
  try {
    const { user } = await requireUser();
    const params = await context.params;
    const body = await request.json();
    const review = await updateCustomerReview(user, params.id, body);
    return jsonSuccess({ review });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request, context) {
  try {
    const { user } = await requireUser();
    const params = await context.params;
    const result = await deleteCustomerReview(user, params.id);
    return jsonSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
