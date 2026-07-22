import mongoose from 'mongoose';

const familyTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Family type name is required'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Code is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    adultCount: {
      type: Number,
      required: [true, 'Adult count is required'],
      min: [0, 'Adult count cannot be negative'],
    },
    childCount: {
      type: Number,
      required: [true, 'Child count is required'],
      min: [0, 'Child count cannot be negative'],
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

export const FamilyType = mongoose.model('FamilyType', familyTypeSchema);
