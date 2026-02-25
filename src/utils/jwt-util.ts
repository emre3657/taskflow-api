import jwt from "jsonwebtoken";

export type AccessPayload = {
  sub: string;
  username?: string;
} 

export function signAccessToken(payload: AccessPayload) {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: "15m",
    issuer: "todo-api",
    audience: "todo-web"
  });
}

export function verifyAccessToken (token: string) {
  return jwt.verify(token, process.env.JWT_SECRET!, {
    issuer: "todo-api",
    audience: "todo-web"
  });
}



