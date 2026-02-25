import type { ErrorRequestHandler } from "express";
import { Prisma } from "../generated/prisma/client.js";
import { ZodError } from "zod";
import { StatusCodes } from "http-status-codes";
import { CustomAPIError } from "../errors/custom-api-error.js";

export const errorHandlerMiddleware: ErrorRequestHandler = (err, req, res, next) => {
  // Zod
  if (err instanceof ZodError) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: "Validation error",
      code: "VALIDATION_ERROR",
      errors: err.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      })),
    });
  }

  // Custom
  if (err instanceof CustomAPIError) {
    return res.status(err.statusCode).json({
      message: err.message,
      code: err.name, 
    });
  }

  // Prisma known
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const target = (err.meta as any)?.target;
      const fields = Array.isArray(target)
        ? target
        : target
        ? [target]
        : [];

      return res.status(StatusCodes.CONFLICT).json({
        message: "Already exists",
        code: "UNIQUE_CONSTRAINT",
        fields,
      });
    }

    if (err.code === "P2025") {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "Record not found",
        code: "NOT_FOUND",
      });
    }

    return res.status(StatusCodes.BAD_REQUEST).json({
      message: "Database error",
      code: "DB_ERROR",
      ...(process.env.NODE_ENV !== "production" ? { dbCode: err.code } : {}),
    });
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: "Invalid input",
      code: "DB_VALIDATION_ERROR",
    });
  }

  // Default
  res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    message: "Internal Server Error",
    code: "INTERNAL_ERROR",
  });
};

