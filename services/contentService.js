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

async function loadPublicSection(label, query, fallbackValue, allowFallback) {
  try {
    return await query();
  } catch (error) {
    if (!allowFallback) throw error;
    console.error(`[public-content] Failed to load ${label}`, {
      code: error?.code,
      message: error?.message
    });
    return fallbackValue;
  }
}

let publicContentCache = null;
let publicContentCacheTime = 0;
const PUBLIC_CONTENT_CACHE_TTL_MS = 60 * 1000;

let adminDashboardCache = null;
let adminDashboardCacheTime = 0;
const ADMIN_DASHBOARD_CACHE_TTL_MS = 20 * 1000; // 20-second cache

export function invalidatePublicContentCache() {
  publicContentCache = null;
  publicContentCacheTime = 0;
  try {
    const { invalidateSalonScheduleCache } = require("@/services/appointmentService");
    invalidateSalonScheduleCache?.();
  } catch {}
}

export function invalidateAdminDashboardCache() {
  adminDashboardCache = null;
  adminDashboardCacheTime = 0;
}

export async function getPublicWebsiteContent({ allowFallback = false, forceRefresh = false } = {}) {
  const now = Date.now();
  if (!forceRefresh && publicContentCache && now - publicContentCacheTime < PUBLIC_CONTENT_CACHE_TTL_MS) {
    return publicContentCache;
  }

  const [rows, businessHours, holidays] = await Promise.all([
    loadPublicSection(
      "website content",
      () => prisma.websiteContent.findMany(),
      [],
      allowFallback
    ),
    loadPublicSection(
      "business hours",
      () => prisma.businessHours.findMany({ orderBy: { weekday: "asc" } }),
      [],
      allowFallback
    ),
    loadPublicSection(
      "holidays",
      () => prisma.holiday.findMany({ orderBy: { date: "asc" } }),
      [],
      allowFallback
    )
  ]);

  const map = {};
  for (const row of rows) {
    map[row.key] = row.value || {};
  }

  const result = {
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

  publicContentCache = result;
  publicContentCacheTime = Date.now();
  return result;
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

    invalidatePublicContentCache();
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

  invalidatePublicContentCache();
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

    invalidatePublicContentCache();
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
    invalidatePublicContentCache();
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

  invalidatePublicContentCache();
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

  const res = await prisma.contactMessage.create({
    data: {
      name: parsed.name,
      email: parsed.email,
      mobile: parsed.mobile,
      subject: parsed.subject,
      message: parsed.message,
      read: false
    }
  });
  invalidateAdminDashboardCache();
  return res;
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
    invalidateAdminDashboardCache();
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

  invalidateAdminDashboardCache();
  return { deleted: true };
}

export async function getAdminDashboardAnalytics({ forceRefresh = false } = {}) {
  const nowMs = Date.now();
  if (!forceRefresh && adminDashboardCache && nowMs - adminDashboardCacheTime < ADMIN_DASHBOARD_CACHE_TTL_MS) {
    return adminDashboardCache;
  }

  const now = new Date();
  const sixMonthsAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));

  const [countsRows, apptMonthly, userMonthly, popularServices] = await Promise.all([
    prisma.$queryRaw`
      SELECT
        (SELECT COUNT(*) FROM "User" WHERE role = 'CUSTOMER'::"Role" AND "deletedAt" IS NULL)::int AS "totalCustomers",
        (SELECT COUNT(*) FROM "User" WHERE role = 'CUSTOMER'::"Role" AND "deletedAt" IS NULL AND active = true)::int AS "activeCustomers",
        (SELECT COUNT(*) FROM "User" WHERE role = 'CUSTOMER'::"Role" AND "deletedAt" IS NULL AND active = false)::int AS "inactiveCustomers",
        (SELECT COUNT(*) FROM "Service")::int AS "totalServices",
        (SELECT COUNT(*) FROM "Service" WHERE active = true)::int AS "activeServices",
        (SELECT COUNT(*) FROM "GalleryImage")::int AS "galleryImages",
        (SELECT COUNT(*) FROM "Video")::int AS "videos",
        (SELECT COUNT(*) FROM "Appointment")::int AS "totalAppointments",
        (SELECT COUNT(*) FROM "Appointment" WHERE status = 'PENDING'::"AppointmentStatus")::int AS "pendingAppointments",
        (SELECT COUNT(*) FROM "Appointment" WHERE status = 'CONFIRMED'::"AppointmentStatus")::int AS "confirmedAppointments",
        (SELECT COUNT(*) FROM "Appointment" WHERE status = 'COMPLETED'::"AppointmentStatus")::int AS "completedAppointments",
        (SELECT COUNT(*) FROM "Appointment" WHERE status = 'CANCELLED'::"AppointmentStatus")::int AS "cancelledAppointments",
        (SELECT COUNT(*) FROM "Appointment" WHERE status = 'REJECTED'::"AppointmentStatus")::int AS "rejectedAppointments",
        (SELECT COUNT(*) FROM "Review")::int AS "reviewsCount",
        (SELECT COUNT(*) FROM "ContactMessage" WHERE read = false)::int AS "unreadMessages";
    `,
    prisma.$queryRaw`
      SELECT TO_CHAR("start", 'YYYY-MM') AS ym, COUNT(*)::int AS count
      FROM "Appointment"
      WHERE "start" >= ${sixMonthsAgo}
      GROUP BY ym;
    `,
    prisma.$queryRaw`
      SELECT TO_CHAR("createdAt", 'YYYY-MM') AS ym, COUNT(*)::int AS count
      FROM "User"
      WHERE role = 'CUSTOMER'::"Role" AND "deletedAt" IS NULL AND "createdAt" >= ${sixMonthsAgo}
      GROUP BY ym;
    `,
    prisma.$queryRaw`
      SELECT "serviceName" AS name, COUNT(*)::int AS bookings
      FROM "Appointment"
      GROUP BY "serviceName"
      ORDER BY bookings DESC
      LIMIT 6;
    `
  ]);

  const c = countsRows?.[0] || {};
  const totalCustomers = Number(c.totalCustomers || 0);
  const activeCustomers = Number(c.activeCustomers || 0);
  const inactiveCustomers = Number(c.inactiveCustomers || 0);
  const totalServices = Number(c.totalServices || 0);
  const activeServices = Number(c.activeServices || 0);
  const galleryImages = Number(c.galleryImages || 0);
  const videos = Number(c.videos || 0);
  const totalAppointments = Number(c.totalAppointments || 0);
  const pendingAppointments = Number(c.pendingAppointments || 0);
  const confirmedAppointments = Number(c.confirmedAppointments || 0);
  const completedAppointments = Number(c.completedAppointments || 0);
  const cancelledAppointments = Number(c.cancelledAppointments || 0);
  const rejectedAppointments = Number(c.rejectedAppointments || 0);
  const reviewsCount = Number(c.reviewsCount || 0);
  const unreadMessages = Number(c.unreadMessages || 0);

  // Build 6-month buckets up to current month
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

  for (const row of (apptMonthly || [])) {
    if (monthMap.has(row.ym)) {
      monthMap.get(row.ym).appointments = Number(row.count) || 0;
    }
  }

  for (const row of (userMonthly || [])) {
    if (monthMap.has(row.ym)) {
      monthMap.get(row.ym).newCustomers = Number(row.count) || 0;
    }
  }

  const statusDistribution = [
    { status: "PENDING", count: pendingAppointments },
    { status: "CONFIRMED", count: confirmedAppointments },
    { status: "COMPLETED", count: completedAppointments },
    { status: "CANCELLED", count: cancelledAppointments },
    { status: "REJECTED", count: rejectedAppointments }
  ];

  const result = {
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
      popularServices: (popularServices || []).map((p) => ({
        name: p.name,
        bookings: Number(p.bookings) || 0
      })),
      statusDistribution
    }
  };

  adminDashboardCache = result;
  adminDashboardCacheTime = Date.now();
  return result;
}
