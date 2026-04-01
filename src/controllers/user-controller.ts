import type { UpdateMeInput, UpdatePasswordInput } from "../schemas/users-schema.js";
import type { RequestHandler } from "express";
import { StatusCodes } from "http-status-codes";
import { updateMeSchema, updatePasswordSchema } from "../schemas/users-schema.js";
import { getMeService, updateMeService, updatePasswordService, deleteMeService } from "../services/user-service.js";
import { clearRefreshTokenCookie } from "../helpers/cookie-helper.js";

// Get current user's profile
const getMe: RequestHandler = async (req, res) => {
  // Take user id from req.user, which is set by the authentication middleware
  const userId = req.user!.id;
 
  // Get the user data from the database using the service layer
  const user = await getMeService(userId);
  if (!user) return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found" });

  res.status(StatusCodes.OK).json({ user });
};

// Update current user's profile (email and username)
const updateMe: RequestHandler = async (req, res) => {
  // Parse req body, throw ZodError if not match with the schema 
  const userInput: UpdateMeInput = updateMeSchema.parse(req.body);

  const userId = req.user!.id;

  // Update the user data in the database using the service layer
  const updatedUser = await updateMeService(userId, userInput);

  res.status(StatusCodes.OK).json({ user: updatedUser });
};

// Update current user's password
const updatePassword: RequestHandler = async (req, res) => {
  // Parse req body, throw ZodError if not match with the schema
  const passwordInput: UpdatePasswordInput = updatePasswordSchema.parse(req.body);

  const userId = req.user!.id;

  // Update the user's password in the database using the service layer
  const updatedUser = await updatePasswordService(userId, passwordInput);

  res.status(StatusCodes.OK).json({ user: updatedUser });
};

// Delete current user's account
const deleteMe: RequestHandler = async (req, res) => {
  const userId = req.user!.id;
  
  // Delete the user from the database using the service layer
  await deleteMeService(userId);

  // Clear the refresh token cookie on the client
  clearRefreshTokenCookie(res);

  res.status(StatusCodes.NO_CONTENT).send();
};

export {
  getMe,
  updateMe,
  updatePassword,
  deleteMe,
}