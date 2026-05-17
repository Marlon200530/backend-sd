import crypto from "node:crypto";
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";

import { env } from "../env.js";
import type { User } from "../db/schema.js";
import { AppError } from "../error/app-error.js";

export type TokenType = "access" | "refresh";
export type VerifiedToken = JwtPayload & { sub: string; type: TokenType };

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function signToken(user: User, type: TokenType) {
  const expiresIn = (
    type === "access" ? env.ACCESS_TOKEN_EXPIRES_IN : env.REFRESH_TOKEN_EXPIRES_IN
  ) as NonNullable<SignOptions["expiresIn"]>;

  const secret = type === "access" ? env.ACCESS_TOKEN_SECRET : env.REFRESH_TOKEN_SECRET;
  const payload = {
    sub: user.id,
    role: user.role,
    type,
    ...(type === "refresh" ? { jti: crypto.randomUUID() } : {}),
  };

  const options: SignOptions = { expiresIn };

  return jwt.sign(payload, secret, options);
}

export function decodeToken(token: string) {
  const decoded = jwt.decode(token);

  if (!decoded || typeof decoded === "string") {
    throw new AppError(401, "AUTH_TOKEN_INVALID", "Token inválido.");
  }

  return decoded;
}

export function getTokenExpiration(token: string) {
  const decoded = decodeToken(token);

  if (typeof decoded.exp !== "number") {
    throw new AppError(401, "AUTH_TOKEN_INVALID", "Token inválido.");
  }

  return new Date(decoded.exp * 1000);
}

export function getTokenTtlSeconds(token: string) {
  const decoded = decodeToken(token);

  if (typeof decoded.exp !== "number" || typeof decoded.iat !== "number") {
    return 0;
  }

  return decoded.exp - decoded.iat;
}

export function verifyToken(token: string, type: TokenType): VerifiedToken {
  const secret = type === "access" ? env.ACCESS_TOKEN_SECRET : env.REFRESH_TOKEN_SECRET;
  const decoded = jwt.verify(token, secret);

  if (!decoded || typeof decoded === "string") {
    throw new AppError(401, "AUTH_TOKEN_INVALID", "Token inválido.");
  }

  if (decoded.type !== type || typeof decoded.sub !== "string") {
    throw new AppError(401, "AUTH_TOKEN_INVALID", "Token inválido.");
  }

  return decoded as VerifiedToken;
}
