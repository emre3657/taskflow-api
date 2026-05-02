import { z } from "zod";

// Register schema
export const registerSchema = z
  .object({
  username: z.string().trim().min(5, "Username must be at least 5 characters long").max(30, "Username must be at most 30 characters long"),
  email: z.email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .max(20, "Password must be at most 20 characters long")
    .regex(/[A-Za-z]/, "Password must contain at least one letter")
    .regex(/\d/, "Password must contain at least one number"),
  repassword: z.string().min(8).max(20)
  })
  .refine((data) => data.password === data.repassword, {
    error: "Passwords do not match", 
    path: ["repassword"]
  });


// Login schema
export const loginSchema = z.object({
username: z.string().trim().min(1, "Username is required"),
password: z
  .string()
  .min(1, "Password is required") 
});

// Forgot password schema
export const forgotPasswordSchema = z.object({
  email: z.email("Please enter a valid email address"),
});

// Reset password schema
export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(1, "Reset token is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters long")
      .max(20, "New password must be at most 20 characters long")
      .regex(/[A-Za-z]/, "New password must contain at least one letter")
      .regex(/\d/, "New password must contain at least one number"),
    repassword: z.string().min(8).max(20),
  })
  .refine((data) => data.newPassword === data.repassword, {
    error: "Passwords do not match",
    path: ["repassword"],
  });

// Verify email confirm schema
export const confirmEmailVerificationSchema = z.object({
  token: z.string().trim().min(1, "Verification token is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ConfirmEmailVerificationInput = z.infer<
  typeof confirmEmailVerificationSchema
>;