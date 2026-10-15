import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/auth";

export async function createNotificationOnce(
  { userId, title, message, eventKey },
  db = prisma
) {
  if (!userId || !eventKey) return null;
  return db.notification.upsert({
    where: { eventKey },
    update: {},
    create: {
      userId,
      title,
      message,
      eventKey,
      read: false
    }
  });
}

export async function listUserNotifications(
  userId,
  { page = 1, limit = 20, unreadOnly = false } = {}
) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
  const skip = (safePage - 1) * safeLimit;

  const where = {
    userId,
    ...(unreadOnly ? { read: false } : {})
  };

  const [items, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: safeLimit
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, read: false } })
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

export async function markNotificationRead(userId, notificationId, read = true) {
  const existing = await prisma.notification.findUnique({
    where: { id: notificationId }
  });

  if (!existing || existing.userId !== userId) {
    throw new AppError("Notification not found.", 404, "NOT_FOUND");
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: { read: Boolean(read) }
  });
}

export async function markAllNotificationsRead(userId) {
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true }
  });
  return { success: true };
}
