import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { verifyAccessToken } from '../utils/generateTokens.js';
import { User } from '../models/user.model.js';

export const authenticate = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.accessToken;

  if (!token) {
    throw new ApiError(401, 'Unauthorized: Access token is missing');
  }

  const decoded = verifyAccessToken(token);
  if (!decoded) {
    throw new ApiError(401, 'Unauthorized: Access token is invalid or expired');
  }

  const user = await User.findById(decoded._id).select('-password -refreshToken');
  if (!user) {
    throw new ApiError(401, 'Unauthorized: User not found');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Forbidden: Your account has been deactivated');
  }

  req.user = user;
  next();
});
