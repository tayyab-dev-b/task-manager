const taskService = require("../services/taskService");
const asyncHandler = require("../utils/asyncHandler");

/** POST /api/tasks — protected */
const createTask = asyncHandler(async (req, res) => {
  const task = await taskService.createTask(req.user.id, req.body);
  res.status(201).json({
    success: true,
    message: "Task created successfully.",
    task,
  });
});

/** GET /api/tasks?status=&priority=&search=&page=&limit= — protected */
const getTasks = asyncHandler(async (req, res) => {
  const { tasks, pagination } = await taskService.listTasks(
    req.user.id,
    req.query
  );
  res.status(200).json({
    success: true,
    message: "Tasks retrieved successfully.",
    count: tasks.length,
    pagination,
    tasks,
  });
});

/** GET /api/tasks/:id — protected */
const getTask = asyncHandler(async (req, res) => {
  const task = await taskService.getOwnedTask(req.user.id, req.params.id);
  res.status(200).json({
    success: true,
    message: "Task retrieved successfully.",
    task,
  });
});

/** PATCH /api/tasks/:id — protected */
const updateTask = asyncHandler(async (req, res) => {
  const task = await taskService.updateTask(
    req.user.id,
    req.params.id,
    req.body
  );
  res.status(200).json({
    success: true,
    message: "Task updated successfully.",
    task,
  });
});

/** DELETE /api/tasks/:id — protected */
const deleteTask = asyncHandler(async (req, res) => {
  await taskService.deleteTask(req.user.id, req.params.id);
  res.status(200).json({
    success: true,
    message: "Task deleted successfully.",
  });
});

module.exports = { createTask, getTasks, getTask, updateTask, deleteTask };
