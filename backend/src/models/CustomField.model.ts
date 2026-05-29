import { Schema, model, Document } from 'mongoose';

/**
 * CustomField Interface
 * Campos personalizados para extensão de dados
 * Por entidade (Contact, Conversation, etc)
 */
export interface ICustomField extends Document {
  _id: string;
  workspaceId: string;
  entityType: 'contact' | 'conversation' | 'campaign' | 'message';
  fieldName: string;
  fieldLabel: string;
  fieldType: 'text' | 'email' | 'phone' | 'number' | 'date' | 'boolean' | 'select' | 'multiselect';
  required: boolean;
  defaultValue?: any;
  placeholder?: string;
  helpText?: string;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
  };
  options?: Array<{
    value: string;
    label: string;
    color?: string;
  }>;
  displayOrder: number;
  isVisible: boolean;
  isSystem: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const customFieldSchema = new Schema<ICustomField>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      enum: ['contact', 'conversation', 'campaign', 'message'],
      required: true,
      index: true,
    },
    fieldName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9_]+$/,
    },
    fieldLabel: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    fieldType: {
      type: String,
      enum: ['text', 'email', 'phone', 'number', 'date', 'boolean', 'select', 'multiselect'],
      required: true,
    },
    required: {
      type: Boolean,
      default: false,
    },
    defaultValue: {
      type: Schema.Types.Mixed,
      default: null,
    },
    placeholder: {
      type: String,
      default: null,
      maxlength: 100,
    },
    helpText: {
      type: String,
      default: null,
      maxlength: 300,
    },
    validation: {
      minLength: Number,
      maxLength: Number,
      pattern: String,
      min: Number,
      max: Number,
    },
    options: [
      {
        value: String,
        label: String,
        color: String,
      },
    ],
    displayOrder: {
      type: Number,
      default: 0,
    },
    isVisible: {
      type: Boolean,
      default: true,
      index: true,
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'custom_fields',
  }
);

// Índices
customFieldSchema.index({ workspaceId: 1, entityType: 1, displayOrder: 1 });
customFieldSchema.index({ workspaceId: 1, entityType: 1, fieldName: 1 }, { unique: true, sparse: true });
customFieldSchema.index({ workspaceId: 1, isVisible: 1 });
customFieldSchema.index({ createdAt: -1 });
customFieldSchema.index({ deletedAt: 1 });

export const CustomField = model<ICustomField>('CustomField', customFieldSchema);