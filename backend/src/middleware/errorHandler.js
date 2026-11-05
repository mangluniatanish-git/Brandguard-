import { logger } from '../utils/logger.js';

export function errorHandler(err, req, res, next) {
  // Safe logging without leaking sensitive payloads
  logger.error(
    {
      method: req.method,
      url: req.originalUrl,
      errorName: err.name,
      errorMessage: err.message,
    },
    'Unhandled request error'
  );

  // Return clean, safe error to the client with no stack traces
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    error: err.name || 'Internal Server Error',
    message: statusCode === 500 ? 'An unexpected server error occurred' : err.message,
  });
}
