import type{ RegisterInput, LoginInput } from "../controllers/auth-controller.js";
import type { AccessPayload } from "../utils/jwt-util.js";
import crypto from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { signAccessToken } from "../utils/jwt-util.js";
import { hashRefreshToken, hashPassword, comparePassword } from "../utils/hash-util.js";
import { ConflictError } from "../errors/conflict-error.js";
import { BadRequestError } from "../errors/bad-request-error.js";
import { UnauthenticatedError } from "../errors/unauthenticated-error.js";
import { addTime } from "../utils/day-util.js";


type RegisterServiceInput = Omit<RegisterInput, "repassword">;

// REGISTER
async function registerUser (input: RegisterServiceInput)  {
  const {username, email, password} = input;

  // Check username constraint 
  const existingByUsername = await prisma.user.findUnique({where: {username}});
  if(existingByUsername) {
    throw new ConflictError("Username already exists");
  }

  // Check email constraint 
  const existingByEmail = await prisma.user.findUnique({where: {email}});
  if(existingByEmail) {
    throw new ConflictError("Email already exists");
  }

  // Hash the password
  const passwordHash = await hashPassword(password);

  // Create an user
  const user = await prisma.user.create({
    data: {username, email, passwordHash},
    select: { id: true, username: true }
  });

  // Sign an access token
    const accessPayload: AccessPayload = {
      sub: user.id, 
      username: user.username
    };
    const accessToken = signAccessToken(accessPayload);
  
    // Create a refresh token
    const refreshToken = crypto.randomBytes(64).toString("hex");

    // Create a refresh token record
    await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: addTime(new Date(Date.now()), 30, "day")
      }
    });
    
    // Create returning object
    const result = {
      user: {
        id: user.id,
        username: user.username
      },
      accessToken,
      refreshToken
    }

  return result;
}


// LOGIN
async function loginUser(input: LoginInput) {
  const { username, password: candidatePassword } = input;
  
  const user = await prisma.user.findUnique({where: { username }, select: { id: true, username: true, passwordHash: true }});

  if (!user) {
    throw new BadRequestError("Invalid credentials");
  }

  const hashedPassword = user.passwordHash;
  const isMatch = await comparePassword(candidatePassword, hashedPassword);

  if (!isMatch) {
    throw new BadRequestError("Invalid credentials");
  }

  // Sign an access token
  const accessPayload: AccessPayload = {
    sub: user.id, 
    username: user.username
  };
  const accessToken = signAccessToken(accessPayload);

  // Create a refresh token
  const refreshToken = crypto.randomBytes(64).toString("hex");

  // Create a refresh token record
  await prisma.refreshToken.create({
  data: {
    userId: user.id,
    tokenHash: hashRefreshToken(refreshToken),
    expiresAt: addTime(new Date(Date.now()), 30, "day")
    }
  });
  
  // Create returning object
  const result = {
    user: {
      id: user.id,
      username: user.username
    },
    accessToken,
    refreshToken
  }

  return result;
}


// ROTATE 
async function rotateRefreshToken(rawToken: string) {
  // Hash refresh token that comes from cookie
  const tokenHash = hashRefreshToken(rawToken);

  // Find the record filtered by tokenHash
  const record = await prisma.refreshToken.findUnique({where: { tokenHash }});

  // Token not found
  if (!record) {
    throw new UnauthenticatedError("Invalid refresh token");
  }

  // End all sessions(different devices) related to the user if record.revokeAt is not null
  // That means the expired token was reused again: Potential REFRESH_TOKEN_LEAKAGE 
  if (record.revokedAt){
    await prisma.refreshToken.updateMany({
      where: { userId: record.userId, revokedAt: null},
      data: {revokedAt: new Date(), revokeReason: revokeReasons.REUSE_DETECTED}
    });
    throw new UnauthenticatedError("Invalid refresh token");
  }

  // Expired token
  if (record.expiresAt <= new Date()) {
    await prisma.refreshToken.updateMany({
      where: {id: record.id},
      data: {revokedAt: new Date(), revokeReason: revokeReasons.EXPIRED}
    });
    throw new UnauthenticatedError("Invalid refresh token");
  }

  // Rotate starting
  const newRefresh = crypto.randomBytes(64).toString("hex");
  const newHash = hashRefreshToken(newRefresh);

  // Sign an access token
  const accessPayload: AccessPayload = {
    sub: record.userId, 
  };
  const accessToken = signAccessToken(accessPayload);

  // Db transaction
  await prisma.$transaction([
    prisma.refreshToken.update(
      {
        where: { id: record.id },
        data: {
          replacedByTokenHash: newHash,
          revokedAt: new Date(),
          revokeReason: revokeReasons.ROTATE,
        },
      },
    ),
    prisma.refreshToken.create(
      {
        data: {
          userId: record.userId,
          tokenHash: newHash,
          expiresAt: addTime(new Date(Date.now()), 30, "day"),
        },
      },
    ),
  ]);

  const result = { accessToken, refreshToken: newRefresh };
  return result;
} 

// Revoke reasons
export const revokeReasons = {
  EXPIRED: "EXPIRED",
  ROTATE: "ROTATE",
  LOGOUT: "LOGOUT",
  LOGOUT_ALL: "LOGOUT_ALL",
  REUSE_DETECTED: "REUSE_DETECTED",
} as const;


export {
  registerUser,
  loginUser,
  rotateRefreshToken,
}

