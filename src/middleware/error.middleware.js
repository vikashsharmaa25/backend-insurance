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
    // Mongoose duplicate key error
    else if (error.code === 11000) {
      statusCode = 400;
      const field = Object.keys(error.keyValue)[0];
      message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
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
