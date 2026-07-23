import crypto from 'crypto';
import { Plan, PlanOption } from '../../models/plan.model.js';
import { Coverage } from '../../models/coverage.model.js';
import { SumInsured } from '../../models/sumInsured.model.js';
import { AgeSlab } from '../../models/ageSlab.model.js';
import { FamilyType } from '../../models/familyType.model.js';
import { PlanCoverage } from '../../models/planCoverage.model.js';
import { PremiumRate } from '../../models/premiumRate.model.js';
import { PolicyCondition } from '../../models/policyCondition.model.js';
import { Kyc } from '../../models/kyc.model.js';
import { PolicyProposal } from '../../models/policyProposal.model.js';
import { PolicyApplication } from '../../models/policyApplication.model.js';
import ApiError from '../../utils/ApiError.js';
import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';

// Helper to calculate exact age from Date of Birth
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

// ==========================================
// 1. MOBILE APP DASHBOARD HOME SCREEN
// ==========================================

export const getCustomerDashboard = asyncHandler(async (req, res) => {
  const [plans, sumInsureds, familyTypes, kyc] = await Promise.all([
    Plan.find({ isDeleted: false, status: 'active' }).select('name slug shortDescription logo'),
    SumInsured.find({ isDeleted: false, status: 'active' }).sort({ amount: 1 }).select('amount displayName'),
    FamilyType.find({ isDeleted: false, status: 'active' }).sort({ adultCount: 1, childCount: 1 }).select('name code adultCount childCount'),
    req.user ? Kyc.findOne({ userId: req.user._id, isDeleted: false }).select('kycStatus dob gender') : null,
  ]);

  const dashboardData = {
    user: req.user
      ? {
          _id: req.user._id,
          firstName: req.user.firstName,
          lastName: req.user.lastName,
          email: req.user.email,
          phone: req.user.phone,
          kycStatus: kyc ? kyc.kycStatus : 'pending',
        }
      : null,
    banners: [
      { id: 1, title: 'Comprehensive Health Cover', subtitle: 'Zero Copay & Unlimited Reset', image: 'https://example.com/banner1.jpg' },
      { id: 2, title: 'Maternity & Newborn Cover', subtitle: 'Pre & Post Natal Expenses Covered', image: 'https://example.com/banner2.jpg' },
    ],
    featuredPlans: plans,
    sumInsuredOptions: sumInsureds,
    familyTypes,
  };

  return res.status(200).json(new ApiResponse(200, dashboardData, 'Customer dashboard data fetched successfully'));
});

// ==========================================
// 2. EXPLORE PLANS & DYNAMIC QUOTE ENGINE
// ==========================================

export const explorePlansWithQuotes = asyncHandler(async (req, res) => {
  const { dob, familyTypeId, sumInsuredId, planId } = req.body;

  const userAge = calculateAgeFromDob(dob);

  if (userAge === undefined || userAge === null || isNaN(userAge)) {
    throw new ApiError(400, 'Please provide a valid Date of Birth (dob)');
  }

  // 1. Find matching Age Slab
  const ageSlab = await AgeSlab.findOne({
    minAge: { $lte: userAge },
    maxAge: { $gte: userAge },
    isDeleted: false,
    status: 'active',
  });

  if (!ageSlab) {
    throw new ApiError(400, `No active age slab found for age ${userAge}. Valid age range is 18-65 years.`);
  }

  // 2. Validate Family Type & Sum Insured
  const [familyType, sumInsured] = await Promise.all([
    FamilyType.findOne({ _id: familyTypeId, isDeleted: false, status: 'active' }),
    SumInsured.findOne({ _id: sumInsuredId, isDeleted: false, status: 'active' }),
  ]);

  if (!familyType) throw new ApiError(404, 'Active Family Type not found');
  if (!sumInsured) throw new ApiError(404, 'Active Sum Insured not found');

  // 3. Find Target Plans
  const planQuery = { isDeleted: false, status: 'active' };
  if (planId) planQuery._id = planId;

  const plans = await Plan.find(planQuery);

  const quoteResults = [];

  for (const plan of plans) {
    const options = await PlanOption.find({ planId: plan._id, isDeleted: false, status: 'active' });
    const policyConditions = await PolicyCondition.findOne({ planId: plan._id, isDeleted: false });

    const computedOptions = [];

    for (const opt of options) {
      const rateEntry = await PremiumRate.findOne({
        planId: plan._id,
        optionId: opt._id,
        sumInsuredId: sumInsured._id,
        ageSlabId: ageSlab._id,
        familyTypeId: familyType._id,
        isDeleted: false,
        status: 'active',
      });

      if (!rateEntry) continue; // Skip if no rate configured for this option

      const basePremium = rateEntry.basePremium;
      const gstRate = rateEntry.gstPercentage || 18;
      const gstAmount = Math.round((basePremium * (gstRate / 100)) * 100) / 100;
      const totalPremium = Math.round((basePremium + gstAmount) * 100) / 100;

      // Coverages for this option
      const optionCoverages = await PlanCoverage.find({
        planId: plan._id,
        optionId: opt._id,
        isDeleted: false,
      }).populate('coverageId', 'title description icon');

      computedOptions.push({
        optionId: opt._id,
        name: opt.name,
        description: opt.description,
        pricing: {
          basePremium,
          gstPercentage: gstRate,
          gstAmount,
          totalPremium,
        },
        coverages: optionCoverages.map((c) => ({
          title: c.coverageId.title,
          description: c.coverageId.description,
          icon: c.coverageId.icon,
          isCovered: c.isCovered,
          value: c.value,
        })),
      });
    }

    if (computedOptions.length > 0) {
      let userApplicationStatus = null;
      if (req.user?._id) {
        const existingApp = await PolicyApplication.findOne({
          userId: req.user._id,
          planId: plan._id,
          isDeleted: false,
        }).sort({ createdAt: -1 });

        if (existingApp) {
          userApplicationStatus = existingApp.status;
        }
      }

      quoteResults.push({
        plan: {
          id: plan._id,
          name: plan.name,
          slug: plan.slug,
          shortDescription: plan.shortDescription,
          logo: plan.logo,
        },
        userApplicationStatus,
        ageSlab: { id: ageSlab._id, displayName: ageSlab.displayName, userAge },
        familyType: { id: familyType._id, name: familyType.name, code: familyType.code },
        sumInsured: { id: sumInsured._id, amount: sumInsured.amount, displayName: sumInsured.displayName },
        policyWording: policyConditions
          ? {
              roomRentLimit: policyConditions.roomRentLimit,
              prePostHospitalization: policyConditions.prePostHospitalization,
              diseaseSubLimits: policyConditions.diseaseSubLimits,
              exclusions: policyConditions.exclusions,
            }
          : null,
        options: computedOptions,
      });
    }
  }

  return res.status(200).json(new ApiResponse(200, quoteResults, 'Dynamic plan quotes fetched successfully'));
});

// ==========================================
// 3. CUSTOMER KYC MANAGEMENT
// ==========================================

export const submitCustomerKyc = asyncHandler(async (req, res) => {
  const { dob, gender, panNumber, aadhaarNumber, address, idProofUrl } = req.body;

  const kyc = await Kyc.findOneAndUpdate(
    { userId: req.user._id, isDeleted: false },
    {
      $set: {
        userId: req.user._id,
        dob: new Date(dob),
        gender,
        panNumber: panNumber ? panNumber.toUpperCase() : undefined,
        aadhaarNumber,
        address,
        idProofUrl,
        kycStatus: 'verified', // Auto-verify standard submission
      },
    },
    { new: true, upsert: true, runValidators: true }
  );

  return res.status(200).json(new ApiResponse(200, kyc, 'KYC details submitted and verified successfully'));
});

export const getCustomerKyc = asyncHandler(async (req, res) => {
  const kyc = await Kyc.findOne({ userId: req.user._id, isDeleted: false });

  if (!kyc) {
    return res.status(200).json(
      new ApiResponse(200, { kycStatus: 'pending', isSubmitted: false }, 'No KYC record found. Please submit KYC.')
    );
  }

  return res.status(200).json(new ApiResponse(200, { ...kyc.toObject(), isSubmitted: true }, 'KYC details fetched successfully'));
});

// ==========================================
// 4. POLICY PROPOSAL & MY POLICIES
// ==========================================

export const createPolicyProposal = asyncHandler(async (req, res) => {
  const { planId, optionId, sumInsuredId, ageSlabId, familyTypeId, insuredMembers, nominee } = req.body;

  // Check if user already has a pending or active application/proposal for this insurance plan
  const existingApp = await PolicyApplication.findOne({
    userId: req.user._id,
    planId,
    isDeleted: false,
    status: { $in: ['PENDING_APPROVAL', 'APPROVED', 'POLICY_ISSUED'] },
  }).populate('planId', 'name');

  if (existingApp) {
    const planName = existingApp.planId?.name || 'this insurance plan';
    if (existingApp.status === 'PENDING_APPROVAL') {
      throw new ApiError(
        400,
        `You have already applied for ${planName}. Your application is currently pending admin approval.`
      );
    }
    if (['APPROVED', 'POLICY_ISSUED'].includes(existingApp.status)) {
      throw new ApiError(
        400,
        `You already hold an active policy for ${planName}. Duplicate policy creation is not allowed.`
      );
    }
  }

  // Verify rate matrix to get pricing
  const rateEntry = await PremiumRate.findOne({
    planId,
    optionId,
    sumInsuredId,
    ageSlabId,
    familyTypeId,
    isDeleted: false,
    status: 'active',
  });

  if (!rateEntry) {
    throw new ApiError(400, 'Invalid proposal parameters. Premium rate entry not found.');
  }

  const basePremium = rateEntry.basePremium;
  const gstRate = rateEntry.gstPercentage || 18;
  const gstAmount = Math.round((basePremium * (gstRate / 100)) * 100) / 100;
  const totalPremium = Math.round((basePremium + gstAmount) * 100) / 100;

  const proposalNumber = `PROP-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const policyNumber = `POL-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

  const proposal = await PolicyProposal.create({
    proposalNumber,
    policyNumber,
    userId: req.user._id,
    planId,
    optionId,
    sumInsuredId,
    ageSlabId,
    familyTypeId,
    insuredMembers,
    nominee,
    pricing: {
      basePremium,
      gstPercentage: gstRate,
      gstAmount,
      totalPremium,
    },
    status: 'active', // Active immediately upon submission
  });

  const createdProposal = await PolicyProposal.findById(proposal._id)
    .populate('planId', 'name slug logo')
    .populate('optionId', 'name description')
    .populate('sumInsuredId', 'displayName amount')
    .populate('familyTypeId', 'name code');

  return res.status(201).json(new ApiResponse(201, createdProposal, 'Policy proposal submitted and activated successfully!'));
});

export const getMyPolicies = asyncHandler(async (req, res) => {
  const policies = await PolicyProposal.find({ userId: req.user._id, isDeleted: false })
    .populate('planId', 'name slug logo shortDescription')
    .populate('optionId', 'name description')
    .populate('sumInsuredId', 'displayName amount')
    .populate('familyTypeId', 'name code')
    .sort({ createdAt: -1 });

  return res.status(200).json(new ApiResponse(200, policies, 'Customer policies retrieved successfully'));
});

export const getPolicyDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const policy = await PolicyProposal.findOne({ _id: id, userId: req.user._id, isDeleted: false })
    .populate('planId', 'name slug logo description')
    .populate('optionId', 'name description')
    .populate('sumInsuredId', 'displayName amount')
    .populate('ageSlabId', 'displayName')
    .populate('familyTypeId', 'name code');

  if (!policy) {
    throw new ApiError(404, 'Policy record not found');
  }

  // Attach policy conditions and coverages
  const [conditions, coverages] = await Promise.all([
    PolicyCondition.findOne({ planId: policy.planId._id, isDeleted: false }),
    PlanCoverage.find({ planId: policy.planId._id, optionId: policy.optionId._id, isDeleted: false }).populate('coverageId', 'title description icon'),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        policy,
        policyWording: conditions,
        coverages: coverages.map((c) => ({ title: c.coverageId.title, description: c.coverageId.description, isCovered: c.isCovered, value: c.value })),
      },
      'Policy details fetched successfully'
    )
  );
});
  // Check if user already has a pending or active application/proposal for this insurance plan
  const existingApp = await PolicyApplication.findOne({
    userId: req.user._id,
    planId,
    isDeleted: false,
    status: { $in: ['PENDING_APPROVAL', 'APPROVED', 'POLICY_ISSUED'] },
  }).populate('planId', 'name');

  if (existingApp) {
    const planName = existingApp.planId?.name || 'this insurance plan';
    if (existingApp.status === 'PENDING_APPROVAL') {
      throw new ApiError(
        400,
        `You have already applied for ${planName}. Your application is currently pending admin approval.`
      );
    }
    if (['APPROVED', 'POLICY_ISSUED'].includes(existingApp.status)) {
      throw new ApiError(
        400,
        `You already hold an active policy for ${planName}. Duplicate policy creation is not allowed.`
      );
    }
  }

  // Verify rate matrix to get pricing
  const rateEntry = await PremiumRate.findOne({
    planId,
    optionId,
    sumInsuredId,
    ageSlabId,
    familyTypeId,
    isDeleted: false,
    status: 'active',
  });

  if (!rateEntry) {
    throw new ApiError(400, 'Invalid proposal parameters. Premium rate entry not found.');
  }

  const basePremium = rateEntry.basePremium;
  const gstRate = rateEntry.gstPercentage || 18;
  const gstAmount = Math.round((basePremium * (gstRate / 100)) * 100) / 100;
  const totalPremium = Math.round((basePremium + gstAmount) * 100) / 100;

  const proposalNumber = `PROP-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const policyNumber = `POL-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

  const proposal = await PolicyProposal.create({
    proposalNumber,
    policyNumber,
    userId: req.user._id,
    planId,
    optionId,
    sumInsuredId,
    ageSlabId,
    familyTypeId,
    insuredMembers,
    nominee,
    pricing: {
      basePremium,
      gstPercentage: gstRate,
      gstAmount,
      totalPremium,
    },
    status: 'active', // Active immediately upon submission
  });

  const createdProposal = await PolicyProposal.findById(proposal._id)
    .populate('planId', 'name slug logo')
    .populate('optionId', 'name description')
    .populate('sumInsuredId', 'displayName amount')
    .populate('familyTypeId', 'name code');

  return res.status(201).json(new ApiResponse(201, createdProposal, 'Policy proposal submitted and activated successfully!'));
});

export const getMyPolicies = asyncHandler(async (req, res) => {
  const policies = await PolicyProposal.find({ userId: req.user._id, isDeleted: false })
    .populate('planId', 'name slug logo shortDescription')
    .populate('optionId', 'name description')
    .populate('sumInsuredId', 'displayName amount')
    .populate('familyTypeId', 'name code')
    .sort({ createdAt: -1 });

  return res.status(200).json(new ApiResponse(200, policies, 'Customer policies retrieved successfully'));
});

export const getPolicyDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const policy = await PolicyProposal.findOne({ _id: id, userId: req.user._id, isDeleted: false })
    .populate('planId', 'name slug logo description')
    .populate('optionId', 'name description')
    .populate('sumInsuredId', 'displayName amount')
    .populate('ageSlabId', 'displayName')
    .populate('familyTypeId', 'name code');

  if (!policy) {
    throw new ApiError(404, 'Policy record not found');
  }

  // Attach policy conditions and coverages
  const [conditions, coverages] = await Promise.all([
    PolicyCondition.findOne({ planId: policy.planId._id, isDeleted: false }),
    PlanCoverage.find({ planId: policy.planId._id, optionId: policy.optionId._id, isDeleted: false }).populate('coverageId', 'title description icon'),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        policy,
        policyWording: conditions,
        coverages: coverages.map((c) => ({ title: c.coverageId.title, description: c.coverageId.description, isCovered: c.isCovered, value: c.value })),
      },
      'Policy details fetched successfully'
    )
  );
});
