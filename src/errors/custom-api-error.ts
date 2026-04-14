import type { ConflictErrorOptions } from "./conflict-error.js";

export abstract class CustomAPIError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly errors: Array<ConflictErrorOptions>;

  constructor(message: string, statusCode: number, code: string, errors: Array<ConflictErrorOptions> = []) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors; // Just using for conflict error.

    Error.captureStackTrace(this, this.constructor);
  }
}