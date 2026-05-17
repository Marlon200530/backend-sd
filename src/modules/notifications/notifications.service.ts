import { AppError } from "../../error/app-error.js";
import * as repository from "./notifications.repository.js";
import { publishNotification } from "./notifications.sse.js";
import type { NotificationsListQueryInput } from "./notifications.schemas.js";

export async function list(userId: string, query: NotificationsListQueryInput) {
  const result = await repository.listNotifications(userId, query);

  return {
    data: result.rows,
    meta: {
      page: query.page,
      limit: query.limit,
      total: result.total,
      unreadCount: result.unreadCount,
      totalPages: Math.ceil(result.total / query.limit),
    },
  };
}

export async function markRead(userId: string, id: string) {
  const notification = await repository.markNotificationRead(userId, id);

  if (!notification) {
    throw new AppError(404, "NOTIFICATION_NOT_FOUND", "Notificação não encontrada.");
  }

  return notification;
}

export async function markAllRead(userId: string) {
  return { updatedCount: await repository.markAllNotificationsRead(userId) };
}

export async function create(input: Parameters<typeof repository.createNotification>[0]) {
  const notification = await repository.createNotification(input);
  publishNotification(notification);
  return notification;
}
