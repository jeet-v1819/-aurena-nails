import { requireAdmin } from "@/lib/auth";
import {
  createAdminCategory,
  listAdminCategories
} from "@/services/galleryService";
import { handleApiError, jsonSuccess } from "@/utils/apiResponse";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const items = await listAdminCategories({
      search: searchParams.get("search") || ""
    });
    return jsonSuccess({ items });
  } catch (error) {
    return handleApiError(error, "Unable to load categories.");
  }
}

export async function POST(request) {
  try {
    const { user: admin } = await requireAdmin();
    const body = await request.json();
    const category = await createAdminCategory(admin.id, body);
    return jsonSuccess(
      {
        category,
        message: "Category created successfully."
      },
      201
    );
  } catch (error) {
    return handleApiError(error, "Unable to create category.");
  }
}
