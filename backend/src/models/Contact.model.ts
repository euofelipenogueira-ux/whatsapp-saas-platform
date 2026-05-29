import { Schema, model, Document } from 'mongoose';

/**
 * Contact Interface
 * Agregação de contatos por instância
 * Desnormalizado para queries rápidas
 */
export interface IContact extends Document {
  _id: string;
  workspaceId: string;
  instanceId: string;
  phoneNumber: string;
  displayName?: string;
  profilePicture?: string;
  bio?: string;
  isGroup: boolean;
  isBot: boolean;
  isBusiness: boolean;
  businessCategory?: string;
  businessDescription?: string;
  email?: string;
  customName?: string;
  tags?: string[];
  blockedStatus?: 'none' | 'blocked_by_me' | 'blocked_by_them';
  lastInteraction?: Date;
  messageCount: number;
  unreadMessageCount: number;
  metadata?: {
    customField1?: string;
    customField2?: string;
    customField3?: string;
  };
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const contactSchema = new Schema<IContact>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    instanceId: {
      type: Schema.Types.ObjectId,
      ref: 'WhatsappInstance',
      required: true,
      index: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    displayName: {
      type: String,
      default: null,
      trim: true,
      maxlength: 100,
    },
    profilePicture: {
      type: String,
      default: null,
    },
    bio: {
      type: String,
      default: null,
      maxlength: 500,
    },
    isGroup: {
      type: Boolean,
      default: false,
      index: true,
    },
    isBot: {
      type: Boolean,
      default: false,
    },
    isBusiness: {
      type: Boolean,
      default: false,
    },
    businessCategory: {
      type: String,
      default: null,
    },
    businessDescription: {
      type: String,
      default: null,
      maxlength: 500,
    },
    email: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
    },
    customName: {
      type: String,
      default: null,
      trim: true,
      maxlength: 100,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    blockedStatus: {
      type: String,
      enum: ['none', 'blocked_by_me', 'blocked_by_them'],
      default: 'none',
    },
    lastInteraction: {
      type: Date,
      default: null,
      index: true,
    },
    messageCount: {
      type: Number,
      default: 0,
    },
    unreadMessageCount: {
      type: Number,
      default: 0,
    },
    metadata: {
      customField1: {
        type: String,
        default: null,
      },
      customField2: {
        type: String,
        default: null,
      },
      customField3: {
        type: String,
        default: null,
      },
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'contacts',
  }
);

// Índices compostos
contactSchema.index({ instanceId: 1, phoneNumber: 1 }, { unique: true, sparse: true });
contactSchema.index({ workspaceId: 1, instanceId: 1 });
contactSchema.index({ workspaceId: 1, isGroup: 1 });
contactSchema.index({ workspaceId: 1, lastInteraction: -1 });
contactSchema.index({ tags: 1 });
contactSchema.index({ createdAt: -1 });
contactSchema.index({ deletedAt: 1 });

export const Contact = model<IContact>('Contact', contactSchema);