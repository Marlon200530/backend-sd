import type { Response } from "express";

export function sendSuccess<T>(res: Response, statusCode: number, data: T) {
  return res.status(statusCode).json({
    success: true,
    data,
  });
}

export function sendNoContent(res: Response) {
  return res.status(204).send();
}
