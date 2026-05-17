import { z } from "zod";

export const notificationIdParamsSchema = z
  .object({
    id: z.string().uuid("Id da notificação inválido."),
  })
  .strict();

export const notificationsListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    isRead: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),
  })
  .strict();

export type NotificationIdParamsInput = z.infer<typeof notificationIdParamsSchema>;
export type NotificationsListQueryInput = z.infer<typeof notificationsListQuerySchema>;
