import bcrypt from "bcrypt";

import { env } from "../../../env.js";
import { AppError } from "../../error/app-error.js";
import { toPublicUser } from "../../utils/public-user.js";
import { resourceStorageService } from "../resources/resources-storage.service.js";
import {
  findUserById,
  getUserStats,
  listUsers,
  updateUserById,
  type UserListFilters,
} from "./user.repository.js";
import type {
  ChangePasswordInput,
  UpdateOwnProfileInput,
  UpdateUserRoleInput,
  UpdateUserStatusInput,
} from "./user.schemas.js";

export async function getOwnProfile(userId: string) {
  const user = await findUserById(userId);

  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "Utilizador não encontrado.");
  }

  return {
    ...toPublicUser(user),
    stats: await getUserStats(userId),
  };
}

export async function updateOwnProfile(userId: string, input: UpdateOwnProfileInput) {
  const updateData: {
    name?: string;
    contact?: string;
    photoUrl?: string | null;
  } = {};

  if (input.name !== undefined) updateData.name = input.name;
  if (input.contact !== undefined) updateData.contact = input.contact;
  if (input.photoUrl !== undefined) updateData.photoUrl = input.photoUrl;

  const user = await updateUserById(userId, updateData);

  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "Utilizador não encontrado.");
  }

  return {
    ...toPublicUser(user),
    stats: await getUserStats(userId),
  };
}

export async function changeOwnPassword(userId: string, input: ChangePasswordInput) {
  const user = await findUserById(userId);

  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "Utilizador não encontrado.");
  }

  const passwordMatches = await bcrypt.compare(input.currentPassword, user.passwordHash);

  if (!passwordMatches) {
    throw new AppError(401, "AUTH_INVALID_PASSWORD", "Palavra-passe actual incorrecta.");
  }

  const passwordHash = await bcrypt.hash(input.newPassword, env.PASSWORD_HASH_ROUNDS);
  await updateUserById(userId, { passwordHash });

  return { message: "Palavra-passe alterada com sucesso." };
}

export async function updateOwnPhoto(userId: string, file: Express.Multer.File) {
  const uploaded = await resourceStorageService.uploadUserAvatar({ userId, file });
  const user = await updateUserById(userId, { photoUrl: uploaded.url });

  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "Utilizador não encontrado.");
  }

  return {
    ...toPublicUser(user),
    stats: await getUserStats(userId),
  };
}

export async function listUsersForAdmin(filters: UserListFilters) {
  const result = await listUsers(filters);

  return {
    data: result.rows.map(toPublicUser),
    meta: {
      page: filters.page,
      limit: filters.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / filters.limit),
    },
  };
}

export async function updateUserStatus(
  adminId: string,
  userId: string,
  input: UpdateUserStatusInput,
) {
  if (adminId === userId && input.isActive === false) {
    throw new AppError(422, "USER_SELF_DISABLE_FORBIDDEN", "Não pode desactivar a própria conta.");
  }

  const user = await updateUserById(userId, { isActive: input.isActive });

  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "Utilizador não encontrado.");
  }

  return toPublicUser(user);
}

export async function updateUserRole(adminId: string, userId: string, input: UpdateUserRoleInput) {
  if (adminId === userId) {
    throw new AppError(422, "USER_SELF_ROLE_FORBIDDEN", "Não pode alterar o próprio role.");
  }

  const user = await updateUserById(userId, { role: input.role });

  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "Utilizador não encontrado.");
  }

  return toPublicUser(user);
}
