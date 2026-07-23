import mongoose from 'mongoose';

const insuredMemberSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    relation: { type: String, required: true, trim: true },
    dob: { type: Date, required: true },
    gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER'], required: true },
    hasPreExistingDisease: { type: Boolean, default: false },
    medicalNotes: { type: String, default: '' },
  },
  { _id: false }
);

const nomineeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    relation: { type: String, required: true, trim: true },
    age: { type: Number, required: true, min: 0 },
    phone: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const policyApplicationSchema = new mongoose.Schema(
  {
    applicationNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    policyNumber: {
      type: String,
      default: '',
      index: true,
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
    applicantDetails: {
      fullName: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true, lowercase: true },
      phone: { type: String, required: true, trim: true },
      dob: { type: Date, required: true },
      gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER'], required: true },
      panNumber: { type: String, uppercase: true, trim: true },
      aadhaarNumber: { type: String, trim: true },
      address: {
        street: { type: String, default: '' },
        city: { type: String, default: '' },
        state: { type: String, default: '' },
        pincode: { type: String, default: '' },
      },
    },
    insuredMembers: [insuredMemberSchema],
    nominee: nomineeSchema,
    pricing: {
      basePremium: { type: Number, required: true },
      gstPercentage: { type: Number, default: 18 },
      gstAmount: { type: Number, required: true },
      totalPremium: { type: Number, required: true },
    },
    paymentDetails: {
      transactionId: { type: String, required: true, trim: true },
      paymentMode: { type: String, enum: ['UPI', 'NET_BANKING', 'CREDIT_CARD', 'DEBIT_CARD', 'WALLET'], default: 'UPI' },
      paymentStatus: { type: String, enum: ['SUCCESS', 'PENDING', 'FAILED'], default: 'SUCCESS' },
      paidAmount: { type: Number, required: true },
      paidAt: { type: Date, default: Date.now },
    },
    status: {
      type: String,
      enum: ['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'POLICY_ISSUED'],
      default: 'PENDING_APPROVAL',
      index: true,
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    policyStartDate: {
      type: Date,
    },
    policyExpiryDate: {
      type: Date,
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

export const PolicyApplication = mongoose.model('PolicyApplication', policyApplicationSchema);
