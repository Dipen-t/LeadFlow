import mongoose, { Schema, Document } from 'mongoose';

export interface IIntegration extends Document {
  brokerageId: mongoose.Types.ObjectId;
  type: string;
  name: string;
  secretKey: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const IntegrationSchema = new Schema(
  {
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: 'Brokerage',
      required: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    secretKey: {
      type: String,
      required: true,
      unique: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Integration = mongoose.model<IIntegration>('Integration', IntegrationSchema);
