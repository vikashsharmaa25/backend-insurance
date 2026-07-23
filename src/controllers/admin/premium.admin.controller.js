import XLSX from 'xlsx';
import { Plan } from '../../models/plan.model.js';
import { Coverage } from '../../models/coverage.model.js';
import { SumInsured } from '../../models/sumInsured.model.js';
import { AgeSlab } from '../../models/ageSlab.model.js';
import { FamilyType } from '../../models/familyType.model.js';
import { PlanCoverage } from '../../models/planCoverage.model.js';
import { PremiumRate } from '../../models/premiumRate.model.js';
import ApiError from '../../utils/ApiError.js';
import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';

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
// 1. PREMIUM RATE MATRIX ADMIN CONTROLLERS
// ==========================================

export const createPremiumRate = asyncHandler(async (req, res) => {
  const { planId, sumInsuredId, ageSlabId, familyTypeId, basePremium, gstPercentage, status } = req.body;

  const existing = await PremiumRate.findOne({
    planId,
    sumInsuredId,
    ageSlabId,
    familyTypeId,
    isDeleted: false,
  });

  if (existing) {
    throw new ApiError(400, 'Premium rate entry already exists for these parameters.');
  }

  const rate = await PremiumRate.create({
    planId,
    sumInsuredId,
    ageSlabId,
    familyTypeId,
    basePremium,
    gstPercentage: gstPercentage || 18,
    status: status || 'active',
  });

  return res.status(201).json(new ApiResponse(201, rate, 'Premium rate entry created successfully'));
});

export const bulkCreatePremiumRates = asyncHandler(async (req, res) => {
  const { rates } = req.body;

  const operations = rates.map((item) => ({
    updateOne: {
      filter: {
        planId: item.planId,
        sumInsuredId: item.sumInsuredId,
        ageSlabId: item.ageSlabId,
        familyTypeId: item.familyTypeId,
        isDeleted: false,
      },
      update: {
        $set: {
          basePremium: item.basePremium,
          gstPercentage: item.gstPercentage || 18,
          status: 'active',
        },
      },
      upsert: true,
    },
  }));

  const result = await PremiumRate.bulkWrite(operations);

  return res
    .status(200)
    .json(new ApiResponse(200, result, 'Bulk premium rates uploaded/updated successfully'));
});

export const getAllPremiumRates = asyncHandler(async (req, res) => {
  const { planId, sumInsuredId, ageSlabId, familyTypeId, page = 1, limit = 500 } = req.query;

  const query = { isDeleted: false };
  if (planId) query.planId = planId;
  if (sumInsuredId) query.sumInsuredId = sumInsuredId;
  if (ageSlabId) query.ageSlabId = ageSlabId;
  if (familyTypeId) query.familyTypeId = familyTypeId;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const total = await PremiumRate.countDocuments(query);
  const rates = await PremiumRate.find(query)
    .populate('planId', 'name slug')
    .populate('sumInsuredId', 'displayName amount')
    .populate('ageSlabId', 'displayName minAge maxAge')
    .populate('familyTypeId', 'name code')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        rates,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
      'Premium rates fetched successfully'
    )
  );
});

export const getPremiumRateById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const rate = await PremiumRate.findOne({ _id: id, isDeleted: false })
    .populate('planId', 'name slug')
    .populate('sumInsuredId', 'displayName amount')
    .populate('ageSlabId', 'displayName minAge maxAge')
    .populate('familyTypeId', 'name code');

  if (!rate) {
    throw new ApiError(404, 'Premium rate entry not found');
  }

  return res.status(200).json(new ApiResponse(200, rate, 'Premium rate entry fetched successfully'));
});

export const updatePremiumRate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { planId, sumInsuredId, ageSlabId, familyTypeId, basePremium, gstPercentage, status } = req.body;

  const updateFields = {};
  if (planId !== undefined) updateFields.planId = planId;
  if (sumInsuredId !== undefined) updateFields.sumInsuredId = sumInsuredId;
  if (ageSlabId !== undefined) updateFields.ageSlabId = ageSlabId;
  if (familyTypeId !== undefined) updateFields.familyTypeId = familyTypeId;
  if (basePremium !== undefined) updateFields.basePremium = basePremium;
  if (gstPercentage !== undefined) updateFields.gstPercentage = gstPercentage;
  if (status !== undefined) updateFields.status = status;

  const rate = await PremiumRate.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $set: updateFields },
    { new: true, runValidators: true }
  )
    .populate('planId', 'name')
    .populate('sumInsuredId', 'displayName amount')
    .populate('ageSlabId', 'displayName minAge maxAge')
    .populate('familyTypeId', 'name code');

  if (!rate) {
    throw new ApiError(404, 'Premium rate entry not found');
  }

  return res.status(200).json(new ApiResponse(200, rate, 'Premium rate entry updated successfully'));
});

export const deletePremiumRate = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const rate = await PremiumRate.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $set: { isDeleted: true } },
    { new: true }
  );

  if (!rate) {
    throw new ApiError(404, 'Premium rate entry not found');
  }

  return res.status(200).json(new ApiResponse(200, null, 'Premium rate entry deleted successfully'));
});

// ==========================================
// 2. PLAN COVERAGE MATRIX (ADMIN Only)
// ==========================================

export const mapPlanCoverage = asyncHandler(async (req, res) => {
  const { planId, coverageId, sumInsuredId, isCovered, value } = req.body;

  const filter = { planId, coverageId, sumInsuredId: sumInsuredId || null, isDeleted: false };
  const mapping = await PlanCoverage.findOneAndUpdate(
    filter,
    { $set: { isCovered, value: value || (isCovered ? 'Yes' : 'No') } },
    { new: true, upsert: true }
  );

  return res.status(200).json(new ApiResponse(200, mapping, 'Coverage mapped to plan successfully'));
});

export const mapPlanCoverageBatch = asyncHandler(async (req, res) => {
  const { planId, coverages } = req.body;

  if (!planId || !Array.isArray(coverages)) {
    throw new ApiError(400, 'planId and coverages array are required');
  }

  const operations = coverages.map((cov) => ({
    updateOne: {
      filter: {
        planId,
        coverageId: cov.coverageId,
        sumInsuredId: cov.sumInsuredId || null,
      },
      update: {
        $set: {
          isCovered: Boolean(cov.isCovered),
          value: cov.value || (cov.isCovered ? 'Yes' : 'No'),
          isDeleted: false,
        },
        $setOnInsert: {
          sumInsuredId: cov.sumInsuredId || null,
        },
      },
      upsert: true,
    },
  }));

  if (operations.length > 0) {
    try {
      await PlanCoverage.bulkWrite(operations, { ordered: false });
    } catch (bulkErr) {
      // If some ops failed due to duplicate key (old index), ignore those
      // and continue — the successfully written ones are fine
      const code = bulkErr.code || bulkErr.result?.getWriteErrors?.()?.[0]?.code;
      if (code !== 11000 && code !== 11001) {
        throw bulkErr;
      }
    }
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { count: operations.length }, 'Plan coverage matrix saved successfully'));
});

export const getPlanCoveragesMatrix = asyncHandler(async (req, res) => {
  const { planId, sumInsuredId } = req.query;

  const query = { isDeleted: false };
  if (planId) query.planId = planId;
  if (sumInsuredId) query.sumInsuredId = sumInsuredId;

  const matrix = await PlanCoverage.find(query)
    .populate('planId', 'name')
    .populate('coverageId', 'title description icon')
    .populate('sumInsuredId', 'amount displayName');

  return res.status(200).json(new ApiResponse(200, matrix, 'Plan coverage matrix fetched successfully'));
});

// ==========================================
// 3. EXCEL BULK UPLOAD & TEMPLATE DOWNLOAD (ADMIN Only)
// ==========================================

export const uploadExcelBulkData = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'Please upload an Excel file (.xlsx, .xls, .csv)');
  }

  const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
  const sheetNames = workbook.SheetNames;

  const results = {
    plansImported: 0,
    coveragesImported: 0,
    sumInsuredsImported: 0,
    ageSlabsImported: 0,
    familyTypesImported: 0,
    coverageMappingsImported: 0,
    premiumRatesImported: 0,
  };

  const getSheetData = (name) => {
    const sheetName = sheetNames.find((s) => s.toLowerCase().trim() === name.toLowerCase().trim());
    if (!sheetName) return [];
    return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
  };

  // Plans
  const plansData = getSheetData('Plans');
  for (const row of plansData) {
    const name = row['Plan Name'] || row['name'];
    if (!name) continue;
    const slug = row['Slug'] || row['slug'] || generateSlug(name);
    await Plan.findOneAndUpdate(
      { slug, isDeleted: false },
      {
        $set: {
          name: String(name).trim(),
          slug,
          shortDescription: row['Short Description'] || row['shortDescription'] || '',
          description: row['Description'] || row['description'] || '',
          status: 'active',
        },
      },
      { upsert: true, new: true }
    );
    results.plansImported++;
  }

  // Coverages
  const coveragesData = getSheetData('Coverages');
  for (const row of coveragesData) {
    const title = row['Title'] || row['title'];
    if (!title) continue;

    await Coverage.findOneAndUpdate(
      { title: String(title).trim(), isDeleted: false },
      { $set: { description: row['Description'] || '', icon: row['Icon'] || '', status: 'active' } },
      { upsert: true, new: true }
    );
    results.coveragesImported++;
  }

  // Sum Insured
  const siData = getSheetData('Sum Insured');
  for (const row of siData) {
    const amount = Number(row['Amount'] || row['amount']);
    if (isNaN(amount) || amount <= 0) continue;
    const displayName = row['Display Name'] || row['displayName'] || `${amount}`;

    await SumInsured.findOneAndUpdate(
      { amount, isDeleted: false },
      { $set: { displayName: String(displayName).trim(), status: 'active' } },
      { upsert: true, new: true }
    );
    results.sumInsuredsImported++;
  }

  // Age Slabs
  const ageData = getSheetData('Age Slabs');
  for (const row of ageData) {
    const minAge = Number(row['Min Age'] || row['minAge']);
    const maxAge = Number(row['Max Age'] || row['maxAge']);
    if (isNaN(minAge) || isNaN(maxAge)) continue;
    const displayName = row['Display Name'] || row['displayName'] || `${minAge}-${maxAge} Years`;

    await AgeSlab.findOneAndUpdate(
      { minAge, maxAge, isDeleted: false },
      { $set: { displayName: String(displayName).trim(), status: 'active' } },
      { upsert: true, new: true }
    );
    results.ageSlabsImported++;
  }

  // Family Types
  const familyData = getSheetData('Family Types');
  for (const row of familyData) {
    const name = row['Name'] || row['name'];
    const code = String(row['Code'] || row['code'] || '').toUpperCase().trim();
    if (!name || !code) continue;

    await FamilyType.findOneAndUpdate(
      { code, isDeleted: false },
      {
        $set: {
          name: String(name).trim(),
          code,
          adultCount: Number(row['Adult Count'] || row['adultCount'] || 1),
          childCount: Number(row['Child Count'] || row['childCount'] || 0),
          status: 'active',
        },
      },
      { upsert: true, new: true }
    );
    results.familyTypesImported++;
  }

  // Coverage Matrix
  const matrixData = getSheetData('Coverage Matrix');
  for (const row of matrixData) {
    const planName = row['Plan Name'] || row['planName'];
    const coverageTitle = row['Coverage Title'] || row['coverageTitle'];
    const siAmount = Number(row['Sum Insured Amount'] || row['sumInsuredAmount'] || row['amount']);

    if (!planName || !coverageTitle) continue;

    const [plan, coverage, sumInsured] = await Promise.all([
      Plan.findOne({ name: { $regex: new RegExp(`^${String(planName).trim()}$`, 'i') }, isDeleted: false }),
      Coverage.findOne({ title: { $regex: new RegExp(`^${String(coverageTitle).trim()}$`, 'i') }, isDeleted: false }),
      !isNaN(siAmount) && siAmount > 0 ? SumInsured.findOne({ amount: siAmount, isDeleted: false }) : null,
    ]);

    if (!plan || !coverage) continue;

    const isCoveredStr = String(row['Is Covered'] || row['isCovered'] || 'Yes');
    const isCovered = isCoveredStr.toLowerCase().includes('yes') || isCoveredStr === 'true';
    const value = row['Value'] || row['value'] || (isCovered ? 'Yes' : 'No');

    await PlanCoverage.findOneAndUpdate(
      {
        planId: plan._id,
        coverageId: coverage._id,
        sumInsuredId: sumInsured?._id || null,
        isDeleted: false,
      },
      { $set: { isCovered, value: String(value), isDeleted: false } },
      { upsert: true }
    );
    results.coverageMappingsImported++;
  }

  // Premium Rates
  const rateData = getSheetData('Premium Rates');
  for (const row of rateData) {
    const planName = row['Plan Name'] || row['planName'];
    const siAmount = Number(row['Sum Insured Amount'] || row['sumInsuredAmount'] || row['amount']);
    const ageStr = String(row['Age Slab'] || row['ageSlab'] || '');
    const familyCode = String(row['Family Type Code'] || row['familyTypeCode'] || row['code'] || '').toUpperCase().trim();
    const basePremium = Number(row['Base Premium'] || row['basePremium'] || row['premium']);

    if (!planName || !siAmount || !ageStr || !familyCode || isNaN(basePremium)) continue;

    const [minAge, maxAge] = ageStr.split('-').map((v) => parseInt(v.trim(), 10));

    const [plan, sumInsured, ageSlab, familyType] = await Promise.all([
      Plan.findOne({ name: { $regex: new RegExp(`^${String(planName).trim()}$`, 'i') }, isDeleted: false }),
      SumInsured.findOne({ amount: siAmount, isDeleted: false }),
      isNaN(minAge) ? null : AgeSlab.findOne({ minAge, maxAge, isDeleted: false }),
      FamilyType.findOne({ code: familyCode, isDeleted: false }),
    ]);

    if (!plan || !sumInsured || !ageSlab || !familyType) continue;

    await PremiumRate.findOneAndUpdate(
      {
        planId: plan._id,
        sumInsuredId: sumInsured._id,
        ageSlabId: ageSlab._id,
        familyTypeId: familyType._id,
        isDeleted: false,
      },
      { $set: { basePremium, gstPercentage: Number(row['GST %'] || 18), status: 'active' } },
      { upsert: true }
    );
    results.premiumRatesImported++;
  }

  return res.status(200).json(new ApiResponse(200, results, 'Excel bulk data imported and processed successfully'));
});

export const downloadExcelTemplate = asyncHandler(async (req, res) => {
  const workbook = XLSX.utils.book_new();

  // 1. Plans
  const plansWS = XLSX.utils.json_to_sheet([
    { 'Plan Name': 'Health Shield', Slug: 'health-shield', 'Short Description': 'Comprehensive family health cover with zero copay & unlimited reset', Description: 'Complete medical cover including cashless hospitalization, day care surgeries, maternity cover, and ambulance benefits.' },
    { 'Plan Name': 'Elevate Health Plan', Slug: 'elevate-health-plan', 'Short Description': 'Premium health cover with global hospitalization and wellness rewards', Description: 'Advanced health protection plan with high sum insured limits, international emergency cover, and cumulative bonus.' },
  ]);
  XLSX.utils.book_append_sheet(workbook, plansWS, 'Plans');

  // 2. Coverages
  const coveragesWS = XLSX.utils.json_to_sheet([
    { Title: 'Hospitalisation Expenses', Description: 'Inpatient hospitalization medical expenses covered up to sum insured', Icon: 'hospital' },
    { Title: 'Day Care Treatment/Surgeries', Description: 'Day care procedures requiring less than 24 hours hospitalization', Icon: 'clock' },
    { Title: 'Pre - Post Hospitalisation', Description: 'Medical expenses incurred before and after hospitalization', Icon: 'file-text' },
    { Title: 'In Patient AYUSH Hospitalisation', Description: 'Ayurveda, Yoga, Unani, Siddha, and Homeopathy treatment cover', Icon: 'heart' },
    { Title: 'Unlimited Reset Benefit', Description: 'Automatic restoration of 100% sum insured upon exhaustion', Icon: 'refresh' },
    { Title: 'Loyalty Bonus', Description: 'No claim bonus increase in sum insured for claim-free years', Icon: 'award' },
    { Title: 'Donor Expenses', Description: 'Organ donor hospitalization expenses covered', Icon: 'user-check' },
    { Title: 'Domiciliary Hospitalization', Description: 'Treatment taken at home under medical supervision', Icon: 'home' },
    { Title: 'Domestic Road Emergency Ambulance Cover', Description: 'Emergency ambulance charges covered', Icon: 'truck' },
    { Title: 'Sub Limits on Illness/ Surgeries/ Procedures', Description: 'Specific sub-limits applied to surgeries or procedures', Icon: 'shield-alert' },
    { Title: 'Maternity Cover', Description: 'Delivery and maternity related medical expenses', Icon: 'baby' },
    { Title: 'New Born Baby Cover', Description: 'Medical expenses covered for newborn baby from day 1', Icon: 'smile' },
    { Title: 'Voluntary Co-Payment', Description: 'Discount on premium by opting for voluntary copay', Icon: 'percent' },
  ]);
  XLSX.utils.book_append_sheet(workbook, coveragesWS, 'Coverages');

  // 3. Sum Insured
  const siWS = XLSX.utils.json_to_sheet([
    { Amount: 300000, 'Display Name': '3 Lakhs' },
    { Amount: 500000, 'Display Name': '5 Lakhs' },
    { Amount: 1000000, 'Display Name': '10 Lakhs' },
  ]);
  XLSX.utils.book_append_sheet(workbook, siWS, 'Sum Insured');

  // 4. Age Slabs
  const ageWS = XLSX.utils.json_to_sheet([
    { 'Min Age': 18, 'Max Age': 35, 'Display Name': '18-35' },
    { 'Min Age': 36, 'Max Age': 45, 'Display Name': '36-45' },
    { 'Min Age': 46, 'Max Age': 55, 'Display Name': '46-55' },
    { 'Min Age': 56, 'Max Age': 65, 'Display Name': '56-65' },
  ]);
  XLSX.utils.book_append_sheet(workbook, ageWS, 'Age Slabs');

  // 5. Family Types
  const ftWS = XLSX.utils.json_to_sheet([
    { Name: 'Self Only', Code: 'INDIVIDUAL' },
    { Name: '1 Adult + 1 Child', Code: '1A+1K' },
    { Name: '1 Adult + 2 Children', Code: '1A+2K' },
    { Name: '2 Adults (Self + Spouse)', Code: '2A' },
    { Name: '2 Adults + 1 Child', Code: '2A+1K' },
    { Name: '2 Adults + 2 Children', Code: '2A+2K' },
  ]);
  XLSX.utils.book_append_sheet(workbook, ftWS, 'Family Types');

  // 6. Coverage Matrix
  const matrixRows = [];
  const samplePlan = 'Health Shield';
  const sampleCoverages = [
    { title: 'Hospitalisation Expenses', val: 'Yes' },
    { title: 'Day Care Treatment/Surgeries', val: 'Yes' },
    { title: 'Pre - Post Hospitalisation', val: 'Yes' },
    { title: 'In Patient AYUSH Hospitalisation', val: 'Yes' },
    { title: 'Unlimited Reset Benefit', val: 'Yes' },
    { title: 'Loyalty Bonus', val: 'Yes' },
    { title: 'Donor Expenses', val: 'Yes' },
    { title: 'Domiciliary Hospitalization', val: 'Yes' },
    { title: 'Domestic Road Emergency Ambulance Cover', val: 'Yes' },
    { title: 'Sub Limits on Illness/ Surgeries/ Procedures', val: 'Yes' },
    { title: 'Maternity Cover', val: 'Yes' },
    { title: 'New Born Baby Cover', val: 'Yes' },
    { title: 'Voluntary Co-Payment', val: 'No' },
  ];

  [300000, 500000, 1000000].forEach((amount) => {
    sampleCoverages.forEach((cov) => {
      matrixRows.push({
        'Plan Name': samplePlan,
        'Coverage Title': cov.title,
        'Sum Insured Amount': amount,
        'Is Covered': cov.val,
        Value: cov.val,
      });
    });
  });

  const matrixWS = XLSX.utils.json_to_sheet(matrixRows);
  XLSX.utils.book_append_sheet(workbook, matrixWS, 'Coverage Matrix');

  // 7. Premium Rates
  const rateRows = [
    // 3 Lakhs
    { 'Plan Name': 'Health Shield', 'Sum Insured Amount': 300000, 'Age Slab': '18-35', 'Family Type Code': 'INDIVIDUAL', 'Base Premium': 3442, 'GST %': 18 },
    { 'Plan Name': 'Health Shield', 'Sum Insured Amount': 300000, 'Age Slab': '18-35', 'Family Type Code': '1A+1K', 'Base Premium': 4662, 'GST %': 18 },
    { 'Plan Name': 'Health Shield', 'Sum Insured Amount': 300000, 'Age Slab': '18-35', 'Family Type Code': '1A+2K', 'Base Premium': 5580, 'GST %': 18 },
    { 'Plan Name': 'Health Shield', 'Sum Insured Amount': 300000, 'Age Slab': '18-35', 'Family Type Code': '2A', 'Base Premium': 6120, 'GST %': 18 },
    { 'Plan Name': 'Health Shield', 'Sum Insured Amount': 300000, 'Age Slab': '18-35', 'Family Type Code': '2A+1K', 'Base Premium': 7340, 'GST %': 18 },
    { 'Plan Name': 'Health Shield', 'Sum Insured Amount': 300000, 'Age Slab': '18-35', 'Family Type Code': '2A+2K', 'Base Premium': 8250, 'GST %': 18 },

    { 'Plan Name': 'Health Shield', 'Sum Insured Amount': 300000, 'Age Slab': '36-45', 'Family Type Code': 'INDIVIDUAL', 'Base Premium': 4200, 'GST %': 18 },
    { 'Plan Name': 'Health Shield', 'Sum Insured Amount': 300000, 'Age Slab': '36-45', 'Family Type Code': '1A+1K', 'Base Premium': 5600, 'GST %': 18 },
    { 'Plan Name': 'Health Shield', 'Sum Insured Amount': 300000, 'Age Slab': '36-45', 'Family Type Code': '2A', 'Base Premium': 7500, 'GST %': 18 },
    { 'Plan Name': 'Health Shield', 'Sum Insured Amount': 300000, 'Age Slab': '36-45', 'Family Type Code': '2A+2K', 'Base Premium': 9800, 'GST %': 18 },

    // 5 Lakhs
    { 'Plan Name': 'Health Shield', 'Sum Insured Amount': 500000, 'Age Slab': '18-35', 'Family Type Code': 'INDIVIDUAL', 'Base Premium': 4850, 'GST %': 18 },
    { 'Plan Name': 'Health Shield', 'Sum Insured Amount': 500000, 'Age Slab': '18-35', 'Family Type Code': '1A+1K', 'Base Premium': 6450, 'GST %': 18 },
    { 'Plan Name': 'Health Shield', 'Sum Insured Amount': 500000, 'Age Slab': '18-35', 'Family Type Code': '2A', 'Base Premium': 8600, 'GST %': 18 },
    { 'Plan Name': 'Health Shield', 'Sum Insured Amount': 500000, 'Age Slab': '18-35', 'Family Type Code': '2A+2K', 'Base Premium': 11200, 'GST %': 18 },

    { 'Plan Name': 'Health Shield', 'Sum Insured Amount': 500000, 'Age Slab': '36-45', 'Family Type Code': 'INDIVIDUAL', 'Base Premium': 5900, 'GST %': 18 },
    { 'Plan Name': 'Health Shield', 'Sum Insured Amount': 500000, 'Age Slab': '36-45', 'Family Type Code': '2A', 'Base Premium': 10200, 'GST %': 18 },
    { 'Plan Name': 'Health Shield', 'Sum Insured Amount': 500000, 'Age Slab': '36-45', 'Family Type Code': '2A+2K', 'Base Premium': 13400, 'GST %': 18 },

    // 10 Lakhs
    { 'Plan Name': 'Health Shield', 'Sum Insured Amount': 1000000, 'Age Slab': '18-35', 'Family Type Code': 'INDIVIDUAL', 'Base Premium': 7200, 'GST %': 18 },
    { 'Plan Name': 'Health Shield', 'Sum Insured Amount': 1000000, 'Age Slab': '18-35', 'Family Type Code': '2A', 'Base Premium': 12800, 'GST %': 18 },
    { 'Plan Name': 'Health Shield', 'Sum Insured Amount': 1000000, 'Age Slab': '18-35', 'Family Type Code': '2A+2K', 'Base Premium': 16500, 'GST %': 18 },
  ];

  const ratesWS = XLSX.utils.json_to_sheet(rateRows);
  XLSX.utils.book_append_sheet(workbook, ratesWS, 'Premium Rates');

  const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="Insurance_Master_Bulk_Upload.xlsx"');
  return res.send(excelBuffer);
});
