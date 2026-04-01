import type { UpdateMeInput, UpdatePasswordInput } from "../schemas/users-schema.js";
import { prisma } from "../lib/prisma.js";
import { hashPassword, comparePassword } from "../utils/hash-util.js";
import { UnauthenticatedError } from "../errors/unauthenticated-error.js";
import { NotFoundError } from "../errors/not-found-error.js";

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
    ...(data.username && { username: data.username }),
    ...(data.email && { email: data.email }),
  };

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

  // Verify current password 
  const isMatch = await comparePassword(data.currentPassword, user.passwordHash);
  if (!isMatch) {
    throw new UnauthenticatedError("Current password is incorrect");
  }
  
  // Hash the new password
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