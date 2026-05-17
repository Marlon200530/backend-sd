import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";

import { isProd } from "../env.js";
import { AppError } from "../error/app-error.js";
import { isJwtTokenExpiredError, isJwtTokenInvalidError } from "../jwt/jwt-errors.js";

type ErrorWithHttpParserMetadata = Error & {
  status?: number;
  type?: string;
};

type PgError = Error & {
  code?: string;
  constraint?: string;
};

function isMalformedJsonError(error: unknown): error is ErrorWithHttpParserMetadata {
  return (
    error instanceof SyntaxError &&
    typeof error === "object" &&
    "status" in error &&
    (error as ErrorWithHttpParserMetadata).status === 400 &&
    (error as ErrorWithHttpParserMetadata).type === "entity.parse.failed"
  );
}

function isClientBodyParserError(error: unknown): error is ErrorWithHttpParserMetadata {
  return (
    error instanceof Error &&
    typeof error === "object" &&
    "status" in error &&
    typeof (error as ErrorWithHttpParserMetadata).status === "number" &&
    (error as ErrorWithHttpParserMetadata).status! >= 400 &&
    (error as ErrorWithHttpParserMetadata).status! < 500
  );
}

function isPgUniqueViolation(error: unknown): error is PgError {
  return error instanceof Error && (error as PgError).code === "23505";
}

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(404, "ROUTE_NOT_FOUND", `Rota ${req.method} ${req.originalUrl} não encontrada.`));
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (isMalformedJsonError(error)) {
    return res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "JSON inválido no corpo da requisição.",
      },
    });
  }

  if (isClientBodyParserError(error)) {
    const statusCode = error.status ?? 400;

    return res.status(statusCode).json({
      success: false,
      error: {
        code: statusCode === 413 ? "PAYLOAD_TOO_LARGE" : "VALIDATION_ERROR",
        message:
          statusCode === 413
            ? "Corpo da requisição demasiado grande."
            : "Corpo da requisição inválido.",
      },
    });
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details !== undefined ? { details: error.details } : {}),
      },
    });
  }

  if (error instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Dados da requisição inválidos.",
        details: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      },
    });
  }

  if (isJwtTokenExpiredError(error)) {
    return res.status(401).json({
      success: false,
      error: {
        code: "AUTH_TOKEN_EXPIRED",
        message: "Token expirado.",
      },
    });
  }

  if (isJwtTokenInvalidError(error)) {
    return res.status(401).json({
      success: false,
      error: {
        code: "AUTH_TOKEN_INVALID",
        message: "Token inválido.",
      },
    });
  }

  if (isPgUniqueViolation(error) && error.constraint === "users_email_unique") {
    return res.status(409).json({
      success: false,
      error: {
        code: "USER_EMAIL_ALREADY_EXISTS",
        message: "Email já registado.",
      },
    });
  }

  console.error(error);

  return res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Erro interno do servidor.",
      ...(!isProd() && error instanceof Error ? { details: { message: error.message } } : {}),
    },
  });
};
