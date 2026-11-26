const { z } = require("zod");

const registerSchema = z.object({
  username: z.string().trim().min(3, "Username must be at least 3 characters").max(30),
  email: z.string().trim().email("Please provide a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
});

const loginSchema = z.object({
  email: z.string().trim().email("Please provide a valid email"),
  password: z.string().min(1, "Password is required"),
});

const taskStatus = z.enum(["todo", "in-progress", "done"]);
const taskPriority = z.enum(["low", "medium", "high"]);

const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  description: z.string().trim().max(1000).optional(),
  status: taskStatus.optional(),
  priority: taskPriority.optional(),
  dueDate: z.coerce.date().optional().nullable(),
});

const updateTaskSchema = createTaskSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "Provide at least one field to update" }
);

module.exports = {
  registerSchema,
  loginSchema,
  createTaskSchema,
  updateTaskSchema,
};
