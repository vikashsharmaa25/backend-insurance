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
  const { basePremium, gstPercentage, status } = req.body;

  const rate = await PremiumRate.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $set: { basePremium, gstPercentage, status } },
    { new: true, runValidators: true }
  );

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
    if (!planName || !coverageTitle) continue;

    const [plan, coverage] = await Promise.all([
      Plan.findOne({ name: { $regex: new RegExp(`^${String(planName).trim()}$`, 'i') }, isDeleted: false }),
      Coverage.findOne({ title: { $regex: new RegExp(`^${String(coverageTitle).trim()}$`, 'i') }, isDeleted: false }),
    ]);

    if (!plan || !coverage) continue;

    const isCoveredStr = String(row['Is Covered'] || row['isCovered'] || 'Yes');
    const isCovered = isCoveredStr.toLowerCase().includes('yes') || isCoveredStr === 'true';
    const value = row['Value'] || row['value'] || (isCovered ? 'Yes' : 'No');

    await PlanCoverage.findOneAndUpdate(
      { planId: plan._id, coverageId: coverage._id, isDeleted: false },
      { $set: { isCovered, value: String(value) } },
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

  const plansWS = XLSX.utils.json_to_sheet([
    { 'Plan Name': 'Comprehensive Health Plan', Slug: 'comprehensive-health-plan', 'Short Description': 'Full health coverage', Description: 'Detailed policy description' },
  ]);
  XLSX.utils.book_append_sheet(workbook, plansWS, 'Plans');

  const coveragesWS = XLSX.utils.json_to_sheet([
    { Title: 'Hospitalisation Expenses', Description: 'Inpatient expenses', Icon: 'hospital-icon' },
    { Title: 'Maternity Cover', Description: 'Delivery expenses', Icon: 'baby-icon' },
  ]);
  XLSX.utils.book_append_sheet(workbook, coveragesWS, 'Coverages');

  const matrixWS = XLSX.utils.json_to_sheet([
    { 'Plan Name': 'Comprehensive Health Plan', 'Coverage Title': 'Hospitalisation Expenses', 'Is Covered': 'Yes', Value: 'Yes' },
    { 'Plan Name': 'Comprehensive Health Plan', 'Coverage Title': 'Maternity Cover', 'Is Covered': 'No', Value: 'No' },
  ]);
  XLSX.utils.book_append_sheet(workbook, matrixWS, 'Coverage Matrix');

  const siWS = XLSX.utils.json_to_sheet([
    { Amount: 300000, 'Display Name': '3 Lakhs' },
    { Amount: 500000, 'Display Name': '5 Lakhs' },
    { Amount: 1000000, 'Display Name': '10 Lakhs' },
  ]);
  XLSX.utils.book_append_sheet(workbook, siWS, 'Sum Insured');

  const ageWS = XLSX.utils.json_to_sheet([
    { 'Min Age': 18, 'Max Age': 25, 'Display Name': '18-25 Years' },
    { 'Min Age': 26, 'Max Age': 30, 'Display Name': '26-30 Years' },
  ]);
  XLSX.utils.book_append_sheet(workbook, ageWS, 'Age Slabs');

  const familyWS = XLSX.utils.json_to_sheet([
    { Name: 'Individual', Code: 'INDIVIDUAL', 'Adult Count': 1, 'Child Count': 0 },
    { Name: '1 Adult + 1 Kid', Code: '1A+1K', 'Adult Count': 1, 'Child Count': 1 },
    { Name: '2 Adults + 2 Kids', Code: '2A+2K', 'Adult Count': 2, 'Child Count': 2 },
  ]);
  XLSX.utils.book_append_sheet(workbook, familyWS, 'Family Types');

  const ratesWS = XLSX.utils.json_to_sheet([
    { 'Plan Name': 'Comprehensive Health Plan', 'Sum Insured Amount': 300000, 'Age Slab': '18-25', 'Family Type Code': 'INDIVIDUAL', 'Base Premium': 3442, 'GST %': 18 },
    { 'Plan Name': 'Comprehensive Health Plan', 'Sum Insured Amount': 300000, 'Age Slab': '18-25', 'Family Type Code': '1A+1K', 'Base Premium': 4662, 'GST %': 18 },
  ]);
  XLSX.utils.book_append_sheet(workbook, ratesWS, 'Premium Rates');

  const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="Insurance_Master_Template.xlsx"');
  return res.send(excelBuffer);
});
