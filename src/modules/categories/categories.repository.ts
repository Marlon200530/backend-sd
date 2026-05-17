import { eq } from "drizzle-orm";

import { resourceCategories } from "../../db/schema.js";
import { db } from "../../db/connection.js";
import type { NewResourceCategory } from "../../db/schema.js";

export const createCategory = async ({
  name,
  slug,
  isActive,
  description,
}: NewResourceCategory) => {
  const [category] = await db
    .insert(resourceCategories)
    .values({
      name,
      slug,
      isActive,
      description,
    })
    .returning();

  if (!category) throw new Error("Failed to create a category");

  return category;
};

export const getCategories = async (filters: { isActive?: boolean } = {}) => {
  const query = db.select().from(resourceCategories);

  if (filters.isActive === undefined) {
    return query;
  }

  return query.where(eq(resourceCategories.isActive, filters.isActive));
};

export const updateCategoryById = async (
  id: string,
  data: Partial<NewResourceCategory>,
) => {
  const [category] = await db
    .update(resourceCategories)
    .set(data)
    .where(eq(resourceCategories.id, id))
    .returning();

  return category ?? null;
};
