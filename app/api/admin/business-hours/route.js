import { requireAdmin } from "@/lib/auth";
import {
  getPublicWebsiteContent,
  updateBusinessHours
} from "@/services/contentService";
import { handleApiError, jsonSuccess } from "@/utils/apiResponse";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    const content = await getPublicWebsiteContent();
    return jsonSuccess({
      businessHours: content.businessHours,
      holidays: content.holidays
    });
  } catch (error) {
    return handleApiError(error, "Unable to load business hours.");
  }
}

export async function PUT(request) {
  try {
    const { user: admin } = await requireAdmin();
    const body = await request.json();
    const hours = await updateBusinessHours(
      admin.id,
      body.businessHours || body.hours || []
    );
    return jsonSuccess({
      businessHours: hours,
      message: "Business hours updated successfully."
    });
  } catch (error) {
    return handleApiError(error, "Unable to update business hours.");
  }
}
