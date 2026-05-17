import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "A palavra-passe deve ter pelo menos 8 caracteres.")
  .max(72, "A palavra-passe deve ter no máximo 72 caracteres.")
  .regex(/[A-Z]/, "A palavra-passe deve conter pelo menos uma letra maiúscula.")
  .regex(/[0-9]/, "A palavra-passe deve conter pelo menos um número.");

export const registerSchema = z
  .object({
    name: z.string().trim().min(2).max(160),
    email: z.string().trim().toLowerCase().email().max(180),
    contact: z
      .string()
      .trim()
      .min(7)
      .max(40)
      .regex(/^\+?[0-9\s().-]+$/, "Contacto inválido.")
      .optional(),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .strict()
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "As palavras-passe não coincidem.",
  });

export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(180),
    password: z.string().min(1, "A palavra-passe é obrigatória.").max(72),
  })
  .strict();

export const forgotPasswordSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(180),
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(1, "Token obrigatório."),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .strict()
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "As palavras-passe não coincidem.",
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
