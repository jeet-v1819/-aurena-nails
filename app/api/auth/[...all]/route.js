import { proxyNeonAuthRequest } from "@/lib/auth";
import { handleApiError } from "@/utils/apiResponse";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    return await proxyNeonAuthRequest(request, params?.all || []);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request, { params }) {
  try {
    return await proxyNeonAuthRequest(request, params?.all || []);
  } catch (error) {
    return handleApiError(error);
  }
}
