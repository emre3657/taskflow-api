import express from "express";
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

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.post("/logout-all", authMiddleware, logoutAll);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/verify-email/resend", authMiddleware, resendVerificationEmail);
router.post("/verify-email/confirm", confirmVerificationEmail);

export {
  router as authRouter
}