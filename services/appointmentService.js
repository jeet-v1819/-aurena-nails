import crypto from "crypto";
import { prisma, serializeService } from "@/lib/prisma";
import { AppError } from "@/lib/auth";
import { bookingSchema } from "@/validators";
import {
  getWeekdayForDateStr,
  getZonedParts,
  minutesToTimeString,
  timeStringToMinutes,
  zonedDateTimeToUtc
} from "@/utils/timezone";
import { createNotificationOnce } from "@/services/notificationService";

const DEFAULT_SETTINGS = {
  timezone: "Asia/Kolkata",
  bookingDays: 60,
  cancellationHours: 2
};

export async function getSalonScheduleConfig() {
  const [settingsRow, businessHours, holidays] = await Promise.all([
    prisma.websiteContent.findUnique({ where: { key: "settings" } }),
    prisma.businessHours.findMany({ orderBy: { weekday: "asc" } }),
    prisma.holiday.findMany({
      where: { active: true },
      orderBy: { date: "asc" }
    })
  ]);

  const rawSettings =
    settingsRow?.value && typeof settingsRow.value === "object"
      ? settingsRow.value
      : {};

  return {
    settings: {
      timezone: rawSettings.timezone || DEFAULT_SETTINGS.timezone,
      bookingDays: Number(rawSettings.bookingDays || DEFAULT_SETTINGS.bookingDays),
      cancellationHours: Number(
        rawSettings.cancellationHours ?? DEFAULT_SETTINGS.cancellationHours
      )
    },
    businessHours,
    holidays
  };
}

export async function getAvailableSlotsForDate({ serviceId, date }) {
  if (!serviceId || !/^\d{4}-\d{2}-\d{2}$/.test(String(date || ""))) {
    throw new AppError("Valid serviceId and date (YYYY-MM-DD) are required.", 400);
  }

  const [service, schedule] = await Promise.all([
    prisma.service.findUnique({ where: { id: serviceId } }),
    getSalonScheduleConfig()
  ]);

  if (!service || !service.active || !service.available) {
    throw new AppError("Selected service is currently unavailable for booking.", 400);
  }

  const { timezone, bookingDays } = schedule.settings;
  const nowParts = getZonedParts(new Date(), timezone);

  if (date < nowParts.dateStr) {
    return {
      date,
      timezone,
      available: false,
      reason: "Appointments cannot be booked in the past.",
      slots: []
    };
  }

  const maxDateObj = new Date(Date.now() + bookingDays * 24 * 60 * 60 * 1000);
  const maxDateParts = getZonedParts(maxDateObj, timezone);
  if (date > maxDateParts.dateStr) {
    return {
      date,
      timezone,
      available: false,
      reason: `Bookings are currently open up to ${bookingDays} days in advance.`,
      slots: []
    };
  }

  const holiday = schedule.holidays.find((h) => h.date === date && h.active);
  if (holiday) {
    return {
      date,
      timezone,
      available: false,
      reason: `Studio closed for ${holiday.name}.`,
      holiday: holiday.name,
      slots: []
    };
  }

  const weekday = getWeekdayForDateStr(date);
  const dayHours = schedule.businessHours.find((bh) => bh.weekday === weekday);

  if (!dayHours || dayHours.closed) {
    return {
      date,
      timezone,
      available: false,
      reason: "Aurena Nails is closed on this day.",
      slots: []
    };
  }

  const openMins = timeStringToMinutes(dayHours.open);
  const closeMins = timeStringToMinutes(dayHours.close);
  const duration = Number(service.duration || 60);

  if (openMins + duration > closeMins) {
    return {
      date,
      timezone,
      available: false,
      reason: "No slots fit the selected service duration on this day.",
      slots: []
    };
  }

  const dayStartUtc = zonedDateTimeToUtc(date, "00:00", timezone);
  const dayEndUtc = zonedDateTimeToUtc(date, "23:59", timezone);

  const existingAppointments = await prisma.appointment.findMany({
    where: {
      status: { in: ["PENDING", "CONFIRMED"] },
      start: { lt: dayEndUtc },
      end: { gt: dayStartUtc }
    },
    select: {
      id: true,
      start: true,
      end: true,
      status: true
    }
  });

  const nowUtc = new Date();
  const slots = [];
  const stepMinutes = 30;

  for (let startMin = openMins; startMin + duration <= closeMins; startMin += stepMinutes) {
    const timeStr = minutesToTimeString(startMin);
    const endTimeStr = minutesToTimeString(startMin + duration);
    const slotStartUtc = zonedDateTimeToUtc(date, timeStr, timezone);
    const slotEndUtc = new Date(slotStartUtc.getTime() + duration * 60 * 1000);

    const isPast = slotStartUtc <= nowUtc;
    const isOverlapping = existingAppointments.some(
      (appt) => slotStartUtc < new Date(appt.end) && slotEndUtc > new Date(appt.start)
    );

    slots.push({
      time: timeStr,
      endTime: endTimeStr,
      startIso: slotStartUtc.toISOString(),
      endIso: slotEndUtc.toISOString(),
      available: !isPast && !isOverlapping,
      reason: isPast ? "past" : isOverlapping ? "booked" : null
    });
  }

  return {
    date,
    timezone,
    available: slots.some((s) => s.available),
    businessHours: {
      open: dayHours.open,
      close: dayHours.close
    },
    slots
  };
}

export async function createAppointmentBooking(user, rawInput) {
  const parsed = bookingSchema.parse(rawInput);
  const requestKey =
    parsed.requestKey && parsed.requestKey.length >= 6
      ? `${user.id}:${parsed.requestKey}`
      : `${user.id}:${parsed.serviceId}:${parsed.date}:${parsed.time}:${crypto
          .randomBytes(6)
          .toString("hex")}`;

  // Check idempotency if client supplied a deterministic requestKey
  if (parsed.requestKey) {
    const existingByKey = await prisma.appointment.findUnique({
      where: { requestKey },
      include: { service: true }
    });
    if (existingByKey) {
      return {
        ...existingByKey,
        service: existingByKey.service ? serializeService(existingByKey.service) : null
      };
    }
  }

  const [service, schedule] = await Promise.all([
    prisma.service.findUnique({ where: { id: parsed.serviceId } }),
    getSalonScheduleConfig()
  ]);

  if (!service || !service.active || !service.available) {
    throw new AppError(
      "This service is currently unavailable for booking.",
      400,
      "SERVICE_UNAVAILABLE"
    );
  }

  const { timezone, bookingDays } = schedule.settings;
  const nowParts = getZonedParts(new Date(), timezone);

  if (parsed.date < nowParts.dateStr) {
    throw new AppError(
      "Cannot book an appointment on a past date.",
      400,
      "PAST_DATE"
    );
  }

  const maxDateObj = new Date(Date.now() + bookingDays * 24 * 60 * 60 * 1000);
  const maxDateParts = getZonedParts(maxDateObj, timezone);
  if (parsed.date > maxDateParts.dateStr) {
    throw new AppError(
      `Appointments can only be booked up to ${bookingDays} days in advance.`,
      400,
      "DATE_OUT_OF_RANGE"
    );
  }

  const holiday = schedule.holidays.find((h) => h.date === parsed.date && h.active);
  if (holiday) {
    throw new AppError(
      `Aurena Nails is closed on ${parsed.date} for ${holiday.name}.`,
      400,
      "HOLIDAY_CLOSED"
    );
  }

  const weekday = getWeekdayForDateStr(parsed.date);
  const dayHours = schedule.businessHours.find((bh) => bh.weekday === weekday);
  if (!dayHours || dayHours.closed) {
    throw new AppError(
      "Aurena Nails is closed on the selected weekday.",
      400,
      "CLOSED_WEEKDAY"
    );
  }

  const openMins = timeStringToMinutes(dayHours.open);
  const closeMins = timeStringToMinutes(dayHours.close);
  const slotStartMins = timeStringToMinutes(parsed.time);
  const duration = Number(service.duration || 60);
  const slotEndMins = slotStartMins + duration;

  if (slotStartMins < openMins || slotEndMins > closeMins) {
    throw new AppError(
      `Selected time falls outside salon business hours (${dayHours.open} – ${dayHours.close}).`,
      400,
      "OUTSIDE_BUSINESS_HOURS"
    );
  }

  const startUtc = zonedDateTimeToUtc(parsed.date, parsed.time, timezone);
  const endUtc = new Date(startUtc.getTime() + duration * 60 * 1000);

  if (startUtc <= new Date()) {
    throw new AppError(
      "Cannot book a time slot that has already passed.",
      400,
      "PAST_TIME_SLOT"
    );
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      // Acquire transaction-level advisory lock for the date to serialize concurrent bookings
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`booking:${parsed.date}`}))`;

      const overlapping = await tx.appointment.findFirst({
        where: {
          status: { in: ["PENDING", "CONFIRMED"] },
          start: { lt: endUtc },
          end: { gt: startUtc }
        }
      });

      if (overlapping) {
        throw new AppError(
          "This time slot is no longer available. Please choose another time.",
          409,
          "SLOT_UNAVAILABLE"
        );
      }

      const appointment = await tx.appointment.create({
        data: {
          userId: user.id,
          serviceId: service.id,
          serviceName: service.name,
          start: startUtc,
          end: endUtc,
          status: "PENDING",
          note: parsed.note || "",
          requestKey
        },
        include: {
          service: true
        }
      });

      await createNotificationOnce(
        {
          userId: user.id,
          title: "Appointment requested",
          message: `Your ${service.name} appointment is awaiting confirmation.`,
          eventKey: `appointment:${appointment.id}:PENDING`
        },
        tx
      );

      return appointment;
    });

    return {
      ...created,
      service: created.service ? serializeService(created.service) : null
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    const msg = String(err?.message || "");
    if (msg.includes("appointment_no_overlap") || msg.includes("23P01")) {
      throw new AppError(
        "This time slot was just booked by another customer. Please choose another available time.",
        409,
        "SLOT_UNAVAILABLE"
      );
    }
    if (err?.code === "P2002" && String(err?.meta?.target || "").includes("requestKey")) {
      const existing = await prisma.appointment.findUnique({
        where: { requestKey },
        include: { service: true }
      });
      if (existing) {
        return {
          ...existing,
          service: existing.service ? serializeService(existing.service) : null
        };
      }
    }
    throw err;
  }
}

export async function listCustomerAppointments(
  userId,
  { status = "all", page = 1, limit = 20 } = {}
) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
  const skip = (safePage - 1) * safeLimit;

  const where = {
    userId,
    ...(status && status !== "all" ? { status } : {})
  };

  const [rows, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      orderBy: { start: "desc" },
      skip,
      take: safeLimit,
      include: {
        service: true,
        review: true
      }
    }),
    prisma.appointment.count({ where })
  ]);

  return {
    items: rows.map((row) => ({
      ...row,
      service: row.service ? serializeService(row.service) : null
    })),
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.max(1, Math.ceil(total / safeLimit))
  };
}

export async function getCustomerAppointmentById(userId, appointmentId) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      service: true,
      review: true
    }
  });

  if (!appointment) {
    throw new AppError("Appointment not found.", 404, "NOT_FOUND");
  }

  if (appointment.userId !== userId) {
    throw new AppError(
      "Forbidden: You cannot access another customer's appointment.",
      403,
      "FORBIDDEN"
    );
  }

  return {
    ...appointment,
    service: appointment.service ? serializeService(appointment.service) : null
  };
}

export async function cancelCustomerAppointment(userId, appointmentId) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { service: true }
  });

  if (!appointment) {
    throw new AppError("Appointment not found.", 404, "NOT_FOUND");
  }

  // Strict ownership check against IDOR
  if (appointment.userId !== userId) {
    throw new AppError(
      "Forbidden: You can only cancel your own appointments.",
      403,
      "FORBIDDEN"
    );
  }

  if (!["PENDING", "CONFIRMED"].includes(appointment.status)) {
    throw new AppError(
      `This appointment cannot be cancelled because its status is ${appointment.status}.`,
      400,
      "INVALID_STATUS_TRANSITION"
    );
  }

  if (new Date(appointment.start) <= new Date()) {
    throw new AppError(
      "Past or ongoing appointments cannot be cancelled.",
      400,
      "PAST_APPOINTMENT"
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const appt = await tx.appointment.update({
      where: { id: appointmentId },
      data: { status: "CANCELLED" },
      include: { service: true }
    });

    await createNotificationOnce(
      {
        userId,
        title: "Appointment cancelled",
        message: `Your ${appointment.serviceName} appointment has been cancelled.`,
        eventKey: `appointment:${appointmentId}:CANCELLED`
      },
      tx
    );

    return appt;
  });

  return {
    ...updated,
    service: updated.service ? serializeService(updated.service) : null
  };
}

export async function listAdminAppointments({
  search = "",
  status = "all",
  serviceId = "",
  date = "",
  page = 1,
  limit = 20
} = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
  const skip = (safePage - 1) * safeLimit;
  const q = String(search || "").trim();

  let dateFilter = {};
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const startUtc = zonedDateTimeToUtc(date, "00:00", "Asia/Kolkata");
    const endUtc = zonedDateTimeToUtc(date, "23:59", "Asia/Kolkata");
    dateFilter = {
      start: { gte: startUtc, lte: endUtc }
    };
  }

  const where = {
    ...(status && status !== "all" ? { status } : {}),
    ...(serviceId ? { serviceId } : {}),
    ...dateFilter,
    ...(q
      ? {
          OR: [
            { serviceName: { contains: q, mode: "insensitive" } },
            { note: { contains: q, mode: "insensitive" } },
            { user: { firstName: { contains: q, mode: "insensitive" } } },
            { user: { lastName: { contains: q, mode: "insensitive" } } },
            { user: { email: { contains: q, mode: "insensitive" } } },
            { user: { mobile: { contains: q, mode: "insensitive" } } }
          ]
        }
      : {})
  };

  const [rows, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      orderBy: { start: "desc" },
      skip,
      take: safeLimit,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            mobile: true,
            active: true
          }
        },
        service: true,
        review: true
      }
    }),
    prisma.appointment.count({ where })
  ]);

  return {
    items: rows.map((row) => ({
      ...row,
      service: row.service ? serializeService(row.service) : null
    })),
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.max(1, Math.ceil(total / safeLimit))
  };
}

const VALID_ADMIN_TRANSITIONS = {
  PENDING: ["CONFIRMED", "REJECTED", "CANCELLED", "COMPLETED"],
  CONFIRMED: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  REJECTED: []
};

const NOTIFICATION_COPY = {
  CONFIRMED: (serviceName) => ({
    title: "Appointment confirmed",
    message: `Your ${serviceName} appointment has been confirmed.`
  }),
  REJECTED: (serviceName) => ({
    title: "Appointment rejected",
    message: `Unfortunately, your ${serviceName} appointment request could not be accommodated.`
  }),
  CANCELLED: (serviceName) => ({
    title: "Appointment cancelled",
    message: `Your ${serviceName} appointment has been cancelled.`
  }),
  COMPLETED: (serviceName) => ({
    title: "Appointment completed",
    message: `Thank you for visiting Aurena Nails for your ${serviceName} service! You may now leave a review.`
  })
};

export async function updateAdminAppointmentStatus(adminId, appointmentId, nextStatus) {
  const allowedStatuses = ["CONFIRMED", "REJECTED", "CANCELLED", "COMPLETED"];
  if (!allowedStatuses.includes(nextStatus)) {
    throw new AppError("Invalid appointment status.", 400, "INVALID_STATUS");
  }

  const existing = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      user: true,
      service: true
    }
  });

  if (!existing) {
    throw new AppError("Appointment not found.", 404, "NOT_FOUND");
  }

  if (existing.status === nextStatus) {
    return {
      ...existing,
      service: existing.service ? serializeService(existing.service) : null
    };
  }

  const permitted = VALID_ADMIN_TRANSITIONS[existing.status] || [];
  if (!permitted.includes(nextStatus)) {
    throw new AppError(
      `Cannot transition appointment from ${existing.status} to ${nextStatus}.`,
      400,
      "INVALID_STATUS_TRANSITION"
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const appt = await tx.appointment.update({
      where: { id: appointmentId },
      data: { status: nextStatus },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            mobile: true
          }
        },
        service: true
      }
    });

    const copyBuilder = NOTIFICATION_COPY[nextStatus];
    if (copyBuilder) {
      const copy = copyBuilder(existing.serviceName);
      await createNotificationOnce(
        {
          userId: existing.userId,
          title: copy.title,
          message: copy.message,
          eventKey: `appointment:${appointmentId}:${nextStatus}`
        },
        tx
      );
    }

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: `APPOINTMENT_${nextStatus}`,
        targetId: appointmentId
      }
    });

    return appt;
  });

  return {
    ...updated,
    service: updated.service ? serializeService(updated.service) : null
  };
}
