import crypto from "node:crypto";

<<<<<<< HEAD
=======
import { env } from "../../../env.js";
>>>>>>> 884a15f (fix production bugs)
import { AppError } from "../../error/app-error.js";
import { getSupabaseClient } from "../../shared/storage/supabase.js";

function getImageExtension(mimetype: string) {
  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  return extensions[mimetype];
}

type UploadResourceImageInput = {
  resourceId: string;
  file: Express.Multer.File;
};

type UploadUserAvatarInput = {
  userId: string;
  file: Express.Multer.File;
};

export const resourceStorageService = {
  async uploadResourceImage(input: UploadResourceImageInput) {
    const bucket = getResourcesBucket();
    const supabase = getSupabaseClient();
    const extension = getImageExtension(input.file.mimetype);

    if (!extension) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "Formato de imagem inválido.",
        [
          {
            field: "images",
            message: "Apenas imagens JPEG, PNG ou WEBP são permitidas.",
          },
        ],
      );
    }

    const fileName = `${crypto.randomUUID()}.${extension}`;
    const storageKey = `resources/${input.resourceId}/${fileName}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(storageKey, input.file.buffer, {
        contentType: input.file.mimetype,
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw new AppError(
        500,
        "IMAGE_UPLOAD_FAILED",
        "Não foi possível enviar a imagem.",
        [
          {
            field: "images",
            message: error.message,
          },
        ],
      );
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(storageKey);

    return {
      url: data.publicUrl,
      storageKey,
    };
  },

  async uploadUserAvatar(input: UploadUserAvatarInput) {
    const bucket = getResourcesBucket();
    const supabase = getSupabaseClient();
    const extension = getImageExtension(input.file.mimetype);

    if (!extension) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "Formato de imagem inválido.",
        [
          {
            field: "photo",
            message: "Apenas imagens JPEG, PNG ou WEBP são permitidas.",
          },
        ],
      );
    }

    const fileName = `${crypto.randomUUID()}.${extension}`;
    const storageKey = `users/${input.userId}/avatar/${fileName}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(storageKey, input.file.buffer, {
        contentType: input.file.mimetype,
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw new AppError(
        500,
        "IMAGE_UPLOAD_FAILED",
        "Não foi possível enviar a foto.",
        [
          {
            field: "photo",
            message: error.message,
          },
        ],
      );
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(storageKey);

    return {
      url: data.publicUrl,
      storageKey,
    };
  },

  async deleteResourceImages(storageKeys: string[]) {
    if (storageKeys.length === 0) return;

    const bucket = getResourcesBucket();
    const supabase = getSupabaseClient();
    const { error } = await supabase.storage.from(bucket).remove(storageKeys);

    if (error) {
      throw new AppError(
        500,
        "IMAGE_DELETE_FAILED",
        "Não foi possível remover as imagens do storage.",
        [
          {
            field: "images",
            message: error.message,
          },
        ],
      );
    }
  },
};

function getResourcesBucket() {
<<<<<<< HEAD
  const bucket = process.env.SUPABASE_BUCKET_RESOURCES;

  if (!bucket) {
    throw new Error("SUPABASE_BUCKET_RESOURCES não foi definido no .env.");
  }

  return bucket;
=======
  return env.SUPABASE_BUCKET_RESOURCES;
>>>>>>> 884a15f (fix production bugs)
}
