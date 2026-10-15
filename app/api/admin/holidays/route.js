import { requireAdmin } from "@/lib/auth";
import {
  createHoliday,
  getPublicWebsiteContent
} from "@/services/contentService";
import { handleApiError, jsonSuccess } from "@/utils/apiResponse";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    const content = await getPublicWebsiteContent();
    return jsonSuccess({ items: content.holidays });
  } catch (error) {
    return handleApiError(error, "Unable to load holidays.");
  }
}

export async function POST(request) {
  try {
    const { user: admin } = await requireAdmin();
    const body = await request.json();
    const holiday = await createHoliday(admin.id, body);
    return jsonSuccess(
      {
        holiday,
        message: "Holiday saved successfully."
      },
      201
    );
  } catch (error) {
    return handleApiError(error, "Unable to save holiday.");
  }
}
