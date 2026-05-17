import { and, count, desc, eq, type SQL } from "drizzle-orm";

import { db } from "../../db/connection.js";
import { notifications } from "../../db/schema.js";
import { AppError } from "../../error/app-error.js";
import type { NotificationsListQueryInput } from "./notifications.schemas.js";

type CreateNotificationInput = {
  userId: string;
  type:
    | "loan_created"
    | "loan_approved"
    | "loan_rejected"
    | "return_requested"
    | "resource_returned"
    | "due_soon"
    | "overdue"
    | "loan_cancelled"
    | "resource_hidden"
    | "system";
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
};

export async function createNotification(input: CreateNotificationInput) {
  const [notification] = await db
    .insert(notifications)
    .values({
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      entityType: input.entityType,
      entityId: input.entityId,
    })
    .returning();

  if (!notification) {
    throw new AppError(500, "NOTIFICATION_CREATE_FAILED", "Não foi possível criar a notificação.");
  }

  return notification;
}

export async function listNotifications(userId: string, query: NotificationsListQueryInput) {
  const conditions: SQL[] = [eq(notifications.userId, userId)];

  if (query.isRead !== undefined) {
    conditions.push(eq(notifications.isRead, query.isRead));
  }

  const where = and(...conditions);
  const offset = (query.page - 1) * query.limit;

  const [rows, [totalRow], [unreadRow]] = await Promise.all([
    db
      .select()
      .from(notifications)
      .where(where)
      .orderBy(desc(notifications.createdAt))
      .limit(query.limit)
      .offset(offset),
    db.select({ total: count() }).from(notifications).where(where),
    db
      .select({ total: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false))),
  ]);

  return {
    rows,
    total: totalRow?.total ?? 0,
    unreadCount: unreadRow?.total ?? 0,
  };
}

export async function markNotificationRead(userId: string, id: string) {
  const [notification] = await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
    .returning();

  return notification ?? null;
}

export async function markAllNotificationsRead(userId: string) {
  const updated = await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
    .returning({ id: notifications.id });

  return updated.length;
}
