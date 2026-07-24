import crypto from 'crypto';
import { Plan } from '../../models/plan.model.js';
import { Coverage } from '../../models/coverage.model.js';
import { SumInsured } from '../../models/sumInsured.model.js';
import { AgeSlab } from '../../models/ageSlab.model.js';
import { FamilyType } from '../../models/familyType.model.js';
import { PlanCoverage } from '../../models/planCoverage.model.js';
import { PremiumRate } from '../../models/premiumRate.model.js';
import { Kyc } from '../../models/kyc.model.js';
import { User } from '../../models/user.model.js';
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

const deduplicatePlanCoverages = (planCoverages) => {
  if (!Array.isArray(planCoverages)) return [];
  const map = new Map();
  for (const c of planCoverages) {
    if (!c || !c.coverageId) continue;
    const key = c.coverageId._id
      ? c.coverageId._id.toString()
      : (c.coverageId.title || c.coverageId.toString());
    if (!key) continue;

    if (!map.has(key)) {
      map.set(key, c);
    } else {
      const existing = map.get(key);
      if (!existing.isCovered && c.isCovered) {
        map.set(key, c);
      }
    }
  }
  return Array.from(map.values());
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
        coverages: deduplicatePlanCoverages(planCoverages).map((c) => ({
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

  // Fetch user active proposals/applications to mark applied plans
  let userProposals = [];
  if (req.user) {
    userProposals = await PolicyProposal.find({
      userId: req.user._id,
      isDeleted: false,
      status: { $in: ['submitted', 'approved', 'active', 'draft', 'PENDING_APPROVAL'] },
    }).select('planId status proposalNumber');
  }

  const appliedMap = new Map();
  userProposals.forEach((p) => {
    appliedMap.set(p.planId.toString(), p.status);
  });

  const featuredPlansWithApplied = featuredPlans.map((fp) => {
    const status = appliedMap.get(fp._id.toString());
    return {
      ...fp,
      isApplied: Boolean(status),
      appliedStatus: status || null,
    };
  });

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
    featuredPlans: featuredPlansWithApplied,
    appliedPlanIds: Array.from(appliedMap.keys()),
  };

  return res.status(200).json(new ApiResponse(200, dashboardData, 'Customer dashboard data fetched successfully'));
});

// ==========================================
// 1.1 CUSTOMER PLAN DETAILS BY ID
// ==========================================

export const getCustomerPlanDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const params = { ...req.query, ...req.body };
  const { dob, age, familyTypeId, familyTypeCode, adultCount, childCount, sumInsuredId } = params;

  const plan = await Plan.findOne({ _id: id, isDeleted: false, status: 'active' })
    .populate('slabs', 'displayName amount')
    .populate('sumInsuredSlabs', 'displayName amount');

  if (!plan) {
    throw new ApiError(404, 'Insurance Plan not found or inactive');
  }

  // Calculate master user age from query/body dob/age, or user profile/KYC
  let userAge = null;
  if (dob) {
    userAge = calculateAgeFromDob(dob);
  } else if (age) {
    userAge = parseInt(age, 10);
  } else if (req.user && req.user.dob) {
    userAge = calculateAgeFromDob(req.user.dob);
  } else {
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

  // Fetch all active family types (or ensure defaults exist)
  let familyTypeOptions = await FamilyType.find({ isDeleted: false, status: 'active' }).sort({ adultCount: 1, childCount: 1 });
  if (!familyTypeOptions || familyTypeOptions.length === 0) {
    familyTypeOptions = await FamilyType.insertMany([
      { name: 'Individual (1 Adult)', code: 'INDIVIDUAL', adultCount: 1, childCount: 0 },
      { name: '1 Adult + 1 Child', code: '1A+1C', adultCount: 1, childCount: 1 },
      { name: '2 Adults', code: '2A', adultCount: 2, childCount: 0 },
      { name: '2 Adults + 1 Child', code: '2A+1C', adultCount: 2, childCount: 1 },
      { name: '2 Adults + 2 Children', code: '2A+2C', adultCount: 2, childCount: 2 },
    ]);
  }

  // Determine selected sumInsured
  let selectedSumInsured = null;
  if (sumInsuredId) {
    selectedSumInsured = sumInsuredOptions.find((si) => si._id.toString() === sumInsuredId);
  }
  if (!selectedSumInsured) {
    selectedSumInsured = sumInsuredOptions.length > 0 ? sumInsuredOptions[0] : null;
  }

  // Determine selected familyType dynamically
  let selectedFamilyType = null;
  if (familyTypeId) {
    selectedFamilyType = familyTypeOptions.find((ft) => ft._id.toString() === familyTypeId);
  }
  if (!selectedFamilyType && familyTypeCode) {
    const normalizedCode = familyTypeCode.replace('K', 'C').toUpperCase();
    selectedFamilyType = familyTypeOptions.find((ft) => ft.code.toUpperCase() === normalizedCode);
  }
  if (!selectedFamilyType && (adultCount !== undefined || childCount !== undefined)) {
    const reqAdults = parseInt(adultCount || '1', 10);
    const reqChildren = parseInt(childCount || '0', 10);
    selectedFamilyType = familyTypeOptions.find(
      (ft) => ft.adultCount === reqAdults && ft.childCount === reqChildren
    );
    if (!selectedFamilyType) {
      selectedFamilyType = familyTypeOptions.find(
        (ft) => ft.adultCount >= reqAdults && ft.childCount >= reqChildren
      );
    }
  }
  if (!selectedFamilyType) {
    selectedFamilyType = familyTypeOptions.find((ft) => ft.code === 'INDIVIDUAL') || familyTypeOptions[0];
  }

  // Strict PremiumRate lookup from Admin's configured Matrix (NO fallbacks!)
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

  const isAvailable = Boolean(selectedRate && selectedRate.basePremium > 0);
  let basePremium = isAvailable ? selectedRate.basePremium : 0;
  let gstPercentage = isAvailable ? (selectedRate.gstPercentage || 18) : 18;
  let gstAmount = isAvailable ? Math.round((basePremium * (gstPercentage / 100)) * 100) / 100 : 0;
  let totalPremium = isAvailable ? Math.round((basePremium + gstAmount) * 100) / 100 : 0;

  // Calculate pricing breakdown for ALL sum insured options strictly from Admin matrix
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

      const rateAvailable = Boolean(rate && rate.basePremium > 0);
      const base = rateAvailable ? rate.basePremium : 0;
      const gst = rateAvailable ? (rate.gstPercentage || 18) : 18;
      const gstAmt = rateAvailable ? Math.round((base * (gst / 100)) * 100) / 100 : 0;
      const total = rateAvailable ? Math.round((base + gstAmt) * 100) / 100 : 0;

      return {
        _id: si._id,
        displayName: si.displayName,
        amount: si.amount,
        isAvailable: rateAvailable,
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

  const coverages = deduplicatePlanCoverages(planCoverages).map((c) => ({
    _id: c._id,
    coverageId: c.coverageId?._id,
    title: c.coverageId?.title || '',
    description: c.coverageId?.description || '',
    icon: c.coverageId?.icon || '',
    category: c.coverageId?.category || 'General',
    isCovered: c.isCovered,
    value: c.value || '',
  }));

  // Check if current user has already applied for this plan
  let existingProposal = null;
  if (req.user) {
    existingProposal = await PolicyProposal.findOne({
      userId: req.user._id,
      planId: plan._id,
      isDeleted: false,
      status: { $in: ['submitted', 'approved', 'active', 'draft', 'PENDING_APPROVAL'] },
    });
  }

  const isApplied = Boolean(existingProposal);
  const appliedStatus = existingProposal ? existingProposal.status : null;

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
    isAvailable,
    isApplied,
    appliedStatus,
    message: isApplied
      ? 'You have already applied for this plan. Proposal is currently under review.'
      : isAvailable
      ? 'Package rate fetched successfully'
      : 'Package not available for the selected age slab and family composition.',
    pricing: {
      basePremium,
      gstPercentage,
      gstAmount,
      totalPremium,
    },
    sumInsuredOptions: sumInsuredPricingMap,
    familyTypeOptions,
    coverages,
  };

  return res.status(200).json(new ApiResponse(200, planDetails, 'Customer plan details fetched successfully'));
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
      coverages: deduplicatePlanCoverages(planCoverages).map((c) => ({
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
  const { name, email, dob, gender, panNumber, aadhaarNumber, address, idProofUrl } = req.body;

  const kyc = await Kyc.findOneAndUpdate(
    { userId: req.user._id, isDeleted: false },
    {
      $set: {
        userId: req.user._id,
        dob: dob ? new Date(dob) : undefined,
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

  // Sync profile fields (name, email, dob, gender) with User model
  const userUpdates = {};
  if (name) userUpdates.name = name;
  if (email) userUpdates.email = email;
  if (dob) userUpdates.dob = new Date(dob);
  if (gender) userUpdates.gender = gender;

  if (Object.keys(userUpdates).length > 0) {
    await User.findByIdAndUpdate(req.user._id, { $set: userUpdates });
  }

  return res.status(200).json(new ApiResponse(200, kyc, 'KYC & User details submitted and verified successfully'));
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
  let { planId, sumInsuredId, ageSlabId, familyTypeId, insuredMembers, masterMember, nominee } = req.body;

  const existingProposal = await PolicyProposal.findOne({
    userId: req.user._id,
    planId,
    isDeleted: false,
    status: { $in: ['submitted', 'approved', 'active', 'draft', 'PENDING_APPROVAL', 'POLICY_ISSUED'] },
  }).populate('planId', 'name');

  if (existingProposal) {
    if (['active', 'POLICY_ISSUED', 'APPROVED'].includes(existingProposal.status)) {
      const planName = existingProposal.planId?.name || 'this insurance plan';
      throw new ApiError(
        400,
        `You have already purchased and activated ${planName}.`
      );
    }
    return res.status(200).json(new ApiResponse(200, existingProposal, 'Existing proposal retrieved for payment processing'));
  }

  // Auto-resolve masterMember if not explicitly passed
  let resolvedMaster = masterMember;
  if (!resolvedMaster && insuredMembers && insuredMembers.length > 0) {
    const oldestMember = insuredMembers.reduce((oldest, m) => {
      const oldestAge = calculateAgeFromDob(oldest.dob);
      const mAge = calculateAgeFromDob(m.dob);
      return mAge > oldestAge ? m : oldest;
    }, insuredMembers[0]);

    resolvedMaster = {
      name: oldestMember.name,
      relation: oldestMember.relation,
      dob: new Date(oldestMember.dob),
      age: calculateAgeFromDob(oldestMember.dob),
      aadhaar: oldestMember.aadhaar || '',
    };
  } else if (resolvedMaster && resolvedMaster.dob) {
    resolvedMaster.dob = new Date(resolvedMaster.dob);
    resolvedMaster.age = resolvedMaster.age || calculateAgeFromDob(resolvedMaster.dob);
  }

  // Auto-resolve ageSlabId if missing using master member's age
  if (!ageSlabId && resolvedMaster && resolvedMaster.age) {
    const matchedSlab = await AgeSlab.findOne({
      minAge: { $lte: resolvedMaster.age },
      maxAge: { $gte: resolvedMaster.age },
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
    throw new ApiError(400, 'Invalid proposal parameters. Premium rate entry not found for this age slab and family composition.');
  }

  const basePremium = rateEntry.basePremium;
  const gstRate = rateEntry.gstPercentage || 18;
  const gstAmount = Math.round((basePremium * (gstRate / 100)) * 100) / 100;
  const totalPremium = Math.round((basePremium + gstAmount) * 100) / 100;

  const proposalNumber = `PROP-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

  const proposal = await PolicyProposal.create({
    proposalNumber,
    policyNumber: '',
    userId: req.user._id,
    planId,
    sumInsuredId,
    ageSlabId,
    familyTypeId,
    masterMember: resolvedMaster,
    insuredMembers,
    nominee,
    pricing: {
      basePremium,
      gstPercentage: gstRate,
      gstAmount,
      totalPremium,
    },
    status: 'submitted',
  });

  const createdProposal = await PolicyProposal.findById(proposal._id)
    .populate('planId', 'name slug logo')
    .populate('sumInsuredId', 'displayName amount')
    .populate('familyTypeId', 'name code');

  return res.status(201).json(new ApiResponse(201, createdProposal, 'Policy proposal submitted successfully! Pending Admin Approval.'));
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

  const rawCoverages = await PlanCoverage.find({
    planId: policy.planId._id,
    $or: [{ sumInsuredId: policy.sumInsuredId?._id || policy.sumInsuredId }, { sumInsuredId: null }],
    isDeleted: false,
  }).populate('coverageId', 'title description icon');

  const coverages = deduplicatePlanCoverages(rawCoverages);

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
