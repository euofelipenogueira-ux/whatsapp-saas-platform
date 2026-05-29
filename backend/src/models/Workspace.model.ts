import { Schema, model, Document } from 'mongoose';

/**
 * Workspace Interface
 * Container principal multi-tenant
 * Isolamento de dados por workspaceId
 */
export interface IWorkspace extends Document {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  ownerId: string;
  plan: 'free' | 'pro' | 'enterprise';
  billingEmail: string;
  currency: string;
  timezone: string;
  logo?: string;
  maxInstances: number;
  maxUsers: number;
  maxApiTokens: number;
  maxWebhooks: number;
  settings: {
    webhookRetries: number;
    webhookTimeout: number;
    messageRetention: number;
    enableFlows: boolean;
    enableCampaigns: boolean;
    enableAnalytics: boolean;
    enableAuditLog: boolean;
  };
  members: Array<{
    userId: string;
    role: 'owner' | 'admin' | 'manager' | 'user' | 'viewer';
    joinedAt: Date;
  }>;
  isActive: boolean;
  trialEndsAt?: Date;
  subscriptionEndsAt?: Date;
  metadata?: {
    industry?: string;
    company?: string;
    website?: string;
    country?: string;
    phone?: string;
  };
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const workspaceSchema = new Schema<IWorkspace>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[a-z0-9-]+$/,
    },
    description: {
      type: String,
      default: null,
      maxlength: 500,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    plan: {
      type: String,
      enum: ['free', 'pro', 'enterprise'],
      default: 'free',
      index: true,
    },
    billingEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    currency: {
      type: String,
      default: 'BRL',
    },
    timezone: {
      type: String,
      default: 'America/Sao_Paulo',
    },
    logo: {
      type: String,
      default: null,
    },
    maxInstances: {
      type: Number,
      default: 1,
    },
    maxUsers: {
      type: Number,
      default: 5,
    },
    maxApiTokens: {
      type: Number,
      default: 10,
    },
    maxWebhooks: {
      type: Number,
      default: 20,
    },
    settings: {
      webhookRetries: {
        type: Number,
        default: 5,
      },
      webhookTimeout: {
        type: Number,
        default: 30000,
      },
      messageRetention: {
        type: Number,
        default: 90,
      },
      enableFlows: {
        type: Boolean,
        default: true,
      },
      enableCampaigns: {
        type: Boolean,
        default: false,
      },
      enableAnalytics: {
        type: Boolean,
        default: true,
      },
      enableAuditLog: {
        type: Boolean,
        default: true,
      },
    },
    members: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
        role: {
          type: String,
          enum: ['owner', 'admin', 'manager', 'user', 'viewer'],
          default: 'user',
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    trialEndsAt: {
      type: Date,
      default: null,
    },
    subscriptionEndsAt: {
      type: Date,
      default: null,
    },
    metadata: {
      industry: {
        type: String,
        default: null,
      },
      company: {
        type: String,
        default: null,
      },
      website: {
        type: String,
        default: null,
      },
      country: {
        type: String,
        default: null,
      },
      phone: {
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
    collection: 'workspaces',
  }
);

// Índices para performance
workspaceSchema.index({ slug: 1 });
workspaceSchema.index({ ownerId: 1 });
workspaceSchema.index({ plan: 1, isActive: 1 });
workspaceSchema.index({ createdAt: -1 });
workspaceSchema.index({ deletedAt: 1 });

export const Workspace = model<IWorkspace>('Workspace', workspaceSchema);