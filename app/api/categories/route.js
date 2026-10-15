import { listCategories } from "@/services/galleryService";
import { jsonSuccess, handleApiError } from "@/utils/apiResponse";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await listCategories({ activeOnly: true });
    return jsonSuccess({ items, categories: items });
  } catch (error) {
    return handleApiError(error);
  }
}
