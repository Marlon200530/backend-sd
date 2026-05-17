import type { Request, Response } from "express";

import { sendSuccess } from "../../utils/api-response.js";
import { requireAuthenticatedUser } from "../../utils/authenticated-user.js";
import { getUserFromAccessToken } from "../auth/auth.service.js";
import * as service from "./notifications.service.js";
import { registerNotificationClient } from "./notifications.sse.js";
import type {
  NotificationIdParamsInput,
  NotificationsListQueryInput,
} from "./notifications.schemas.js";

export async function list(req: Request, res: Response) {
  const user = requireAuthenticatedUser(req);
  const query = req.query as unknown as NotificationsListQueryInput;
  const result = await service.list(user.id, query);

  return res.status(200).json({ success: true, data: result.data, meta: result.meta });
}

export async function markRead(req: Request, res: Response) {
  const user = requireAuthenticatedUser(req);
  const params = req.params as NotificationIdParamsInput;
  return sendSuccess(res, 200, await service.markRead(user.id, params.id));
}

export async function markAllRead(req: Request, res: Response) {
  const user = requireAuthenticatedUser(req);
  return sendSuccess(res, 200, await service.markAllRead(user.id));
}

export async function stream(req: Request, res: Response) {
  const token = typeof req.query.token === "string" ? req.query.token : "";
  const user = await getUserFromAccessToken(token);
  const cleanup = registerNotificationClient(user.id, res);

  req.on("close", cleanup);
}
