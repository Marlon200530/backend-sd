import { and, asc, count, desc, eq, ilike, ne, or, sql, type SQL } from "drizzle-orm";
import { db } from "../../db/connection.js";
import { resources, resourceImages, users } from "../../db/schema.js";


type CreateResourceInput = {
  ownerId: string;
  categoryId: string;
  title: string;
  description: string;
  condition: "new" | "like_new" | "very_good" | "good" | "acceptable";
  status: "available";
  location: string;
  visibleFrom: Date;
};

type CreateImagesInput = {
  resourceId: string;
  hasCover: boolean;
  images: {
    url: string;
    altText?: string;
    isCover: boolean;
  }[];
};

type UpdateResourceInput = {
  categoryId?: string | undefined;
  title?: string | undefined;
  description?: string | undefined;
  condition?: "new" | "like_new" | "very_good" | "good" | "acceptable" | undefined;
  status?: "available" | "requisitioned" | "unavailable" | "hidden" | "removed" | undefined;
  location?: string | undefined;
  visibleFrom?: Date | undefined;
  deletedAt?: Date | null | undefined;
};

type ListResourcesInput = {
  page: number;
  limit: number;
  q?: string | undefined;
  categoryId?: string | undefined;
  condition?: "new" | "like_new" | "very_good" | "good" | "acceptable" | undefined;
  status?: "available" | "requisitioned" | "unavailable" | "hidden" | "removed" | undefined;
  sort?: "createdAt" | "title" | "visibleFrom" | undefined;
  order?: "asc" | "desc" | undefined;
  ownerId?: string | undefined;
};

export const resourcesRepository = {
  async createOnce(input: CreateResourceInput) {
    const normalizedTitle = input.title.trim().replace(/\s+/g, " ").toLowerCase();
    const lockKey = `resource:${input.ownerId}:${input.categoryId}:${normalizedTitle}`;

    return db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${lockKey}))`);

      const [existingResource] = await tx
        .select()
        .from(resources)
        .where(
          and(
            eq(resources.ownerId, input.ownerId),
            eq(resources.categoryId, input.categoryId),
            ne(resources.status, "removed"),
            sql`lower(regexp_replace(trim(${resources.title}), '\\s+', ' ', 'g')) = ${normalizedTitle}`,
          ),
        )
        .limit(1);

      if (existingResource) {
        return { kind: "duplicate" as const, resource: existingResource };
      }

      const [resource] = await tx
        .insert(resources)
        .values({
          ownerId: input.ownerId,
          categoryId: input.categoryId,
          title: input.title,
          description: input.description,
          condition: input.condition,
          status: input.status,
          location: input.location,
          visibleFrom: input.visibleFrom,
        })
        .returning();

      if (!resource) {
        return { kind: "create-failed" as const };
      }

      return { kind: "created" as const, resource };
    });
  },

  async create(input: CreateResourceInput) {
    const [resource] = await db
      .insert(resources)
      .values({
        ownerId: input.ownerId,
        categoryId: input.categoryId,
        title: input.title,
        description: input.description,
        condition: input.condition,
        status: input.status,
        location: input.location,
        visibleFrom: input.visibleFrom,
      })
      .returning();

    return resource;
  },

  async update(resourceId: string, input: UpdateResourceInput) {
    const [resource] = await db
      .update(resources)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(resources.id, resourceId))
      .returning();

    return resource ?? null;
  },

  async list(input: ListResourcesInput) {
    const conditions: SQL[] = [];

    if (input.q) {
      conditions.push(or(ilike(resources.title, `%${input.q}%`), ilike(resources.description, `%${input.q}%`))!);
    }

    if (input.categoryId) conditions.push(eq(resources.categoryId, input.categoryId));
    if (input.condition) conditions.push(eq(resources.condition, input.condition));
    if (input.status) conditions.push(eq(resources.status, input.status));
    if (input.ownerId) conditions.push(eq(resources.ownerId, input.ownerId));

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const sortColumn =
      input.sort === "title"
        ? resources.title
        : input.sort === "visibleFrom"
          ? resources.visibleFrom
          : resources.createdAt;
    const orderBy = input.order === "asc" ? asc(sortColumn) : desc(sortColumn);
    const offset = (input.page - 1) * input.limit;

    const [rows, [totalRow]] = await Promise.all([
      db.select().from(resources).where(where).orderBy(orderBy).limit(input.limit).offset(offset),
      db.select({ total: count() }).from(resources).where(where),
    ]);

    const withImages = await Promise.all(
      rows.map(async (resource) => {
        const [images, [owner]] = await Promise.all([
          db
            .select()
            .from(resourceImages)
            .where(eq(resourceImages.resourceId, resource.id))
            .orderBy(asc(resourceImages.createdAt)),
          db
            .select({
              id: users.id,
              name: users.name,
              email: users.email,
              role: users.role,
              contact: users.contact,
              photoUrl: users.photoUrl,
              isActive: users.isActive,
              createdAt: users.createdAt,
              updatedAt: users.updatedAt,
            })
            .from(users)
            .where(eq(users.id, resource.ownerId))
            .limit(1),
        ]);

        return {
          ...resource,
          images,
          coverImage: images.find((image) => image.isCover) ?? null,
          owner: owner ?? null,
        };
      }),
    );

    return { rows: withImages, total: totalRow?.total ?? 0 };
  },

  async findById(resourceId: string) {
    const [resource] = await db
      .select()
      .from(resources)
      .where(eq(resources.id, resourceId))
      .limit(1);

    if (!resource) {
      return null;
    }

    const [images, [owner]] = await Promise.all([
      db
        .select()
        .from(resourceImages)
        .where(eq(resourceImages.resourceId, resourceId))
        .orderBy(asc(resourceImages.createdAt)),
      db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          contact: users.contact,
          photoUrl: users.photoUrl,
          isActive: users.isActive,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(eq(users.id, resource.ownerId))
        .limit(1),
    ]);

    const coverImage = images.find((image) => image.isCover) ?? null;

    return {
      ...resource,
      images,
      coverImage,
      owner: owner ?? null,
    };
  },

  async createImages(input: CreateImagesInput) {
    return db.transaction(async (tx) => {
      if (input.hasCover) {
        await tx
          .update(resourceImages)
          .set({ isCover: false })
          .where(eq(resourceImages.resourceId, input.resourceId));
      }

      const createdImages = await tx
        .insert(resourceImages)
        .values(
          input.images.map((image) => ({
            resourceId: input.resourceId,
            url: image.url,
            altText: image.altText,
            isCover: image.isCover,
          })),
        )
        .returning();

      return createdImages;
    });
  },

  async deleteImage(resourceId: string, imageId: string) {
    const [image] = await db
      .delete(resourceImages)
      .where(and(eq(resourceImages.id, imageId), eq(resourceImages.resourceId, resourceId)))
      .returning();

    return image ?? null;
  },
};
