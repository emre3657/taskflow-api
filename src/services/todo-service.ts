// Types
import type { CreateTodoInput, UpdateTodoInput } from "../schemas/todo-schema.js";

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

async function getTodosService(userId: string) {
  return prisma.todo.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
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