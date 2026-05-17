import { AppError } from "../../error/app-error.js";

import { resourcesRepository } from "./resources.repository.js";
import { resourceStorageService } from "./resources-storage.service.js";

import type {
  ResourceCondition,
  UpdateResourceInput,
} from "./resources.schemas.js";

type UserRole = "student" | "admin";

type CreateResourceInput = {
  ownerId: string;
  categoryId: string;
  title: string;
  description: string;
  condition: ResourceCondition;
  location: string;
  visibleFrom?: Date;
};

type UpdateResourceServiceInput = {
  resourceId: string;
  userId: string;
  userRole: UserRole;
  data: UpdateResourceInput;
};

type AddImagesInput = {
  resourceId: string;
  userId: string;
  userRole: UserRole;
  files: Express.Multer.File[];
  altText?: string;
  coverIndex: number;
};

type ListResourcesInput = {
  page: number;
  limit: number;
  q?: string | undefined;
  categoryId?: string | undefined;
  condition?: ResourceCondition | undefined;
  status?: "available" | "requisitioned" | "unavailable" | "hidden" | "removed" | undefined;
  sort?: "createdAt" | "title" | "visibleFrom" | undefined;
  order?: "asc" | "desc" | undefined;
  ownerId?: string | undefined;
};

export const resourcesService = {
  async list(input: ListResourcesInput) {
    const result = await resourcesRepository.list(input);

    return {
      data: result.rows,
      meta: {
        page: input.page,
        limit: input.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / input.limit),
      },
    };
  },

  async create(input: CreateResourceInput) {
    const result = await resourcesRepository.createOnce({
      ownerId: input.ownerId,
      categoryId: input.categoryId,
      title: input.title,
      description: input.description,
      condition: input.condition,
      status: "available",
      location: input.location,
      visibleFrom: input.visibleFrom ?? new Date(),
    });

    if (result.kind === "duplicate") {
      throw new AppError(
        409,
        "RESOURCE_DUPLICATE",
        "Já publicaste um recurso com este título nesta categoria.",
      );
    }

    if (result.kind === "create-failed") {
      throw new AppError(
        500,
        "RESOURCE_CREATE_FAILED",
        "Não foi possível criar o recurso.",
      );
    }

    return result.resource;
  },

  async update(input: UpdateResourceServiceInput) {
    const resource = await resourcesRepository.findById(input.resourceId);

    if (!resource) {
      throw new AppError(
        404,
        "RESOURCE_NOT_FOUND",
        "Recurso não encontrado.",
      );
    }

    const isOwner = resource.ownerId === input.userId;
    const isAdmin = input.userRole === "admin";

    if (!isOwner && !isAdmin) {
      throw new AppError(
        403,
        "FORBIDDEN",
        "Sem permissão para actualizar este recurso.",
      );
    }

    if (resource.status === "removed") {
      throw new AppError(
        422,
        "RESOURCE_IS_REMOVED",
        "Recurso removido não pode ser actualizado.",
      );
    }

    if (isOwner && !isAdmin && resource.status !== "available") {
      throw new AppError(
        422,
        "RESOURCE_NOT_AVAILABLE",
        "Só é possível editar recursos disponíveis.",
      );
    }

    const updateData: UpdateResourceInput = {};

    if (input.data.categoryId !== undefined) {
      updateData.categoryId = input.data.categoryId;
    }

    if (input.data.title !== undefined) {
      updateData.title = input.data.title;
    }

    if (input.data.description !== undefined) {
      updateData.description = input.data.description;
    }

    if (input.data.condition !== undefined) {
      updateData.condition = input.data.condition;
    }

    if (input.data.location !== undefined) {
      updateData.location = input.data.location;
    }

    if (input.data.visibleFrom !== undefined) {
      updateData.visibleFrom = input.data.visibleFrom;
    }

    return resourcesRepository.update(input.resourceId, updateData);
  },

  async remove(input: { resourceId: string; userId: string; userRole: UserRole }) {
    const resource = await resourcesRepository.findById(input.resourceId);

    if (!resource) {
      throw new AppError(404, "RESOURCE_NOT_FOUND", "Recurso não encontrado.");
    }

    const isOwner = resource.ownerId === input.userId;
    const isAdmin = input.userRole === "admin";

    if (!isOwner && !isAdmin) {
      throw new AppError(403, "FORBIDDEN", "Sem permissão para remover este recurso.");
    }

    if (resource.status === "requisitioned") {
      throw new AppError(409, "RESOURCE_HAS_ACTIVE_LOAN", "Recurso tem requisição activa.");
    }

    await resourcesRepository.update(input.resourceId, {
      status: "removed",
      deletedAt: new Date(),
    });
  },

  async moderate(input: {
    resourceId: string;
    action: "hide" | "restore";
  }) {
    const resource = await resourcesRepository.findById(input.resourceId);

    if (!resource) {
      throw new AppError(404, "RESOURCE_NOT_FOUND", "Recurso não encontrado.");
    }

    if (resource.status === "removed") {
      throw new AppError(422, "RESOURCE_IS_REMOVED", "Recurso removido não pode ser moderado.");
    }

    const nextStatus = input.action === "hide" ? "hidden" : "available";
    return resourcesRepository.update(input.resourceId, { status: nextStatus });
  },

  async addImages(input: AddImagesInput) {
    const resource = await resourcesRepository.findById(input.resourceId);

    if (!resource) {
      throw new AppError(
        404,
        "RESOURCE_NOT_FOUND",
        "Recurso não encontrado.",
      );
    }

    const isOwner = resource.ownerId === input.userId;
    const isAdmin = input.userRole === "admin";

    if (!isOwner && !isAdmin) {
      throw new AppError(
        403,
        "FORBIDDEN",
        "Sem permissão para adicionar imagens a este recurso.",
      );
    }

    if (resource.status === "removed") {
      throw new AppError(
        422,
        "RESOURCE_IS_REMOVED",
        "Não é possível adicionar imagens a um recurso removido.",
      );
    }

    const uploadedImages: Array<{
      url: string;
      storageKey: string;
      altText?: string;
      isCover: boolean;
      position: number;
    }> = [];

    try {
      for (let index = 0; index < input.files.length; index++) {
        const file = input.files[index];

        if (!file) {
          continue;
        }

        const uploaded = await resourceStorageService.uploadResourceImage({
          resourceId: input.resourceId,
          file,
        });

        const image: {
          url: string;
          storageKey: string;
          altText?: string;
          isCover: boolean;
          position: number;
        } = {
          url: uploaded.url,
          storageKey: uploaded.storageKey,
          isCover: index === input.coverIndex,
          position: index,
        };

        if (input.altText !== undefined) {
          image.altText = input.altText;
        }

        uploadedImages.push(image);
      }

      return await resourcesRepository.createImages({
        resourceId: input.resourceId,
        hasCover: uploadedImages.some((image) => image.isCover),
        images: uploadedImages.map(({ url, altText, isCover }) => ({
          url,
          ...(altText !== undefined ? { altText } : {}),
          isCover,
        })),
      });
    } catch (error) {
      await resourceStorageService.deleteResourceImages(
        uploadedImages.map((image) => image.storageKey),
      );

      throw error;
    }
  },

  async deleteImage(input: {
    resourceId: string;
    imageId: string;
    userId: string;
    userRole: UserRole;
  }) {
    const resource = await resourcesRepository.findById(input.resourceId);

    if (!resource) {
      throw new AppError(404, "RESOURCE_NOT_FOUND", "Recurso não encontrado.");
    }

    const isOwner = resource.ownerId === input.userId;
    const isAdmin = input.userRole === "admin";

    if (!isOwner && !isAdmin) {
      throw new AppError(403, "FORBIDDEN", "Sem permissão para remover esta imagem.");
    }

    const image = await resourcesRepository.deleteImage(input.resourceId, input.imageId);

    if (!image) {
      throw new AppError(404, "RESOURCE_IMAGE_NOT_FOUND", "Imagem não encontrada.");
    }
  },

  async getResourceByIdService(id: string) {
    const resource = await resourcesRepository.findById(id);

    if (!resource) {
      throw new AppError(404, "RESOURCE_NOT_FOUND", "Recurso não encontrado.");
    }

    return resource;
  },
};
