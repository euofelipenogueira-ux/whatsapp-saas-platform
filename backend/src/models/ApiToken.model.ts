import { Schema, model, Document } from 'mongoose';
import crypto from 'crypto';

/**
 * ApiToken Interface
 * Tokens para acesso à API via programação
 * Suporta rate limiting e scopes
 */
export interface IApiToken extends Document {
  _id: string;
  workspaceId: string;
  userId?: string;
  name: string;
  token: string;
  tokenPrefix: string;
  permissions: string[];
  isActive: boolean;
  expiresAt?: Date;
  lastUsedAt?: Date;
  lastUsedIp?: string;
  rateLimit: {
    requestsPerMinute: number;
    requestsPerDay: number;
    requestsPerMonth: number;
  };
  allowedIps?: string[];
  metadata?: {
    environment?: 'development' | 'production';
    description?: string;
  };
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const apiTokenSchema = new Schema<IApiToken>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      select: false,
    },
    tokenPrefix: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    permissions: {
      type: [String],
      default: ['read:messages', 'write:messages'],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
    lastUsedIp: {
      type: String,
      default: null,
    },
    rateLimit: {
      requestsPerMinute: {
        type: Number,
        default: 60,
      },
      requestsPerDay: {
        type: Number,
        default: 10000,
      },
      requestsPerMonth: {
        type: Number,
        default: 100000,
      },
    },
    allowedIps: {
      type: [String],
      default: [],
    },
    metadata: {
      environment: {
        type: String,
        enum: ['development', 'production'],
        default: 'production',
      },
      description: {
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
    collection: 'api_tokens',
  }
);

// Índices para performance
apiTokenSchema.index({ workspaceId: 1, isActive: 1 });
apiTokenSchema.index({ token: 1 });
apiTokenSchema.index({ tokenPrefix: 1 });
apiTokenSchema.index({ createdAt: -1 });
apiTokenSchema.index({ deletedAt: 1 });

// Statics para geração de tokens
apiTokenSchema.statics.generateToken = function () {
  const prefix = 'wsk_' + crypto.randomBytes(4).toString('hex');
  const token = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  
  return {
    token: token,
    tokenPrefix: prefix,
    tokenHash: hash,
  };
};

export const ApiToken = model<IApiToken>('ApiToken', apiTokenSchema);