import { Schema, model, Document } from 'mongoose';

/**
 * Tag Interface
 * Tags reutilizáveis para organização de dados
 * Suporta múltiplas entidades
 */
export interface ITag extends Document {
  _id: string;
  workspaceId: string;
  name: string;
  description?: string;
  color?: string;
  category?: string;
  usageCount: number;
  appliedTo: {
    messages?: number;
    contacts?: number;
    conversations?: number;
    campaigns?: number;
    flows?: number;
  };
  isSystem: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const tagSchema = new Schema<ITag>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 50,
    },
    description: {
      type: String,
      default: null,
      maxlength: 200,
    },
    color: {
      type: String,
      default: '#3b82f6',
      match: /^#[0-9a-f]{6}$/i,
    },
    category: {
      type: String,
      default: null,
      trim: true,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    appliedTo: {
      messages: {
        type: Number,
        default: 0,
      },
      contacts: {
        type: Number,
        default: 0,
      },
      conversations: {
        type: Number,
        default: 0,
      },
      campaigns: {
        type: Number,
        default: 0,
      },
      flows: {
        type: Number,
        default: 0,
      },
    },
    isSystem: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'tags',
  }
);

// Índices
tagSchema.index({ workspaceId: 1, name: 1 }, { unique: true, sparse: true });
tagSchema.index({ workspaceId: 1, category: 1 });
tagSchema.index({ workspaceId: 1, createdAt: -1 });
tagSchema.index({ isSystem: 1 });
tagSchema.index({ deletedAt: 1 });

export const Tag = model<ITag>('Tag', tagSchema);