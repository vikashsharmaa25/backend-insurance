import crypto from 'crypto';
import { Plan } from '../../models/plan.model.js';
import { Coverage } from '../../models/coverage.model.js';
import { SumInsured } from '../../models/sumInsured.model.js';
import { AgeSlab } from '../../models/ageSlab.model.js';
import { FamilyType } from '../../models/familyType.model.js';
import { PlanCoverage } from '../../models/planCoverage.model.js';
import { PremiumRate } from '../../models/premiumRate.model.js';
import { Kyc } from '../../models/kyc.model.js';
import { PolicyProposal } from '../../models/policyProposal.model.js';
import { PolicyApplication } from '../../models/policyApplication.model.js';
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

// ==========================================
// 1. CUSTOMER DASHBOARD
// ==========================================

export const getCustomerDashboard = asyncHandler(async (req, res) => {
  const [plans, kyc] = await Promise.all([
    Plan.find({ isDeleted: false, status: 'active' }).select('name slug shortDescription description logo'),
    req.user ? Kyc.findOne({ userId: req.user._id, isDeleted: false }).select('kycStatus dob gender') : null,
  ]);

  const featuredPlans = await Promise.all(
    plans.map(async (plan) => {
      const minRate = await PremiumRate.findOne({
        planId: plan._id,
        isDeleted: false,
        status: 'active',
      })
        .sort({ basePremium: 1 })
        .select('basePremium gstPercentage');

      let startingPrice = 499;
      if (minRate && minRate.basePremium) {
        const gst = minRate.gstPercentage || 18;
        startingPrice = Math.round(minRate.basePremium * (1 + gst / 100));
      }

      return {
        _id: plan._id,
        name: plan.name,
        slug: plan.slug,
        shortDescription:
          plan.shortDescription ||
          plan.description ||
          'Comprehensive health coverage with zero copay & instant claims processing.',
        description: plan.description || plan.shortDescription || '',
        logo: plan.logo || '',
        minPrice: startingPrice,
        startingPrice,
      };
    })
  );

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
    featuredPlans,
  };

  return res.status(200).json(new ApiResponse(200, dashboardData, 'Customer dashboard data fetched successfully'));
});

// ==========================================
// 2. QUOTE GENERATOR ENGINE
// ==========================================

export const explorePlansWithQuotes = asyncHandler(async (req, res) => {
  const { dob, familyTypeId, sumInsuredId, planId } = req.body;

  const userAge = calculateAgeFromDob(dob);

  if (userAge === undefined || userAge === null || isNaN(userAge)) {
    throw new ApiError(400, 'Please provide a valid Date of Birth (dob)');
  }

  const ageSlab = await AgeSlab.findOne({
    minAge: { $lte: userAge },
    maxAge: { $gte: userAge },
    isDeleted: false,
    status: 'active',
  });

  if (!ageSlab) {
    throw new ApiError(400, `No active age slab found for age ${userAge}. Valid age range is 18-65 years.`);
  }

  const [familyType, sumInsured] = await Promise.all([
    FamilyType.findOne({ _id: familyTypeId, isDeleted: false, status: 'active' }),
    SumInsured.findOne({ _id: sumInsuredId, isDeleted: false, status: 'active' }),
  ]);

  if (!familyType) throw new ApiError(404, 'Active Family Type not found');
  if (!sumInsured) throw new ApiError(404, 'Active Sum Insured not found');

  const planQuery = { isDeleted: false, status: 'active' };
  if (planId) planQuery._id = planId;

  const plans = await Plan.find(planQuery);

  const quoteResults = [];

  for (const plan of plans) {
    const rateEntry = await PremiumRate.findOne({
      planId: plan._id,
      sumInsuredId: sumInsured._id,
      ageSlabId: ageSlab._id,
      familyTypeId: familyType._id,
      isDeleted: false,
      status: 'active',
    });

    if (!rateEntry) continue;

    const basePremium = rateEntry.basePremium;
    const gstRate = rateEntry.gstPercentage || 18;
    const gstAmount = Math.round((basePremium * (gstRate / 100)) * 100) / 100;
    const totalPremium = Math.round((basePremium + gstAmount) * 100) / 100;

    const planCoverages = await PlanCoverage.find({
      planId: plan._id,
      $or: [{ sumInsuredId: sumInsured._id }, { sumInsuredId: null }],
      isDeleted: false,
    }).populate('coverageId', 'title description icon');

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
      calculatedAge: userAge,
      ageSlabId: ageSlab._id,
      matchedAgeSlab: ageSlab.displayName,
      userApplicationStatus,
      pricing: {
        basePremium,
        gstPercentage: gstRate,
        gstAmount,
        totalPremium,
      },
      coverages: planCoverages.map((c) => ({
        title: c.coverageId?.title,
        description: c.coverageId?.description,
        icon: c.coverageId?.icon,
        isCovered: c.isCovered,
        value: c.value,
      })),
    });
  }

  return res.status(200).json(new ApiResponse(200, quoteResults, 'Quotations generated successfully'));
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
        kycStatus: 'verified',
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
  let { planId, sumInsuredId, ageSlabId, familyTypeId, insuredMembers, nominee } = req.body;

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

  // Auto-resolve ageSlabId if missing using primary insured member's DOB
  if (!ageSlabId && insuredMembers && insuredMembers.length > 0 && insuredMembers[0].dob) {
    const userAge = calculateAgeFromDob(insuredMembers[0].dob);
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

  const rateEntry = await PremiumRate.findOne({
    planId,
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
    status: 'active',
  });

  const createdProposal = await PolicyProposal.findById(proposal._id)
    .populate('planId', 'name slug logo')
    .populate('sumInsuredId', 'displayName amount')
    .populate('familyTypeId', 'name code');

  return res.status(201).json(new ApiResponse(201, createdProposal, 'Policy proposal submitted and activated successfully!'));
});

export const getMyPolicies = asyncHandler(async (req, res) => {
  const policies = await PolicyProposal.find({ userId: req.user._id, isDeleted: false })
    .populate('planId', 'name slug logo shortDescription')
    .populate('sumInsuredId', 'displayName amount')
    .populate('familyTypeId', 'name code')
    .sort({ createdAt: -1 });

  return res.status(200).json(new ApiResponse(200, policies, 'Customer policies retrieved successfully'));
});

export const getPolicyDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const policy = await PolicyProposal.findOne({ _id: id, userId: req.user._id, isDeleted: false })
    .populate('planId', 'name slug logo description')
    .populate('sumInsuredId', 'displayName amount')
    .populate('ageSlabId', 'displayName')
    .populate('familyTypeId', 'name code');

  if (!policy) {
    throw new ApiError(404, 'Policy record not found');
  }

  const coverages = await PlanCoverage.find({
    planId: policy.planId._id,
    $or: [{ sumInsuredId: policy.sumInsuredId?._id || policy.sumInsuredId }, { sumInsuredId: null }],
    isDeleted: false,
  }).populate('coverageId', 'title description icon');

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        policy,
        coverages: coverages.map((c) => ({ title: c.coverageId?.title, description: c.coverageId?.description, isCovered: c.isCovered, value: c.value })),
      },
      'Policy details fetched successfully'
    )
  );
});
