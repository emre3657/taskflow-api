import type { UpdateMeInput } from "../schemas/users-schema.js";
import type { RequestHandler } from "express";
import { StatusCodes } from "http-status-codes";
import { updateMeSchema } from "../schemas/users-schema.js";
import { getMeService, updateMeService, deleteMeService } from "../services/user-service.js";

const getMe: RequestHandler = async (req, res) => {
  // Take user id from req.user, which is set by the authentication middleware
  const userId = req.user!.id;
 
  const user = await getMeService(userId);
  if (!user) return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found" });

  res.status(StatusCodes.OK).json({ user });
};

const updateMe: RequestHandler = async (req, res) => {
  // Parse req body, throw ZodError if not match with the schema 
  const userInput: UpdateMeInput = updateMeSchema.parse(req.body);

  const userId = req.user!.id;

  // Prepare the data for the service layer and update the user
  const { username, email, password } = userInput;
  const userServiceInput = { username, email, password };
  const updatedUser = await updateMeService(userId, userServiceInput);

  res.status(StatusCodes.OK).json({ user: updatedUser });
};

const deleteMe: RequestHandler = async (req, res) => {
  const userId = req.user!.id;
  
  await deleteMeService(userId);

  res.status(StatusCodes.NO_CONTENT).send();
};

export {
  getMe,
  updateMe,
  deleteMe
}