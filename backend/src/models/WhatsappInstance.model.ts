import { Schema, model, Document } from 'mongoose';

/**
 * WhatsappInstance Interface
 * Representa uma conexão WhatsApp (número) conectada via Baileys
 * Multi-tenant: cada workspace pode ter múltiplas instâncias
 */
export interface IWhatsappInstance extends Document {
  _id: string;
  workspaceId: string;
  phoneNumber: string;
  displayName: string;
  status: 'connected' | 'disconnected' | 'scanning' | 'error' | 'authenticating';
  qrCode?: string;
  sessionData?: {
    credentials: string;
    keys: string;
  };
  errorMessage?: string;
  batteryLevel?: number;
  isOnline: boolean;
  isPaired: boolean;
  isPalmSupported: boolean;
  webhookUrl?: string;
  messageLimit: {
    perDay: number;
    perMinute: number;
    remaining: number;
  };
  metadata?: {
    deviceManufacturer?: string;
    osVersion?: string;
    appVersion?: string;
    platform?: string;
  };
  statistics: {
    messagesReceived: number;
    messagesSent: number;
    contactsCount: number;
    groupsCount: number;
  };
  lastQrCodeRefresh?: Date;
  lastStatusCheck?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const whatsappInstanceSchema = new Schema<IWhatsappInstance>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
      match: /^\d{10,15}$/,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    status: {
      type: String,
      enum: ['connected', 'disconnected', 'scanning', 'error', 'authenticating'],
      default: 'disconnected',
      index: true,
    },
    qrCode: {
      type: String,
      default: null,
      select: false,
    },
    sessionData: {
      credentials: {
        type: String,
        default: null,
        select: false,
      },
      keys: {
        type: String,
        default: null,
        select: false,
      },
    },
    errorMessage: {
      type: String,
      default: null,
    },
    batteryLevel: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },
    isOnline: {
      type: Boolean,
      default: false,
      index: true,
    },
    isPaired: {
      type: Boolean,
      default: false,
    },
    isPalmSupported: {
      type: Boolean,
      default: false,
    },
    webhookUrl: {
      type: String,
      default: null,
    },
    messageLimit: {
      perDay: {
        type: Number,
        default: 1000,
      },
      perMinute: {
        type: Number,
        default: 100,
      },
      remaining: {
        type: Number,
        default: 1000,
      },
    },
    metadata: {
      deviceManufacturer: {
        type: String,
        default: null,
      },
      osVersion: {
        type: String,
        default: null,
      },
      appVersion: {
        type: String,
        default: null,
      },
      platform: {
        type: String,
        default: null,
      },
    },
    statistics: {
      messagesReceived: {
        type: Number,
        default: 0,
      },
      messagesSent: {
        type: Number,
        default: 0,
      },
      contactsCount: {
        type: Number,
        default: 0,
      },
      groupsCount: {
        type: Number,
        default: 0,
      },
    },
    lastQrCodeRefresh: {
      type: Date,
      default: null,
    },
    lastStatusCheck: {
      type: Date,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'whatsapp_instances',
  }
);

// Índices para performance
whatsappInstanceSchema.index({ workspaceId: 1 });
whatsappInstanceSchema.index({ workspaceId: 1, status: 1 });
whatsappInstanceSchema.index({ workspaceId: 1, isOnline: 1 });
whatsappInstanceSchema.index({ phoneNumber: 1 }, { unique: true, sparse: true });
whatsappInstanceSchema.index({ createdAt: -1 });
whatsappInstanceSchema.index({ deletedAt: 1 });

export const WhatsappInstance = model<IWhatsappInstance>(
  'WhatsappInstance',
  whatsappInstanceSchema
);