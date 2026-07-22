import mongoose from 'mongoose';
import connectDB from '../config/db.js';

import { Plan, PlanOption } from '../models/plan.model.js';
import { SumInsured } from '../models/sumInsured.model.js';
import { AgeSlab } from '../models/ageSlab.model.js';
import { FamilyType } from '../models/familyType.model.js';
import { Coverage } from '../models/coverage.model.js';
import { PlanCoverage } from '../models/planCoverage.model.js';
import { PolicyCondition } from '../models/policyCondition.model.js';
import { PremiumRate } from '../models/premiumRate.model.js';

export const seedDatabase = async () => {
  console.log('🌱 Starting database seeding process...');

  // 1. Seed Plan
  const planData = {
    name: 'Health Shield Comprehensive',
    slug: 'health-insurance-comprehensive',
    shortDescription: 'Comprehensive Health Insurance Policy covering Individuals and Families with floating coverages.',
    description: 'Complete health insurance protection offering flexible options, daycare surgeries, AYUSH treatment, restoration benefit, and cashless hospitalization.',
    logo: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=300',
    status: 'active',
  };

  const plan = await Plan.findOneAndUpdate(
    { slug: planData.slug },
    { $set: planData },
    { new: true, upsert: true }
  );
  console.log(`✅ Plan Seeded: ${plan.name} (${plan._id})`);

  // 2. Seed Plan Options (Option A, B, C, D)
  const optionsList = [
    { name: 'Option A', description: 'Standard Comprehensive Plan (3L, 5L, 10L) without Maternity Cover' },
    { name: 'Option B', description: 'Enhanced Plan (5L, 10L) with Maternity & New Born Baby Cover' },
    { name: 'Option C', description: 'Economy Plan (3L, 5L, 10L) with 10% Voluntary Co-Payment' },
    { name: 'Option D', description: 'Premium Plan (5L, 10L) with Maternity & 10% Voluntary Co-Payment' },
  ];

  const planOptionsMap = {};
  for (const opt of optionsList) {
    const optionDoc = await PlanOption.findOneAndUpdate(
      { planId: plan._id, name: opt.name },
      { $set: { planId: plan._id, name: opt.name, description: opt.description, status: 'active', isDeleted: false } },
      { new: true, upsert: true }
    );
    planOptionsMap[opt.name] = optionDoc._id;
  }
  console.log(`✅ ${Object.keys(planOptionsMap).length} Plan Options Seeded.`);

  // 3. Seed Sum Insured Masters
  const sumInsuredList = [
    { amount: 300000, displayName: '3 Lakhs' },
    { amount: 500000, displayName: '5 Lakhs' },
    { amount: 1000000, displayName: '10 Lakhs' },
  ];

  const sumInsuredMap = {};
  for (const si of sumInsuredList) {
    const siDoc = await SumInsured.findOneAndUpdate(
      { amount: si.amount },
      { $set: { amount: si.amount, displayName: si.displayName, status: 'active', isDeleted: false } },
      { new: true, upsert: true }
    );
    sumInsuredMap[si.amount] = siDoc._id;
  }
  console.log(`✅ ${Object.keys(sumInsuredMap).length} Sum Insured Masters Seeded.`);

  // 4. Seed Age Slab Masters
  const ageSlabsList = [
    { minAge: 18, maxAge: 25, displayName: '18-25' },
    { minAge: 26, maxAge: 30, displayName: '26-30' },
    { minAge: 31, maxAge: 35, displayName: '31-35' },
    { minAge: 36, maxAge: 40, displayName: '36-40' },
    { minAge: 41, maxAge: 45, displayName: '41-45' },
    { minAge: 46, maxAge: 50, displayName: '46-50' },
    { minAge: 51, maxAge: 55, displayName: '51-55' },
    { minAge: 56, maxAge: 60, displayName: '56-60' },
    { minAge: 61, maxAge: 65, displayName: '61-65' },
  ];

  const ageSlabsMap = {};
  for (const slab of ageSlabsList) {
    const slabDoc = await AgeSlab.findOneAndUpdate(
      { minAge: slab.minAge, maxAge: slab.maxAge },
      { $set: { ...slab, status: 'active', isDeleted: false } },
      { new: true, upsert: true }
    );
    ageSlabsMap[slab.displayName] = slabDoc._id;
  }
  console.log(`✅ ${Object.keys(ageSlabsMap).length} Age Slab Masters Seeded.`);

  // 5. Seed Family Type Masters
  const familyTypesList = [
    { name: 'Individual', code: '1A', adultCount: 1, childCount: 0 },
    { name: '1 Adult + 1 Child', code: '1A1C', adultCount: 1, childCount: 1 },
    { name: '1 Adult + 2 Children', code: '1A2C', adultCount: 1, childCount: 2 },
    { name: '2 Adults', code: '2A', adultCount: 2, childCount: 0 },
    { name: '2 Adults + 1 Child', code: '2A1C', adultCount: 2, childCount: 1 },
    { name: '2 Adults + 2 Children', code: '2A2C', adultCount: 2, childCount: 2 },
  ];

  const familyTypeMap = {};
  for (const ft of familyTypesList) {
    const ftDoc = await FamilyType.findOneAndUpdate(
      { code: ft.code },
      { $set: { ...ft, status: 'active', isDeleted: false } },
      { new: true, upsert: true }
    );
    familyTypeMap[ft.code] = ftDoc._id;
  }
  console.log(`✅ ${Object.keys(familyTypeMap).length} Family Type Masters Seeded.`);

  // 6. Seed Coverages Master
  const coveragesList = [
    { title: 'Hospitalisation Expenses', description: 'Covered up to Sum Insured', icon: 'Hospital' },
    { title: 'Day Care Treatment/Surgeries', description: 'Covered as per regulator definition', icon: 'Clock' },
    { title: 'Pre - Post Hospitalisation', description: 'Pre 30 days & Post 60 days covered', icon: 'Calendar' },
    { title: 'In Patient AYUSH Hospitalisation', description: 'Covered in AYUSH registered hospitals', icon: 'Activity' },
    { title: 'Unlimited Reset Benefit', description: '100% Reset available unlimited times in a policy year', icon: 'RotateCcw' },
    { title: 'Loyalty Bonus', description: '10% of annual sum insured per claim-free year (Max 100%)', icon: 'Award' },
    { title: 'Donor Expenses', description: 'Covered up to annual Sum Insured', icon: 'Heart' },
    { title: 'Domiciliary Hospitalization', description: 'Covered for min 3 days hospitalization', icon: 'Home' },
    { title: 'Domestic Road Emergency Ambulance Cover', description: 'Up to Rs. 3,000 per event', icon: 'Truck' },
    { title: 'Sub Limits on Illness/Surgeries/Procedures', description: 'Standard disease-wise capping applies', icon: 'ShieldAlert' },
    { title: 'Maternity Cover', description: 'Up to Rs 40,000 for normal and C-section after 2 years', icon: 'UserPlus' },
    { title: 'New Born Baby Cover', description: 'Up to Rs 10,000 for new born treatment up to 91 days', icon: 'Smile' },
    { title: 'Voluntary Co-payment', description: '10% co-pay applicable on each claim if selected', icon: 'Percent' },
  ];

  const coverageMap = {};
  for (const cov of coveragesList) {
    const covDoc = await Coverage.findOneAndUpdate(
      { title: cov.title },
      { $set: { ...cov, status: 'active', isDeleted: false } },
      { new: true, upsert: true }
    );
    coverageMap[cov.title] = covDoc._id;
  }
  console.log(`✅ ${Object.keys(coverageMap).length} Master Coverages Seeded.`);

  // 7. Seed Plan Coverage Matrix (Options A, B, C, D)
  const optionCoverageConfig = {
    'Option A': {
      'Hospitalisation Expenses': { isCovered: true, value: 'Yes' },
      'Day Care Treatment/Surgeries': { isCovered: true, value: 'Yes' },
      'Pre - Post Hospitalisation': { isCovered: true, value: 'Yes' },
      'In Patient AYUSH Hospitalisation': { isCovered: true, value: 'Yes' },
      'Unlimited Reset Benefit': { isCovered: true, value: 'Yes' },
      'Loyalty Bonus': { isCovered: true, value: 'Yes' },
      'Donor Expenses': { isCovered: true, value: 'Yes' },
      'Domiciliary Hospitalization': { isCovered: true, value: 'Yes' },
      'Domestic Road Emergency Ambulance Cover': { isCovered: true, value: 'Yes' },
      'Sub Limits on Illness/Surgeries/Procedures': { isCovered: true, value: 'Yes' },
      'Maternity Cover': { isCovered: false, value: 'No' },
      'New Born Baby Cover': { isCovered: false, value: 'No' },
      'Voluntary Co-payment': { isCovered: false, value: 'No' },
    },
    'Option B': {
      'Hospitalisation Expenses': { isCovered: true, value: 'Yes' },
      'Day Care Treatment/Surgeries': { isCovered: true, value: 'Yes' },
      'Pre - Post Hospitalisation': { isCovered: true, value: 'Yes' },
      'In Patient AYUSH Hospitalisation': { isCovered: true, value: 'Yes' },
      'Unlimited Reset Benefit': { isCovered: true, value: 'Yes' },
      'Loyalty Bonus': { isCovered: true, value: 'Yes' },
      'Donor Expenses': { isCovered: true, value: 'Yes' },
      'Domiciliary Hospitalization': { isCovered: true, value: 'Yes' },
      'Domestic Road Emergency Ambulance Cover': { isCovered: true, value: 'Yes' },
      'Sub Limits on Illness/Surgeries/Procedures': { isCovered: true, value: 'Yes' },
      'Maternity Cover': { isCovered: true, value: 'Yes' },
      'New Born Baby Cover': { isCovered: true, value: 'Yes' },
      'Voluntary Co-payment': { isCovered: false, value: 'No' },
    },
    'Option C': {
      'Hospitalisation Expenses': { isCovered: true, value: 'Yes' },
      'Day Care Treatment/Surgeries': { isCovered: true, value: 'Yes' },
      'Pre - Post Hospitalisation': { isCovered: true, value: 'Yes' },
      'In Patient AYUSH Hospitalisation': { isCovered: true, value: 'Yes' },
      'Unlimited Reset Benefit': { isCovered: true, value: 'Yes' },
      'Loyalty Bonus': { isCovered: true, value: 'Yes' },
      'Donor Expenses': { isCovered: true, value: 'Yes' },
      'Domiciliary Hospitalization': { isCovered: true, value: 'Yes' },
      'Domestic Road Emergency Ambulance Cover': { isCovered: true, value: 'Yes' },
      'Sub Limits on Illness/Surgeries/Procedures': { isCovered: true, value: 'Yes' },
      'Maternity Cover': { isCovered: false, value: 'No' },
      'New Born Baby Cover': { isCovered: false, value: 'No' },
      'Voluntary Co-payment': { isCovered: true, value: 'Yes (10%)' },
    },
    'Option D': {
      'Hospitalisation Expenses': { isCovered: true, value: 'Yes' },
      'Day Care Treatment/Surgeries': { isCovered: true, value: 'Yes' },
      'Pre - Post Hospitalisation': { isCovered: true, value: 'Yes' },
      'In Patient AYUSH Hospitalisation': { isCovered: true, value: 'Yes' },
      'Unlimited Reset Benefit': { isCovered: true, value: 'Yes' },
      'Loyalty Bonus': { isCovered: true, value: 'Yes' },
      'Donor Expenses': { isCovered: true, value: 'Yes' },
      'Domiciliary Hospitalization': { isCovered: true, value: 'Yes' },
      'Domestic Road Emergency Ambulance Cover': { isCovered: true, value: 'Yes' },
      'Sub Limits on Illness/Surgeries/Procedures': { isCovered: true, value: 'Yes' },
      'Maternity Cover': { isCovered: true, value: 'Yes' },
      'New Born Baby Cover': { isCovered: true, value: 'Yes' },
      'Voluntary Co-payment': { isCovered: true, value: 'Yes (10%)' },
    },
  };

  for (const [optionName, coverages] of Object.entries(optionCoverageConfig)) {
    const optId = planOptionsMap[optionName];
    for (const [covTitle, cfg] of Object.entries(coverages)) {
      const covId = coverageMap[covTitle];
      await PlanCoverage.findOneAndUpdate(
        { planId: plan._id, optionId: optId, coverageId: covId },
        {
          $set: {
            planId: plan._id,
            optionId: optId,
            coverageId: covId,
            isCovered: cfg.isCovered,
            value: cfg.value,
            isDeleted: false,
          },
        },
        { new: true, upsert: true }
      );
    }
  }
  console.log(`✅ Plan Coverage Matrix Seeded.`);

  // 8. Seed Policy Conditions
  const sampleSubLimits = [
    { diseaseName: 'Cataract per eye', limitAmount: 30000 },
    { diseaseName: 'Other Eye Surgeries', limitAmount: 55000 },
    { diseaseName: 'ENT', limitAmount: 55000 },
    { diseaseName: 'Surgeries for - Tumors/Cysts/Nodule/Polyp', limitAmount: 90000 },
    { diseaseName: 'Stone in Urinary System', limitAmount: 60000 },
    { diseaseName: 'Hernia Related', limitAmount: 90000 },
    { diseaseName: 'Appendectomy', limitAmount: 60000 },
    { diseaseName: 'Knee Ligament Reconstruction Surgery', limitAmount: 135000 },
    { diseaseName: 'Hysterectomy', limitAmount: 90000 },
    { diseaseName: 'Fissures/Piles/Fistula', limitAmount: 55000 },
    { diseaseName: 'Spine & Vertebrae related', limitAmount: 135000 },
    { diseaseName: 'Cellulitis/Abscess', limitAmount: 55000 },
  ];

  const sampleNinetyDaysIllness = ['Hypertension', 'Diabetes', 'Cardiac Conditions'];

  const sampleTwoYearIllness = [
    'Cataract',
    'Benign Prostatic Hypertrophy',
    'Myomectomy, Hysterectomy unless because of malignancy',
    'All types of Hernia, Hydrocele',
    'Fissures &/or Fistula in anus, hemorrhoids/piles',
    'Arthritis, gout, rheumatism and spinal disorders',
    'Joint replacements unless due to accident',
    'Sinusitis and related disorders',
    'Stones in the urinary and biliary systems',
    'Dilation and curettage, Endometriosis',
    'All types of Skin and internal tumors/ cysts/ nodules/ polyps of any kind including breast lumps unless malignant',
    'Dialysis required for chronic renal failure',
    'Deviated Nasal Septum',
    'Surgery on tonsils, adenoids and sinuses',
    'Gastric and Duodenal erosions & ulcers',
    'Internal Congenital Anomaly',
    'Varicose Veins/ Varicose Ulcers',
  ];

  const sampleExclusions = [
    'Code- Excl01: Investigation & Evaluation',
    'Code- Excl02: Rest Cure, rehabilitation and respite care',
    'Code- Excl03: Obesity/ Weight Control',
    'Code- Excl04: Change of Gender treatments',
    'Code- Excl05: Cosmetic or Plastic Surgery',
    'Code- Excl06: Hazardous or Adventure sports',
    'Code- Excl11: Excluded Providers',
    'Code- Excl12: Treatment for Alcohol, Drug or Substance abuse',
    'Code- Excl13: Treatments received in health hydros, nature cure clinics, spas',
    'Code- Excl14: Dietary supplements and substances that can be purchased without prescription',
    'Code- Excl15: Refractive Error correction of eye sight due to refractive error less than 7.5 dioptres',
    'Code- Excl16: Unproven Treatments',
    'Code- Excl17: Sterility and Infertility',
    'Code- Excl18: Maternity Medical treatment expenses traceable to childbirth unless covered under policy',
  ];

  await PolicyCondition.findOneAndUpdate(
    { planId: plan._id, isDeleted: false },
    {
      $set: {
        planId: plan._id,
        ageBand: '18-65 years for adults & 91 days to 20 years for children',
        familyDefinition: 'Self, Spouse and up to 2 dependent children upto 20 yrs of Age',
        planType: 'Maximum 2 Adult and up to 2 dependent kids under floater policy',
        sumInsuredOptions: '3L / 5L / 10L',
        tenure: '1 Year',
        roomRentLimit: 'Up to 2% for normal room and up to 4% for ICU',
        dayCareTreatment: 'Covered as per standard regulator definition set by regulator',
        prePostHospitalization: 'Pre Hospitalisation and Post Hospitalisation for 30 days & 60 days respectively are covered',
        ayushHospitalization: 'Covered in AYUSH Hospital or AYUSH day care centre',
        unlimitedResetBenefit: 'Reset available unlimited times in a policy year',
        loyaltyBonus: '10% of annual sum insured per claim-free year (Max 100%)',
        donorExpenses: 'Covered up to annual sum insured under Human Organ Act',
        domiciliaryHospitalization: 'Covered provided minimum hospitalization of 3 days',
        ambulanceCoverLimit: 3000,
        maternityLimit: 40000,
        newBornLimit: 10000,
        coPayPercentage: 10,
        initialWaitingPeriodDays: 30,
        specificIllnessWaitingDays: 90,
        preExistingDiseaseWaitingMonths: 24,
        diseaseSubLimits: sampleSubLimits,
        waitingPeriodList: {
          ninetyDays: sampleNinetyDaysIllness,
          twoYears: sampleTwoYearIllness,
        },
        exclusions: sampleExclusions,
        claimSubmissionDays: 30,
      },
    },
    { new: true, upsert: true }
  );
  console.log(`✅ Policy Conditions Seeded.`);

  // 9. Seed Premium Rates Matrix
  const rawRatesData = {
    'Option A': {
      300000: [
        { age: '18-25', rates: { '1A': 3442, '1A1C': 4662, '1A2C': 5706, '2A': 5150, '2A1C': 6922, '2A2C': 9149 } },
        { age: '26-30', rates: { '1A': 4026, '1A1C': 4904, '1A2C': 5998, '2A': 5841, '2A1C': 7211, '2A2C': 9626 } },
        { age: '31-35', rates: { '1A': 4026, '1A1C': 4904, '1A2C': 5998, '2A': 5841, '2A1C': 7211, '2A2C': 9626 } },
        { age: '36-40', rates: { '1A': 4898, '1A1C': 6005, '1A2C': 6863, '2A': 7598, '2A1C': 8726, '2A2C': 9998 } },
        { age: '41-45', rates: { '1A': 4898, '1A1C': 6005, '1A2C': 6863, '2A': 7598, '2A1C': 8726, '2A2C': 9998 } },
        { age: '46-50', rates: { '1A': 6725, '1A1C': 8595, '1A2C': 9174, '2A': 11190, '2A1C': 12365, '2A2C': 13113 } },
        { age: '51-55', rates: { '1A': 9662, '1A1C': 10963, '1A2C': 11772, '2A': 16686, '2A1C': 17264, '2A2C': 17801 } },
        { age: '56-60', rates: { '1A': 14291, '1A1C': 15137, '1A2C': 16295, '2A': 24728, '2A1C': 26387, '2A2C': 27465 } },
        { age: '61-65', rates: { '1A': 18915, '1A1C': 20013, '1A2C': 21203, '2A': 33568, '2A1C': 35480, '2A2C': 37356 } },
      ],
      500000: [
        { age: '18-25', rates: { '1A': 3966, '1A1C': 5478, '1A2C': 6699, '2A': 6072, '2A1C': 8155, '2A2C': 10777 } },
        { age: '26-30', rates: { '1A': 4635, '1A1C': 5761, '1A2C': 7064, '2A': 6891, '2A1C': 8499, '2A2C': 11376 } },
        { age: '31-35', rates: { '1A': 4635, '1A1C': 5761, '1A2C': 7064, '2A': 6891, '2A1C': 8499, '2A2C': 11376 } },
        { age: '36-40', rates: { '1A': 5725, '1A1C': 7122, '1A2C': 8131, '2A': 9017, '2A1C': 10348, '2A2C': 11849 } },
        { age: '41-45', rates: { '1A': 5725, '1A1C': 7122, '1A2C': 8131, '2A': 9017, '2A1C': 10348, '2A2C': 11849 } },
        { age: '46-50', rates: { '1A': 7989, '1A1C': 10273, '1A2C': 10950, '2A': 13374, '2A1C': 14771, '2A2C': 15654 } },
        { age: '51-55', rates: { '1A': 11473, '1A1C': 13096, '1A2C': 14047, '2A': 19939, '2A1C': 20615, '2A2C': 21244 } },
        { age: '56-60', rates: { '1A': 16984, '1A1C': 18028, '1A2C': 19402, '2A': 29508, '2A1C': 31473, '2A2C': 32744 } },
        { age: '61-65', rates: { '1A': 22614, '1A1C': 23936, '1A2C': 25332, '2A': 40159, '2A1C': 42429, '2A2C': 44656 } },
      ],
      1000000: [
        { age: '18-25', rates: { '1A': 4629, '1A1C': 6137, '1A2C': 7500, '2A': 6822, '2A1C': 9157, '2A2C': 12100 } },
        { age: '26-30', rates: { '1A': 5412, '1A1C': 6496, '1A2C': 7933, '2A': 7746, '2A1C': 9550, '2A2C': 12811 } },
        { age: '31-35', rates: { '1A': 5412, '1A1C': 6496, '1A2C': 7933, '2A': 7746, '2A1C': 9550, '2A2C': 12811 } },
        { age: '36-40', rates: { '1A': 6757, '1A1C': 8047, '1A2C': 9181, '2A': 10192, '2A1C': 11692, '2A2C': 13382 } },
        { age: '41-45', rates: { '1A': 6757, '1A1C': 8047, '1A2C': 9181, '2A': 10192, '2A1C': 11692, '2A2C': 13382 } },
        { age: '46-50', rates: { '1A': 9562, '1A1C': 11689, '1A2C': 12448, '2A': 15216, '2A1C': 16799, '2A2C': 17796 } },
        { age: '51-55', rates: { '1A': 13741, '1A1C': 14893, '1A2C': 15962, '2A': 22676, '2A1C': 23435, '2A2C': 24138 } },
        { age: '56-60', rates: { '1A': 20348, '1A1C': 20998, '1A2C': 21989, '2A': 33503, '2A1C': 35721, '2A2C': 37151 } },
        { age: '61-65', rates: { '1A': 27122, '1A1C': 27820, '1A2C': 28799, '2A': 45702, '2A1C': 48270, '2A2C': 50789 } },
      ],
    },
    'Option B': {
      500000: [
        { age: '18-25', rates: { '1A': 3966, '1A1C': 5478, '1A2C': 6699, '2A': 8005, '2A1C': 10087, '2A2C': 12710 } },
        { age: '26-30', rates: { '1A': 4635, '1A1C': 5781, '1A2C': 7064, '2A': 8722, '2A1C': 10331, '2A2C': 13208 } },
        { age: '31-35', rates: { '1A': 4635, '1A1C': 5781, '1A2C': 7064, '2A': 8744, '2A1C': 10353, '2A2C': 13229 } },
        { age: '36-40', rates: { '1A': 5725, '1A1C': 7122, '1A2C': 8131, '2A': 10518, '2A1C': 11850, '2A2C': 13350 } },
        { age: '41-45', rates: { '1A': 5725, '1A1C': 7122, '1A2C': 8131, '2A': 10137, '2A1C': 11469, '2A2C': 12970 } },
        { age: '46-50', rates: { '1A': 7989, '1A1C': 10273, '1A2C': 10950, '2A': 14076, '2A1C': 15472, '2A2C': 16356 } },
        { age: '51-55', rates: { '1A': 11473, '1A1C': 13096, '1A2C': 14047, '2A': 19939, '2A1C': 20615, '2A2C': 21244 } },
        { age: '56-60', rates: { '1A': 16984, '1A1C': 18028, '1A2C': 19402, '2A': 29508, '2A1C': 31473, '2A2C': 32744 } },
        { age: '61-65', rates: { '1A': 22614, '1A1C': 23936, '1A2C': 25332, '2A': 40159, '2A1C': 42429, '2A2C': 44656 } },
      ],
      1000000: [
        { age: '18-25', rates: { '1A': 4629, '1A1C': 6137, '1A2C': 7500, '2A': 8754, '2A1C': 11089, '2A2C': 14032 } },
        { age: '26-30', rates: { '1A': 5412, '1A1C': 6496, '1A2C': 7933, '2A': 9577, '2A1C': 11381, '2A2C': 14642 } },
        { age: '31-35', rates: { '1A': 5412, '1A1C': 6496, '1A2C': 7933, '2A': 9599, '2A1C': 11403, '2A2C': 14664 } },
        { age: '36-40', rates: { '1A': 6757, '1A1C': 8047, '1A2C': 9181, '2A': 11693, '2A1C': 13193, '2A2C': 14883 } },
        { age: '41-45', rates: { '1A': 6757, '1A1C': 8047, '1A2C': 9181, '2A': 11313, '2A1C': 12813, '2A2C': 14502 } },
        { age: '46-50', rates: { '1A': 9562, '1A1C': 11689, '1A2C': 12448, '2A': 15918, '2A1C': 17501, '2A2C': 18497 } },
        { age: '51-55', rates: { '1A': 13741, '1A1C': 14893, '1A2C': 15962, '2A': 22676, '2A1C': 23435, '2A2C': 24138 } },
        { age: '56-60', rates: { '1A': 20348, '1A1C': 20998, '1A2C': 21989, '2A': 33503, '2A1C': 35721, '2A2C': 37151 } },
        { age: '61-65', rates: { '1A': 27122, '1A1C': 27820, '1A2C': 28799, '2A': 45702, '2A1C': 48270, '2A2C': 50789 } },
      ],
    },
    'Option C': {
      300000: [
        { age: '18-25', rates: { '1A': 3104, '1A1C': 4207, '1A2C': 5153, '2A': 4647, '2A1C': 6247, '2A2C': 8256 } },
        { age: '26-30', rates: { '1A': 3629, '1A1C': 4425, '1A2C': 5415, '2A': 5268, '2A1C': 6506, '2A2C': 8685 } },
        { age: '31-35', rates: { '1A': 3629, '1A1C': 4425, '1A2C': 5415, '2A': 5268, '2A1C': 6506, '2A2C': 8685 } },
        { age: '36-40', rates: { '1A': 4414, '1A1C': 5415, '1A2C': 6193, '2A': 6849, '2A1C': 7870, '2A2C': 9020 } },
        { age: '41-45', rates: { '1A': 4414, '1A1C': 5415, '1A2C': 6193, '2A': 6849, '2A1C': 7870, '2A2C': 9020 } },
        { age: '46-50', rates: { '1A': 6058, '1A1C': 7747, '1A2C': 8273, '2A': 10082, '2A1C': 11145, '2A2C': 11824 } },
        { age: '51-55', rates: { '1A': 8701, '1A1C': 9878, '1A2C': 10611, '2A': 15028, '2A1C': 15554, '2A2C': 16043 } },
        { age: '56-60', rates: { '1A': 12867, '1A1C': 13634, '1A2C': 14683, '2A': 22266, '2A1C': 23765, '2A2C': 24741 } },
        { age: '61-65', rates: { '1A': 17029, '1A1C': 18023, '1A2C': 19099, '2A': 30222, '2A1C': 31949, '2A2C': 33643 } },
      ],
      500000: [
        { age: '18-25', rates: { '1A': 3575, '1A1C': 4942, '1A2C': 6046, '2A': 5476, '2A1C': 7356, '2A2C': 9722 } },
        { age: '26-30', rates: { '1A': 4177, '1A1C': 5214, '1A2C': 6375, '2A': 6213, '2A1C': 7666, '2A2C': 10261 } },
        { age: '31-35', rates: { '1A': 4177, '1A1C': 5214, '1A2C': 6375, '2A': 6213, '2A1C': 7666, '2A2C': 10261 } },
        { age: '36-40', rates: { '1A': 5158, '1A1C': 6421, '1A2C': 7334, '2A': 8126, '2A1C': 9330, '2A2C': 10686 } },
        { age: '41-45', rates: { '1A': 5158, '1A1C': 6421, '1A2C': 7334, '2A': 8126, '2A1C': 9330, '2A2C': 10686 } },
        { age: '46-50', rates: { '1A': 7196, '1A1C': 9257, '1A2C': 9872, '2A': 12048, '2A1C': 13310, '2A2C': 14111 } },
        { age: '51-55', rates: { '1A': 10331, '1A1C': 11798, '1A2C': 12659, '2A': 17956, '2A1C': 18570, '2A2C': 19142 } },
        { age: '56-60', rates: { '1A': 15291, '1A1C': 16236, '1A2C': 17479, '2A': 26569, '2A1C': 28342, '2A2C': 29492 } },
        { age: '61-65', rates: { '1A': 20358, '1A1C': 21554, '1A2C': 22815, '2A': 36154, '2A1C': 38203, '2A2C': 40212 } },
      ],
      1000000: [
        { age: '18-25', rates: { '1A': 4172, '1A1C': 5534, '1A2C': 6766, '2A': 6151, '2A1C': 8258, '2A2C': 10912 } },
        { age: '26-30', rates: { '1A': 4877, '1A1C': 5858, '1A2C': 7156, '2A': 6983, '2A1C': 8612, '2A2C': 11552 } },
        { age: '31-35', rates: { '1A': 4877, '1A1C': 5858, '1A2C': 7156, '2A': 6983, '2A1C': 8612, '2A2C': 11552 } },
        { age: '36-40', rates: { '1A': 6087, '1A1C': 7253, '1A2C': 8279, '2A': 9184, '2A1C': 10539, '2A2C': 12066 } },
        { age: '41-45', rates: { '1A': 6087, '1A1C': 7253, '1A2C': 8279, '2A': 9184, '2A1C': 10539, '2A2C': 12066 } },
        { age: '46-50', rates: { '1A': 8611, '1A1C': 10532, '1A2C': 11220, '2A': 13705, '2A1C': 15136, '2A2C': 16039 } },
        { age: '51-55', rates: { '1A': 12373, '1A1C': 13415, '1A2C': 14383, '2A': 20420, '2A1C': 21108, '2A2C': 21747 } },
        { age: '56-60', rates: { '1A': 18319, '1A1C': 18910, '1A2C': 19807, '2A': 30164, '2A1C': 32165, '2A2C': 33459 } },
        { age: '61-65', rates: { '1A': 24415, '1A1C': 25050, '1A2C': 25936, '2A': 41143, '2A1C': 43460, '2A2C': 45733 } },
      ],
    },
    'Option D': {
      500000: [
        { age: '18-25', rates: { '1A': 3575, '1A1C': 4942, '1A2C': 6046, '2A': 7408, '2A1C': 9289, '2A2C': 11654 } },
        { age: '26-30', rates: { '1A': 4177, '1A1C': 5214, '1A2C': 6375, '2A': 8044, '2A1C': 9498, '2A2C': 12092 } },
        { age: '31-35', rates: { '1A': 4177, '1A1C': 5214, '1A2C': 6375, '2A': 8066, '2A1C': 9519, '2A2C': 12114 } },
        { age: '36-40', rates: { '1A': 5158, '1A1C': 6421, '1A2C': 7334, '2A': 9628, '2A1C': 10832, '2A2C': 12188 } },
        { age: '41-45', rates: { '1A': 5158, '1A1C': 6421, '1A2C': 7334, '2A': 9247, '2A1C': 10451, '2A2C': 11807 } },
        { age: '46-50', rates: { '1A': 7196, '1A1C': 9257, '1A2C': 9872, '2A': 12750, '2A1C': 14012, '2A2C': 14813 } },
        { age: '51-55', rates: { '1A': 10331, '1A1C': 11798, '1A2C': 12659, '2A': 17956, '2A1C': 18570, '2A2C': 19142 } },
        { age: '56-60', rates: { '1A': 15291, '1A1C': 16236, '1A2C': 17479, '2A': 26569, '2A1C': 28342, '2A2C': 29492 } },
        { age: '61-65', rates: { '1A': 20358, '1A1C': 21554, '1A2C': 22815, '2A': 36154, '2A1C': 38203, '2A2C': 40212 } },
      ],
      1000000: [
        { age: '18-25', rates: { '1A': 4172, '1A1C': 5534, '1A2C': 6766, '2A': 8083, '2A1C': 10190, '2A2C': 12844 } },
        { age: '26-30', rates: { '1A': 4877, '1A1C': 5858, '1A2C': 7156, '2A': 8814, '2A1C': 10443, '2A2C': 13384 } },
        { age: '31-35', rates: { '1A': 4877, '1A1C': 5858, '1A2C': 7156, '2A': 8836, '2A1C': 10465, '2A2C': 13406 } },
        { age: '36-40', rates: { '1A': 6087, '1A1C': 7253, '1A2C': 8279, '2A': 10685, '2A1C': 12041, '2A2C': 13567 } },
        { age: '41-45', rates: { '1A': 6087, '1A1C': 7253, '1A2C': 8279, '2A': 10305, '2A1C': 11660, '2A2C': 13187 } },
        { age: '46-50', rates: { '1A': 8611, '1A1C': 10532, '1A2C': 11220, '2A': 14407, '2A1C': 15838, '2A2C': 16740 } },
        { age: '51-55', rates: { '1A': 12373, '1A1C': 13415, '1A2C': 14383, '2A': 20420, '2A1C': 21108, '2A2C': 21747 } },
        { age: '56-60', rates: { '1A': 18319, '1A1C': 18910, '1A2C': 19807, '2A': 30164, '2A1C': 32165, '2A2C': 33459 } },
        { age: '61-65', rates: { '1A': 24415, '1A1C': 25050, '1A2C': 25936, '2A': 41143, '2A1C': 43460, '2A2C': 45733 } },
      ],
    },
  };

  let totalRatesInserted = 0;

  for (const [optionName, siMap] of Object.entries(rawRatesData)) {
    const optionId = planOptionsMap[optionName];
    for (const [siAmountStr, ageList] of Object.entries(siMap)) {
      const sumInsuredId = sumInsuredMap[Number(siAmountStr)];
      for (const ageObj of ageList) {
        const ageSlabId = ageSlabsMap[ageObj.age];
        for (const [familyCode, basePremium] of Object.entries(ageObj.rates)) {
          const familyTypeId = familyTypeMap[familyCode];

          await PremiumRate.findOneAndUpdate(
            {
              planId: plan._id,
              optionId,
              sumInsuredId,
              ageSlabId,
              familyTypeId,
              isDeleted: false,
            },
            {
              $set: {
                planId: plan._id,
                optionId,
                sumInsuredId,
                ageSlabId,
                familyTypeId,
                basePremium,
                gstPercentage: 18,
                status: 'active',
                isDeleted: false,
              },
            },
            { new: true, upsert: true }
          );
          totalRatesInserted++;
        }
      }
    }
  }

  console.log(`🎉 Successfully Seeded ${totalRatesInserted} Premium Rate Matrix Entries!`);
  console.log('✅ DATABASE SEEDING COMPLETED SUCCESSFULLY!');
};

// Execute if run directly from command line
if (process.argv[1] && process.argv[1].includes('seedDatabase.js')) {
  connectDB()
    .then(async () => {
      await seedDatabase();
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Seeding failed:', err);
      process.exit(1);
    });
}
