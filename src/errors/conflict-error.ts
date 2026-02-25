import { StatusCodes } from "http-status-codes";
import { CustomAPIError } from "./custom-api-error.js";

export class ConflictError extends CustomAPIError {
  constructor(message: string = "Conflict") {
    super(message, StatusCodes.CONFLICT, "CONFLICT");
  }
} 