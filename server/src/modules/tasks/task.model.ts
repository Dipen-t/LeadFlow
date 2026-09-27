import mongoose, { Schema, Document } from 'mongoose';

export type TaskStatus = 'PENDING' | 'COMPLETED';

export interface ITask extends Document {
  brokerageId: mongoose.Types.ObjectId;
  leadId: mongoose.Types.ObjectId;
  assignedAdvisorId: mongoose.Types.ObjectId;
  title: string;
  dueAt: Date;
  status: TaskStatus;
}

const TaskSchema = new Schema(
  {
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: 'Brokerage',
      required: true,
    },
    leadId: {
      type: Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
    },
    assignedAdvisorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    dueAt: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'COMPLETED'],
      default: 'PENDING',
    },
  },
  { timestamps: true }
);

TaskSchema.index({ assignedAdvisorId: 1, status: 1 });
TaskSchema.index({ leadId: 1 });

export const Task = mongoose.model<ITask>('Task', TaskSchema);
