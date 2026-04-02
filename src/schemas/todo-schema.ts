import { z } from "zod";

// Create todo schema
export const createTodoSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(100, "Title too long"),
});

// Update todo schema
export const updateTodoSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(100, "Title too long").optional(),
  completed: z.boolean().optional(),
})
.refine((data) => data.title !== undefined || data.completed !== undefined, {
  message: "At least one of title or completed must be provided",
});

export type CreateTodoInput = z.infer<typeof createTodoSchema>;
export type UpdateTodoInput = z.infer<typeof updateTodoSchema>;