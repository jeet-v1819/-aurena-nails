import { requireAdmin } from "@/lib/auth";
import { updateAdminAppointmentStatus } from "@/services/appointmentService";
import { handleApiError, jsonSuccess } from "@/utils/apiResponse";

export const dynamic = "force-dynamic";

export async function PATCH(request, context) {
  try {
    const { user: admin } = await requireAdmin();
    const params = await context.params;
    const body = await request.json();
    const appointment = await updateAdminAppointmentStatus(
      admin.id,
      params.id,
      body.status
    );
    return jsonSuccess({
      appointment,
      message: `Appointment marked as ${body.status}.`
    });
  } catch (error) {
    return handleApiError(error, "Unable to update appointment status.");
  }
}
