import type { User } from "../db/schema.js";

export type PublicUser = Pick<
  User,
  "id" | "name" | "email" | "role" | "contact" | "photoUrl" | "isActive" | "createdAt" | "updatedAt"
>;

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    contact: user.contact,
    photoUrl: user.photoUrl,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
