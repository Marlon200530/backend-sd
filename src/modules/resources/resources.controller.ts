import type { Request, Response } from "express";

import { AppError } from "../../error/app-error.js";
import { resourcesService } from "./resources.service.js";

import type {
  ResourceCreateBodyInput,
  ResourceImageIdParamsInput,
  ResourceIdParamsInput,
  ResourceImagesUploadBodyInput,
  ResourceListQueryInput,
  ResourceModerationInput,
  UpdateResourceInput,
} from "./resources.schemas.js";
import { sendSuccess } from "../../utils/api-response.js";

function requireAuthenticatedUser(req: Request) {
  if (!req.user) {
    throw new AppError(401, "AUTH_TOKEN_INVALID", "Utilizador autenticado não encontrado.");
  }

  return req.user;
}

export const resourcesController = {
  async list(req: Request, res: Response) {
    const query = req.query as unknown as ResourceListQueryInput;
    const result = await resourcesService.list(query);

    return res.status(200).json({ success: true, data: result.data, meta: result.meta });
  },

  async create(req: Request, res: Response) {
    const user = requireAuthenticatedUser(req);
    const body = req.body as ResourceCreateBodyInput;
    const resourceInput = {
      ownerId: user.id,
      categoryId: body.categoryId,
      title: body.title,
      description: body.description,
      condition: body.condition,
      location: body.location,
      ...(body.visibleFrom !== undefined ? { visibleFrom: body.visibleFrom } : {}),
    };

    const resource = await resourcesService.create(resourceInput);

    return res.status(201).json({
      success: true,
      data: resource,
    });
  },

  async update(req: Request, res: Response) {
    const user = requireAuthenticatedUser(req);
    const params = req.params as ResourceIdParamsInput;
    const body = req.body as UpdateResourceInput;

    const resource = await resourcesService.update({
      resourceId: params.id,
      userId: user.id,
      userRole: user.role,
      data: body,
    });

    return res.status(200).json({
      success: true,
      data: resource,
    });
  },

  async remove(req: Request, res: Response) {
    const user = requireAuthenticatedUser(req);
    const params = req.params as ResourceIdParamsInput;

    await resourcesService.remove({
      resourceId: params.id,
      userId: user.id,
      userRole: user.role,
    });

    return res.status(204).send();
  },

  async moderate(req: Request, res: Response) {
    const params = req.params as ResourceIdParamsInput;
    const body = req.body as ResourceModerationInput;
    const resource = await resourcesService.moderate({
      resourceId: params.id,
      action: body.action,
    });

    return sendSuccess(res, 200, resource);
  },

  async addImages(req: Request, res: Response) {
    const user = requireAuthenticatedUser(req);
    const params = req.params as ResourceIdParamsInput;
    const body = req.body as ResourceImagesUploadBodyInput;
    const files = req.files as Express.Multer.File[] | undefined;

    if (!files || files.length === 0) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "Envie pelo menos uma imagem.",
        [
          {
            field: "images",
            message: "Envie pelo menos uma imagem.",
          },
        ],
      );
    }

    if (body.coverIndex >= files.length) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "Índice da imagem de capa inválido.",
        [
          {
            field: "coverIndex",
            message: "O índice da capa deve corresponder a uma das imagens enviadas.",
          },
        ],
      );
    }

    const addImagesInput = {
      resourceId: params.id,
      userId: user.id,
      userRole: user.role,
      files,
      coverIndex: body.coverIndex,
      ...(body.altText !== undefined ? { altText: body.altText } : {}),
    };

    const images = await resourcesService.addImages(addImagesInput);

    return res.status(201).json({
      success: true,
      data: images,
    });
  },

  async findById(req: Request, res: Response) {
    const params = req.params as ResourceIdParamsInput;
    const resource = await resourcesService.getResourceByIdService(params.id);

    return sendSuccess(res, 200, resource);
  },

  async deleteImage(req: Request, res: Response) {
    const user = requireAuthenticatedUser(req);
    const params = req.params as ResourceImageIdParamsInput;

    await resourcesService.deleteImage({
      resourceId: params.id,
      imageId: params.imageId,
      userId: user.id,
      userRole: user.role,
    });

    return res.status(204).send();
  },
};
