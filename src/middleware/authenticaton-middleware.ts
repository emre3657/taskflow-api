import type { RequestHandler } from "express";
import  jwt from "jsonwebtoken";
import { UnauthenticatedError } from "../errors/unauthenticated-error.js";

export const authMiddleware: RequestHandler = (req, res, next) => {
  // Check req header for authorization field
  const { authorization } = req.headers; 
  if (!authorization || !authorization.startsWith("Bearer ")){
    throw new UnauthenticatedError("Invalid credentials");
  }

  const token = authorization.split(" ")[1];

  try {
    // Verify the access token
    const payload = jwt.verify(token, process.env.JWT_SECRET!);

    if (typeof payload === "string" || !payload.sub) {
      throw new UnauthenticatedError("Invalid credentials");
    }
    
    // Attach the user to the req
    req.user = { id: payload.sub, username: payload.username };
    next();
  } catch(err) {
    throw new UnauthenticatedError("Not authorized to access this route");
  }
}

