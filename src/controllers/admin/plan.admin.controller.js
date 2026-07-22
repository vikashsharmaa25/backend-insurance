import { Plan, PlanOption } from '../../models/plan.model.js';
import { Coverage } from '../../models/coverage.model.js';
import { SumInsured } from '../../models/sumInsured.model.js';
import { AgeSlab } from '../../models/ageSlab.model.js';
import { FamilyType } from '../../models/familyType.model.js';
import ApiError from '../../utils/ApiError.js';
import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { seedDatabase } from '../../scripts/seedDatabase.js';

const generateSlug = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
};

// ==========================================
// 1. INSURANCE PLANS ADMIN CONTROLLERS
// ==========================================

export const createPlan = asyncHandler(async (req, res) => {
  const { name, slug, shortDescription, description, logo, status } = req.body;

  const planSlug = slug ? generateSlug(slug) : generateSlug(name);

  const existingPlan = await Plan.findOne({ slug: planSlug, isDeleted: false });
  if (existingPlan) {
    throw new ApiError(400, `Plan with slug '${planSlug}' already exists`);
  }

  const plan = await Plan.create({
    name,
    slug: planSlug,
    shortDescription,
    description,
    logo,
    status: status || 'active',
  });

  return res.status(201).json(new ApiResponse(201, plan, 'Insurance plan created successfully'));
});

export const getAllPlans = asyncHandler(async (req, res) => {
  const { search, status, page = 1, limit = 10 } = req.query;

  const query = { isDeleted: false };
  if (status) query.status = status;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { shortDescription: { $regex: search, $options: 'i' } },
    ];
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const total = await Plan.countDocuments(query);
  const plans = await Plan.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        plans,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      },
      'Insurance plans retrieved successfully'
    )
  );
});

export const getSinglePlan = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const plan = await Plan.findOne({ _id: id, isDeleted: false });
  if (!plan) {
    throw new ApiError(404, 'Insurance plan not found');
  }

  const options = await PlanOption.find({ planId: id, isDeleted: false });

  return res.status(200).json(
    new ApiResponse(200, { ...plan.toObject(), options }, 'Plan details fetched successfully')
  );
});

export const updatePlan = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, slug, shortDescription, description, logo, status } = req.body;

  const plan = await Plan.findOne({ _id: id, isDeleted: false });
  if (!plan) {
    throw new ApiError(404, 'Insurance plan not found');
  }

  if (slug || name) {
    const newSlug = slug ? generateSlug(slug) : generateSlug(name || plan.name);
    if (newSlug !== plan.slug) {
      const slugExists = await Plan.findOne({ slug: newSlug, _id: { $ne: id }, isDeleted: false });
      if (slugExists) {
        throw new ApiError(400, `Plan with slug '${newSlug}' already exists`);
      }
      plan.slug = newSlug;
    }
  }

  if (name !== undefined) plan.name = name;
  if (shortDescription !== undefined) plan.shortDescription = shortDescription;
  if (description !== undefined) plan.description = description;
  if (logo !== undefined) plan.logo = logo;
  if (status !== undefined) plan.status = status;

  await plan.save();

  return res.status(200).json(new ApiResponse(200, plan, 'Insurance plan updated successfully'));
});

export const deletePlan = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const plan = await Plan.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $set: { isDeleted: true } },
    { new: true }
  );

  if (!plan) {
    throw new ApiError(404, 'Insurance plan not found');
  }

  await PlanOption.updateMany({ planId: id }, { $set: { isDeleted: true } });

  return res.status(200).json(new ApiResponse(200, {}, 'Insurance plan deleted successfully'));
});

export const togglePlanStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const plan = await Plan.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $set: { status } },
    { new: true }
  );

  if (!plan) {
    throw new ApiError(404, 'Insurance plan not found');
  }

  return res.status(200).json(new ApiResponse(200, plan, `Plan status updated to ${status}`));
});

// ==========================================
// 2. PLAN OPTIONS ADMIN CONTROLLERS
// ==========================================

export const createPlanOption = asyncHandler(async (req, res) => {
  const { planId, name, description, status } = req.body;

  const plan = await Plan.findOne({ _id: planId, isDeleted: false });
  if (!plan) {
    throw new ApiError(404, 'Referenced Insurance plan not found');
  }

  const option = await PlanOption.create({
    planId,
    name,
    description,
    status: status || 'active',
  });

  return res.status(201).json(new ApiResponse(201, option, 'Plan option created successfully'));
});

export const getPlanOptions = asyncHandler(async (req, res) => {
  const { planId } = req.query;

  const query = { isDeleted: false };
  if (planId) query.planId = planId;

  const options = await PlanOption.find(query).populate('planId', 'name slug').sort({ createdAt: -1 });

  return res.status(200).json(new ApiResponse(200, options, 'Plan options retrieved successfully'));
});

export const getSinglePlanOption = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const option = await PlanOption.findOne({ _id: id, isDeleted: false }).populate('planId', 'name slug');
  if (!option) {
    throw new ApiError(404, 'Plan option not found');
  }

  return res.status(200).json(new ApiResponse(200, option, 'Plan option fetched successfully'));
});

export const updatePlanOption = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, status, planId } = req.body;

  const option = await PlanOption.findOne({ _id: id, isDeleted: false });
  if (!option) {
    throw new ApiError(404, 'Plan option not found');
  }

  if (planId) {
    const plan = await Plan.findOne({ _id: planId, isDeleted: false });
    if (!plan) {
      throw new ApiError(404, 'Referenced Insurance plan not found');
    }
    option.planId = planId;
  }

  if (name !== undefined) option.name = name;
  if (description !== undefined) option.description = description;
  if (status !== undefined) option.status = status;

  await option.save();

  return res.status(200).json(new ApiResponse(200, option, 'Plan option updated successfully'));
});

export const deletePlanOption = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const option = await PlanOption.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $set: { isDeleted: true } },
    { new: true }
  );

  if (!option) {
    throw new ApiError(404, 'Plan option not found');
  }

  return res.status(200).json(new ApiResponse(200, {}, 'Plan option deleted successfully'));
});

export const togglePlanOptionStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const option = await PlanOption.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $set: { status } },
    { new: true }
  );

  if (!option) {
    throw new ApiError(404, 'Plan option not found');
  }

  return res.status(200).json(new ApiResponse(200, option, `Option status updated to ${status}`));
});

// ==========================================
// 3. COVERAGE MASTER ADMIN CONTROLLERS
// ==========================================

export const createCoverage = asyncHandler(async (req, res) => {
  const { title, description, icon, status } = req.body;

  const existing = await Coverage.findOne({ title, isDeleted: false });
  if (existing) {
    throw new ApiError(400, `Coverage with title '${title}' already exists`);
  }

  const coverage = await Coverage.create({
    title,
    description,
    icon,
    status: status || 'active',
  });

  return res.status(201).json(new ApiResponse(201, coverage, 'Coverage created successfully'));
});

export const getAllCoverages = asyncHandler(async (req, res) => {
  const { search, status } = req.query;

  const query = { isDeleted: false };
  if (status) query.status = status;
  if (search) query.title = { $regex: search, $options: 'i' };

  const coverages = await Coverage.find(query).sort({ title: 1 });

  return res.status(200).json(new ApiResponse(200, coverages, 'Coverages retrieved successfully'));
});

export const getSingleCoverage = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const coverage = await Coverage.findOne({ _id: id, isDeleted: false });
  if (!coverage) {
    throw new ApiError(404, 'Coverage not found');
  }

  return res.status(200).json(new ApiResponse(200, coverage, 'Coverage fetched successfully'));
});

export const updateCoverage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, icon, status } = req.body;

  const coverage = await Coverage.findOne({ _id: id, isDeleted: false });
  if (!coverage) {
    throw new ApiError(404, 'Coverage not found');
  }

  if (title && title !== coverage.title) {
    const existing = await Coverage.findOne({ title, _id: { $ne: id }, isDeleted: false });
    if (existing) {
      throw new ApiError(400, `Coverage with title '${title}' already exists`);
    }
    coverage.title = title;
  }

  if (description !== undefined) coverage.description = description;
  if (icon !== undefined) coverage.icon = icon;
  if (status !== undefined) coverage.status = status;

  await coverage.save();

  return res.status(200).json(new ApiResponse(200, coverage, 'Coverage updated successfully'));
});

export const deleteCoverage = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const coverage = await Coverage.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $set: { isDeleted: true } },
    { new: true }
  );

  if (!coverage) {
    throw new ApiError(404, 'Coverage not found');
  }

  return res.status(200).json(new ApiResponse(200, {}, 'Coverage deleted successfully'));
});

export const toggleCoverageStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const coverage = await Coverage.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $set: { status } },
    { new: true }
  );

  if (!coverage) {
    throw new ApiError(404, 'Coverage not found');
  }

  return res.status(200).json(new ApiResponse(200, coverage, `Coverage status updated to ${status}`));
});

// ==========================================
// 4. SUM INSURED MASTER ADMIN CONTROLLERS
// ==========================================

export const createSumInsured = asyncHandler(async (req, res) => {
  const { amount, displayName, status } = req.body;

  const existing = await SumInsured.findOne({ amount, isDeleted: false });
  if (existing) {
    throw new ApiError(400, `Sum Insured with amount ${amount} already exists`);
  }

  const sumInsured = await SumInsured.create({
    amount,
    displayName,
    status: status || 'active',
  });

  return res.status(201).json(new ApiResponse(201, sumInsured, 'Sum Insured created successfully'));
});

export const getAllSumInsureds = asyncHandler(async (req, res) => {
  const { status } = req.query;

  const query = { isDeleted: false };
  if (status) query.status = status;

  const items = await SumInsured.find(query).sort({ amount: 1 });

  return res.status(200).json(new ApiResponse(200, items, 'Sum Insured master retrieved successfully'));
});

export const getSingleSumInsured = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const item = await SumInsured.findOne({ _id: id, isDeleted: false });
  if (!item) {
    throw new ApiError(404, 'Sum Insured item not found');
  }

  return res.status(200).json(new ApiResponse(200, item, 'Sum Insured fetched successfully'));
});

export const updateSumInsured = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { amount, displayName, status } = req.body;

  const item = await SumInsured.findOne({ _id: id, isDeleted: false });
  if (!item) {
    throw new ApiError(404, 'Sum Insured item not found');
  }

  if (amount && amount !== item.amount) {
    const existing = await SumInsured.findOne({ amount, _id: { $ne: id }, isDeleted: false });
    if (existing) {
      throw new ApiError(400, `Sum Insured with amount ${amount} already exists`);
    }
    item.amount = amount;
  }

  if (displayName !== undefined) item.displayName = displayName;
  if (status !== undefined) item.status = status;

  await item.save();

  return res.status(200).json(new ApiResponse(200, item, 'Sum Insured updated successfully'));
});

export const deleteSumInsured = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const item = await SumInsured.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $set: { isDeleted: true } },
    { new: true }
  );

  if (!item) {
    throw new ApiError(404, 'Sum Insured item not found');
  }

  return res.status(200).json(new ApiResponse(200, {}, 'Sum Insured deleted successfully'));
});

export const toggleSumInsuredStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const item = await SumInsured.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $set: { status } },
    { new: true }
  );

  if (!item) {
    throw new ApiError(404, 'Sum Insured item not found');
  }

  return res.status(200).json(new ApiResponse(200, item, `Sum Insured status updated to ${status}`));
});

// ==========================================
// 5. AGE SLAB MASTER ADMIN CONTROLLERS
// ==========================================

export const createAgeSlab = asyncHandler(async (req, res) => {
  const { minAge, maxAge, displayName, status } = req.body;

  const ageSlab = await AgeSlab.create({
    minAge,
    maxAge,
    displayName,
    status: status || 'active',
  });

  return res.status(201).json(new ApiResponse(201, ageSlab, 'Age Slab created successfully'));
});

export const getAllAgeSlabs = asyncHandler(async (req, res) => {
  const { status } = req.query;

  const query = { isDeleted: false };
  if (status) query.status = status;

  const slabs = await AgeSlab.find(query).sort({ minAge: 1 });

  return res.status(200).json(new ApiResponse(200, slabs, 'Age Slabs retrieved successfully'));
});

export const getSingleAgeSlab = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const slab = await AgeSlab.findOne({ _id: id, isDeleted: false });
  if (!slab) {
    throw new ApiError(404, 'Age Slab not found');
  }

  return res.status(200).json(new ApiResponse(200, slab, 'Age Slab fetched successfully'));
});

export const updateAgeSlab = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { minAge, maxAge, displayName, status } = req.body;

  const slab = await AgeSlab.findOne({ _id: id, isDeleted: false });
  if (!slab) {
    throw new ApiError(404, 'Age Slab not found');
  }

  if (minAge !== undefined) slab.minAge = minAge;
  if (maxAge !== undefined) slab.maxAge = maxAge;
  if (displayName !== undefined) slab.displayName = displayName;
  if (status !== undefined) slab.status = status;

  if (slab.maxAge < slab.minAge) {
    throw new ApiError(400, 'Maximum age must be greater than or equal to minimum age');
  }

  await slab.save();

  return res.status(200).json(new ApiResponse(200, slab, 'Age Slab updated successfully'));
});

export const deleteAgeSlab = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const slab = await AgeSlab.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $set: { isDeleted: true } },
    { new: true }
  );

  if (!slab) {
    throw new ApiError(404, 'Age Slab not found');
  }

  return res.status(200).json(new ApiResponse(200, {}, 'Age Slab deleted successfully'));
});

export const toggleAgeSlabStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const slab = await AgeSlab.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $set: { status } },
    { new: true }
  );

  if (!slab) {
    throw new ApiError(404, 'Age Slab not found');
  }

  return res.status(200).json(new ApiResponse(200, slab, `Age Slab status updated to ${status}`));
});

// ==========================================
// 6. FAMILY TYPE MASTER ADMIN CONTROLLERS
// ==========================================

export const createFamilyType = asyncHandler(async (req, res) => {
  const { name, code, adultCount, childCount, status } = req.body;

  const existing = await FamilyType.findOne({ code: code.toUpperCase(), isDeleted: false });
  if (existing) {
    throw new ApiError(400, `Family Type with code '${code}' already exists`);
  }

  const familyType = await FamilyType.create({
    name,
    code: code.toUpperCase(),
    adultCount,
    childCount,
    status: status || 'active',
  });

  return res.status(201).json(new ApiResponse(201, familyType, 'Family Type created successfully'));
});

export const getAllFamilyTypes = asyncHandler(async (req, res) => {
  const { status } = req.query;

  const query = { isDeleted: false };
  if (status) query.status = status;

  const types = await FamilyType.find(query).sort({ adultCount: 1, childCount: 1 });

  return res.status(200).json(new ApiResponse(200, types, 'Family Types retrieved successfully'));
});

export const getSingleFamilyType = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const type = await FamilyType.findOne({ _id: id, isDeleted: false });
  if (!type) {
    throw new ApiError(404, 'Family Type not found');
  }

  return res.status(200).json(new ApiResponse(200, type, 'Family Type fetched successfully'));
});

export const updateFamilyType = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, code, adultCount, childCount, status } = req.body;

  const type = await FamilyType.findOne({ _id: id, isDeleted: false });
  if (!type) {
    throw new ApiError(404, 'Family Type not found');
  }

  if (code && code.toUpperCase() !== type.code) {
    const existing = await FamilyType.findOne({ code: code.toUpperCase(), _id: { $ne: id }, isDeleted: false });
    if (existing) {
      throw new ApiError(400, `Family Type with code '${code}' already exists`);
    }
    type.code = code.toUpperCase();
  }

  if (name !== undefined) type.name = name;
  if (adultCount !== undefined) type.adultCount = adultCount;
  if (childCount !== undefined) type.childCount = childCount;
  if (status !== undefined) type.status = status;

  await type.save();

  return res.status(200).json(new ApiResponse(200, type, 'Family Type updated successfully'));
});

export const deleteFamilyType = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const type = await FamilyType.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $set: { isDeleted: true } },
    { new: true }
  );

  if (!type) {
    throw new ApiError(404, 'Family Type not found');
  }

  return res.status(200).json(new ApiResponse(200, {}, 'Family Type deleted successfully'));
});

export const toggleFamilyTypeStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const type = await FamilyType.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $set: { status } },
    { new: true }
  );

  if (!type) {
    throw new ApiError(404, 'Family Type not found');
  }

  return res.status(200).json(new ApiResponse(200, type, `Family Type status updated to ${status}`));
});

export const seedAllDataController = asyncHandler(async (req, res) => {
  await seedDatabase();
  return res.status(200).json(new ApiResponse(200, {}, 'All master data, options, policy conditions & premium rates successfully seeded to MongoDB!'));
});
