import ApiError from '../utils/ApiError.js';
import env from '../config/env.js';

const errorHandler = (err, req, res, next) => {
  let error = err;

  if (!(error instanceof ApiError)) {
    let statusCode = error.statusCode || 500;
    let message = error.message || 'Internal Server Error';
    let errors = [];

    // Mongoose validation error
    if (error.name === 'ValidationError') {
      statusCode = 400;
      message = 'Validation Error';
      errors = Object.values(error.errors).map((el) => ({
        field: el.path,
        message: el.message,
      }));
    }
    // Mongoose / MongoDB duplicate key error
    else if (error.code === 11000 || error.code === 11001) {
      statusCode = 409;
      // BulkWriteError may not have keyValue — guard against null
      const keyValue = error.keyValue || (error.writeErrors?.[0]?.err?.keyValue) || {};
      const field = Object.keys(keyValue)[0] || 'field';
      message = `Duplicate entry: ${field} already exists`;
      errors = [{ field, message }];
    }
    // MongoDB BulkWriteError wrapper
    else if (error.name === 'BulkWriteError' || error.name === 'MongoBulkWriteError') {
      statusCode = 409;
      const firstErr = error.writeErrors?.[0]?.err;
      const keyValue = firstErr?.keyValue || {};
      const field = Object.keys(keyValue)[0] || 'record';
      message = `Duplicate entry detected for ${field}`;
      errors = [{ field, message }];
    }
    // Mongoose cast error (invalid ObjectId)
    else if (error.name === 'CastError') {
      statusCode = 400;
      message = `Invalid ${error.path}: ${error.value}`;
    }

    error = new ApiError(statusCode, message, errors, err.stack);
  }

  const response = {
    success: false,
    message: error.message,
    errors: error.errors || [],
    ...(env.NODE_ENV === 'development' ? { stack: error.stack } : {}),
  };

  res.status(error.statusCode || 500).json(response);
};

export default errorHandler;
