import { requireUser } from "@/lib/auth";
import {
  cancelCustomerAppointment,
  getCustomerAppointmentById
} from "@/services/appointmentService";
import { handleApiError, jsonSuccess } from "@/utils/apiResponse";

export const dynamic = "force-dynamic";

export async function GET(_request, context) {
  try {
    const { user } = await requireUser();
    const params = await context.params;
    const appointment = await getCustomerAppointmentById(user.id, params.id);
    return jsonSuccess({ appointment });
  } catch (error) {
    return handleApiError(error, "Unable to fetch appointment.");
  }
}

export async function PATCH(_request, context) {
  try {
    const { user } = await requireUser();
    const params = await context.params;
    const appointment = await cancelCustomerAppointment(user.id, params.id);
    return jsonSuccess({
      appointment,
      message: "Appointment cancelled successfully."
    });
  } catch (error) {
    return handleApiError(error, "Unable to cancel appointment.");
  }
}
