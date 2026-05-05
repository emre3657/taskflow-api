import express from "express";
import { rateLimit } from "express-rate-limit";
import { 
  register, 
  login, 
  refresh, 
  logout, 
  logoutAll, 
  forgotPassword, 
  resetPassword,
  confirmVerificationEmail,
  resendVerificationEmail
} from "../controllers/auth-controller.js";
import { authMiddleware } from "../middleware/authenticaton-middleware.js";

const router = express.Router();

// Limiter for login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 20, 
  message: "Too many authentication attempts, please try again later.",
});

// Limiter for forgot password, reset password, and email verification endpoints
const strictLimiter =  rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5, 
  message: "Too many email verification requests, please try again later.",
});

// Restricted routes
router.post("/login", loginLimiter, login);
router.post("/forgot-password", strictLimiter, forgotPassword);
router.post("/reset-password", strictLimiter, resetPassword);
router.post("/verify-email/confirm", strictLimiter, confirmVerificationEmail);

// Unrestricted routes
router.post("/register", register);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.post("/logout-all", authMiddleware, logoutAll);
router.post("/verify-email/resend", authMiddleware, resendVerificationEmail);

export {
  router as authRouter
}