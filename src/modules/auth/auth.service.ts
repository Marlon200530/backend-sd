import bcrypt from "bcrypt";

import { env } from "../../env.js";
import { AppError } from "../../error/app-error.js";
import type { User } from "../../db/schema.js";
import {
  getTokenExpiration,
  getTokenTtlSeconds,
  hashToken,
  signToken,
  verifyToken,
} from "../../jwt/jwt-token.js";
import { parseJwtToken } from "../../jwt/jwt-input.js";
import { toPublicUser } from "../../utils/public-user.js";
import {
  createRefreshToken,
  findActiveRefreshTokenByHash,
  revokeRefreshTokenByHash,
} from "../../jwt/jwt.repository.js";
import {
  createUser,
  findUserByEmail,
  findUserById,
} from "./auth.repository.js";
import type { ForgotPasswordInput, LoginInput, RegisterInput, ResetPasswordInput } from "./auth.schemas.js";

async function issueTokenPair(user: User) {
  const accessToken = signToken(user, "access");
  const refreshToken = signToken(user, "refresh");

  await createRefreshToken({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    expiresAt: getTokenExpiration(refreshToken),
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: getTokenTtlSeconds(accessToken),
  };
}

export async function register(input: RegisterInput) {
  const existingUser = await findUserByEmail(input.email);

  if (existingUser) {
    throw new AppError(409, "USER_EMAIL_ALREADY_EXISTS", "Email já registado.");
  }

  const passwordHash = await bcrypt.hash(input.password, env.PASSWORD_HASH_ROUNDS);

  const newUser = {
    name: input.name,
    email: input.email,
    passwordHash,
    ...(input.contact !== undefined ? { contact: input.contact } : {}),
  };

  const user = await createUser(newUser);

  return toPublicUser(user);
}

export async function login(input: LoginInput) {
  const user = await findUserByEmail(input.email);

  if (!user) {
    throw new AppError(401, "AUTH_INVALID_CREDENTIALS", "Email ou palavra-passe incorrectos.");
  }

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);

  if (!passwordMatches) {
    throw new AppError(401, "AUTH_INVALID_CREDENTIALS", "Email ou palavra-passe incorrectos.");
  }

  if (!user.isActive) {
    throw new AppError(403, "AUTH_ACCOUNT_DISABLED", "Conta desactivada.");
  }

  const tokens = await issueTokenPair(user);

  return {
    ...tokens,
    user: toPublicUser(user),
  };
}

export async function refreshAccessToken(refreshToken: string) {
  const parsedRefreshToken = parseJwtToken(refreshToken);
  const decoded = verifyToken(parsedRefreshToken, "refresh");
  const storedToken = await findActiveRefreshTokenByHash(hashToken(parsedRefreshToken));

  if (!storedToken || storedToken.userId !== decoded.sub) {
    throw new AppError(401, "AUTH_REFRESH_REVOKED", "Refresh token inválido ou revogado.");
  }

  const user = await findUserById(decoded.sub);

  if (!user) {
    throw new AppError(401, "AUTH_TOKEN_INVALID", "Token inválido.");
  }

  if (!user.isActive) {
    throw new AppError(403, "AUTH_ACCOUNT_DISABLED", "Conta desactivada.");
  }

  const accessToken = signToken(user, "access");

  return {
    accessToken,
    expiresIn: getTokenTtlSeconds(accessToken),
  };
}

export async function logout(refreshToken: string) {
  const parsedRefreshToken = parseJwtToken(refreshToken);
  verifyToken(parsedRefreshToken, "refresh");
  await revokeRefreshTokenByHash(hashToken(parsedRefreshToken));
}

export async function getUserFromAccessToken(accessToken: string) {
  const parsedAccessToken = parseJwtToken(accessToken);
  const decoded = verifyToken(parsedAccessToken, "access");
  const user = await findUserById(decoded.sub);

  if (!user) {
    throw new AppError(401, "AUTH_TOKEN_INVALID", "Token inválido.");
  }

  if (!user.isActive) {
    throw new AppError(403, "AUTH_ACCOUNT_DISABLED", "Conta desactivada.");
  }

  return toPublicUser(user);
}

export async function forgotPassword(_input: ForgotPasswordInput) {
  return {
    message: "Se o email existir na plataforma, receberá instruções em breve.",
  };
}

export async function resetPassword(_input: ResetPasswordInput) {
  throw new AppError(400, "AUTH_RESET_TOKEN_INVALID", "Token de recuperação inválido ou expirado.");
}
