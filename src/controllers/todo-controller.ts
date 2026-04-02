// Externals
import type { RequestHandler } from "express";
import { StatusCodes } from "http-status-codes";

// Types
import type { CreateTodoInput, UpdateTodoInput } from "../schemas/todo-schema.js";

// Schemas
import { createTodoSchema, updateTodoSchema } from "../schemas/todo-schema.js";

// Services
import { createTodoService, getTodosService, getTodoByIdService, updateTodoService, deleteTodoService } from "../services/todo-service.js";

type TodoIdParams = {
  id: string;
};

// Create a new todo
const createTodo: RequestHandler = async (req, res) => {
  const todoInput: CreateTodoInput = createTodoSchema.parse(req.body);
  const userId = req.user!.id;

  const todo = await createTodoService(userId, todoInput);
  res.status(StatusCodes.CREATED).json({ todo });
};

// Get all todos of the current user
const getTodos: RequestHandler = async (req, res) => {
  const userId = req.user!.id;

  const todos = await getTodosService(userId);
  res.status(StatusCodes.OK).json({ todos });
};

// Get a specific todo by id
const getTodo: RequestHandler<TodoIdParams> = async (req, res) => {
  const userId = req.user!.id;
  const { id: todoId } = req.params;

  const todo = await getTodoByIdService(userId, todoId);
  res.status(StatusCodes.OK).json({ todo });
};

// Update a specific todo by id
const updateTodo: RequestHandler<TodoIdParams> = async (req, res) => {
  const todoInput: UpdateTodoInput = updateTodoSchema.parse(req.body);
  const userId = req.user!.id;
  const { id: todoId } = req.params;

  const updatedTodo = await updateTodoService(userId, todoId, todoInput);
  res.status(StatusCodes.OK).json({ todo: updatedTodo });
};

// Delete a specific todo by id
const deleteTodo: RequestHandler<TodoIdParams> = async (req, res) => {
  const userId = req.user!.id;
  const { id: todoId } = req.params;

  await deleteTodoService(userId, todoId);
  res.status(StatusCodes.NO_CONTENT).send();
};

export { 
  createTodo, 
  getTodos, 
  getTodo, 
  updateTodo, 
  deleteTodo 
};
