import mongoose, { Schema, Document } from 'mongoose';

export type LeadStatus = 'ACTIVE' | 'CONVERTED' | 'DUPLICATE' | 'LOST';

export interface ILead extends Document {
  brokerageId: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  source: string;
  externalId?: string;
  duplicateOf?: mongoose.Types.ObjectId;
  assignedAdvisorId?: mongoose.Types.ObjectId;
  pipelineStageId: mongoose.Types.ObjectId;
  status: LeadStatus;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

const LeadSchema = new Schema(
  {
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: 'Brokerage',
      required: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: null,
    },
    phone: {
      type: String,
      trim: true,
      default: null,
    },
    source: {
      type: String,
      required: true,
      trim: true,
    },
    externalId: {
      type: String,
      trim: true,
      default: null,
    },
    duplicateOf: {
      type: Schema.Types.ObjectId,
      ref: 'Lead',
      default: null,
    },
    assignedAdvisorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    pipelineStageId: {
      type: Schema.Types.ObjectId,
      ref: 'PipelineStage',
      required: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'CONVERTED', 'DUPLICATE', 'LOST'],
      default: 'ACTIVE',
    },
  },
  {
    timestamps: true,
    optimisticConcurrency: true, // Enables __v for version checking (optimistic concurrency)
  }
);

// Idempotency strategy for external ingestion
LeadSchema.index(
  { brokerageId: 1, source: 1, externalId: 1 }, 
  { unique: true, partialFilterExpression: { externalId: { $type: 'string' } } }
);

// For quick fetching by pipeline stage
LeadSchema.index({ brokerageId: 1, pipelineStageId: 1 });

export const Lead = mongoose.model<ILead>('Lead', LeadSchema);
