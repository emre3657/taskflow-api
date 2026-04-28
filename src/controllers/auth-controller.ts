// Externals
import type { RequestHandler } from "express";
import { StatusCodes } from "http-status-codes";

// Types
import type {
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from "../schemas/auth-schema.js";

// Schemas
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../schemas/auth-schema.js";

// Lib / DB
import { prisma } from "../lib/prisma.js";

// Services
import {
  registerUserService,
  loginUserService,
  rotateRefreshTokenService,
  forgotPasswordService,
  resetPasswordService,
  revokeReasons,
} from "../services/auth-service.js";

// Utils / Helpers
import { hashRefreshToken } from "../utils/hash-util.js";
import { setRefreshTokenCookie, clearRefreshTokenCookie, REFRESH_COOKIE_NAME } from "../helpers/cookie-helper.js";

// Errors
import { UnauthenticatedError } from "../errors/unauthenticated-error.js";


// REGISTER
const register: RequestHandler = async(req, res) => {
  const userInput: RegisterInput = registerSchema.parse(req.body);
  const { username, email, password } = userInput;
  const userServiceInput = { username, email, password };

  const result = await registerUserService(userServiceInput);
  setRefreshTokenCookie(res, result.refreshToken);

  res.status(StatusCodes.CREATED).json({
    user: result.user,
    accessToken: result.accessToken
  });
};


// LOGIN
const login: RequestHandler = async(req, res) => {
  const userInput: LoginInput = loginSchema.parse(req.body);
  const currentRefreshToken = req.cookies[REFRESH_COOKIE_NAME];
  
  const result = await loginUserService(userInput, { currentRefreshToken });
  setRefreshTokenCookie(res, result.refreshToken);

  res.status(StatusCodes.OK).json({
    user: result.user,
    accessToken: result.accessToken
  })
};

// REFRESH
const refresh: RequestHandler = async (req, res) => {
  const refreshToken = req.cookies[REFRESH_COOKIE_NAME];
  if (!refreshToken) {
    throw new UnauthenticatedError("Missing refresh token");
  }

  const result = await rotateRefreshTokenService(refreshToken);
  setRefreshTokenCookie(res, result.refreshToken);

  res.status(StatusCodes.OK).json({
    user: result.user,
    accessToken: result.accessToken
  });
};

// LOGOUT: One device that matches with tokenHash
const logout: RequestHandler = async (req, res) => {
  const refreshToken = req.cookies[REFRESH_COOKIE_NAME];
  if (!refreshToken) {
    return res.status(StatusCodes.NO_CONTENT).send();
  }

  const tokenHash = hashRefreshToken(refreshToken);

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

  clearRefreshTokenCookie(res);

  res.status(StatusCodes.NO_CONTENT).send();
}

// LOGOUT: All devices
const logoutAll: RequestHandler = async (req, res) => {
  const userId = req.user!.id; 

  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date(), revokeReason: revokeReasons.LOGOUT_ALL },
  });

  clearRefreshTokenCookie(res);

  res.status(StatusCodes.NO_CONTENT).send();
}

// FORGOT PASSWORD
const forgotPassword: RequestHandler = async (req, res) => {
  const userInput: ForgotPasswordInput = forgotPasswordSchema.parse(req.body);

  const result = await forgotPasswordService(userInput);

  res.status(StatusCodes.OK).json({
    message: result.message,
  });
};

// RESET PASSWORD
const resetPassword: RequestHandler = async (req, res) => {
  const userInput: ResetPasswordInput = resetPasswordSchema.parse(req.body);

  const result = await resetPasswordService(userInput);

  res.status(StatusCodes.OK).json({
    message: result.message,
  });
};

export {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  forgotPassword,
  resetPassword
}