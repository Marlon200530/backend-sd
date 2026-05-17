import jwt from "jsonwebtoken";

export function isJwtTokenExpiredError(error: unknown) {
  return error instanceof jwt.TokenExpiredError;
}

export function isJwtTokenInvalidError(error: unknown) {
  return error instanceof jwt.JsonWebTokenError;
}
