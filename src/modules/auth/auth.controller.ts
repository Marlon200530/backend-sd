import { sendNoContent, sendSuccess } from "../../utils/api-response.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { extractBearerToken } from "../../jwt/authenticate.js";
import * as authService from "./auth.service.js";

export const register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body);
  return sendSuccess(res, 201, user);
});

export const login = asyncHandler(async (req, res) => {
  const data = await authService.login(req.body);
  return sendSuccess(res, 200, data);
});

export const refresh = asyncHandler(async (req, res) => {
  const refreshToken = extractBearerToken(req);
  const data = await authService.refreshAccessToken(refreshToken);
  return sendSuccess(res, 200, data);
});

export const logout = asyncHandler(async (req, res) => {
  const refreshToken = extractBearerToken(req);
  await authService.logout(refreshToken);
  return sendNoContent(res);
});

export const me = asyncHandler(async (req, res) => {
  return sendSuccess(res, 200, req.user);
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const data = await authService.forgotPassword(req.body);
  return sendSuccess(res, 200, data);
});

export const resetPassword = asyncHandler(async (req, res) => {
  const data = await authService.resetPassword(req.body);
  return sendSuccess(res, 200, data);
});
