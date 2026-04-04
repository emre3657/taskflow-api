// Types
import { Prisma } from "../generated/prisma/client.js";
import type { CreateTodoInput, UpdateTodoInput, GetTodosQuery } from "../schemas/todo-schema.js";

// Lib / DB
import { prisma } from "../lib/prisma.js";

// Errors
import { NotFoundError } from "../errors/not-found-error.js";
import { ForbiddenError } from "../errors/forbidden-error.js";

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

async function getTodosService(userId: string, query: GetTodosQuery) {
  const where: Prisma.TodoWhereInput = { userId };

  if (query.completed !== undefined) {
    where.completed = query.completed;
  }

  if (query.priority !== undefined) {
    where.priority = query.priority;
  }

  if (query.search) {
    where.OR = [
      {
        title: {
          contains: query.search,
          mode: "insensitive",
        },
      },
      {
        description: {
          contains: query.search,
          mode: "insensitive",
        },
      },
    ];
  }

  if (query.dueBefore || query.dueAfter) {
    where.dueDate = {
      ...(query.dueBefore && { lte: query.dueBefore }),
      ...(query.dueAfter && { gte: query.dueAfter }),
    };
  }

  const sortValue = query.sort ?? "createdAt_desc";

  const allowedFields = [
    "createdAt",
    "updatedAt",
    "title",
    "completed",
    "priority",
    "dueDate",
  ] as const;

  const allowedDirections = ["asc", "desc"] as const;

  type SortField = (typeof allowedFields)[number];
  type SortDirection = (typeof allowedDirections)[number];

  const orderBy: Prisma.TodoOrderByWithRelationInput[] = sortValue
    .split(",")
    .map((pair) => pair.trim())
    .filter(Boolean)
    .reduce<Prisma.TodoOrderByWithRelationInput[]>((acc, pair) => {
      const [field, direction] = pair.split("_");

      if (
        field &&
        direction &&
        allowedFields.includes(field as SortField) &&
        allowedDirections.includes(direction as SortDirection)
      ) {
        acc.push({
          [field]:
            direction === "asc"
              ? Prisma.SortOrder.asc
              : Prisma.SortOrder.desc,
        } as Prisma.TodoOrderByWithRelationInput);
      }

      return acc;
    }, []);

  const finalOrderBy =
    orderBy.length > 0
      ? orderBy
      : [{ createdAt: Prisma.SortOrder.desc }];

  const skip = (query.page - 1) * query.limit;
  const take = query.limit;

  const [todos, total] = await Promise.all([
    prisma.todo.findMany({
      where,
      orderBy: finalOrderBy,
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

async function getTodoByIdService(userId: string, todoId: string) {
  const todo = await prisma.todo.findUnique({ where: { id: todoId } });
  if (!todo) throw new NotFoundError("Todo not found");
  if (todo.userId !== userId) {console.log("Access denied"); throw new ForbiddenError("Access denied");}
  return todo;
}

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