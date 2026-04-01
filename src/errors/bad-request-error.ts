import { StatusCodes } from "http-status-codes";
import { CustomAPIError } from "./custom-api-error.js";

export  class BadRequestError extends CustomAPIError {
  constructor(message: string = "Bad request") {
    super(message, StatusCodes.BAD_REQUEST, "BAD_REQUEST");
  }
}