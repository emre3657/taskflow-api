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

// Get todos query schema
export const getTodosQuerySchema = z.object({
  completed: z.enum(["true", "false"]).optional()
    .transform((val) => {
      if (val === "true") return true;
      if (val === "false") return false;
      return undefined;
  }),
  search: z.string().trim().optional().transform((val) => (val === "" ? undefined : val)),
  sort: z.string().trim().optional().transform((val) => (val === "" ? undefined : val)),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type CreateTodoInput = z.infer<typeof createTodoSchema>;
export type UpdateTodoInput = z.infer<typeof updateTodoSchema>;
export type GetTodosQuery = z.infer<typeof getTodosQuerySchema>;