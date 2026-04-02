// Externals
import type { RequestHandler } from "express";
import { StatusCodes } from "http-status-codes";

// Types
import type { UpdateMeInput, UpdatePasswordInput } from "../schemas/users-schema.js";

// Schemas
import { updateMeSchema, updatePasswordSchema } from "../schemas/users-schema.js";

// Services
import { getMeService, updateMeService, updatePasswordService, deleteMeService } from "../services/user-service.js";

// Utils / Helpers
import { clearRefreshTokenCookie } from "../helpers/cookie-helper.js";

// Get current user's profile
const getMe: RequestHandler = async (req, res) => {
  const userId = req.user!.id;
 
  const user = await getMeService(userId);
  if (!user) return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found" });

  res.status(StatusCodes.OK).json({ user });
};

// Update current user's profile (email and username)
const updateMe: RequestHandler = async (req, res) => {
  const userInput: UpdateMeInput = updateMeSchema.parse(req.body);
  const userId = req.user!.id;

  const updatedUser = await updateMeService(userId, userInput);

  res.status(StatusCodes.OK).json({ user: updatedUser });
};

// Update current user's password
const updatePassword: RequestHandler = async (req, res) => {
  const passwordInput: UpdatePasswordInput = updatePasswordSchema.parse(req.body);
  const userId = req.user!.id;

  const updatedUser = await updatePasswordService(userId, passwordInput);

  res.status(StatusCodes.OK).json({ user: updatedUser });
};

// Delete current user's account
const deleteMe: RequestHandler = async (req, res) => {
  const userId = req.user!.id;
  
  await deleteMeService(userId);
  clearRefreshTokenCookie(res);

  res.status(StatusCodes.NO_CONTENT).send();
};

export {
  getMe,
  updateMe,
  updatePassword,
  deleteMe,
}