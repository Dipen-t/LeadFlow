import mongoose, { Schema, Document } from 'mongoose';

export interface IEmailTemplate extends Document {
  brokerageId: mongoose.Types.ObjectId;
  pipelineStageId: mongoose.Types.ObjectId;
  subject: string;
  body: string; // Supports {{clientName}} and {{advisorName}}
}

const EmailTemplateSchema = new Schema(
  {
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: 'Brokerage',
      required: true,
    },
    pipelineStageId: {
      type: Schema.Types.ObjectId,
      ref: 'PipelineStage',
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

// One template per stage for simplicity, though could be expanded
EmailTemplateSchema.index({ brokerageId: 1, pipelineStageId: 1 }, { unique: true });

export const EmailTemplate = mongoose.model<IEmailTemplate>('EmailTemplate', EmailTemplateSchema);

export interface ITaskTemplate extends Document {
  brokerageId: mongoose.Types.ObjectId;
  pipelineStageId: mongoose.Types.ObjectId;
  title: string;
  dueInHours: number; // e.g. 2 means due in 2 hours
}

const TaskTemplateSchema = new Schema(
  {
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: 'Brokerage',
      required: true,
    },
    pipelineStageId: {
      type: Schema.Types.ObjectId,
      ref: 'PipelineStage',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    dueInHours: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { timestamps: true }
);

export const TaskTemplate = mongoose.model<ITaskTemplate>('TaskTemplate', TaskTemplateSchema);
