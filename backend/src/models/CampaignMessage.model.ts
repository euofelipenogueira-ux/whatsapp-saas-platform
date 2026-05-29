import { Schema, model, Document } from 'mongoose';

/**
 * CampaignMessage Interface
 * Rastreamento individual de mensagens de campanha
 * Essencial para análise de métricas
 */
export interface ICampaignMessage extends Document {
  _id: string;
  workspaceId: string;
  campaignId: string;
  contactId: string;
  phoneNumber: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'skipped';
  messageId?: string;
  direction: 'outgoing';
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failureReason?: string;
  failureCode?: string;
  retryCount: number;
  nextRetryAt?: Date;
  metadata?: {
    variables?: Record<string, string>;
    deviceInfo?: Record<string, any>;
  };
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const campaignMessageSchema = new Schema<ICampaignMessage>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
      index: true,
    },
    contactId: {
      type: Schema.Types.ObjectId,
      ref: 'Contact',
      required: true,
      index: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'read', 'failed', 'skipped'],
      default: 'pending',
      index: true,
    },
    messageId: {
      type: String,
      default: null,
    },
    direction: {
      type: String,
      enum: ['outgoing'],
      default: 'outgoing',
    },
    sentAt: {
      type: Date,
      default: null,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    readAt: {
      type: Date,
      default: null,
    },
    failureReason: {
      type: String,
      default: null,
    },
    failureCode: {
      type: String,
      default: null,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    nextRetryAt: {
      type: Date,
      default: null,
    },
    metadata: {
      variables: {
        type: Map,
        of: String,
        default: new Map(),
      },
      deviceInfo: Schema.Types.Mixed,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'campaign_messages',
  }
);

// Índices otimizados para queries de status
campaignMessageSchema.index({ workspaceId: 1, campaignId: 1, status: 1 });
campaignMessageSchema.index({ campaignId: 1, status: 1, createdAt: -1 });
campaignMessageSchema.index({ phoneNumber: 1, campaignId: 1 }, { unique: true, sparse: true });
campaignMessageSchema.index({ status: 1, nextRetryAt: 1 });
campaignMessageSchema.index({ createdAt: -1 });
campaignMessageSchema.index({ deletedAt: 1 });

// TTL Index - Manter registros por 60 dias
campaignMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 5184000 });

export const CampaignMessage = model<ICampaignMessage>(
  'CampaignMessage',
  campaignMessageSchema
);