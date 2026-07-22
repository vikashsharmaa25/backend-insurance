import mongoose from 'mongoose';

const insuredMemberSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    relation: { type: String, required: true, trim: true }, // e.g. Self, Spouse, Child 1
    dob: { type: Date, required: true },
    gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER'], required: true },
  },
  { _id: false }
);

const nomineeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    relation: { type: String, required: true, trim: true },
    age: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const policyProposalSchema = new mongoose.Schema(
  {
    proposalNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    policyNumber: {
      type: String,
      default: '',
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan',
      required: [true, 'Plan ID is required'],
    },
    optionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PlanOption',
      required: [true, 'Option ID is required'],
    },
    sumInsuredId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SumInsured',
      required: [true, 'Sum Insured ID is required'],
    },
    ageSlabId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AgeSlab',
      required: [true, 'Age Slab ID is required'],
    },
    familyTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FamilyType',
      required: [true, 'Family Type ID is required'],
    },
    insuredMembers: [insuredMemberSchema],
    nominee: nomineeSchema,
    pricing: {
      basePremium: { type: Number, required: true },
      gstPercentage: { type: Number, default: 18 },
      gstAmount: { type: Number, required: true },
      totalPremium: { type: Number, required: true },
    },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'approved', 'active', 'expired'],
      default: 'submitted',
    },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
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

// Auto calculate 1-year policy end date before saving
policyProposalSchema.pre('save', function (next) {
  if (this.startDate && !this.endDate) {
    const end = new Date(this.startDate);
    end.setFullYear(end.getFullYear() + 1);
    this.endDate = end;
  }
  next();
});

export const PolicyProposal = mongoose.model('PolicyProposal', policyProposalSchema);
