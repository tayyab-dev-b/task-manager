const Task = require("../models/Task");
const AppError = require("../utils/AppError");

/**
 * All task queries are scoped by `owner`, so a user can only ever
 * see and modify their own tasks.
 */

async function createTask(ownerId, data) {
  return Task.create({ ...data, owner: ownerId });
}

/**
 * List the owner's tasks with optional status/priority filters
 * and page/limit pagination.
 */
async function listTasks(ownerId, query = {}) {
  const filter = { owner: ownerId };

  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;
  if (query.search) {
    filter.title = { $regex: query.search, $options: "i" };
  }

  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 100);
  const skip = (page - 1) * limit;

  const [tasks, total] = await Promise.all([
    Task.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Task.countDocuments(filter),
  ]);

  return {
    tasks,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/** Find one of the owner's tasks or throw 404. */
async function getOwnedTask(ownerId, taskId) {
  const task = await Task.findOne({ _id: taskId, owner: ownerId });
  if (!task) {
    throw new AppError("Task not found.", 404);
  }
  return task;
}

async function updateTask(ownerId, taskId, data) {
  const task = await getOwnedTask(ownerId, taskId);
  Object.assign(task, data);
  return task.save();
}

async function deleteTask(ownerId, taskId) {
  const task = await getOwnedTask(ownerId, taskId);
  await task.deleteOne();
  return task;
}

module.exports = {
  createTask,
  listTasks,
  getOwnedTask,
  updateTask,
  deleteTask,
};
