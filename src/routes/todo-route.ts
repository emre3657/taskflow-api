import express from "express";
import { createTodo, getTodos, getTodo, updateTodo, deleteTodo } from "../controllers/todo-controller.js";

const router = express.Router();

router.route("/").post(createTodo).get(getTodos);
router.route("/:id").get(getTodo).patch(updateTodo).delete(deleteTodo);

export { 
  router as todoRouter 
};