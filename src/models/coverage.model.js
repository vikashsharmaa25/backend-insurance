import mongoose from 'mongoose';

const coverageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Coverage title is required'],
      unique: true,
      trim: true,
      maxlength: [100, 'Coverage title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    icon: {
      type: String,
      trim: true,
      default: '',
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

export const Coverage = mongoose.model('Coverage', coverageSchema);
