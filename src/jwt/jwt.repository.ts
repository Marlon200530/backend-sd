import { and, eq, gt, isNull } from "drizzle-orm";

import { db } from "../db/connection.js";
import { refreshTokens, type NewRefreshToken } from "../db/schema.js";

export async function createRefreshToken(data: NewRefreshToken) {
  const [refreshToken] = await db.insert(refreshTokens).values(data).returning();

  if (!refreshToken) {
    throw new Error("Failed to create refresh token.");
  }

  return refreshToken;
}

export async function findActiveRefreshTokenByHash(tokenHash: string) {
  const [refreshToken] = await db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.tokenHash, tokenHash),
        isNull(refreshTokens.revokedAt),
        gt(refreshTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);

  return refreshToken ?? null;
}

export async function revokeRefreshTokenByHash(tokenHash: string) {
  const [refreshToken] = await db
    .update(refreshTokens)
    .set({ revokedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(refreshTokens.tokenHash, tokenHash), isNull(refreshTokens.revokedAt)))
    .returning();

  return refreshToken ?? null;
}
