import type { RequestHandler } from "express";
import { revokeReasons } from "../services/auth-service.js";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import {registerUser, loginUser, rotateRefreshToken} from "../services/auth-service.js";
import { UnauthenticatedError } from "../errors/unauthenticated-error.js";
import { addTime } from "../utils/day-util.js";
import { hashRefreshToken } from "../utils/hash-util.js";

const REFRESH_COOKIE_NAME = "refreshToken";
const REFRESH_COOKIE_PATH = "/api/v1/auth/refresh";

// Create register schema with Zod
const registerSchema = z
  .object({
  username: z.string().min(5, "Username must be at least 5 characters long"),
  email: z.email("Please enter a valid emaild adrress"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Za-z]/, "Password must contain at least one letter")
    .regex(/\d/, "Password must contain at least one number"),
  repassword: z.string().min(8)
  })
  .refine((data) => data.password === data.repassword, {
    error: "Passwords do not match", 
    path: ["repassword"]
  });

export type RegisterInput = z.infer<typeof registerSchema>;

const register: RequestHandler = async(req, res) => {
  // Parse req body, throw ZodError if not match with schema 
  const userInput = registerSchema.parse(req.body);

  // Register an user 
  const result = await registerUser(userInput);
  
  // Set the refresh token to the cookie
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: REFRESH_COOKIE_PATH ,
    expires: addTime(new Date(Date.now()), 30, "day"),
  });

  res.status(StatusCodes.CREATED).json({
    user: result.user,
    accessToken: result.accessToken
  });
};


const loginSchema = z.object({
  username: z.string().min(5, "Username must be at least 5 characters long"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Za-z]/, "Password must contain at least one letter")
    .regex(/\d/, "Password must contain at least one number"),
})

export type LoginInput = z.infer<typeof loginSchema>;

const login: RequestHandler = async(req, res) => {
  // Parse req body, throw ZodError if not match with schema 
  const userInput = loginSchema.parse(req.body);

  // Log in an user
  const result = await loginUser(userInput);

  // Set the refresh token to the cookie
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: REFRESH_COOKIE_PATH ,
    expires: addTime(new Date(Date.now()), 30, "day"),
  });

  res.status(StatusCodes.OK).json({
    user: result.user,
    accessToken: result.accessToken
  })
};


const refresh: RequestHandler = async (req, res) => {
  // Get the refresh token from cookies
  const refreshToken = req.cookies[REFRESH_COOKIE_NAME];

  if (!refreshToken) {
    throw new UnauthenticatedError("Missing refresh token");
  }

  // Run the rotate service
  const result = await rotateRefreshToken(refreshToken);

  // Set the refresh token to the cookie
  res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: REFRESH_COOKIE_PATH ,
    expires: addTime(new Date(Date.now()), 30, "day"),
  });

  res.status(StatusCodes.OK).json({
    accessToken: result.accessToken
  });
};

// Logout one device that matches with tokenHash
const logout: RequestHandler = async (req, res) => {
  // Get the refresh token from cookies
  const refreshToken = req.cookies[REFRESH_COOKIE_NAME];
  
  // Clear cookie
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: REFRESH_COOKIE_PATH ,
  });

  if (!refreshToken) {
    return res.sendStatus(StatusCodes.NO_CONTENT);
  }

  // Hash the refresh token
  const tokenHash = hashRefreshToken(refreshToken);

  // Revoke the token if null
  await prisma.refreshToken.updateMany({
    where: {
      tokenHash,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
      revokeReason: revokeReasons.LOGOUT,
    },
  });

  res.sendStatus(StatusCodes.NO_CONTENT);
}

// Logout all devices
const logoutAll: RequestHandler = async (req, res) => {
  // Get user id from the req
  const userId = req.user!.id; 

  // Clear cookie
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: REFRESH_COOKIE_PATH,
  });

  // Revoke all tokens related to the user
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date(), revokeReason: revokeReasons.LOGOUT_ALL },
  });

  res.sendStatus(StatusCodes.NO_CONTENT);
}


export {
  register,
  login,
  refresh,
  logout,
  logoutAll,
};