import mongoose from 'mongoose';

const ageSlabSchema = new mongoose.Schema(
  {
    minAge: {
      type: Number,
      required: [true, 'Minimum age is required'],
      min: [0, 'Minimum age cannot be negative'],
    },
    maxAge: {
      type: Number,
      required: [true, 'Maximum age is required'],
      min: [0, 'Maximum age cannot be negative'],
    },
    displayName: {
      type: String,
      required: [true, 'Display name is required'],
      trim: true,
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

export const AgeSlab = mongoose.model('AgeSlab', ageSlabSchema);
