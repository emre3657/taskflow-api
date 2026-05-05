import type { Response } from "express";
import { addTime } from "../utils/day-util.js";

export const REFRESH_COOKIE_NAME = "refreshToken";
const REFRESH_COOKIE_PATH = "/api/v1/auth";

// Cookie Helper Functions
// Set the refresh token in the cookie
export function setRefreshTokenCookie(res: Response, refreshToken: string) {
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: REFRESH_COOKIE_PATH,
    expires: addTime(new Date(), 30, "day"),
  });
}

// Clear the refresh token cookie
export function clearRefreshTokenCookie(res: Response) {
  const isProduction = process.env.NODE_ENV === "production";

  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: REFRESH_COOKIE_PATH,
  });
}