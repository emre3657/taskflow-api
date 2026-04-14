// Externals
import crypto from "node:crypto";

// Types
import type { RegisterInput, LoginInput } from "../schemas/auth-schema.js";
import type { AccessPayload } from "../utils/jwt-util.js";

// Lib / DB
import { prisma } from "../lib/prisma.js";

// Utils / Helpers
import { addTime } from "../utils/day-util.js";
import { hashRefreshToken, hashPassword, comparePassword } from "../utils/hash-util.js";
import { signAccessToken } from "../utils/jwt-util.js";

// Errors
import { ConflictError } from "../errors/conflict-error.js";
import { UnauthenticatedError } from "../errors/unauthenticated-error.js";

type RegisterServiceInput = Omit<RegisterInput, "repassword">;
type LoginUserOptions = {
  currentRefreshToken?: string;
};

// REGISTER
async function registerUser (input: RegisterServiceInput)  {
  const {username, email, password} = input;

  // Check if the username or email is already taken
  const [existingByUsername, existingByEmail] = await Promise.all([
    prisma.user.findUnique({ where: { username } }),
    prisma.user.findUnique({ where: { email } }),
  ]);

  const errors = [];

  if (existingByUsername) {
    errors.push({
      field: "username",
      message: "This username is already taken.",
    });
  }

  if (existingByEmail) {
    errors.push({
      field: "email",
      message: "This email is already taken.",
    });
  }

  if (errors.length > 0) {
    throw new ConflictError("A conflict occurred", errors);
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
  
  return {
    user: {
      id: user.id,
      username: user.username
    },
    accessToken,
    refreshToken
  }
}

// LOGIN
async function loginUser(
  input: LoginInput,
  options?: LoginUserOptions
) {
  const { username, password: candidatePassword } = input;
  const currentRefreshToken = options?.currentRefreshToken;

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      passwordHash: true,
    },
  });

  if (!user) {
    throw new UnauthenticatedError("Invalid credentials");
  }

  const isMatch = await comparePassword(candidatePassword, user.passwordHash);

  if (!isMatch) {
    throw new UnauthenticatedError("Invalid credentials");
  }

  // Sign an access token
  const accessPayload: AccessPayload = {
    sub: user.id,
    username: user.username,
  };
  const accessToken = signAccessToken(accessPayload);

  // Create a refresh token
  const refreshToken = crypto.randomBytes(64).toString("hex");

  // Hash the refresh token before storing in db
  const newTokenHash = hashRefreshToken(refreshToken);

  // Db transaction: Revoke the current refresh token if exists, and create a new record for the new refresh token
  await prisma.$transaction(async (tx) => {
    if (currentRefreshToken) {
      const currentTokenHash = hashRefreshToken(currentRefreshToken);

      await tx.refreshToken.updateMany({
        where: {
          userId: user.id,
          tokenHash: currentTokenHash,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
          revokeReason: revokeReasons.NEW_LOGIN,
          replacedByTokenHash: newTokenHash,
        },
      });
    }

    await tx.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: newTokenHash,
        expiresAt: addTime(new Date(), 30, "day"),
      },
    });
  });

  return {
    user: {
      id: user.id,
      username: user.username,
    },
    accessToken,
    refreshToken,
  };
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

  // Db transaction: Revoke the current refresh token, and create a new record for the new refresh token
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
          expiresAt: addTime(new Date(), 30, "day"),
        },
      },
    ),
  ]);

  return { accessToken, refreshToken: newRefresh };
} 

// Revoke reasons
export const revokeReasons = {
  NEW_LOGIN: "NEW_LOGIN",
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

