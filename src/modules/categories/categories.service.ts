import type { NewResourceCategory } from "../../db/schema.js";
import { AppError } from "../../error/app-error.js";
import { generateSlug } from "../../utils/generate-slug.js";
import {
  createCategory,
  getCategories,
  updateCategoryById,
} from "./categories.repository.js";
import type { CategoryInput, UpdateCategoryInput } from "./categories.schemas.js";

export const createCategoryService = async (data: CategoryInput) => {
  const slug = generateSlug(data.name);
  const category = await createCategory({
    ...data,
    slug,
  });

  return category;
};

export const listCategoriesService = async (filters: { isActive?: boolean }) => {
  return getCategories(filters);
};

export const updateCategoryService = async (
  id: string,
  data: UpdateCategoryInput,
) => {
  const updateData: Partial<NewResourceCategory> = {};

  if (data.name !== undefined) {
    updateData.name = data.name;
    updateData.slug = generateSlug(data.name);
  }

  if (data.description !== undefined) {
    updateData.description = data.description;
  }

  if (data.isActive !== undefined) {
    updateData.isActive = data.isActive;
  }

  const category = await updateCategoryById(id, updateData);

  if (!category) {
    throw new AppError(404, "CATEGORY_NOT_FOUND", "Categoria não encontrada.");
  }

  return category;
};
