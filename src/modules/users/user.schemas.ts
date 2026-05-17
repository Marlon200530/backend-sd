import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "A palavra-passe deve ter pelo menos 8 caracteres.")
  .max(72, "A palavra-passe deve ter no máximo 72 caracteres.")
  .regex(/[A-Z]/, "A palavra-passe deve conter pelo menos uma letra maiúscula.")
  .regex(/[0-9]/, "A palavra-passe deve conter pelo menos um número.");

export const userIdParamsSchema = z
  .object({
    id: z.string().uuid("Id do utilizador inválido."),
  })
  .strict();

export const updateOwnProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(160).optional(),
    contact: z
      .string()
      .trim()
      .min(7)
      .max(40)
      .regex(/^\+?[0-9\s().-]+$/, "Contacto inválido.")
      .optional(),
    photoUrl: z.string().url("URL da foto inválida.").nullable().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, "Informe pelo menos um campo.");

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "A palavra-passe actual é obrigatória.").max(72),
    newPassword: passwordSchema,
    confirmNewPassword: z.string(),
  })
  .strict()
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    path: ["confirmNewPassword"],
    message: "As palavras-passe não coincidem.",
  });

export const usersListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    q: z.string().trim().optional(),
    role: z.enum(["student", "admin"]).optional(),
    isActive: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),
  })
  .strict();

export const updateUserStatusSchema = z
  .object({
    isActive: z.boolean(),
  })
  .strict();

export const updateUserRoleSchema = z
  .object({
    role: z.enum(["student", "admin"]),
  })
  .strict();

export type UserIdParamsInput = z.infer<typeof userIdParamsSchema>;
export type UpdateOwnProfileInput = z.infer<typeof updateOwnProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UsersListQueryInput = z.infer<typeof usersListQuerySchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
