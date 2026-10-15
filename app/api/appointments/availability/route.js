import { getAvailableSlotsForDate, getSalonScheduleConfig } from "@/services/appointmentService";
import { handleApiError, jsonSuccess } from "@/utils/apiResponse";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get("serviceId") || "";
    const date = searchParams.get("date") || "";

    if (!serviceId && !date) {
      const schedule = await getSalonScheduleConfig();
      return jsonSuccess(schedule);
    }

    const availability = await getAvailableSlotsForDate({ serviceId, date });
    return jsonSuccess(availability);
  } catch (error) {
    return handleApiError(error, "Unable to check slot availability.");
  }
}
