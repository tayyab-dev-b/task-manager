const express = require("express");
const {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
} = require("../controllers/taskController");
const { protect } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { createTaskSchema, updateTaskSchema } = require("../validators/schemas");

const router = express.Router();

// Every task route requires a valid JWT.
router.use(protect);

router
  .route("/")
  .post(validate(createTaskSchema), createTask)
  .get(getTasks);

router
  .route("/:id")
  .get(getTask)
  .patch(validate(updateTaskSchema), updateTask)
  .delete(deleteTask);

module.exports = router;
