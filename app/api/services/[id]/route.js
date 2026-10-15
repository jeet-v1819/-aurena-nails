import { getServiceBySlug } from "@/services/serviceService";
import { AppError } from "@/lib/auth";
import { jsonSuccess, handleApiError } from "@/utils/apiResponse";

export const dynamic = "force-dynamic";

export async function GET(_request, context) {
  try {
    const params = await context.params;
    const service = await getServiceBySlug(params.id);
    if (!service) {
      throw new AppError("Service not found.", 404, "NOT_FOUND");
    }
    return jsonSuccess({ service });
  } catch (error) {
    return handleApiError(error);
  }
}
