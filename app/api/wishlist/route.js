import { requireUser } from "@/lib/auth";
import {
  listUserWishlist,
  addWishlistItem,
  removeWishlistItem
} from "@/services/customerService";
import { jsonSuccess, handleApiError } from "@/utils/apiResponse";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { user } = await requireUser();
    const items = await listUserWishlist(user.id);
    return jsonSuccess({ items });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request) {
  try {
    const { user } = await requireUser();
    const body = await request.json();
    const item = await addWishlistItem(user.id, {
      serviceId: body.serviceId,
      galleryId: body.galleryId || body.galleryItemId
    });
    return jsonSuccess({ item, saved: true }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request) {
  try {
    const { user } = await requireUser();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id") || undefined;
    const serviceId = searchParams.get("serviceId") || undefined;
    const galleryId = searchParams.get("galleryId") || undefined;
    const result = await removeWishlistItem(user.id, {
      id,
      serviceId,
      galleryId
    });
    return jsonSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
