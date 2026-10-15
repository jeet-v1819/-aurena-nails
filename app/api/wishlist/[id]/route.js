import { requireUser } from "@/lib/auth";
import { removeWishlistItem } from "@/services/customerService";
import { jsonSuccess, handleApiError } from "@/utils/apiResponse";

export const dynamic = "force-dynamic";

export async function DELETE(_request, context) {
  try {
    const { user } = await requireUser();
    const params = await context.params;
    const result = await removeWishlistItem(user.id, { id: params.id });
    return jsonSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
