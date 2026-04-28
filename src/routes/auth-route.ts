import express from "express";
import { 
  register, 
  login, 
  refresh, 
  logout, 
  logoutAll, 
  forgotPassword, 
  resetPassword
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


export {
  router as authRouter
}