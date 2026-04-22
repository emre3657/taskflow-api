// Types
import type { UpdateMeInput, UpdatePasswordInput } from "../schemas/users-schema.js";

// Lib / DB
import { prisma } from "../lib/prisma.js";

// Utils / Helpers
import { hashPassword, comparePassword } from "../utils/hash-util.js";

// Errors
import { UnauthenticatedError } from "../errors/unauthenticated-error.js";
import { NotFoundError, ConflictError } from "../errors/index.js";

// Get current user
export async function getMeService(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

// Update current user's profile (email and username)
export async function updateMeService(userId: string, data: UpdateMeInput) {
  const updatedData: UpdateMeInput = {
    ...(data.username !== undefined && { username: data.username }),
    ...(data.email !== undefined && { email: data.email }),
  };

  const [existingByUsername, existingByEmail] = await Promise.all([
    updatedData.username !== undefined
      ? prisma.user.findFirst({
          where: {
            username: updatedData.username,
            id: {
              not: userId,
            },
          },
        })
      : Promise.resolve(null),

    updatedData.email !== undefined
      ? prisma.user.findFirst({
          where: {
            email: updatedData.email,
            id: {
              not: userId,
            },
          },
        })
      : Promise.resolve(null),
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

  return prisma.user.update({
    where: { id: userId },
    data: updatedData,
    select: {
      id: true,
      email: true,
      username: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

// Update current user's password
export async function updatePasswordService(userId: string, data: UpdatePasswordInput) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, passwordHash: true },
  });

  if (!user || !user.passwordHash) {
    throw new NotFoundError("User not found");
  }

  const isMatch = await comparePassword(data.currentPassword, user.passwordHash);
  if (!isMatch) {
    throw new UnauthenticatedError("Current password is incorrect");
  }
  
  const newHashedPassword = await hashPassword(data.newPassword);

  return prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHashedPassword },
    select: {
      id: true,
      email: true,
      username: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

// Delete current user
export async function deleteMeService(userId: string) {
  return prisma.user.delete({
    where: { id: userId },
  });
}