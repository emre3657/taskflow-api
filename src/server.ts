// Externals 
import "dotenv/config";
import "express-async-errors";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { xss } from "express-xss-sanitizer";
import rateLimit from "express-rate-limit";

// Lib / DB 
import { prisma } from "./lib/prisma.js";

// Routes
import { authRouter } from "./routes/auth-route.js";
import { userRouter } from "./routes/user-route.js";
import { todoRouter } from "./routes/todo-route.js";

// Middlewares
import { authMiddleware } from "./middleware/authenticaton-middleware.js";
import { errorHandlerMiddleware } from "./middleware/error-handler-middleware.js";
import { notFoundMiddleware } from "./middleware/not-found-middleware.js";

// Create Express app
const app = express();

// Set proxy trust
app.set("trust proxy", 1);

// Helmet - Security headers
app.use(helmet());

// CORS middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
}));

// Cookie parser middleware
app.use(cookieParser());

// Json parser middleware
app.use(express.json());

// XSS sanitization
app.use(xss());

// Auth routes
app.use("/api/v1/auth", authRouter);

// User routes (with authentication middleware)
app.use("/api/v1/users", authMiddleware, userRouter);

// Todo routes (with authentication middleware)
app.use("/api/v1/todos", authMiddleware, todoRouter);

// Not found middleware
app.use(notFoundMiddleware);

// Error handler middleware
app.use(errorHandlerMiddleware);

// Set port
const PORT = process.env.PORT || 3000;

// Start API
const start = async () => {
  await prisma.$connect();
  app.listen(PORT, () => {
  console.log(`API is running on port ${PORT}`);
  });
}

start();