import { getSessionAndUser, AppError } from "@/lib/auth";
import { uploadMediaBuffer } from "@/lib/cloudinary";
import { jsonSuccess, handleApiError } from "@/utils/apiResponse";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const { user } = await getSessionAndUser();
    const formData = await request.formData();
    const file = formData.get("file");
    const expectedType = String(formData.get("resourceType") || "image");
    const folder = String(formData.get("folder") || "aurena-nails/uploads");

    if (!file || typeof file.arrayBuffer !== "function") {
      throw new AppError("Please select a valid media file to upload.", 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadMediaBuffer({
      buffer,
      filename: file.name || "upload",
      declaredMime: file.type || "",
      expectedType: expectedType === "video" ? "video" : "image",
      folder,
      ownerId: user?.id || "guest"
    });

    return jsonSuccess(uploaded, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
