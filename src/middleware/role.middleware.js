import ApiError from '../utils/ApiError.js';

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Unauthorized: User authentication is required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, `Forbidden: Role ${req.user.role} is not authorized to access this resource`));
    }

    next();
  };
};
