import multer from "multer";
import type { RequestHandler } from "express";

import { AppError } from "../../error/app-error.js";

const multerUpload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB por imagem
    files: 5,
  },

  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(
        new AppError(
          400,
          "VALIDATION_ERROR",
          "Tipo de imagem inválido.",
          [
            {
              field: "images",
              message: "Apenas imagens JPEG, PNG ou WEBP são permitidas.",
            },
          ],
        ),
      );
    }

    return cb(null, true);
  },
});

export const uploadResourceImages: RequestHandler = (req, res, next) => {
  const upload = multerUpload.array("images", 5);

  upload(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof AppError) {
      return next(error);
    }

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return next(
          new AppError(
            400,
            "VALIDATION_ERROR",
            "A imagem excede o tamanho máximo permitido.",
            [
              {
                field: "images",
                message: "Cada imagem deve ter no máximo 5MB.",
              },
            ],
          ),
        );
      }

      if (error.code === "LIMIT_FILE_COUNT") {
        return next(
          new AppError(
            400,
            "VALIDATION_ERROR",
            "Foram enviadas imagens a mais.",
            [
              {
                field: "images",
                message: "Envie no máximo 5 imagens.",
              },
            ],
          ),
        );
      }
    }

    return next(
      new AppError(
        400,
        "VALIDATION_ERROR",
        "Erro ao processar as imagens enviadas.",
      ),
    );
  });
};

export const uploadProfilePhoto: RequestHandler = (req, res, next) => {
  const upload = multerUpload.single("photo");

  upload(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof AppError) {
      return next(error);
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return next(
        new AppError(
          400,
          "VALIDATION_ERROR",
          "A foto excede o tamanho máximo permitido.",
          [
            {
              field: "photo",
              message: "A foto deve ter no máximo 5MB.",
            },
          ],
        ),
      );
    }

    return next(
      new AppError(
        400,
        "VALIDATION_ERROR",
        "Erro ao processar a foto enviada.",
      ),
    );
  });
};
