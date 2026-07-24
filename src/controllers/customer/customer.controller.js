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
  const [plans, kyc, individualFamilyType, lowestSumInsured] = await Promise.all([
    Plan.find({ isDeleted: false, status: 'active' })
      .populate('slabs', 'displayName amount')
      .populate('sumInsuredSlabs', 'displayName amount'),
    req.user ? Kyc.findOne({ userId: req.user._id, isDeleted: false }).select('kycStatus dob gender') : null,
    FamilyType.findOne({ isDeleted: false, status: 'active', $or: [{ code: 'INDIVIDUAL' }, { adultCount: 1, childCount: 0 }] }),
    SumInsured.findOne({ isDeleted: false, status: 'active' }).sort({ amount: 1 }),
  ]);

  // Calculate user age from DOB in query / KYC / User / default from min AgeSlab
  let userAge = null;
  if (req.query?.dob) {
    userAge = calculateAgeFromDob(req.query.dob);
  } else if (req.query?.age) {
    userAge = parseInt(req.query.age, 10);
  } else if (kyc && kyc.dob) {
    userAge = calculateAgeFromDob(kyc.dob);
  } else if (req.user && req.user.dob) {
    userAge = calculateAgeFromDob(req.user.dob);
  }

  // Fallback: If age is not set, use lowest minAge from active AgeSlabs
  if (!userAge || isNaN(userAge)) {
    const minSlab = await AgeSlab.findOne({ isDeleted: false, status: 'active' }).sort({ minAge: 1 });
    userAge = minSlab ? minSlab.minAge : 18;
  }

  // Find matching active AgeSlab for userAge
  const ageSlab = await AgeSlab.findOne({
    minAge: { $lte: userAge },
    maxAge: { $gte: userAge },
    isDeleted: false,
    status: 'active',
  });

  const featuredPlans = await Promise.all(
    plans.map(async (plan) => {
      let minRate = null;

      if (ageSlab) {
        // 1. Try finding exact rate for plan + user ageSlab + individual family type + lowest sum insured
        const query = {
          planId: plan._id,
          ageSlabId: ageSlab._id,
          isDeleted: false,
          status: 'active',
        };
        if (individualFamilyType) query.familyTypeId = individualFamilyType._id;
        if (lowestSumInsured) query.sumInsuredId = lowestSumInsured._id;

        minRate = await PremiumRate.findOne(query).select('basePremium gstPercentage sumInsuredId');

        // 2. If exact rate not found, find minimum rate for this plan & user ageSlab
        if (!minRate) {
          minRate = await PremiumRate.findOne({
            planId: plan._id,
            ageSlabId: ageSlab._id,
            isDeleted: false,
            status: 'active',
          }).sort({ basePremium: 1 }).select('basePremium gstPercentage sumInsuredId');
        }
      }

      // 3. Fallback: if no rate entry for user age slab exists, find absolute lowest rate for this plan
      if (!minRate) {
        minRate = await PremiumRate.findOne({
          planId: plan._id,
          isDeleted: false,
          status: 'active',
        }).sort({ basePremium: 1 }).select('basePremium gstPercentage sumInsuredId');
      }

      let basePrice = 0;
      let startingPrice = 0;
      let gstPercentage = 0;

      if (minRate && typeof minRate.basePremium === 'number') {
        basePrice = minRate.basePremium;
        gstPercentage = minRate.gstPercentage || 18;
        startingPrice = Math.round(basePrice * (1 + gstPercentage / 100));
      }

      // Selected sum insured for this price
      let planSumInsured = lowestSumInsured;
      if (minRate?.sumInsuredId) {
        planSumInsured = await SumInsured.findById(minRate.sumInsuredId).select('displayName amount');
      } else if (plan.sumInsuredSlabs && plan.sumInsuredSlabs.length > 0) {
        planSumInsured = plan.sumInsuredSlabs[0];
      }

      const planCoverages = await PlanCoverage.find({
        planId: plan._id,
        isDeleted: false,
      }).populate('coverageId', 'title description icon');

      return {
        _id: plan._id,
        name: plan.name,
        slug: plan.slug,
        shortDescription: plan.shortDescription || '',
        description: plan.description || '',
        logo: plan.logo || '',
        status: plan.status,
        calculatedAge: userAge,
        matchedAgeSlab: ageSlab ? (ageSlab.displayName || `${ageSlab.minAge}-${ageSlab.maxAge} Years`) : 'N/A',
        sumInsured: planSumInsured ? {
          _id: planSumInsured._id,
          displayName: planSumInsured.displayName,
          amount: planSumInsured.amount,
        } : null,
        sumInsuredSlabs: plan.sumInsuredSlabs || plan.slabs || [],
        coverages: planCoverages.map((c) => ({
          _id: c._id,
          title: c.coverageId?.title || '',
          description: c.coverageId?.description || '',
          icon: c.coverageId?.icon || '',
          isCovered: c.isCovered,
          value: c.value,
        })),
        basePrice,
        minPrice: basePrice,
        startingPrice: basePrice,
        priceWithGst: startingPrice,
        gstPercentage,
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt,
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
// 1.1 CUSTOMER PLAN DETAILS BY ID
// ==========================================

export const getCustomerPlanDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { dob, age } = req.query;

  const plan = await Plan.findOne({ _id: id, isDeleted: false, status: 'active' })
    .populate('slabs', 'displayName amount')
    .populate('sumInsuredSlabs', 'displayName amount');

  if (!plan) {
    throw new ApiError(404, 'Insurance Plan not found or inactive');
  }

  // Calculate user age from query dob/age, or user profile/KYC, or default minAge
  let userAge = null;
  if (dob) {
    userAge = calculateAgeFromDob(dob);
  } else if (age) {
    userAge = parseInt(age, 10);
  } else if (req.user && req.user.dob) {
    userAge = calculateAgeFromDob(req.user.dob);
  } else {
    // try to find from KYC
    const kyc = req.user ? await Kyc.findOne({ userId: req.user._id, isDeleted: false }).select('dob') : null;
    if (kyc && kyc.dob) {
      userAge = calculateAgeFromDob(kyc.dob);
    }
  }

  // Fallback if userAge not valid
  if (!userAge || isNaN(userAge)) {
    const minSlab = await AgeSlab.findOne({ isDeleted: false, status: 'active' }).sort({ minAge: 1 });
    userAge = minSlab ? minSlab.minAge : 18;
  }

  // Find matching active AgeSlab for userAge
  const ageSlab = await AgeSlab.findOne({
    minAge: { $lte: userAge },
    maxAge: { $gte: userAge },
    isDeleted: false,
    status: 'active',
  });

  // Fetch available sum insured options
  let sumInsuredOptions = [];
  if (plan.sumInsuredSlabs && plan.sumInsuredSlabs.length > 0) {
    sumInsuredOptions = plan.sumInsuredSlabs;
  } else if (plan.slabs && plan.slabs.length > 0) {
    sumInsuredOptions = plan.slabs;
  } else {
    sumInsuredOptions = await SumInsured.find({ isDeleted: false, status: 'active' }).sort({ amount: 1 });
  }

  // Fetch all active family types
  const familyTypeOptions = await FamilyType.find({ isDeleted: false, status: 'active' }).sort({ adultCount: 1, childCount: 1 });

  // Default selected sumInsured (first available)
  const selectedSumInsured = sumInsuredOptions.length > 0 ? sumInsuredOptions[0] : null;

  // Default selected familyType (INDIVIDUAL or first available)
  const selectedFamilyType = familyTypeOptions.find((ft) => ft.code === 'INDIVIDUAL') || (familyTypeOptions.length > 0 ? familyTypeOptions[0] : null);

  // Find rate for selected combination or fallback
  let selectedRate = null;
  if (ageSlab && selectedSumInsured && selectedFamilyType) {
    selectedRate = await PremiumRate.findOne({
      planId: plan._id,
      ageSlabId: ageSlab._id,
      sumInsuredId: selectedSumInsured._id,
      familyTypeId: selectedFamilyType._id,
      isDeleted: false,
      status: 'active',
    });
  }

  if (!selectedRate && ageSlab) {
    selectedRate = await PremiumRate.findOne({
      planId: plan._id,
      ageSlabId: ageSlab._id,
      isDeleted: false,
      status: 'active',
    }).sort({ basePremium: 1 });
  }

  if (!selectedRate) {
    selectedRate = await PremiumRate.findOne({
      planId: plan._id,
      isDeleted: false,
      status: 'active',
    }).sort({ basePremium: 1 });
  }

  let basePremium = selectedRate ? selectedRate.basePremium : 0;
  let gstPercentage = selectedRate ? (selectedRate.gstPercentage || 18) : 18;
  let gstAmount = Math.round((basePremium * (gstPercentage / 100)) * 100) / 100;
  let totalPremium = Math.round((basePremium + gstAmount) * 100) / 100;

  // Calculate pricing breakdown for ALL sum insured options for quick dynamic UI selection
  const sumInsuredPricingMap = await Promise.all(
    sumInsuredOptions.map(async (si) => {
      let rate = null;
      if (ageSlab && selectedFamilyType) {
        rate = await PremiumRate.findOne({
          planId: plan._id,
          sumInsuredId: si._id,
          ageSlabId: ageSlab._id,
          familyTypeId: selectedFamilyType._id,
          isDeleted: false,
          status: 'active',
        });
      }
      if (!rate && ageSlab) {
        rate = await PremiumRate.findOne({
          planId: plan._id,
          sumInsuredId: si._id,
          ageSlabId: ageSlab._id,
          isDeleted: false,
          status: 'active',
        });
      }
      if (!rate) {
        rate = await PremiumRate.findOne({
          planId: plan._id,
          sumInsuredId: si._id,
          isDeleted: false,
          status: 'active',
        });
      }

      const base = rate ? rate.basePremium : basePremium;
      const gst = rate ? (rate.gstPercentage || 18) : gstPercentage;
      const gstAmt = Math.round((base * (gst / 100)) * 100) / 100;
      const total = Math.round((base + gstAmt) * 100) / 100;

      return {
        _id: si._id,
        displayName: si.displayName,
        amount: si.amount,
        basePremium: base,
        gstPercentage: gst,
        gstAmount: gstAmt,
        totalPremium: total,
      };
    })
  );

  // Fetch plan coverages
  const planCoverages = await PlanCoverage.find({
    planId: plan._id,
    isDeleted: false,
  }).populate('coverageId', 'title description icon category');

  const coverages = planCoverages.map((c) => ({
    _id: c._id,
    coverageId: c.coverageId?._id,
    title: c.coverageId?.title || '',
    description: c.coverageId?.description || '',
    icon: c.coverageId?.icon || '',
    category: c.coverageId?.category || 'General',
    isCovered: c.isCovered,
    value: c.value || '',
  }));

  const planDetails = {
    plan: {
      _id: plan._id,
      name: plan.name,
      slug: plan.slug,
      shortDescription: plan.shortDescription || '',
      description: plan.description || '',
      logo: plan.logo || '',
      status: plan.status,
    },
    calculatedAge: userAge,
    dob: dob || req.user?.dob || null,
    matchedAgeSlab: ageSlab ? { _id: ageSlab._id, displayName: ageSlab.displayName, minAge: ageSlab.minAge, maxAge: ageSlab.maxAge } : null,
    selectedSumInsured,
    selectedFamilyType,
    pricing: {
      basePremium,
      gstPercentage,
      gstAmount,
      totalPremium,
    },
    sumInsuredOptions: sumInsuredPricingMap,
    familyTypeOptions,
    coverages,
    keyHighlights: [
      'Cashless Hospitalization across 10,000+ partner hospitals',
      'In-patient hospitalization coverage (Room rent, ICU, Doctor fees)',
      'Pre-hospitalization up to 60 days & Post-hospitalization up to 90 days',
      'Day care treatment & AYUSH hospitalization included',
      'Tax savings up to ₹75,000 under Section 80D',
      'No claim bonus benefit up to 50% extra sum insured',
    ],
  };

  return res.status(200).json(new ApiResponse(200, planDetails, 'Plan details fetched successfully'));
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
