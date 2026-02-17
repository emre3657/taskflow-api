import type { ErrorRequestHandler } from "express";
import { Prisma } from "../generated/prisma/client.js";
import { ZodError } from "zod";
import { StatusCodes } from "http-status-codes";
import { CustomAPIError } from "../errors/custom-api-error.js";

export const errorHandlerMiddleware: ErrorRequestHandler = (err, req, res, next) => {
  // Zod errors
  if(err instanceof ZodError) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      errors: err.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message
      }))
    })
  }

  // Custom API errors
  if(err instanceof CustomAPIError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message
    })
  }

  // Prisma errors
  // PrismaClientKnownRequestError
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002": {
        // Unique constraint failed
        // err.meta?.target --> ["username"] | ["email"] | ["username", "email"]
        const target = (err.meta as any)?.target;
        const fields = Array.isArray(target) ? target.join(", ") : String(target ?? "");
        const message = fields
          ? `Already exists: ${fields}`
          : "Already exists (unique constraint).";

        return res.status(StatusCodes.CONFLICT).json({
          success: false,
          message,
        });
      }

      case "P2003": {
        // Foreign key constraint failed
        // meta.field_name --> foreign key 
        const field = (err.meta as any)?.field_name;
        return res.status(StatusCodes.CONFLICT).json({
          success: false,
          message: field
            ? `Invalid reference (foreign key): ${field}`
            : "Invalid reference (foreign key constraint).",
        });
      }

      case "P2025": {
        // Record not found
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Record not found.",
        });
      }

      case "P2000": {
        // Value too long for column
        const column = (err.meta as any)?.column_name;
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: column
            ? `Value too long for column: ${column}`
            : "Invalid input (value too long).",
        });
      }

      case "P2014": {
        // Relation violation
        return res.status(StatusCodes.CONFLICT).json({
          success: false,
          message: "Relation constraint failed.",
        });
      }

      case "P2016": {
        // Query interpretation error
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid query.",
        });
      }

      default:
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Database error.",
          code: err.code, // Keep it only development
        });
    }
  }

  // PrismaClientValidationError --> Query etc. Client side errors
  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: "Database validation error.",
    });
  }

  // Default error
  res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: "Internal Server Error",
  });
}

