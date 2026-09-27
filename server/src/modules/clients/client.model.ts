import mongoose, { Schema, Document as MongooseDocument } from 'mongoose';

export interface IClient extends MongooseDocument {
  brokerageId: mongoose.Types.ObjectId;
  leadId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId; // The Auth User account mapped to this client
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema = new Schema(
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
      unique: true, // One lead maps to exactly one client
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // Unique auth mapping
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
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Optimize lookup by brokerage
ClientSchema.index({ brokerageId: 1, email: 1 });

export const Client = mongoose.model<IClient>('Client', ClientSchema);
