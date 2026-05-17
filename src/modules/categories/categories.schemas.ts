import z from "zod";

export const categorySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, "A categoria deve ter no mínimo 3 caracteres.")
      .max(80, "A categoria deve ter no máximo 80 caracteres."),
    description: z
      .string()
      .trim()
      .max(100, "A descrição deve ter no máximo 100 caracteres.")
      .optional(),
    isActive: z.boolean().default(true),
  })
  .strict();

export const updateCategorySchema = categorySchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  "Informe pelo menos um campo para atualizar.",
);

export const categoryParamsSchema = z
  .object({
    id: z.string().uuid("Id da categoria inválido."),
  })
  .strict();

export type CategoryInput = z.infer<typeof categorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
