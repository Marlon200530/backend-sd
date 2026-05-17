import type { Response } from "express";
import type { Notification } from "../../db/schema.js";

const clients = new Map<string, Set<Response>>();

function sendEvent(res: Response, event: string, data: unknown) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export function registerNotificationClient(userId: string, res: Response) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  let userClients = clients.get(userId);

  if (!userClients) {
    userClients = new Set();
    clients.set(userId, userClients);
  }

  userClients.add(res);
  res.write("retry: 3000\n\n");
  sendEvent(res, "connected", { ok: true });

  const heartbeat = setInterval(() => {
    sendEvent(res, "ping", { now: new Date().toISOString() });
  }, 25_000);

  return () => {
    clearInterval(heartbeat);
    userClients.delete(res);

    if (userClients.size === 0) {
      clients.delete(userId);
    }
  };
}

export function publishNotification(notification: Notification) {
  const userClients = clients.get(notification.userId);

  if (!userClients) {
    return;
  }

  for (const client of userClients) {
    sendEvent(client, "notification", notification);
  }
}
