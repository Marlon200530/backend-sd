import { AppError } from "../error/app-error.js";
import { jwtTokenSchema } from "./jwt.schemas.js";

export function parseJwtToken(token: unknown) {
  const result = jwtTokenSchema.safeParse(token);

  if (!result.success) {
    throw new AppError(401, "AUTH_TOKEN_INVALID", "Formato de token inválido.");
  }

  return result.data;
}

export function extractBearerTokenValue(authorization: unknown) {
  if (typeof authorization !== "string" || authorization.trim() === "") {
    throw new AppError(401, "AUTH_TOKEN_INVALID", "Token de autenticação não informado.");
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    throw new AppError(401, "AUTH_TOKEN_INVALID", "Formato de token inválido.");
  }

  return parseJwtToken(match[1]);
}
