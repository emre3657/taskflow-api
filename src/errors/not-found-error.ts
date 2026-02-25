import { StatusCodes } from "http-status-codes";
import { CustomAPIError } from "./custom-api-error.js";

export class NotFoundError extends CustomAPIError {
  constructor(message: string = "Not found") {
    super(message, StatusCodes.NOT_FOUND, "NOT_FOUND");
  }
}