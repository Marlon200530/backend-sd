import { z } from "zod";

export const reportRangeQuerySchema = z
  .object({
    from: z.string().optional(),
    to: z.string().optional(),
    categoryId: z.string().uuid("Id da categoria inválido.").optional(),
    groupBy: z.enum(["day", "week", "month"]).default("month").optional(),
    type: z.enum(["loans", "resources", "users"]).optional(),
    format: z.enum(["csv"]).default("csv").optional(),
  })
  .strict();

export type ReportRangeQueryInput = z.infer<typeof reportRangeQuerySchema>;
