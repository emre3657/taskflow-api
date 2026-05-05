// Externals
import crypto from "node:crypto";

// Types
import type { 
  RegisterInput, 
  LoginInput, 
  ForgotPasswordInput, 
  ResetPasswordInput,
  ConfirmEmailVerificationInput
} from "../schemas/auth-schema.js";
import type { AccessPayload } from "../utils/jwt-util.js";

// Internal modules
import { sendPasswordResetEmail, sendEmailVerificationEmail } from "./email-service.js";

// Lib / DB
import { prisma } from "../lib/prisma.js";

// Utils / Helpers
import { addTime } from "../utils/day-util.js";
import { hashRefreshToken, hashOneTimeToken, hashPassword, comparePassword } from "../utils/hash-util.js";
import { signAccessToken } from "../utils/jwt-util.js";

// Errors
import { ConflictError } from "../errors/conflict-error.js";
import { UnauthenticatedError } from "../errors/unauthenticated-error.js";

type RegisterServiceInput = Omit<RegisterInput, "repassword">;
type LoginUserOptions = {
  currentRefreshToken?: string;
};

// Register a new user
async function registerUserService(input: RegisterServiceInput) {
  const { username, email, password } = input;

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

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: { username, email, passwordHash },
    select: { id: true, username: true, email: true, emailVerifiedAt: true },
  });

  const accessPayload: AccessPayload = {
    sub: user.id,
    username: user.username,
  };
  const accessToken = signAccessToken(accessPayload);

  const refreshToken = crypto.randomBytes(64).toString("hex");

  const rawVerificationToken = crypto.randomBytes(32).toString("hex");
  const verificationTokenHash = hashOneTimeToken(rawVerificationToken);

  await prisma.$transaction([
    prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashRefreshToken(refreshToken),
        expiresAt: addTime(new Date(), 30, "day"),
      },
    }),
    prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: verificationTokenHash,
        expiresAt: addTime(new Date(), 30, "minute"),
      },
    }),
  ]);

  const frontendUrl = process.env.FRONTEND_URL;

  if (!frontendUrl) {
    throw new Error("FRONTEND_URL is not configured");
  }

  const verificationLink = `${frontendUrl}/verify-email?token=${rawVerificationToken}`;

  await sendEmailVerificationEmail({
    to: user.email,
    username: user.username,
    verificationLink,
  });

  return {
    user: {
      id: user.id,
      username: user.username,
      emailVerifiedAt: user.emailVerifiedAt,
    },
    accessToken,
    refreshToken,
  };
}
// Login user and create session
async function loginUserService(
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
      emailVerifiedAt: true,
    },
  });

  if (!user) {
    throw new UnauthenticatedError("Invalid credentials");
  }

  // Compare the password
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
      emailVerifiedAt: user.emailVerifiedAt,
    },
    accessToken,
    refreshToken,
  };
}


// Rotate refresh token
async function rotateRefreshTokenService(rawToken: string) {
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

  // Db transaction: Revoke the current refresh token, create a new record for the new refresh token and get the user info
  const [, , user] = await prisma.$transaction([
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
    prisma.user.findUnique({ 
      where: { id: record.userId }, 
      select: { id: true, username: true, emailVerifiedAt: true } 
    })
  ]);

  if (!user) {
    throw new UnauthenticatedError("User not found");
  }

  return { user, accessToken, refreshToken: newRefresh };
} 

// Forgot password
async function forgotPasswordService(input: ForgotPasswordInput) {
  const { email } = input;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, username: true },
  });

  if (!user) {
    return {
      message: "If an account with that email exists, a reset link has been sent.",
    };
  }

  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id },
  });

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashOneTimeToken(rawToken);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: addTime(new Date(), 15, "minute"),
    },
  });

  const frontendUrl = process.env.FRONTEND_URL;

  if (!frontendUrl) {
    throw new Error("FRONTEND_URL is not configured");
  }

  const resetLink = `${frontendUrl}/reset-password?token=${rawToken}`;

  await sendPasswordResetEmail({
    to: user.email,
    username: user.username,
    resetLink,
  });

  return {
    message: "If an account with that email exists, a reset link has been sent.",
  };
}

// Reset password
async function resetPasswordService(input: ResetPasswordInput) {
  const { token, newPassword } = input;

  const tokenHash = hashOneTimeToken(token);

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
    },
  });

  if (!record) {
    throw new UnauthenticatedError("Invalid or expired reset token");
  }

  if (record.expiresAt <= new Date()) {
    await prisma.passwordResetToken.deleteMany({
      where: { id: record.id },
    });

    throw new UnauthenticatedError("Invalid or expired reset token");
  }

  const newPasswordHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash: newPasswordHash },
    }),
    prisma.passwordResetToken.deleteMany({
      where: { userId: record.userId },
    }),
    prisma.refreshToken.updateMany({
      where: {
        userId: record.userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revokeReason: revokeReasons.PASSWORD_RESET,
      },
    }),
  ]);

  return {
    message: "Password reset successfully.",
  };
}

// Resend email verification
async function resendEmailVerificationService(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      emailVerifiedAt: true,
    },
  });

  if (!user) {
    throw new UnauthenticatedError("User not found");
  }

  if (user.emailVerifiedAt) {
    return {
      message: "Email is already verified.",
    };
  }

  await prisma.emailVerificationToken.deleteMany({
    where: { userId: user.id },
  });

  const rawVerificationToken = crypto.randomBytes(32).toString("hex");
  const verificationTokenHash = hashOneTimeToken(rawVerificationToken);

  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      tokenHash: verificationTokenHash,
      expiresAt: addTime(new Date(), 30, "minute"),
    },
  });

  const frontendUrl = process.env.FRONTEND_URL;

  if (!frontendUrl) {
    throw new Error("FRONTEND_URL is not configured");
  }

  const verificationLink = `${frontendUrl}/verify-email?token=${rawVerificationToken}`;

  await sendEmailVerificationEmail({
    to: user.email,
    username: user.username,
    verificationLink,
  });

  return {
    message: "A verification email has been sent.",
  };
}

// Confirm email verification
async function confirmEmailVerificationService(input: ConfirmEmailVerificationInput) {
  const { token } = input;

  const tokenHash = hashOneTimeToken(token);

  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
    },
  });

  if (!record) {
    throw new UnauthenticatedError("Invalid or expired verification token");
  }

  if (record.expiresAt <= new Date()) {
    await prisma.emailVerificationToken.deleteMany({
      where: { id: record.id },
    });

    throw new UnauthenticatedError("Invalid or expired verification token");
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: {
        emailVerifiedAt: new Date(),
      },
    }),
    prisma.emailVerificationToken.deleteMany({
      where: { userId: record.userId },
    }),
  ]);

  return {
    message: "Email verified successfully.",
  };
}

// Revoke reasons
export const revokeReasons = {
  NEW_LOGIN: "NEW_LOGIN",
  EXPIRED: "EXPIRED",
  ROTATE: "ROTATE",
  LOGOUT: "LOGOUT",
  LOGOUT_ALL: "LOGOUT_ALL",
  REUSE_DETECTED: "REUSE_DETECTED",
  PASSWORD_RESET: "PASSWORD_RESET",
} as const;


export {
  registerUserService,
  loginUserService,
  rotateRefreshTokenService,
  forgotPasswordService,
  resetPasswordService,
  resendEmailVerificationService,
  confirmEmailVerificationService
}

