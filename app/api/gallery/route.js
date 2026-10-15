import { listGalleryImages } from "@/services/galleryService";
import { jsonSuccess, handleApiError } from "@/utils/apiResponse";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const tag = searchParams.get("tag") || "";
    const style = searchParams.get("style") || "";
    const occasion = searchParams.get("occasion") || "";
    const featuredOnly =
      searchParams.get("featuredOnly") === "true" ||
      searchParams.get("featured") === "true";
    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 18);

    const result = await listGalleryImages({
      search,
      category,
      tag,
      style,
      occasion,
      featuredOnly,
      activeOnly: true,
      page,
      limit
    });
    return jsonSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
