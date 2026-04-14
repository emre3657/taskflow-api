import { StatusCodes } from "http-status-codes";
import { CustomAPIError } from "./custom-api-error.js";

export type ConflictErrorOptions = {
  field: string;
  message: string;
};

export class ConflictError extends CustomAPIError {
  errors: Array<ConflictErrorOptions>;

  constructor(message: string = "A conflict occurred", errors: Array<ConflictErrorOptions>) {
    super(message, StatusCodes.CONFLICT, "CONFLICT");
    this.errors = errors;
  }
} 