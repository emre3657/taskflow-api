import { StatusCodes } from "http-status-codes";
import { CustomAPIError } from "./custom-api-error.js";

export class UnauthenticatedError extends CustomAPIError {
  constructor (message: string = "Authentication required") {
    super(message, StatusCodes.UNAUTHORIZED, "UNAUTHENTICATED");
  }
}