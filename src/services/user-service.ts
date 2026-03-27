import type { UpdateMeInput } from "../schemas/users-schema.js";
import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../utils/hash-util.js";

type UpdateMeServiceInput = Omit<UpdateMeInput, "repassword">;
type UpdateUserData = {
  username?: string;
  email?: string;
  passwordHash?: string;
};

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

export async function updateMeService(userId: string, data: UpdateMeServiceInput) {
  let updatedData: UpdateUserData = {
    ...(data.username && { username: data.username }),
    ...(data.email && { email: data.email }),
  };

  if (data.password) {
    // Hash the password before saving to the database
    updatedData.passwordHash = await hashPassword(data.password);
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

export async function deleteMeService(userId: string) {
  return prisma.user.delete({
    where: { id: userId },
  });
}