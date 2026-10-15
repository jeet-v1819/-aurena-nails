import { requireUser } from "@/lib/auth";
import {
  createAppointmentBooking,
  listCustomerAppointments
} from "@/services/appointmentService";
import { handleApiError, jsonSuccess } from "@/utils/apiResponse";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { user } = await requireUser();
    const { searchParams } = new URL(request.url);
    const result = await listCustomerAppointments(user.id, {
      status: searchParams.get("status") || "all",
      page: Number(searchParams.get("page") || 1),
      limit: Number(searchParams.get("limit") || 20)
    });
    return jsonSuccess(result);
  } catch (error) {
    return handleApiError(error, "Unable to load your appointments.");
  }
}

export async function POST(request) {
  try {
    const { user } = await requireUser();
    const body = await request.json();
    const appointment = await createAppointmentBooking(user, body);
    return jsonSuccess(
      {
        appointment,
        message: "Your appointment request has been submitted."
      },
      201
    );
  } catch (error) {
    return handleApiError(error, "Unable to book appointment.");
  }
}
