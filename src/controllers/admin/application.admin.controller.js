import crypto from 'crypto';
import { PolicyApplication } from '../../models/policyApplication.model.js';
import ApiError from '../../utils/ApiError.js';
import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';

export const getAllApplications = asyncHandler(async (req, res) => {
  const { search, status, userId, page = 1, limit = 10 } = req.query;

  const query = { isDeleted: false };
  if (status) query.status = status;
  if (userId) query.userId = userId;
  if (search) {
    query.$or = [
      { applicationNumber: { $regex: search, $options: 'i' } },
      { policyNumber: { $regex: search, $options: 'i' } },
      { 'applicantDetails.fullName': { $regex: search, $options: 'i' } },
      { 'applicantDetails.email': { $regex: search, $options: 'i' } },
      { 'applicantDetails.phone': { $regex: search, $options: 'i' } },
    ];
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const total = await PolicyApplication.countDocuments(query);
  const applications = await PolicyApplication.find(query)
    .populate('userId', 'firstName lastName email phone')
    .populate('planId', 'name slug logo')
    .populate('sumInsuredId', 'displayName amount')
    .populate('familyTypeId', 'name code')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        applications,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      },
      'Customer applications retrieved successfully'
    )
  );
});

export const getAdminApplicationDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const application = await PolicyApplication.findOne({ _id: id, isDeleted: false })
    .populate('userId', 'firstName lastName email phone role')
    .populate('planId', 'name slug logo description')
    .populate('sumInsuredId', 'displayName amount')
    .populate('ageSlabId', 'displayName')
    .populate('familyTypeId', 'name code')
    .populate('reviewedBy', 'firstName lastName email');

  if (!application) {
    throw new ApiError(404, 'Policy application record not found');
  }

  return res.status(200).json(new ApiResponse(200, application, 'Application details fetched successfully'));
});

export const updateApplicationStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, rejectionReason } = req.body;

  const application = await PolicyApplication.findOne({ _id: id, isDeleted: false });
  if (!application) {
    throw new ApiError(404, 'Policy application record not found');
  }

  if (application.status === 'POLICY_ISSUED' || application.status === 'APPROVED') {
    throw new ApiError(400, 'This policy application is already approved and issued.');
  }

  if (status === 'APPROVED') {
    const startDate = new Date();
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    const policyNumber = `POL-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    application.status = 'POLICY_ISSUED';
    application.policyNumber = policyNumber;
    application.policyStartDate = startDate;
    application.policyExpiryDate = expiryDate;
    application.reviewedBy = req.user._id;
    application.reviewedAt = new Date();
  } else if (status === 'REJECTED') {
    application.status = 'REJECTED';
    application.rejectionReason = rejectionReason || 'Application rejected by underwriting team';
    application.reviewedBy = req.user._id;
    application.reviewedAt = new Date();
  }

  await application.save();

  const updatedApp = await PolicyApplication.findById(id)
    .populate('planId', 'name slug')
    .populate('sumInsuredId', 'displayName')
    .populate('reviewedBy', 'firstName lastName');

  return res
    .status(200)
    .json(new ApiResponse(200, updatedApp, `Application status updated to ${application.status}`));
});
