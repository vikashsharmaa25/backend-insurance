import mongoose from 'mongoose';

const planCoverageSchema = new mongoose.Schema(
  {
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan',
      required: [true, 'Plan ID is required'],
      index: true,
    },
    coverageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coverage',
      required: [true, 'Coverage ID is required'],
      index: true,
    },
    isCovered: {
      type: Boolean,
      default: true,
    },
    value: {
      type: String,
      trim: true,
      default: 'Yes', // e.g. "Yes", "No", "3L, 5L, 10L"
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

// Compound index to ensure uniqueness of coverage per plan
planCoverageSchema.index(
  { planId: 1, coverageId: 1, isDeleted: 1 },
  { unique: true }
);

export const PlanCoverage = mongoose.model('PlanCoverage', planCoverageSchema);
