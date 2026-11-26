const AppError = require("../utils/AppError");

/**
 * Validate req.body against a Zod schema before the controller runs.
 * On failure the request stops here with a 400 and field messages.
 */
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const message = result.error.issues
      .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
      .join(", ");
    return next(new AppError(message, 400));
  }

  req.body = result.data;
  next();
};

module.exports = validate;
