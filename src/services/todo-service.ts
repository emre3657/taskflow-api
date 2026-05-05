// Types
import { Prisma } from "../generated/prisma/client.js";
import type { CreateTodoInput, UpdateTodoInput, GetTodosQuery } from "../schemas/todo-schema.js";

// Lib / DB
import { prisma } from "../lib/prisma.js";

// Helpers
import {
  buildPrismaOrderBy,
  buildPrismaWhere,
  buildRawOrderBy,
  buildRawStatusConditions,
  parseSortPairs,
  type RawTodoRow,
} from "./todo-service-helpers.js";

// Errors
import { NotFoundError } from "../errors/not-found-error.js";
import { ForbiddenError } from "../errors/forbidden-error.js";

// Create a new todo
async function createTodoService(userId: string, data: CreateTodoInput) {
  return prisma.todo.create({
    data: {
      title: data.title,
      description: data.description,
      priority: data.priority,
      completed: false,
      dueDate: data.dueDate,
      userId,
    },
  });
}

// Get todos with filtering, sorting, and pagination
async function getTodosService(userId: string, query: GetTodosQuery) {
  const useRawStatusFilter = query.status !== undefined;
  const sortPairs = parseSortPairs(query.sort);
  const skip = (query.page - 1) * query.limit;
  const take = query.limit;
  const now = new Date();

  if (useRawStatusFilter) {
    const conditions = buildRawStatusConditions(userId, query, now);
    const orderByRaw = buildRawOrderBy(sortPairs);

    const [todos, countResult] = await Promise.all([
      prisma.$queryRaw<RawTodoRow[]>`
        SELECT *
        FROM "Todo"
        WHERE ${Prisma.join(conditions, " AND ")}
        ORDER BY ${orderByRaw}
        OFFSET ${skip}
        LIMIT ${take};
      `,
      prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) AS count
        FROM "Todo"
        WHERE ${Prisma.join(conditions, " AND ")};
      `,
    ]);

    const total = Number(countResult[0]?.count ?? 0);

    return {
      todos,
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  const where = buildPrismaWhere(userId, query);
  const orderBy = buildPrismaOrderBy(sortPairs);

  const [todos, total] = await Promise.all([
    prisma.todo.findMany({
      where,
      orderBy,
      skip,
      take,
    }),
    prisma.todo.count({ where }),
  ]);

  return {
    todos,
    total,
    page: query.page,
    limit: query.limit,
  };
}

// Get a single todo by ID
async function getTodoByIdService(userId: string, todoId: string) {
  const todo = await prisma.todo.findUnique({ where: { id: todoId } });
  if (!todo) throw new NotFoundError("Todo not found");
  if (todo.userId !== userId) throw new ForbiddenError("Access denied");
  return todo;
}

// Update a todo
async function updateTodoService(
  userId: string,
  todoId: string,
  data: UpdateTodoInput
) {
  const existingTodo = await prisma.todo.findUnique({ where: { id: todoId } });

  if (!existingTodo) throw new NotFoundError("Todo not found");
  if (existingTodo.userId !== userId) throw new ForbiddenError("Access denied");

  return prisma.todo.update({
    where: { id: todoId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.priority !== undefined && { priority: data.priority }),
      ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
      ...(data.completed !== undefined && {
          completed: data.completed,
          completedAt:
            data.completed === existingTodo.completed
              ? existingTodo.completedAt
              : data.completed
                ? new Date()
                : null,
        }
      ),
    },
  });
}

// Delete a todo
async function deleteTodoService(userId: string, todoId: string) {
  const existingTodo = await prisma.todo.findUnique({ where: { id: todoId } });
  if (!existingTodo) throw new NotFoundError("Todo not found");
  if (existingTodo.userId !== userId) throw new ForbiddenError("Access denied");

  return prisma.todo.delete({ where: { id: todoId } });
}

export { 
  createTodoService, 
  getTodosService,
  getTodoByIdService, 
  updateTodoService, 
  deleteTodoService
};