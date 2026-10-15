import { getSessionAndUser, requireUser } from "@/lib/auth";
import {
  listPublicReviews,
  getEligibleCompletedAppointments,
  createCustomerReview
} from "@/services/reviewService";
import { jsonSuccess, handleApiError } from "@/utils/apiResponse";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get("serviceId") || "";
    const limit = Number(searchParams.get("limit") || 12);

    const [{ user }, items] = await Promise.all([
      getSessionAndUser({ disableCookieCache: false }),
      listPublicReviews({ serviceId, limit })
    ]);

    const eligibleAppointments = user
      ? await getEligibleCompletedAppointments(user.id, serviceId)
      : [];

    return jsonSuccess({
      items,
      reviews: items,
      eligibleAppointments
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request) {
  try {
    const { user } = await requireUser();
    const body = await request.json();
    const review = await createCustomerReview(user, body);
    return jsonSuccess(
      {
        review,
        message: "Your review has been published!"
      },
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
