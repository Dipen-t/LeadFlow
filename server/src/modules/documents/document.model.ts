import mongoose, { Schema, Document as MongooseDocument } from 'mongoose';

export type DocumentStatus = 'PENDING' | 'PROCESSING' | 'VERIFIED' | 'FAILED';

export interface IDocument extends MongooseDocument {
  brokerageId: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  uploadedBy: mongoose.Types.ObjectId;
  originalName: string;
  storageKey: string; // Cloudinary public_id or URL
  mimeType: string;
  size: number;
  status: DocumentStatus;
  failureReason?: string;
  processingAttempts: number;
  uploadedAt: Date;
  processingStartedAt?: Date;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentSchema = new Schema(
  {
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: 'Brokerage',
      required: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true, // Typically the Client User
    },
    originalName: {
      type: String,
      required: true,
    },
    storageKey: {
      type: String, 
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'VERIFIED', 'FAILED'],
      default: 'PENDING',
    },
    failureReason: {
      type: String,
      default: null,
    },
    processingAttempts: {
      type: Number,
      default: 0,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    processingStartedAt: {
      type: Date,
      default: null,
    },
    processedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes to fetch a client's documents efficiently
DocumentSchema.index({ clientId: 1, status: 1 });

export const Document = mongoose.model<IDocument>('Document', DocumentSchema);
