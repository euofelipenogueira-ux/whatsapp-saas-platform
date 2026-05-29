import { Schema, model, Document } from 'mongoose';

/**
 * Campaign Interface
 * Campanhas de mensagens em massa
 * Rastreamento de envios e métricas
 */
export interface ICampaign extends Document {
  _id: string;
  workspaceId: string;
  instanceId?: string;
  name: string;
  description?: string;
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled';
  type: 'broadcast' | 'targeted' | 'triggered';
  messageTemplate: {
    body: string;
    mediaUrl?: string;
    mediaType?: string;
    buttons?: Array<{
      id: string;
      title: string;
      url?: string;
      phoneNumber?: string;
    }>;
  };
  recipients: {
    type: 'all' | 'segment' | 'custom' | 'contacts';
    config?: Record<string, any>;
    contactIds?: string[];
    count: number;
  };
  scheduling: {
    startDate: Date;
    endDate?: Date;
    sendImmediately: boolean;
    timezone?: string;
  };
  limits: {
    dailyLimit?: number;
    totalLimit?: number;
    retryFailed: boolean;
    maxRetries: number;
  };
  statistics: {
    totalScheduled: number;
    totalSent: number;
    totalDelivered: number;
    totalFailed: number;
    totalRead: number;
    deliveryRate: number;
    readRate: number;
    averageResponseTime?: number;
  };
  variables?: Record<string, string>;
  tags?: string[];
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const campaignSchema = new Schema<ICampaign>(
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
    description: {
      type: String,
      default: null,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled'],
      default: 'draft',
      index: true,
    },
    type: {
      type: String,
      enum: ['broadcast', 'targeted', 'triggered'],
      required: true,
      index: true,
    },
    messageTemplate: {
      body: {
        type: String,
        required: true,
        maxlength: 4096,
      },
      mediaUrl: String,
      mediaType: String,
      buttons: [
        {
          id: String,
          title: String,
          url: String,
          phoneNumber: String,
        },
      ],
    },
    recipients: {
      type: {
        type: String,
        enum: ['all', 'segment', 'custom', 'contacts'],
        required: true,
      },
      config: Schema.Types.Mixed,
      contactIds: [Schema.Types.ObjectId],
      count: {
        type: Number,
        default: 0,
      },
    },
    scheduling: {
      startDate: {
        type: Date,
        required: true,
      },
      endDate: Date,
      sendImmediately: {
        type: Boolean,
        default: false,
      },
      timezone: String,
    },
    limits: {
      dailyLimit: Number,
      totalLimit: Number,
      retryFailed: {
        type: Boolean,
        default: true,
      },
      maxRetries: {
        type: Number,
        default: 3,
      },
    },
    statistics: {
      totalScheduled: {
        type: Number,
        default: 0,
      },
      totalSent: {
        type: Number,
        default: 0,
      },
      totalDelivered: {
        type: Number,
        default: 0,
      },
      totalFailed: {
        type: Number,
        default: 0,
      },
      totalRead: {
        type: Number,
        default: 0,
      },
      deliveryRate: {
        type: Number,
        default: 0,
      },
      readRate: {
        type: Number,
        default: 0,
      },
      averageResponseTime: Number,
    },
    variables: {
      type: Map,
      of: String,
      default: new Map(),
    },
    tags: {
      type: [String],
      default: [],
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
    collection: 'campaigns',
  }
);

// Índices
campaignSchema.index({ workspaceId: 1, status: 1 });
campaignSchema.index({ workspaceId: 1, type: 1 });
campaignSchema.index({ workspaceId: 1, createdAt: -1 });
campaignSchema.index({ 'scheduling.startDate': 1, status: 1 });
campaignSchema.index({ tags: 1 });
campaignSchema.index({ deletedAt: 1 });

export const Campaign = model<ICampaign>('Campaign', campaignSchema);