import { Schema, model, Document } from 'mongoose';

/**
 * Webhook Interface
 * Endpoints para receber eventos em tempo real
 * Suporta retries, HMAC-SHA256 e custom headers
 */
export interface IWebhook extends Document {
  _id: string;
  workspaceId: string;
  instanceId?: string;
  name: string;
  url: string;
  events: string[];
  headers?: Record<string, string>;
  secret: string;
  retryPolicy: {
    maxRetries: number;
    initialDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
  };
  isActive: boolean;
  testData?: {
    lastTestAt?: Date;
    lastTestStatus?: number;
    lastTestResponse?: string;
  };
  statistics: {
    deliveredEvents: number;
    failedEvents: number;
    totalAttempts: number;
    averageResponseTime: number;
    lastEventAt?: Date;
  };
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const webhookSchema = new Schema<IWebhook>(
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
      default: null,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    url: {
      type: String,
      required: true,
      trim: true,
      match: /^https?:\/\/.+/,
    },
    events: {
      type: [String],
      required: true,
      enum: [
        'message.received',
        'message.sent',
        'message.read',
        'message.delivery',
        'instance.connected',
        'instance.disconnected',
        'instance.qrcode',
        'instance.error',
        'contact.updated',
        'conversation.updated',
        'flow.executed',
        'campaign.sent',
      ],
    },
    headers: {
      type: Map,
      of: String,
      default: new Map(),
    },
    secret: {
      type: String,
      required: true,
      select: false,
    },
    retryPolicy: {
      maxRetries: {
        type: Number,
        default: 5,
        min: 0,
        max: 20,
      },
      initialDelay: {
        type: Number,
        default: 1000,
      },
      maxDelay: {
        type: Number,
        default: 30000,
      },
      backoffMultiplier: {
        type: Number,
        default: 2,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    testData: {
      lastTestAt: {
        type: Date,
        default: null,
      },
      lastTestStatus: {
        type: Number,
        default: null,
      },
      lastTestResponse: {
        type: String,
        default: null,
      },
    },
    statistics: {
      deliveredEvents: {
        type: Number,
        default: 0,
      },
      failedEvents: {
        type: Number,
        default: 0,
      },
      totalAttempts: {
        type: Number,
        default: 0,
      },
      averageResponseTime: {
        type: Number,
        default: 0,
      },
      lastEventAt: {
        type: Date,
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
    collection: 'webhooks',
  }
);

// Índices para performance
webhookSchema.index({ workspaceId: 1, isActive: 1 });
webhookSchema.index({ workspaceId: 1, instanceId: 1 });
webhookSchema.index({ url: 1 });
webhookSchema.index({ createdAt: -1 });
webhookSchema.index({ deletedAt: 1 });

export const Webhook = model<IWebhook>('Webhook', webhookSchema);