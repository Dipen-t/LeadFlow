import mongoose, { Schema, Document } from 'mongoose';

export interface IPipelineStage extends Document {
  brokerageId: mongoose.Types.ObjectId;
  name: string;
  order: number;
  category: 'OPEN' | 'WON' | 'LOST';
  emailTemplateId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PipelineStageSchema = new Schema(
  {
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: 'Brokerage',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    category: {
      type: String,
      enum: ['OPEN', 'WON', 'LOST'],
      default: 'OPEN',
    },
    emailTemplateId: {
      type: Schema.Types.ObjectId,
      ref: 'EmailTemplate',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure a brokerage cannot have two stages with the exact same name
PipelineStageSchema.index({ brokerageId: 1, name: 1 }, { unique: true });

export const PipelineStage = mongoose.model<IPipelineStage>('PipelineStage', PipelineStageSchema);
