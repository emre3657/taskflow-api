import { z } from "zod";

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

// Create register schema with Zod
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


// Create login schema with Zod
export const loginSchema = z.object({
username: z.string().trim().min(1, "Username is required"),
password: z
  .string()
  .min(1, "Password is required") 
});

