import crypto from 'crypto';
import { PolicyApplication } from '../../models/policyApplication.model.js';
import { PolicyProposal } from '../../models/policyProposal.model.js';
import { PremiumRate } from '../../models/premiumRate.model.js';
import { AgeSlab } from '../../models/ageSlab.model.js';
import ApiError from '../../utils/ApiError.js';
import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';

const calculateAgeFromDob = (dobString) => {
  const birthDate = new Date(dobString);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

export const applyForInsurancePolicy = asyncHandler(async (req, res) => {
  let {
    planId,
    sumInsuredId,
    ageSlabId,
    familyTypeId,
    applicantDetails,
    insuredMembers,
    nominee,
    paymentDetails,
  } = req.body;

  // 1. Check if user already has a pending or active application for this insurance plan
  const [existingApplication, existingProposal] = await Promise.all([
    PolicyApplication.findOne({
      userId: req.user._id,
      planId,
      isDeleted: false,
      status: { $in: ['PENDING_APPROVAL', 'APPROVED', 'POLICY_ISSUED'] },
    }).populate('planId', 'name'),
    PolicyProposal.findOne({
      userId: req.user._id,
      planId,
      isDeleted: false,
      status: { $in: ['submitted', 'approved', 'active', 'draft', 'PENDING_APPROVAL', 'APPROVED', 'POLICY_ISSUED'] },
    }).populate('planId', 'name'),
  ]);

  const existingRecord = existingApplication || existingProposal;

  if (existingRecord) {
    const planName = existingRecord.planId?.name || 'this insurance plan';
    const status = existingRecord.status;
    if (['PENDING_APPROVAL', 'submitted', 'draft'].includes(status)) {
      throw new ApiError(
        400,
        `You have already applied for ${planName}. Your application is currently pending admin approval. You cannot re-apply until it is approved or rejected.`
      );
    }
    if (['APPROVED', 'POLICY_ISSUED', 'active', 'approved'].includes(status)) {
      throw new ApiError(
        400,
        `You already hold an active policy for ${planName}. Duplicate policy applications are not allowed.`
      );
    }
  }

  // Auto-resolve ageSlabId if missing using applicantDetails.dob or insuredMembers[0].dob
  if (!ageSlabId) {
    const targetDob = applicantDetails?.dob || (insuredMembers && insuredMembers[0]?.dob);
    if (targetDob) {
      const userAge = calculateAgeFromDob(targetDob);
      const matchedSlab = await AgeSlab.findOne({
        minAge: { $lte: userAge },
        maxAge: { $gte: userAge },
        isDeleted: false,
        status: 'active',
      });
      if (matchedSlab) {
        ageSlabId = matchedSlab._id;
      }
    }
  }

  // 2. Verify pricing against rate card matrix
  const rateEntry = await PremiumRate.findOne({
    planId,
    sumInsuredId,
    ageSlabId,
    familyTypeId,
    isDeleted: false,
    status: 'active',
  });

  if (!rateEntry) {
    throw new ApiError(400, 'Invalid policy configuration. No active rate matrix found for selected parameters.');
  }

  const basePremium = rateEntry.basePremium;
  const gstRate = rateEntry.gstPercentage || 18;
  const gstAmount = Math.round((basePremium * (gstRate / 100)) * 100) / 100;
  const totalPremium = Math.round((basePremium + gstAmount) * 100) / 100;

  if (Math.abs(paymentDetails.paidAmount - totalPremium) > 1) {
    throw new ApiError(400, `Paid amount mismatch. Expected ₹${totalPremium}, got ₹${paymentDetails.paidAmount}`);
  }

  // 3. Generate Application Number e.g. APP-2026-X9A2B
  const applicationNumber = `APP-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

  const application = await PolicyApplication.create({
    applicationNumber,
    userId: req.user._id,
    planId,
    sumInsuredId,
    ageSlabId,
    familyTypeId,
    applicantDetails: {
      ...applicantDetails,
      dob: new Date(applicantDetails.dob),
    },
    insuredMembers: insuredMembers.map((m) => ({
      ...m,
      dob: new Date(m.dob),
    })),
    nominee,
    pricing: {
      basePremium,
      gstPercentage: gstRate,
      gstAmount,
      totalPremium,
    },
    paymentDetails: {
      ...paymentDetails,
      paidAt: new Date(),
    },
    status: 'PENDING_APPROVAL',
  });

  const createdApp = await PolicyApplication.findById(application._id)
    .populate('planId', 'name slug logo')
    .populate('sumInsuredId', 'displayName amount')
    .populate('familyTypeId', 'name code');

  return res.status(201).json(new ApiResponse(201, createdApp, 'Insurance application submitted successfully! Pending Admin Approval.'));
});

export const getMyApplications = asyncHandler(async (req, res) => {
  const { status, page, limit } = req.query;

  const query = { userId: req.user._id, isDeleted: false };
  if (status && status !== 'all') {
    if (status === 'APPROVED' || status === 'POLICY_ISSUED') {
      query.status = { $in: ['APPROVED', 'POLICY_ISSUED'] };
    } else {
      query.status = status;
    }
  }

  let queryExec = PolicyApplication.find(query)
    .populate('planId', 'name slug logo shortDescription')
    .populate('sumInsuredId', 'displayName amount')
    .populate('ageSlabId', 'displayName minAge maxAge')
    .populate('familyTypeId', 'name code')
    .sort({ createdAt: -1 });

  if (page || limit) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;
    const total = await PolicyApplication.countDocuments(query);
    const applications = await queryExec.skip(skip).limit(limitNum);

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
        'My applications list retrieved successfully'
      )
    );
  }

  const applications = await queryExec;
  return res.status(200).json(new ApiResponse(200, applications, 'My applications list retrieved successfully'));
});

export const getApplicationDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const application = await PolicyApplication.findOne({ _id: id, userId: req.user._id, isDeleted: false })
    .populate('planId', 'name slug logo description')
    .populate('sumInsuredId', 'displayName amount')
    .populate('ageSlabId', 'displayName')
    .populate('familyTypeId', 'name code');

  if (!application) {
    throw new ApiError(404, 'Policy application record not found');
  }

  return res.status(200).json(new ApiResponse(200, application, 'Application details fetched successfully'));
});
