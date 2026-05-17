import type { Request, RequestHandler } from "express";

import { getUserFromAccessToken } from "../modules/auth/auth.service.js";
import { asyncHandler } from "../utils/async-handler.js";
import { extractBearerTokenValue } from "./jwt-input.js";

export function extractBearerToken(req: Request) {
  return extractBearerTokenValue(req.headers.authorization);
}

export const authenticateAccessToken: RequestHandler = asyncHandler(async (req, _res, next) => {
  const accessToken = extractBearerToken(req);
  req.user = await getUserFromAccessToken(accessToken);
  next();
});
