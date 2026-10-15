import { prisma } from "@/lib/prisma";
import { AppError, checkRateLimit } from "@/lib/auth";
import {
  businessHoursItemSchema,
  contactMessageSchema,
  holidaySchema
} from "@/validators";
import { timeStringToMinutes } from "@/utils/timezone";

export const DEFAULT_WEBSITE_CONTENT = {
  home: {
    title: "Beautiful Nails. Beautiful You.",
    description:
      "Thoughtfully crafted nail art. A little luxury, just for you. Discover your signature style at Aurena Nails.",
    image: "/images/hero-nails.jpg",
    primaryLabel: "Book Appointment",
    secondaryLabel: "Explore Nail Art",
    studioImages: ["/images/studio-1.jpg", "/images/gel-nails.jpg", "/images/art-nails.jpg"]
  },
  about: {
    title: "More than nails. A moment for you.",
    story:
      "We believe beauty is in the little details. A shade that makes you smile. A design that feels entirely your own. A quiet moment to slow down and be cared for. Aurena brings thoughtful artistry and personal attention to every nail experience.",
    mission: "To make self-care feel personal, beautiful, and effortless.",
    vision:
      "A space where creativity and confidence meet, one set of nails at a time.",
    passion:
      "Every brushstroke, builder gel overlay, and hand-sculpted extension is crafted using non-toxic, cruelty-free formulas with hospital-grade sterilization.",
    artist:
      "Meet your artist at your consultation. We’ll listen to your ideas and create your next favourite look together.",
    image: "/images/hero-nails.jpg",
    studioImages: ["/images/studio-1.jpg", "/images/french-nails.jpg"]
  },
  contact: {
    businessName: "Aurena Nails Luxury Studio",
    phone: "+91 98765 43210",
    whatsapp: "919876543210",
    email: "concierge@aurenanails.com",
    address: "2nd Floor, Roseate Promenade, Linking Road, Bandra West, Mumbai 400050",
    openingHoursSummary: "Mon–Fri: 10:00 AM – 7:00 PM | Sat: 10:00 AM – 8:00 PM | Sun: Closed",
    mapUrl:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3771.0!2d72.83!3d19.06!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTnCsDAzJzM2LjAiTiA3MsKwNDknNDguMCJF!5e0!3m2!1sen!2sin!4v1700000000000",
    instagram: "https://instagram.com/aurenanails",
    facebook: "https://facebook.com/aurenanails",
    pinterest: "https://pinterest.com/aurenanails",
    youtube: "https://youtube.com/@aurenanails"
  },
  settings: {
    timezone: "Asia/Kolkata",
    bookingDays: 60,
    cancellationHours: 24
  }
};

export async function getPublicWebsiteContent() {
  const [rows, businessHours, holidays] = await Promise.all([
    prisma.websiteContent.findMany(),
    prisma.businessHours.findMany({ orderBy: { weekday: "asc" } }),
    prisma.holiday.findMany({ orderBy: { date: "asc" } })
  ]);

  const map = {};
  for (const row of rows) {
    map[row.key] = row.value || {};
  }

  return {
    home: {
      ...DEFAULT_WEBSITE_CONTENT.home,
      ...(map.home || {}),
      title: map.home?.title || DEFAULT_WEBSITE_CONTENT.home.title,
      description: map.home?.description || DEFAULT_WEBSITE_CONTENT.home.description,
      image: map.home?.image || DEFAULT_WEBSITE_CONTENT.home.image,
      primaryLabel: map.home?.primaryLabel || DEFAULT_WEBSITE_CONTENT.home.primaryLabel,
      secondaryLabel: map.home?.secondaryLabel || DEFAULT_WEBSITE_CONTENT.home.secondaryLabel
    },
    about: {
      ...DEFAULT_WEBSITE_CONTENT.about,
      ...(map.about || {}),
      title: map.about?.title || DEFAULT_WEBSITE_CONTENT.about.title,
      story: map.about?.story || DEFAULT_WEBSITE_CONTENT.about.story,
      mission: map.about?.mission || DEFAULT_WEBSITE_CONTENT.about.mission,
      vision: map.about?.vision || DEFAULT_WEBSITE_CONTENT.about.vision,
      artist: map.about?.artist || DEFAULT_WEBSITE_CONTENT.about.artist,
      image: map.about?.image || DEFAULT_WEBSITE_CONTENT.about.image
    },
    contact: {
      ...DEFAULT_WEBSITE_CONTENT.contact,
      ...(map.contact || {}),
      businessName:
        map.contact?.businessName || DEFAULT_WEBSITE_CONTENT.contact.businessName,
      phone: map.contact?.phone || DEFAULT_WEBSITE_CONTENT.contact.phone,
      whatsapp: map.contact?.whatsapp || DEFAULT_WEBSITE_CONTENT.contact.whatsapp,
      email: map.contact?.email || DEFAULT_WEBSITE_CONTENT.contact.email,
      address: map.contact?.address || DEFAULT_WEBSITE_CONTENT.contact.address,
      instagram: map.contact?.instagram || DEFAULT_WEBSITE_CONTENT.contact.instagram,
      facebook: map.contact?.facebook || DEFAULT_WEBSITE_CONTENT.contact.facebook,
      pinterest: map.contact?.pinterest || DEFAULT_WEBSITE_CONTENT.contact.pinterest,
      youtube: map.contact?.youtube || DEFAULT_WEBSITE_CONTENT.contact.youtube,
      mapUrl: map.contact?.mapUrl || DEFAULT_WEBSITE_CONTENT.contact.mapUrl
    },
    settings: {
      ...DEFAULT_WEBSITE_CONTENT.settings,
      ...(map.settings || {})
    },
    businessHours,
    holidays
  };
}

export async function updateWebsiteContentSection(adminId, key, value) {
  const allowedKeys = ["home", "about", "contact", "settings"];
  if (!allowedKeys.includes(key)) {
    throw new AppError("Invalid website content section key.", 400, "INVALID_KEY");
  }

  if (!value || typeof value !== "object") {
    throw new AppError("Content value must be a valid JSON object.", 400);
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.websiteContent.findUnique({ where: { key } });
    const mergedValue = {
      ...(DEFAULT_WEBSITE_CONTENT[key] || {}),
      ...(existing?.value && typeof existing.value === "object" ? existing.value : {}),
      ...value
    };

    const row = await tx.websiteContent.upsert({
      where: { key },
      update: { value: mergedValue },
      create: { key, value: mergedValue }
    });

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: `CONTENT_UPDATE_${key.toUpperCase()}`,
        targetId: key
      }
    });

    return row;
  });
}

export async function updateBusinessHours(adminId, hoursArray) {
  if (!Array.isArray(hoursArray) || hoursArray.length === 0) {
    throw new AppError("Business hours array is required.", 400);
  }

  const parsedItems = hoursArray.map((item) => {
    const valid = businessHoursItemSchema.parse(item);
    if (!valid.closed && timeStringToMinutes(valid.close) <= timeStringToMinutes(valid.open)) {
      throw new AppError(
        `Closing time must be later than opening time for weekday ${valid.weekday}.`,
        400,
        "INVALID_BUSINESS_HOURS"
      );
    }
    return valid;
  });

  await prisma.$transaction(async (tx) => {
    for (const item of parsedItems) {
      await tx.businessHours.upsert({
        where: { weekday: item.weekday },
        update: {
          open: item.open,
          close: item.close,
          closed: item.closed
        },
        create: {
          weekday: item.weekday,
          open: item.open,
          close: item.close,
          closed: item.closed
        }
      });
    }

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "BUSINESS_HOURS_UPDATE",
        targetId: "business_hours"
      }
    });
  });

  return prisma.businessHours.findMany({ orderBy: { weekday: "asc" } });
}

export async function createHoliday(adminId, rawInput) {
  const parsed = holidaySchema.parse(rawInput);

  return prisma.$transaction(async (tx) => {
    const holiday = await tx.holiday.upsert({
      where: { date: parsed.date },
      update: {
        name: parsed.name,
        description: parsed.description || "",
        active: parsed.active
      },
      create: {
        name: parsed.name,
        date: parsed.date,
        description: parsed.description || "",
        active: parsed.active
      }
    });

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "HOLIDAY_UPSERT",
        targetId: holiday.id
      }
    });

    return holiday;
  });
}

export async function updateHoliday(adminId, id, rawInput) {
  const existing = await prisma.holiday.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError("Holiday not found.", 404, "NOT_FOUND");
  }

  const parsed = holidaySchema.parse({
    name: rawInput.name ?? existing.name,
    date: rawInput.date ?? existing.date,
    description: rawInput.description ?? existing.description,
    active: rawInput.active !== undefined ? Boolean(rawInput.active) : existing.active
  });

  return prisma.$transaction(async (tx) => {
    const updated = await tx.holiday.update({
      where: { id },
      data: parsed
    });
    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "HOLIDAY_UPDATE",
        targetId: id
      }
    });
    return updated;
  });
}

export async function deleteHoliday(adminId, id) {
  const existing = await prisma.holiday.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError("Holiday not found.", 404, "NOT_FOUND");
  }

  await prisma.$transaction(async (tx) => {
    await tx.holiday.delete({ where: { id } });
    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "HOLIDAY_DELETE",
        targetId: id
      }
    });
  });

  return { deleted: true };
}

export async function createContactMessage(rawInput, ipKey = "anon") {
  const rate = await checkRateLimit(`contact:${ipKey}`, {
    limit: 10,
    windowSeconds: 60
  });
  if (!rate.allowed) {
    throw new AppError(
      "Too many messages sent recently. Please wait a minute before trying again.",
      429,
      "RATE_LIMITED"
    );
  }

  const parsed = contactMessageSchema.parse(rawInput);

  return prisma.contactMessage.create({
    data: {
      name: parsed.name,
      email: parsed.email,
      mobile: parsed.mobile,
      subject: parsed.subject,
      message: parsed.message,
      read: false
    }
  });
}

export async function listAdminMessages({
  search = "",
  read = "all",
  page = 1,
  limit = 20
} = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
  const skip = (safePage - 1) * safeLimit;
  const q = String(search || "").trim();

  const where = {
    ...(read === "read" ? { read: true } : {}),
    ...(read === "unread" ? { read: false } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { mobile: { contains: q, mode: "insensitive" } },
            { subject: { contains: q, mode: "insensitive" } },
            { message: { contains: q, mode: "insensitive" } }
          ]
        }
      : {})
  };

  const [items, total, unreadCount] = await Promise.all([
    prisma.contactMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: safeLimit
    }),
    prisma.contactMessage.count({ where }),
    prisma.contactMessage.count({ where: { read: false } })
  ]);

  return {
    items,
    total,
    unreadCount,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.max(1, Math.ceil(total / safeLimit))
  };
}

export async function markAdminMessageRead(adminId, id, read = true) {
  const existing = await prisma.contactMessage.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError("Message not found.", 404, "NOT_FOUND");
  }

  return prisma.$transaction(async (tx) => {
    const msg = await tx.contactMessage.update({
      where: { id },
      data: { read: Boolean(read) }
    });
    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: read ? "MESSAGE_READ" : "MESSAGE_UNREAD",
        targetId: id
      }
    });
    return msg;
  });
}

export async function deleteAdminMessage(adminId, id) {
  const existing = await prisma.contactMessage.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError("Message not found.", 404, "NOT_FOUND");
  }

  await prisma.$transaction(async (tx) => {
    await tx.contactMessage.delete({ where: { id } });
    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "MESSAGE_DELETE",
        targetId: id
      }
    });
  });

  return { deleted: true };
}

export async function getAdminDashboardAnalytics() {
  const [
    totalCustomers,
    activeCustomers,
    inactiveCustomers,
    totalServices,
    activeServices,
    galleryImages,
    videos,
    totalAppointments,
    pendingAppointments,
    confirmedAppointments,
    completedAppointments,
    cancelledAppointments,
    rejectedAppointments,
    reviewsCount,
    unreadMessages,
    recentAppointments,
    customersLast6Months,
    popularServiceGroups
  ] = await Promise.all([
    prisma.user.count({ where: { role: "CUSTOMER", deletedAt: null } }),
    prisma.user.count({ where: { role: "CUSTOMER", active: true, deletedAt: null } }),
    prisma.user.count({ where: { role: "CUSTOMER", active: false, deletedAt: null } }),
    prisma.service.count(),
    prisma.service.count({ where: { active: true } }),
    prisma.galleryImage.count(),
    prisma.video.count(),
    prisma.appointment.count(),
    prisma.appointment.count({ where: { status: "PENDING" } }),
    prisma.appointment.count({ where: { status: "CONFIRMED" } }),
    prisma.appointment.count({ where: { status: "COMPLETED" } }),
    prisma.appointment.count({ where: { status: "CANCELLED" } }),
    prisma.appointment.count({ where: { status: "REJECTED" } }),
    prisma.review.count(),
    prisma.contactMessage.count({ where: { read: false } }),
    prisma.appointment.findMany({
      select: { start: true, status: true, serviceName: true },
      orderBy: { start: "desc" },
      take: 500
    }),
    prisma.user.findMany({
      where: { role: "CUSTOMER", deletedAt: null },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 500
    }),
    prisma.appointment.groupBy({
      by: ["serviceName"],
      _count: { serviceName: true },
      orderBy: { _count: { serviceName: "desc" } },
      take: 6
    })
  ]);

  // Build 6-month buckets up to current month
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("en-IN", {
      month: "short",
      year: "2-digit",
      timeZone: "UTC"
    });
    months.push({ key, label, appointments: 0, newCustomers: 0 });
  }

  const monthMap = new Map(months.map((m) => [m.key, m]));

  for (const appt of recentAppointments) {
    const d = new Date(appt.start);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    if (monthMap.has(key)) {
      monthMap.get(key).appointments += 1;
    }
  }

  for (const cust of customersLast6Months) {
    const d = new Date(cust.createdAt);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    if (monthMap.has(key)) {
      monthMap.get(key).newCustomers += 1;
    }
  }

  const popularServices = popularServiceGroups.map((g) => ({
    name: g.serviceName,
    bookings: g._count.serviceName
  }));

  const statusDistribution = [
    { status: "PENDING", count: pendingAppointments },
    { status: "CONFIRMED", count: confirmedAppointments },
    { status: "COMPLETED", count: completedAppointments },
    { status: "CANCELLED", count: cancelledAppointments },
    { status: "REJECTED", count: rejectedAppointments }
  ];

  return {
    stats: {
      totalCustomers,
      activeCustomers,
      inactiveCustomers,
      totalServices,
      activeServices,
      galleryImages,
      videos,
      totalAppointments,
      pendingAppointments,
      confirmedAppointments,
      completedAppointments,
      cancelledAppointments,
      rejectedAppointments,
      reviews: reviewsCount,
      unreadMessages
    },
    charts: {
      monthlySeries: months,
      popularServices,
      statusDistribution
    }
  };
}
