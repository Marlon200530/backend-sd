import { eq, sql } from "drizzle-orm";

import { db } from "../../db/connection.js";
import { users, type NewUser } from "../../db/schema.js";

export async function findUserByEmail(email: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${email.toLowerCase()}`)
    .limit(1);

  return user ?? null;
}

export async function findUserById(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user ?? null;
}

export async function createUser(data: NewUser) {
  const [user] = await db.insert(users).values(data).returning();

  if (!user) {
    throw new Error("Failed to create user.");
  }

  return user;
}
