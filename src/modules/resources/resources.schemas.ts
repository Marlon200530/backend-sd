import { z } from "zod";

/**
 * ============================================================
 * Helpers
 * ============================================================
 */

const uuidSchema = (message: string) => z.string().uuid(message);

const nonEmptyString = (message: string, max = 180) =>
  z.string().trim().min(1, message).max(max);

const optionalTrimmedString = (max = 180) =>
  z.string().trim().max(max).optional();

const isTomorrowOrLater = (date: Date) => {
  const today = new Date();

  const tomorrow = new Date(today);
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const inputDate = new Date(date);
  inputDate.setHours(0, 0, 0, 0);

  return inputDate >= tomorrow;
};

/**
 * ============================================================
 * Enums
 * ============================================================
 */

export const resourceConditionEnum = z.enum([
  "new",
  "like_new",
  "very_good",
  "good",
  "acceptable",
]);

export const resourceStatusEnum = z.enum([
  "available",
  "requisitioned",
  "unavailable",
  "hidden",
  "removed",
]);

export const loanStatusEnum = z.enum([
  "pending",
  "active",
  "overdue",
  "return_pending",
  "returned",
  "rejected",
  "cancelled",
]);

/**
 * ============================================================
 * Params
 * ============================================================
 */

export const resourceIdParamsSchema = z
  .object({
    id: uuidSchema("Id do recurso inválido."),
  })
  .strict();

export const resourceImageIdParamsSchema = z
  .object({
    id: uuidSchema("Id do recurso inválido."),
    imageId: uuidSchema("Id da imagem inválido."),
  })
  .strict();

export const loanIdParamsSchema = z
  .object({
    id: uuidSchema("Id da requisição inválido."),
  })
  .strict();

/**
 * ============================================================
 * Resources
 * ============================================================
 *
 * Importante:
 * - O frontend NÃO deve enviar ownerId.
 * - O ownerId vem de req.user.id.
 * - O status inicial é definido no backend como "available".
 * - As imagens entram depois via POST /resources/:id/images.
 */

export const resourceCreateBodySchema = z
  .object({
    categoryId: uuidSchema("Id da categoria inválido."),
    title: nonEmptyString("O título é obrigatório.", 180),
    description: z.string().trim().min(1, "A descrição é obrigatória."),
    condition: resourceConditionEnum,
    location: nonEmptyString("A localização é obrigatória.", 180),
    visibleFrom: z.coerce.date().optional(),
  })
  .strict();

export const resourceCreateServiceSchema = resourceCreateBodySchema
  .extend({
    ownerId: uuidSchema("Id do proprietário inválido."),
    status: resourceStatusEnum.default("available"),
    preLoanStatus: resourceStatusEnum.optional(),
  })
  .strict();

export const updateResourceSchema = z
  .object({
    categoryId: uuidSchema("Id da categoria inválido.").optional(),
    title: nonEmptyString("O título é obrigatório.", 180).optional(),
    description: z.string().trim().min(1, "A descrição é obrigatória.").optional(),
    condition: resourceConditionEnum.optional(),
    location: nonEmptyString("A localização é obrigatória.", 180).optional(),
    visibleFrom: z.coerce.date().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe pelo menos um campo para actualizar.",
  });

export const resourceModerationSchema = z
  .object({
    action: z.enum(["hide", "restore"]),
    reason: z.string().trim().min(1, "O motivo é obrigatório.").max(500).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.action === "hide" && !data.reason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reason"],
        message: "Informe o motivo para ocultar o recurso.",
      });
    }
  });

export const resourceListQuerySchema = z
  .object({
    q: z.string().trim().optional(),

    categoryId: uuidSchema("Id da categoria inválido.").optional(),

    condition: resourceConditionEnum.optional(),

    status: resourceStatusEnum.default("available").optional(),

    sort: z
      .enum(["createdAt", "title", "visibleFrom"])
      .default("createdAt")
      .optional(),

    order: z.enum(["asc", "desc"]).default("desc").optional(),

    page: z.coerce.number().int().min(1).default(1),

    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

/**
 * ============================================================
 * Resource Images
 * ============================================================
 *
 * Para Supabase Storage:
 * - O frontend envia ficheiros via multipart/form-data.
 * - O backend faz upload para Supabase Storage.
 * - Depois grava a URL pública na BD.
 */

export const resourceImagesUploadBodySchema = z
  .object({
    altText: optionalTrimmedString(180),
    coverIndex: z.coerce.number().int().min(0).default(0),
  })
  .strict();

export const resourceImageInsertSchema = z
  .object({
    resourceId: uuidSchema("Id do recurso inválido."),
    url: z.string().url("URL da imagem inválida."),
    altText: optionalTrimmedString(180),
    isCover: z.boolean().default(false),
  })
  .strict();

export const resourceImageUpdateSchema = z
  .object({
    altText: optionalTrimmedString(180),
    isCover: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe pelo menos um campo para actualizar.",
  });

/**
 * ============================================================
 * Loans
 * ============================================================
 *
 * Importante:
 * - O frontend NÃO deve enviar borrowerId.
 * - O borrowerId vem de req.user.id.
 * - O ownerId vem do recurso encontrado no backend.
 * - O status inicial é "active".
 */

export const loanCreateBodySchema = z
  .object({
    resourceId: uuidSchema("Id do recurso inválido."),
    dueDate: z.coerce.date({
      error: "A data de devolução é obrigatória.",
    }),
  })
  .strict()
  .refine((data) => isTomorrowOrLater(data.dueDate), {
    message: "A data de devolução deve ser uma data futura.",
    path: ["dueDate"],
  });

export const loanCreateServiceSchema = loanCreateBodySchema
  .extend({
    borrowerId: uuidSchema("Id do mutuário inválido."),
    ownerId: uuidSchema("Id do proprietário inválido."),
    status: loanStatusEnum.default("active"),
    requestedAt: z.coerce.date().optional(),
  })
  .strict()
  .refine((data) => data.borrowerId !== data.ownerId, {
    message: "O mutuário não pode ser o mesmo que o proprietário.",
    path: ["borrowerId"],
  })
  .refine(
    (data) => !data.requestedAt || data.dueDate > data.requestedAt,
    {
      message: "A data de devolução deve ser posterior à data de pedido.",
      path: ["dueDate"],
    },
  );

export const updateLoanSchema = z
  .object({
    status: loanStatusEnum.optional(),
    dueDate: z.coerce.date().optional(),
    returnedAt: z.coerce.date().optional(),
    returnNotes: z.string().trim().max(500).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe pelo menos um campo para actualizar.",
  })
  .refine((data) => !data.dueDate || isTomorrowOrLater(data.dueDate), {
    message: "A data de devolução deve ser uma data futura.",
    path: ["dueDate"],
  });

export const loanReturnBodySchema = z
  .object({
    returnNotes: z.string().trim().max(500).optional(),
  })
  .strict();

export const loanCancelBodySchema = z
  .object({
    reason: z.string().trim().min(1, "O motivo do cancelamento é obrigatório.").max(500),
  })
  .strict();

export const loanListQuerySchema = z
  .object({
    status: loanStatusEnum.optional(),

    resourceId: uuidSchema("Id do recurso inválido.").optional(),

    borrowerId: uuidSchema("Id do mutuário inválido.").optional(),

    ownerId: uuidSchema("Id do proprietário inválido.").optional(),

    page: z.coerce.number().int().min(1).default(1),

    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

/**
 * ============================================================
 * Types
 * ============================================================
 */

export type ResourceCondition = z.infer<typeof resourceConditionEnum>;
export type ResourceStatus = z.infer<typeof resourceStatusEnum>;

export type ResourceIdParamsInput = z.infer<typeof resourceIdParamsSchema>;
export type ResourceImageIdParamsInput = z.infer<typeof resourceImageIdParamsSchema>;

export type ResourceCreateBodyInput = z.infer<typeof resourceCreateBodySchema>;
export type ResourceCreateServiceInput = z.infer<typeof resourceCreateServiceSchema>;
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>;
export type ResourceModerationInput = z.infer<typeof resourceModerationSchema>;
export type ResourceListQueryInput = z.infer<typeof resourceListQuerySchema>;

export type ResourceImagesUploadBodyInput = z.infer<
  typeof resourceImagesUploadBodySchema
>;

export type ResourceImageInsertInput = z.infer<typeof resourceImageInsertSchema>;
export type ResourceImageUpdateInput = z.infer<typeof resourceImageUpdateSchema>;

export type LoanStatus = z.infer<typeof loanStatusEnum>;
export type LoanIdParamsInput = z.infer<typeof loanIdParamsSchema>;
export type LoanCreateBodyInput = z.infer<typeof loanCreateBodySchema>;
export type LoanCreateServiceInput = z.infer<typeof loanCreateServiceSchema>;
export type UpdateLoanInput = z.infer<typeof updateLoanSchema>;
export type LoanReturnBodyInput = z.infer<typeof loanReturnBodySchema>;
export type LoanCancelBodyInput = z.infer<typeof loanCancelBodySchema>;
export type LoanListQueryInput = z.infer<typeof loanListQuerySchema>;

/**
 * ============================================================
 * Backwards-compatible aliases
 * ============================================================
 *
 * Mantém estes aliases se outras partes do teu código já importam
 * ResourceCreateInput, ResourceImageInput, etc.
 */

export const resourceCreateSchema = resourceCreateBodySchema;

export const resourceImageSchema = resourceImageInsertSchema;

export const loanCreateSchema = loanCreateBodySchema;

export type ResourceCreateInput = ResourceCreateBodyInput;
export type ResourceImageInput = ResourceImageInsertInput;
