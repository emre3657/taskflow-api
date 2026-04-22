import { z } from "zod";

export const todoPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH"]);

// Create todo schema
export const createTodoSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(100, "Title too long"),
  description: z.string().trim().max(1000, "Description too long").optional()
    .transform((val) => (val === "" ? undefined : val)),
  priority: todoPrioritySchema.optional().default("MEDIUM"),
  dueDate: z.coerce.date().optional(),
});

// Update todo schema
export const updateTodoSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(100, "Title too long").optional(),
  description: z.string().trim().max(1000, "Description too long").nullable().optional()
    .transform((val) => (val === "" ? undefined : val)),
  completed: z.boolean().optional(),
  priority: todoPrioritySchema.optional(),
  dueDate: z.coerce.date().nullable().optional(),
}).refine(
  (data) =>
    data.title !== undefined ||
    data.description !== undefined ||
    data.completed !== undefined ||
    data.priority !== undefined ||
    data.dueDate !== undefined,
  {
    message: "At least one field must be provided",
  }
);

// Get todos query schema
export const getTodosQuerySchema = z.object({
  completed: z.enum(["true", "false"]).optional().transform((val) => {
    if (val === "true") return true;
    if (val === "false") return false;
    return undefined;
  }),
  priority: todoPrioritySchema.optional(),
  search: z.string().trim().optional().transform((val) => (val === "" ? undefined : val)),
  status: z
    .enum(['completed_on_time', 'completed_late', 'overdue'])
    .optional(),
  sort: z.string().trim().optional().transform((val) => (val === "" ? undefined : val)),
  dueBefore: z.coerce.date().optional(),
  dueAfter: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
}).refine(
  (data) =>
    !data.dueBefore ||
    !data.dueAfter ||
    data.dueAfter <= data.dueBefore,
  {
    message: "dueAfter must be earlier than or equal to dueBefore",
    path: ["dueAfter"],
  }
);

export type CreateTodoInput = z.infer<typeof createTodoSchema>;
export type UpdateTodoInput = z.infer<typeof updateTodoSchema>;
export type GetTodosQuery = z.infer<typeof getTodosQuerySchema>;
export type TodoPriorityInput = z.infer<typeof todoPrioritySchema>;