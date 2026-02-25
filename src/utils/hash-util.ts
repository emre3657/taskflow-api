import crypto from "node:crypto";
import bcrypt from "bcryptjs";

export function hashRefreshToken(token: string) {
  return crypto
    .createHmac("sha256", process.env.REFRESH_SECRET!)
    .update(token)
    .digest("hex");
}

export function hashPassword (password: string) {
  return bcrypt.hash(password, 10);
}

export function comparePassword (candidatePassword: string, hashedPassword: string) {
  return bcrypt.compare(candidatePassword, hashedPassword);
}