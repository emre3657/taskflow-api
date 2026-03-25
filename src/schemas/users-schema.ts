import { z } from "zod";

// At least one of username or email must be present
export const updateMeSchema = z.object({
  username: z.string().trim().min(5, "Username must be at least 5 characters long").max(30, "Username must be at most 30 characters long").optional(),
  email: z.email("Please enter a valid email address").optional(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Za-z]/, "Password must contain at least one letter")
    .regex(/\d/, "Password must contain at least one number")
    .optional(),
  repassword: z.string().min(8).optional()
  })
  .refine((data) => data.email !== undefined || data.username !== undefined || data.password !== undefined, {
    message: "At least one of username, email, or password must be provided"
  })
  .refine((data) => data.password === data.repassword, {
    error: "Passwords do not match", 
    path: ["repassword"]
  });

export type UpdateMeInput = z.infer<typeof updateMeSchema>;