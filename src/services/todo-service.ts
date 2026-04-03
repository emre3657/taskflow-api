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
      completed: false,
      userId,
    },
  });
}

async function getTodosService(userId: string, query: GetTodosQuery) {
  const where: Prisma.TodoWhereInput = { userId };

  if (query.completed !== undefined) {
    where.completed = query.completed;
  }

  if (query.search) {
    where.title = {
      contains: query.search,
      mode: "insensitive",
    };
  }

  const sortValue = query.sort ?? "createdAt_desc";

  const allowedFields = ["createdAt", "title", "completed"] as const;
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
          [field]: direction === "asc" ? Prisma.SortOrder.asc : Prisma.SortOrder.desc,
        } as Prisma.TodoOrderByWithRelationInput);
      }

      return acc;
    }, []);

  const finalOrderBy = orderBy.length > 0 ? orderBy : [{ createdAt: Prisma.SortOrder.desc }];

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

async function updateTodoService(userId: string, todoId: string, data: UpdateTodoInput) {
  const existingTodo = await prisma.todo.findUnique({ where: { id: todoId } });
  if (!existingTodo) throw new NotFoundError("Todo not found");
  if (existingTodo.userId !== userId) throw new ForbiddenError("Access denied");

  return prisma.todo.update({
    where: { id: todoId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.completed !== undefined && { completed: data.completed }),
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