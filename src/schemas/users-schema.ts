import { z } from "zod";

// Update profile schema
export const updateMeSchema = z.object({
  username: z.string().trim().min(5, "Username must be at least 5 characters long").max(30, "Username must be at most 30 characters long").optional(),
  email: z.email("Please enter a valid email address").optional(),
})
.refine((data) => data.email !== undefined || data.username !== undefined, {
  message: "At least one of username or email must be provided",
});

// Update password schema
export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(8, "Current password must be at least 8 characters long"),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters long")
    .regex(/[A-Za-z]/, "New password must contain at least one letter")
    .regex(/\d/, "New password must contain at least one number"),
  repassword: z.string().min(8, "Confirm password must be at least 8 characters long"),
})
.refine((data) => data.newPassword === data.repassword, {
  message: "Passwords do not match",
  path: ["repassword"],
});

export type UpdateMeInput = z.infer<typeof updateMeSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;