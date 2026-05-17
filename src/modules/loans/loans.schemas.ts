import { z } from "zod";

const uuidSchema = (message: string) => z.string().uuid(message);

export const loanStatusEnum = z.enum([
  "pending",
  "active",
  "overdue",
  "return_pending",
  "returned",
  "rejected",
  "cancelled",
]);

const isTomorrowOrLater = (date: Date) => {
  const tomorrow = new Date();
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const input = new Date(date);
  input.setHours(0, 0, 0, 0);

  return input >= tomorrow;
};

export const loanIdParamsSchema = z
  .object({
    id: uuidSchema("Id da requisição inválido."),
  })
  .strict();

export const loanCreateSchema = z
  .object({
    resourceId: uuidSchema("Id do recurso inválido."),
    dueDate: z.coerce.date(),
  })
  .strict()
  .refine((data) => isTomorrowOrLater(data.dueDate), {
    path: ["dueDate"],
    message: "A data de devolução deve ser uma data futura.",
  });

export const loanListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: loanStatusEnum.optional(),
    resourceId: uuidSchema("Id do recurso inválido.").optional(),
    borrowerId: uuidSchema("Id do mutuário inválido.").optional(),
    ownerId: uuidSchema("Id do proprietário inválido.").optional(),
  })
  .strict();

export const loanReturnSchema = z
  .object({
    returnNotes: z.string().trim().max(500).optional(),
  })
  .strict();

export const loanCancelSchema = z
  .object({
    reason: z.string().trim().min(1, "O motivo do cancelamento é obrigatório.").max(500),
  })
  .strict();

export const loanRejectSchema = z
  .object({
    reason: z.string().trim().min(1, "O motivo da rejeição é obrigatório.").max(500).optional(),
  })
  .strict();

export type LoanIdParamsInput = z.infer<typeof loanIdParamsSchema>;
export type LoanCreateInput = z.infer<typeof loanCreateSchema>;
export type LoanListQueryInput = z.infer<typeof loanListQuerySchema>;
export type LoanReturnInput = z.infer<typeof loanReturnSchema>;
export type LoanCancelInput = z.infer<typeof loanCancelSchema>;
export type LoanRejectInput = z.infer<typeof loanRejectSchema>;
