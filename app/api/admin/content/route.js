import { requireAdmin } from "@/lib/auth";
import {
  getPublicWebsiteContent,
  updateWebsiteContentSection
} from "@/services/contentService";
import { handleApiError, jsonSuccess } from "@/utils/apiResponse";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    const content = await getPublicWebsiteContent();
    return jsonSuccess({ ...content, content });
  } catch (error) {
    return handleApiError(error, "Unable to load website content.");
  }
}

export async function PUT(request) {
  try {
    const { user: admin } = await requireAdmin();
    const body = await request.json();

    const sectionKey = body.key || body.section;
    const sectionVal = body.value || body.data;

    if (sectionKey && sectionVal) {
      const updated = await updateWebsiteContentSection(
        admin.id,
        sectionKey,
        sectionVal
      );
      return jsonSuccess({
        section: updated,
        message: "Content section updated successfully."
      });
    }

    // Support saving multiple sections at once
    for (const k of ["home", "hero", "about", "contact", "settings", "announcement"]) {
      if (body[k] && typeof body[k] === "object") {
        await updateWebsiteContentSection(admin.id, k, body[k]);
      }
    }

    const content = await getPublicWebsiteContent();
    return jsonSuccess({
      ...content,
      content,
      message: "Website content saved successfully."
    });
  } catch (error) {
    return handleApiError(error, "Unable to update website content.");
  }
}

export async function PATCH(request) {
  return PUT(request);
}
