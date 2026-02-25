import { RequestHandler } from "express";
import { StatusCodes } from "http-status-codes";

export const notFoundMiddleware: RequestHandler =  (req, res) => {
  res.status(StatusCodes.NOT_FOUND).json({message: `Route ${req.originalUrl} not found`})
} 