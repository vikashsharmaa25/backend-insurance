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
    // Optional: per-slab coverage (null = applies to all slabs / global)
    sumInsuredId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SumInsured',
      default: null,
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

// Compound index: unique per plan + coverage + sumInsured slab
planCoverageSchema.index(
  { planId: 1, coverageId: 1, sumInsuredId: 1, isDeleted: 1 },
  { unique: true }
);

export const PlanCoverage = mongoose.model('PlanCoverage', planCoverageSchema);
