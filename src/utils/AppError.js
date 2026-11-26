/**
 * Error type carrying an HTTP status code, so services can throw
 * meaningful errors that the central error handler turns into
 * clean JSON responses.
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
