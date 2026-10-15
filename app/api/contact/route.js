import { createContactMessage } from "@/services/contentService";
import { jsonSuccess, handleApiError } from "@/utils/apiResponse";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json();
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "127.0.0.1";
    const contactMessage = await createContactMessage(body, ip);
    return jsonSuccess(
      {
        contactMessage,
        message:
          "Thank you for contacting Aurena Nails. Our concierge team will respond shortly."
      },
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
