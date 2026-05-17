import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";

import { db } from "../../db/connection.js";
import { loans, resources, users, type User } from "../../db/schema.js";

export type UserListFilters = {
  page: number;
  limit: number;
  q?: string | undefined;
  role?: User["role"] | undefined;
  isActive?: boolean | undefined;
};

export async function findUserById(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user ?? null;
}

export async function updateUserById(id: string, data: Partial<typeof users.$inferInsert>) {
  const [user] = await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();

  return user ?? null;
}

export async function getUserStats(userId: string) {
  const [[published], [activeLoans], [totalLoans]] = await Promise.all([
    db.select({ total: count() }).from(resources).where(eq(resources.ownerId, userId)),
    db
      .select({ total: count() })
      .from(loans)
      .where(and(eq(loans.borrowerId, userId), eq(loans.status, "active"))),
    db.select({ total: count() }).from(loans).where(eq(loans.borrowerId, userId)),
  ]);

  return {
    resourcesPublished: published?.total ?? 0,
    activeLoans: activeLoans?.total ?? 0,
    totalLoans: totalLoans?.total ?? 0,
  };
}

export async function listUsers(filters: UserListFilters) {
  const conditions: SQL[] = [];

  if (filters.q) {
    conditions.push(or(ilike(users.name, `%${filters.q}%`), ilike(users.email, `%${filters.q}%`))!);
  }

  if (filters.role) {
    conditions.push(eq(users.role, filters.role));
  }

  if (filters.isActive !== undefined) {
    conditions.push(eq(users.isActive, filters.isActive));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (filters.page - 1) * filters.limit;

  const [rows, [totalRow]] = await Promise.all([
    db
      .select()
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(filters.limit)
      .offset(offset),
    db.select({ total: count() }).from(users).where(where),
  ]);

  return {
    rows,
    total: totalRow?.total ?? 0,
  };
}
