import { CustomAPIError } from "./custom-api-error.js";
import { StatusCodes } from "http-status-codes";

export  class BadRequestError extends CustomAPIError {
  constructor(message: string) {
    super(message, StatusCodes.BAD_REQUEST);
  }
}