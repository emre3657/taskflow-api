import "dotenv/config";
import "express-async-errors";
import express from "express";
import cookieParser from "cookie-parser";
import { authRouter } from "./routes/auth-route.js";
import { prisma } from "./lib/prisma.js";
import { errorHandlerMiddleware } from "./middleware/error-handler-middleware.js";
import { notFoundMiddleware } from "./middleware/not-found-middleware.js";

// Create Express app
const app = express();

// Json parser middleware
app.use(express.json());

// Cookie parser middleware
app.use(cookieParser());

// Auth routes
app.use("/api/v1/auth", authRouter);

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