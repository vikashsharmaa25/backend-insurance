import crypto from 'crypto';
import { User } from '../models/user.model.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/generateTokens.js';
import { setAuthCookies, clearAuthCookies } from '../utils/cookieOptions.js';
import env from '../config/env.js';

/**
 * @desc    Register a new user (default role: CUSTOMER)
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, phone, password } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(400, 'User with this email already exists');
  }

  // Create user with default role CUSTOMER
  const user = await User.create({
    firstName,
    lastName,
    email,
    phone,
    password,
    role: 'CUSTOMER',
  });

  // Fetch the created user without sensitive fields
  const createdUser = await User.findById(user._id).select('-password -refreshToken');
  if (!createdUser) {
    throw new ApiError(500, 'Something went wrong while creating the user');
  }

  // Generate tokens
  const accessToken = generateAccessToken(createdUser);
  const refreshToken = generateRefreshToken(createdUser);

  // Store refresh token in db
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  // Set cookies
  setAuthCookies(res, accessToken, refreshToken);

  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, 'User registered successfully'));
});

/**
 * @desc    Authenticate user & get tokens
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Check user existence
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, 'User does not exist');
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid user credentials');
  }

  // Check active status
  if (!user.isActive) {
    throw new ApiError(403, 'Your account has been deactivated. Please contact support.');
  }

  // Generate tokens
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  // Update lastLogin and refresh token in db
  user.refreshToken = refreshToken;
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  // Fetch updated user without sensitive fields
  const loggedInUser = await User.findById(user._id).select('-password -refreshToken');

  // Set cookies
  setAuthCookies(res, accessToken, refreshToken);

  return res
    .status(200)
    .json(new ApiResponse(200, loggedInUser, 'User logged in successfully'));
});

/**
 * @desc    Refresh access & refresh tokens (Token rotation)
 * @route   POST /api/auth/refresh-token
 * @access  Public
 */
export const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, 'Unauthorized request: Refresh token is missing');
  }

  // Verify incoming token
  const decodedToken = verifyRefreshToken(incomingRefreshToken);
  if (!decodedToken) {
    throw new ApiError(401, 'Unauthorized request: Refresh token is invalid or expired');
  }

  // Find user
  const user = await User.findById(decodedToken._id);
  if (!user) {
    throw new ApiError(401, 'Unauthorized request: User not found');
  }

  // Verify stored token matches incoming token (detect reuse/revocation)
  if (user.refreshToken !== incomingRefreshToken) {
    throw new ApiError(401, 'Unauthorized request: Refresh token is invalid or already used');
  }

  // Check user active status
  if (!user.isActive) {
    throw new ApiError(403, 'Forbidden: Your account has been deactivated');
  }

  // Generate new tokens (rotation)
  const newAccessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken(user);

  // Update in database
  user.refreshToken = newRefreshToken;
  await user.save({ validateBeforeSave: false });

  // Set updated cookies
  setAuthCookies(res, newAccessToken, newRefreshToken);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'Access token refreshed successfully'));
});

/**
 * @desc    Logout user & clear cookies
 * @route   POST /api/auth/logout
 * @access  Private
 */
export const logout = asyncHandler(async (req, res) => {
  // Clear refresh token in database
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: null,
      },
    },
    {
      new: true,
    }
  );

  // Clear client cookies
  clearAuthCookies(res);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'User logged out successfully'));
});

/**
 * @desc    Get currently logged in user info
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, 'Current user fetched successfully'));
});

/**
 * @desc    Update authenticated user password
 * @route   PATCH /api/auth/change-password
 * @access  Private
 */
export const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Verify old password
  const isPasswordCorrect = await user.comparePassword(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(400, 'Invalid current password');
  }

  // Update password
  user.password = newPassword;
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'Password changed successfully'));
});

/**
 * @desc    Update user demographics & details
 * @route   PATCH /api/auth/update-profile
 * @access  Private
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const { firstName, lastName, phone, profileImage } = req.body;

  const updateFields = {};
  if (firstName !== undefined) updateFields.firstName = firstName;
  if (lastName !== undefined) updateFields.lastName = lastName;
  if (phone !== undefined) updateFields.phone = phone;
  if (profileImage !== undefined) updateFields.profileImage = profileImage;

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: updateFields,
    },
    {
      new: true,
      runValidators: true,
    }
  ).select('-password -refreshToken');

  if (!updatedUser) {
    throw new ApiError(404, 'User not found');
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, 'Profile updated successfully'));
});

/**
 * @desc    Forgot password - generate reset token & log reset link
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, 'User not found with this email');
  }

  // Generate cryptographic reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // In production, send this via email service.
  // For demo/logging, construct absolute reset URL
  const resetUrl = `${req.protocol}://${req.get('host')}/api/auth/reset-password?token=${resetToken}`;
  console.log(`\n🔑 [Reset Password Token Link]\n👉 ${resetUrl}\n`);

  // Return reset token details during development for easier verification
  const data = env.NODE_ENV === 'development' ? { resetToken, resetUrl } : {};

  return res
    .status(200)
    .json(new ApiResponse(200, data, 'Password reset email simulated. Check console logs for details.'));
});

/**
 * @desc    Reset password using reset token
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  // Hash incoming token to match stored version
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  // Find user with matching token and unexpired timer
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(400, 'Reset token is invalid or has expired');
  }

  // Update password and clear reset fields
  user.password = newPassword;
  user.passwordResetToken = null;
  user.passwordResetExpires = null;
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'Password reset successfully'));
});
