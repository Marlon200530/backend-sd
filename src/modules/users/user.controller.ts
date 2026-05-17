import type { Request, Response } from "express";

import { sendSuccess } from "../../utils/api-response.js";
import { requireAuthenticatedUser } from "../../utils/authenticated-user.js";
import { AppError } from "../../error/app-error.js";
import * as loansService from "../loans/loans.service.js";
import * as resourcesModule from "../resources/resources.service.js";
import * as userService from "./user.service.js";
import type { UserIdParamsInput, UsersListQueryInput } from "./user.schemas.js";

export async function me(req: Request, res: Response) {
  const user = requireAuthenticatedUser(req);
  return sendSuccess(res, 200, await userService.getOwnProfile(user.id));
}

export async function updateMe(req: Request, res: Response) {
  const user = requireAuthenticatedUser(req);
  return sendSuccess(res, 200, await userService.updateOwnProfile(user.id, req.body));
}

export async function changePassword(req: Request, res: Response) {
  const user = requireAuthenticatedUser(req);
  return sendSuccess(res, 200, await userService.changeOwnPassword(user.id, req.body));
}

export async function updatePhoto(req: Request, res: Response) {
  const user = requireAuthenticatedUser(req);
  const file = req.file;

  if (!file) {
    throw new AppError(400, "VALIDATION_ERROR", "Envie uma foto de perfil.");
  }

  return sendSuccess(res, 200, await userService.updateOwnPhoto(user.id, file));
}

export async function myResources(req: Request, res: Response) {
  const user = requireAuthenticatedUser(req);
  const query = req.query as unknown as {
    page: number;
    limit: number;
    status?: "available" | "requisitioned" | "unavailable" | "hidden" | "removed";
  };
  const result = await resourcesModule.resourcesService.list({
    page: query.page,
    limit: query.limit,
    ownerId: user.id,
    ...(query.status !== undefined ? { status: query.status } : {}),
  });

  return res.status(200).json({ success: true, data: result.data, meta: result.meta });
}

export async function myLoans(req: Request, res: Response) {
  const user = requireAuthenticatedUser(req);
  const query = req.query as unknown as {
    page: number;
    limit: number;
    status?: "active" | "overdue" | "returned" | "cancelled";
  };
  const result = await loansService.listLoans(
    {
      page: query.page,
      limit: query.limit,
      borrowerId: user.id,
      ...(query.status !== undefined ? { status: query.status } : {}),
    },
    user,
  );

  return res.status(200).json({ success: true, data: result.data, meta: result.meta });
}

export async function list(req: Request, res: Response) {
  const query = req.query as unknown as UsersListQueryInput;
  const result = await userService.listUsersForAdmin(query);
  return res.status(200).json({ success: true, data: result.data, meta: result.meta });
}

export async function updateStatus(req: Request, res: Response) {
  const admin = requireAuthenticatedUser(req);
  const params = req.params as UserIdParamsInput;
  return sendSuccess(res, 200, await userService.updateUserStatus(admin.id, params.id, req.body));
}

export async function updateRole(req: Request, res: Response) {
  const admin = requireAuthenticatedUser(req);
  const params = req.params as UserIdParamsInput;
  return sendSuccess(res, 200, await userService.updateUserRole(admin.id, params.id, req.body));
}
