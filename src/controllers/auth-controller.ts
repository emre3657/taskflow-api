import type { RequestHandler } from "express";
import type { RegisterInput, LoginInput } from "../schemas/auth-schema.js";
import { revokeReasons } from "../services/auth-service.js";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../lib/prisma.js";
import { registerUser, loginUser, rotateRefreshToken } from "../services/auth-service.js";
import { UnauthenticatedError } from "../errors/unauthenticated-error.js";
import { hashRefreshToken } from "../utils/hash-util.js";
import { registerSchema, loginSchema } from "../schemas/auth-schema.js";
import { setRefreshTokenCookie, clearRefreshTokenCookie, REFRESH_COOKIE_NAME } from "../helpers/cookie-helper.js";


// REGISTER
const register: RequestHandler = async(req, res) => {
  // Parse req body, throw ZodError if not match with schema 
  const userInput: RegisterInput = registerSchema.parse(req.body);

  // Extract only necessary fields for the service layer
  const { username, email, password } = userInput;

  // Create an input object for the service layer
  const userServiceInput = { username, email, password };

  // Register an user 
  const result = await registerUser(userServiceInput);
  
  // Set the refresh token to the cookie
  setRefreshTokenCookie(res, result.refreshToken);

  res.status(StatusCodes.CREATED).json({
    user: result.user,
    accessToken: result.accessToken
  });
};


// LOGIN
const login: RequestHandler = async(req, res) => {
  // Parse req body, throw ZodError if not match with schema 
  const userInput: LoginInput = loginSchema.parse(req.body);

  // Get the current refresh token from cookies (if exists)
  const currentRefreshToken = req.cookies[REFRESH_COOKIE_NAME];
  
  // Log in an user
  const result = await loginUser(userInput, { currentRefreshToken });

  // Set the refresh token to the cookie
  setRefreshTokenCookie(res, result.refreshToken);

  res.status(StatusCodes.OK).json({
    user: result.user,
    accessToken: result.accessToken
  })
};

// REFRESH
const refresh: RequestHandler = async (req, res) => {
  // Get the refresh token from cookies
  const refreshToken = req.cookies[REFRESH_COOKIE_NAME];

  if (!refreshToken) {
    throw new UnauthenticatedError("Missing refresh token");
  }

  // Run the rotate service
  const result = await rotateRefreshToken(refreshToken);

  // Set the refresh token to the cookie
  setRefreshTokenCookie(res, result.refreshToken);

  res.status(StatusCodes.OK).json({
    accessToken: result.accessToken
  });
};

// LOGOUT: One device that matches with tokenHash
const logout: RequestHandler = async (req, res) => {
  // Get the refresh token from cookies
  const refreshToken = req.cookies[REFRESH_COOKIE_NAME];
  
  if (!refreshToken) {
    return res.status(StatusCodes.NO_CONTENT).send();
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

  // Clear cookie
  clearRefreshTokenCookie(res);

  res.status(StatusCodes.NO_CONTENT).send();
}

// LOGOUT: All devices
const logoutAll: RequestHandler = async (req, res) => {
  // Get user id from the req
  const userId = req.user!.id; 

  // Revoke all tokens related to the user
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date(), revokeReason: revokeReasons.LOGOUT_ALL },
  });

  // Clear the refresh token cookie on the client
  clearRefreshTokenCookie(res);

  res.status(StatusCodes.NO_CONTENT).send();
}


export {
  register,
  login,
  refresh,
  logout,
  logoutAll,
}