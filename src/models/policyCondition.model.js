import mongoose from 'mongoose';

const diseaseSubLimitSchema = new mongoose.Schema(
  {
    diseaseName: {
      type: String,
      required: [true, 'Disease or procedure name is required'],
      trim: true,
    },
    limitAmount: {
      type: Number,
      required: [true, 'Limit amount is required'],
      min: [0, 'Limit amount cannot be negative'],
    },
  },
  { _id: false }
);

const policyConditionSchema = new mongoose.Schema(
  {
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan',
      required: [true, 'Plan ID is required'],
      unique: true,
      index: true,
    },
    ageBand: {
      type: String,
      default: '18-65 years for adults & 91 days to 20 years for children',
      trim: true,
    },
    familyDefinition: {
      type: String,
      default: 'Self, Spouse and up to 2 dependent children upto 20 yrs of Age',
      trim: true,
    },
    planType: {
      type: String,
      default: 'Maximum 2 Adult and up to 2 dependent kids under floater policy',
      trim: true,
    },
    sumInsuredOptions: {
      type: String,
      default: '3L / 5L / 10L',
      trim: true,
    },
    tenure: {
      type: String,
      default: '1 Year',
      trim: true,
    },
    roomRentLimit: {
      type: String,
      default: 'Up to 2% for normal room and up to 4% for ICU',
      trim: true,
    },
    dayCareTreatment: {
      type: String,
      default: 'Covered as per standard regulator definition',
      trim: true,
    },
    prePostHospitalization: {
      type: String,
      default: 'Pre Hospitalisation for 30 days & Post Hospitalisation for 60 days',
      trim: true,
    },
    ayushHospitalization: {
      type: String,
      default: 'Covered in AYUSH Hospital or AYUSH day care centre',
      trim: true,
    },
    unlimitedResetBenefit: {
      type: String,
      default: 'Reset available unlimited times in a policy year',
      trim: true,
    },
    loyaltyBonus: {
      type: String,
      default: '10% of annual sum insured per claim-free year (Max 100%)',
      trim: true,
    },
    donorExpenses: {
      type: String,
      default: 'Covered up to annual sum insured under Human Organ Act',
      trim: true,
    },
    domiciliaryHospitalization: {
      type: String,
      default: 'Covered provided minimum hospitalization of 3 days',
      trim: true,
    },
    ambulanceCoverLimit: {
      type: Number,
      default: 3000,
      min: 0,
    },
    maternityLimit: {
      type: Number,
      default: 40000,
      min: 0,
    },
    newBornLimit: {
      type: Number,
      default: 10000,
      min: 0,
    },
    coPayPercentage: {
      type: Number,
      default: 10,
      min: 0,
      max: 100,
    },
    initialWaitingPeriodDays: {
      type: Number,
      default: 30,
    },
    specificIllnessWaitingDays: {
      type: Number,
      default: 90, // Hypertension, Diabetes, Cardiac
    },
    preExistingDiseaseWaitingMonths: {
      type: Number,
      default: 24, // 2 Years
    },
    diseaseSubLimits: [diseaseSubLimitSchema],
    waitingPeriodList: {
      ninetyDays: [String],
      twoYears: [String],
    },
    exclusions: [String],
    claimSubmissionDays: {
      type: Number,
      default: 30,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const PolicyCondition = mongoose.model('PolicyCondition', policyConditionSchema);
