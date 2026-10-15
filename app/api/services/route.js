import { listPublicServices } from "@/services/serviceService";
import { jsonSuccess, handleApiError } from "@/utils/apiResponse";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const style = searchParams.get("style") || "";
    const occasion = searchParams.get("occasion") || "";
    const maxDuration = Number(searchParams.get("maxDuration") || 0);
    const availableOnly = searchParams.get("availableOnly") === "true";
    const featuredOnly =
      searchParams.get("featuredOnly") === "true" ||
      searchParams.get("featured") === "true";
    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 20);

    const result = await listPublicServices({
      search,
      category,
      style,
      occasion,
      maxDuration,
      availableOnly,
      featuredOnly,
      page,
      limit
    });
    return jsonSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
