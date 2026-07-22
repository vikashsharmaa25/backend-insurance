import mongoose from 'mongoose';

const premiumRateSchema = new mongoose.Schema(
  {
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan',
      required: [true, 'Plan ID is required'],
      index: true,
    },
    optionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PlanOption',
      required: [true, 'Option ID is required'],
      index: true,
    },
    sumInsuredId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SumInsured',
      required: [true, 'Sum Insured ID is required'],
      index: true,
    },
    ageSlabId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AgeSlab',
      required: [true, 'Age Slab ID is required'],
      index: true,
    },
    familyTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FamilyType',
      required: [true, 'Family Type ID is required'],
      index: true,
    },
    basePremium: {
      type: Number,
      required: [true, 'Base premium amount is required'],
      min: [0, 'Premium cannot be negative'],
    },
    gstPercentage: {
      type: Number,
      default: 18,
      min: [0, 'GST percentage cannot be negative'],
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'inactive'],
        message: '{VALUE} is not a valid status',
      },
      default: 'active',
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

// Compound unique index to prevent duplicate rates for identical parameters
premiumRateSchema.index(
  { planId: 1, optionId: 1, sumInsuredId: 1, ageSlabId: 1, familyTypeId: 1, isDeleted: 1 },
  { unique: true }
);

export const PremiumRate = mongoose.model('PremiumRate', premiumRateSchema);
