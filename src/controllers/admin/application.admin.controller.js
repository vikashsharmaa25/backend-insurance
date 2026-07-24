import crypto from 'crypto';
import { PolicyProposal } from '../../models/policyProposal.model.js';
import { PolicyApplication } from '../../models/policyApplication.model.js';
import { Plan } from '../../models/plan.model.js';
import { Coverage } from '../../models/coverage.model.js';
import ApiError from '../../utils/ApiError.js';
import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';

export const getDashboardStats = asyncHandler(async (req, res) => {
  const [
    activePlansCount,
    totalCoveragesCount,
    pendingAppsCount,
    approvedAppsCount,
    rejectedAppsCount,
    totalAppsCount,
    recentApplications,
    revenueResult,
  ] = await Promise.all([
    Plan.countDocuments({ isDeleted: false, status: 'active' }),
    Coverage.countDocuments({ isDeleted: false, status: 'active' }),
    PolicyProposal.countDocuments({ isDeleted: false, status: { $in: ['submitted', 'draft', 'PENDING_APPROVAL', 'PENDING'] } }),
    PolicyProposal.countDocuments({ isDeleted: false, status: { $in: ['approved', 'active', 'APPROVED', 'POLICY_ISSUED'] } }),
    PolicyProposal.countDocuments({ isDeleted: false, status: { $in: ['rejected', 'REJECTED'] } }),
    PolicyProposal.countDocuments({ isDeleted: false }),
    PolicyProposal.find({ isDeleted: false })
      .populate('userId', 'firstName lastName email phone name')
      .populate('planId', 'name slug logo')
      .populate('sumInsuredId', 'displayName amount')
      .sort({ createdAt: -1 })
      .limit(5),
    PolicyProposal.aggregate([
      {
        $match: {
          isDeleted: false,
          status: { $in: ['approved', 'active', 'APPROVED', 'POLICY_ISSUED'] },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$pricing.totalPremium' },
        },
      },
    ]),
  ]);

  const totalRevenue = revenueResult[0]?.totalRevenue || 0;

  const normalizedRecent = recentApplications.map((app) => {
    const obj = app.toObject ? app.toObject() : app;
    return {
      _id: obj._id,
      applicationNumber: obj.proposalNumber || obj.applicationNumber || `PROP-${obj._id}`,
      proposalNumber: obj.proposalNumber || obj.applicationNumber,
      status: ['submitted', 'pending', 'draft'].includes(obj.status) ? 'PENDING_APPROVAL' : ['approved', 'active'].includes(obj.status) ? 'APPROVED' : obj.status,
      applicantDetails: {
        fullName: obj.masterMember?.name || obj.userId?.name || obj.userId?.firstName || 'Applicant',
        email: obj.userId?.email || '',
        phone: obj.userId?.phone || '',
      },
      planId: obj.planId,
      sumInsuredId: obj.sumInsuredId,
      pricing: obj.pricing,
      createdAt: obj.createdAt,
    };
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        stats: {
          activePlans: activePlansCount,
          totalCoverages: totalCoveragesCount,
          pendingApps: pendingAppsCount,
          approvedApps: approvedAppsCount,
          rejectedApps: rejectedAppsCount,
          totalApplications: totalAppsCount,
          totalRevenue,
        },
        recentApplications: normalizedRecent,
      },
      'Executive dashboard metrics and stats retrieved successfully'
    )
  );
});

export const getAllApplications = asyncHandler(async (req, res) => {
  const { search, status, userId, page = 1, limit = 10 } = req.query;

  const query = { isDeleted: false };
  if (status && status !== 'all') {
    if (['APPROVED', 'approved', 'POLICY_ISSUED', 'active'].includes(status)) {
      query.status = { $in: ['APPROVED', 'approved', 'POLICY_ISSUED', 'active'] };
    } else if (['PENDING_APPROVAL', 'submitted', 'draft', 'pending'].includes(status)) {
      query.status = { $in: ['PENDING_APPROVAL', 'submitted', 'draft', 'pending'] };
    } else if (['REJECTED', 'rejected'].includes(status)) {
      query.status = { $in: ['REJECTED', 'rejected'] };
    } else {
      query.status = status;
    }
  }
  if (userId) query.userId = userId;
  if (search) {
    query.$or = [
      { proposalNumber: { $regex: search, $options: 'i' } },
      { policyNumber: { $regex: search, $options: 'i' } },
      { 'masterMember.name': { $regex: search, $options: 'i' } },
      { 'insuredMembers.name': { $regex: search, $options: 'i' } },
    ];
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  let total = await PolicyProposal.countDocuments(query);
  let applications = await PolicyProposal.find(query)
    .populate('userId', 'firstName lastName email phone name')
    .populate('planId', 'name slug logo')
    .populate('sumInsuredId', 'displayName amount')
    .populate('familyTypeId', 'name code')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  if (total === 0 && !search) {
    total = await PolicyApplication.countDocuments(query);
    applications = await PolicyApplication.find(query)
      .populate('userId', 'firstName lastName email phone')
      .populate('planId', 'name slug logo')
      .populate('sumInsuredId', 'displayName amount')
      .populate('familyTypeId', 'name code')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);
  }

  const normalizedApplications = applications.map((app) => {
    const obj = app.toObject ? app.toObject() : app;
    const isPending = ['submitted', 'pending', 'draft', 'PENDING_APPROVAL'].includes(obj.status);
    const isApproved = ['approved', 'active', 'APPROVED', 'POLICY_ISSUED'].includes(obj.status);
    return {
      _id: obj._id,
      applicationNumber: obj.proposalNumber || obj.applicationNumber || `PROP-${obj._id}`,
      proposalNumber: obj.proposalNumber || obj.applicationNumber,
      policyNumber: obj.policyNumber || '',
      status: isPending ? 'PENDING_APPROVAL' : isApproved ? 'APPROVED' : obj.status,
      rawStatus: obj.status,
      userId: obj.userId,
      applicantDetails: {
        fullName: obj.masterMember?.name || obj.userId?.name || obj.userId?.firstName || 'Applicant',
        email: obj.userId?.email || '',
        phone: obj.userId?.phone || '',
      },
      masterMember: obj.masterMember,
      insuredMembers: obj.insuredMembers || [],
      nominee: obj.nominee,
      planId: obj.planId,
      sumInsuredId: obj.sumInsuredId,
      familyTypeId: obj.familyTypeId,
      pricing: obj.pricing,
      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt,
    };
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        applications: normalizedApplications,
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

  let application = await PolicyProposal.findOne({ _id: id, isDeleted: false })
    .populate('userId', 'firstName lastName email phone role name')
    .populate('planId', 'name slug logo description')
    .populate('sumInsuredId', 'displayName amount')
    .populate('ageSlabId', 'displayName minAge maxAge')
    .populate('familyTypeId', 'name code')
    .populate('reviewedBy', 'firstName lastName email');

  if (!application) {
    application = await PolicyApplication.findOne({ _id: id, isDeleted: false })
      .populate('userId', 'firstName lastName email phone role')
      .populate('planId', 'name slug logo description')
      .populate('sumInsuredId', 'displayName amount')
      .populate('ageSlabId', 'displayName')
      .populate('familyTypeId', 'name code')
      .populate('reviewedBy', 'firstName lastName email');
  }

  if (!application) {
    throw new ApiError(404, 'Policy application record not found');
  }

  const obj = application.toObject ? application.toObject() : application;
  const isPending = ['submitted', 'pending', 'draft', 'PENDING_APPROVAL'].includes(obj.status);
  const isApproved = ['approved', 'active', 'APPROVED', 'POLICY_ISSUED'].includes(obj.status);

  const normalized = {
    ...obj,
    applicationNumber: obj.proposalNumber || obj.applicationNumber || `PROP-${obj._id}`,
    proposalNumber: obj.proposalNumber || obj.applicationNumber,
    status: isPending ? 'PENDING_APPROVAL' : isApproved ? 'APPROVED' : obj.status,
    applicantDetails: {
      fullName: obj.masterMember?.name || obj.userId?.name || obj.userId?.firstName || 'Applicant',
      email: obj.userId?.email || '',
      phone: obj.userId?.phone || '',
    },
  };

  return res.status(200).json(new ApiResponse(200, normalized, 'Application details fetched successfully'));
});

export const updateApplicationStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, rejectionReason } = req.body;

  let isProposal = true;
  let application = await PolicyProposal.findOne({ _id: id, isDeleted: false });
  if (!application) {
    isProposal = false;
    application = await PolicyApplication.findOne({ _id: id, isDeleted: false });
  }

  if (!application) {
    throw new ApiError(404, 'Policy application record not found');
  }

  if (['APPROVED', 'approved', 'POLICY_ISSUED', 'active'].includes(application.status) && status === 'APPROVED') {
    throw new ApiError(400, 'This policy application is already approved and active.');
  }

  const targetStatus = status.toUpperCase();

  if (targetStatus === 'APPROVED' || targetStatus === 'ACTIVE') {
    const startDate = new Date();
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    const policyNumber = application.policyNumber || `POL-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    application.status = isProposal ? 'approved' : 'POLICY_ISSUED';
    application.policyNumber = policyNumber;
    application.startDate = startDate;
    application.endDate = expiryDate;
    application.reviewedBy = req.user._id;
    application.reviewedAt = new Date();
  } else if (targetStatus === 'REJECTED') {
    application.status = isProposal ? 'rejected' : 'REJECTED';
    application.rejectionReason = rejectionReason || 'Application rejected by underwriting team';
    application.reviewedBy = req.user._id;
    application.reviewedAt = new Date();
  }

  await application.save();

  return res
    .status(200)
    .json(new ApiResponse(200, application, `Application status updated to ${application.status}`));
});
