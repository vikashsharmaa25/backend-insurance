import { PolicyCondition } from '../../models/policyCondition.model.js';
import { Plan } from '../../models/plan.model.js';
import ApiError from '../../utils/ApiError.js';
import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../utils/asyncHandler.js';

// ==========================================
// 1. POLICY CONDITION ADMIN CONTROLLERS
// ==========================================

export const upsertPolicyCondition = asyncHandler(async (req, res) => {
  const { planId, ...conditionFields } = req.body;

  const plan = await Plan.findOne({ _id: planId, isDeleted: false });
  if (!plan) {
    throw new ApiError(404, 'Insurance Plan not found');
  }

  const policyCondition = await PolicyCondition.findOneAndUpdate(
    { planId, isDeleted: false },
    { $set: { planId, ...conditionFields } },
    { new: true, upsert: true, runValidators: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, policyCondition, 'Policy terms and conditions set successfully'));
});

export const deletePolicyCondition = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const condition = await PolicyCondition.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $set: { isDeleted: true } },
    { new: true }
  );

  if (!condition) {
    throw new ApiError(404, 'Policy condition record not found');
  }

  return res.status(200).json(new ApiResponse(200, {}, 'Policy condition deleted successfully'));
});

export const seedSamplePolicyConditions = asyncHandler(async (req, res) => {
  let plan = await Plan.findOne({ slug: 'health-insurance-comprehensive', isDeleted: false });
  if (!plan) {
    plan = await Plan.findOne({ isDeleted: false });
  }

  if (!plan) {
    throw new ApiError(404, 'No active plan found to seed policy conditions');
  }

  const sampleSubLimits = [
    { diseaseName: 'Cataract per eye', limitAmount: 30000 },
    { diseaseName: 'Other Eye Surgeries', limitAmount: 50000 },
    { diseaseName: 'ENT Surgeries', limitAmount: 55000 },
    { diseaseName: 'Surgeries for Tumors/Cysts/Nodule/Polyp', limitAmount: 90000 },
    { diseaseName: 'Stone in Urinary System', limitAmount: 60000 },
    { diseaseName: 'Hernia Related Surgeries', limitAmount: 90000 },
    { diseaseName: 'Appendectomy', limitAmount: 60000 },
    { diseaseName: 'Knee Ligament Reconstruction Surgery', limitAmount: 150000 },
    { diseaseName: 'Hysterectomy', limitAmount: 90000 },
    { diseaseName: 'Fissure/Fistula/Piles', limitAmount: 55000 },
    { diseaseName: 'Spine & Vertebrae related', limitAmount: 135000 },
    { diseaseName: 'Cellulitis/Abscess', limitAmount: 55000 },
  ];

  const sampleNinetyDaysIllness = ['Hypertension', 'Diabetes', 'Cardiac Conditions'];

  const sampleTwoYearIllness = [
    'Cataract',
    'Benign Prostatic Hypertrophy',
    'Hysterectomy / Myomectomy',
    'All types of Hernia & Hydrocele',
    'Fissure, Anal Fistula, Piles',
    'Arthritis, Gout, Joint Replacements',
    'Sinusitis and related disorders',
    'Stones in urinary and biliary system',
    'Endometriosis / PCOS',
    'Dialysis required for chronic renal failure',
    'Deviated Nasal Septum',
    'Varicose Veins',
  ];

  const sampleExclusions = [
    'Rest Cure, rehabilitation and respite care',
    'Obesity and Weight Control treatment',
    'Change of Gender treatments',
    'Cosmetic or plastic surgery',
    'Hazardous or Adventure Sports',
    'Treatment for Alcohol, Drug or Substance abuse',
    'Dietary supplements and substances without prescription',
    'Refractive Error correction for vision error less than 7.5 dioptres',
    'Sterility and Infertility treatments',
    'Dental, acupuncture and cosmetic procedures unless due to Accident',
  ];

  const condition = await PolicyCondition.findOneAndUpdate(
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
        dayCareTreatment: 'Covered as per standard regulator definition',
        prePostHospitalization: 'Pre Hospitalisation for 30 days & Post Hospitalisation for 60 days',
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

  return res
    .status(200)
    .json(new ApiResponse(200, condition, 'Sample policy conditions & terms successfully seeded from document!'));
});
