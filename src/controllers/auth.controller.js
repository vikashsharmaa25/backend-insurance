import crypto from 'crypto';
import { User } from '../models/user.model.js';
import { Kyc } from '../models/kyc.model.js';
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
 * @desc    Register a new user (name + email + phone + dob + gender)
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = asyncHandler(async (req, res) => {
  const { name, email, phone, dob, gender } = req.body;

  if (!name || !email || !phone || !dob || !gender) {
    throw new ApiError(400, 'Name, email, phone, DOB, and gender are required for registration');
  }

  // Check if phone already registered
  const existingPhone = await User.findOne({ phone });
  if (existingPhone) {
    throw new ApiError(400, 'A user with this phone number already exists');
  }

  // Check if email already registered
  if (email) {
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      throw new ApiError(400, 'A user with this email already exists');
    }
  }

  // Create user
  const user = await User.create({
    name,
    email: email || undefined,
    phone,
    role: 'CUSTOMER',
    isVerified: true,
  });

  // Create KYC record with user-provided dob and gender only
  if (dob || gender) {
    await Kyc.create({
      userId: user._id,
      dob: dob ? new Date(dob) : undefined,
      gender: gender ? gender.toUpperCase() : undefined,
      kycStatus: 'pending',
    });
  }

  const createdUser = await User.findById(user._id).select('-password -refreshToken -otp -otpExpires');
  if (!createdUser) {
    throw new ApiError(500, 'Something went wrong while creating the user');
  }

  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, 'User registered successfully. You can now login with your mobile number.'));
});

/**
 * @desc    Send OTP to phone number (dummy OTP returned in response for demo)
 * @route   POST /api/auth/send-otp
 * @access  Public
 */
export const sendOtp = asyncHandler(async (req, res) => {
  const { phone } = req.body;

  const user = await User.findOne({ phone });
  if (!user) {
    throw new ApiError(404, 'No account found with this phone number. Please register first.');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Your account has been deactivated. Please contact support.');
  }

  // Generate dummy OTP and save to user
  const otp = user.generateOtp();
  await user.save({ validateBeforeSave: false });

  // In production: send OTP via SMS service
  // For demo: return OTP in response
  console.log(`\n📱 [OTP for ${phone}]: ${otp}\n`);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        phone,
        demoOtp: otp, // Only in demo/development — remove in production
        expiresInMinutes: 5,
      },
      'OTP sent successfully'
    )
  );
});

/**
 * @desc    Verify OTP and complete login (issues tokens)
 * @route   POST /api/auth/verify-otp
 * @access  Public
 */
export const verifyOtp = asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;

  const user = await User.findOne({ phone });
  if (!user) {
    throw new ApiError(404, 'No account found with this phone number');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Your account has been deactivated. Please contact support.');
  }

  // Validate OTP
  if (!user.otp || !user.otpExpires) {
    throw new ApiError(400, 'No OTP was requested. Please request a new OTP.');
  }

  if (new Date() > user.otpExpires) {
    // Clear expired OTP
    user.otp = null;
    user.otpExpires = null;
    await user.save({ validateBeforeSave: false });
    throw new ApiError(400, 'OTP has expired. Please request a new one.');
  }

  if (user.otp !== otp) {
    throw new ApiError(400, 'Invalid OTP. Please try again.');
  }

  // OTP verified — clear otp fields
  user.otp = null;
  user.otpExpires = null;
  user.isVerified = true;

  // Generate tokens
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  // Update session
  user.refreshToken = refreshToken;
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  const loggedInUser = await User.findById(user._id).select('-password -refreshToken -otp -otpExpires');

  // Set cookies
  setAuthCookies(res, accessToken, refreshToken);

  return res.status(200).json(
    new ApiResponse(
      200,
      { user: loggedInUser, accessToken, refreshToken },
      'Login successful'
    )
  );
});

/**
 * @desc    Refresh access & refresh tokens (Token rotation)
 * @route   POST /api/auth/refresh-token
 * @access  Public
 */
export const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken ||
    req.body?.refreshToken ||
    req.headers['x-refresh-token'];

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

  return res.status(200).json(
    new ApiResponse(
      200,
      { accessToken: newAccessToken, refreshToken: newRefreshToken },
      'Access token refreshed successfully'
    )
  );
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
    { $set: { refreshToken: null } },
    { new: true }
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
  const kyc = await Kyc.findOne({ userId: req.user._id, isDeleted: false });

  const userObj = req.user.toObject ? req.user.toObject() : req.user;

  const userData = {
    ...userObj,
    dob: kyc ? kyc.dob : null,
    gender: kyc ? kyc.gender : null,
    kycStatus: kyc ? kyc.kycStatus : 'pending',
  };

  return res
    .status(200)
    .json(new ApiResponse(200, userData, 'Current user fetched successfully'));
});

/**
 * @desc    Update user demographics & details
 * @route   PATCH /api/auth/update-profile
 * @access  Private
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const { name, email, phone, profileImage } = req.body;

  const updateFields = {};
  if (name !== undefined) updateFields.name = name;
  if (email !== undefined) updateFields.email = email;
  if (phone !== undefined) updateFields.phone = phone;
  if (profileImage !== undefined) updateFields.profileImage = profileImage;

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updateFields },
    { new: true, runValidators: true }
  ).select('-password -refreshToken -otp -otpExpires');

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

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${req.protocol}://${req.get('host')}/api/auth/reset-password?token=${resetToken}`;
  console.log(`\n🔑 [Reset Password Token Link]\n👉 ${resetUrl}\n`);

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

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(400, 'Reset token is invalid or has expired');
  }

  user.password = newPassword;
  user.passwordResetToken = null;
  user.passwordResetExpires = null;
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'Password reset successfully'));
});

// Legacy login (kept for backward compat — not used in new OTP flow)
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, 'User does not exist');
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) throw new ApiError(401, 'Invalid user credentials');
  if (!user.isActive) throw new ApiError(403, 'Account deactivated');
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  user.refreshToken = refreshToken;
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });
  const loggedInUser = await User.findById(user._id).select('-password -refreshToken -otp -otpExpires');
  setAuthCookies(res, accessToken, refreshToken);
  return res.status(200).json(
    new ApiResponse(200, { user: loggedInUser, accessToken, refreshToken }, 'User logged in successfully')
  );
});

// Legacy changePassword (kept for backward compat)
export const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, 'User not found');
  const isPasswordCorrect = await user.comparePassword(oldPassword);
  if (!isPasswordCorrect) throw new ApiError(400, 'Invalid current password');
  user.password = newPassword;
  await user.save();
  return res.status(200).json(new ApiResponse(200, {}, 'Password changed successfully'));
});
