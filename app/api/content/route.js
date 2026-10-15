import { getPublicWebsiteContent } from "@/services/contentService";
import { jsonSuccess, handleApiError } from "@/utils/apiResponse";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getPublicWebsiteContent();
    return jsonSuccess(data);
  } catch (error) {
    return handleApiError(error);
  }
}
