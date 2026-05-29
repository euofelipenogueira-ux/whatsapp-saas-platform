import { Schema, model, Document } from 'mongoose';

/**
 * Message Interface
 * Otimizado para milhões de mensagens
 * Índices compostos para queries rápidas
 * TTL automático para retenção de dados
 */
export interface IMessage extends Document {
  _id: string;
  workspaceId: string;
  instanceId: string;
  messageId: string;
  from: string;
  to: string;
  body: string;
  type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'location' | 'contact' | 'sticker' | 'reaction';
  mediaUrl?: string;
  mediaType?: string;
  mediaSize?: number;
  quotedMessageId?: string;
  quotedFromJid?: string;
  quotedBody?: string;
  direction: 'incoming' | 'outgoing';
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: Date;
  ack?: number;
  failureReason?: string;
  metadata?: {
    caption?: string;
    duration?: number;
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    vCard?: string;
    mentions?: string[];
  };
  tags?: string[];
  customFields?: Record<string, any>;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
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
    messageId: {
      type: String,
      required: true,
      trim: true,
    },
    from: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    to: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    body: {
      type: String,
      default: '',
      maxlength: 4096,
    },
    type: {
      type: String,
      enum: ['text', 'image', 'document', 'audio', 'video', 'location', 'contact', 'sticker', 'reaction'],
      default: 'text',
      index: true,
    },
    mediaUrl: {
      type: String,
      default: null,
    },
    mediaType: {
      type: String,
      default: null,
    },
    mediaSize: {
      type: Number,
      default: null,
    },
    quotedMessageId: {
      type: String,
      default: null,
    },
    quotedFromJid: {
      type: String,
      default: null,
    },
    quotedBody: {
      type: String,
      default: null,
      maxlength: 1000,
    },
    direction: {
      type: String,
      enum: ['incoming', 'outgoing'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
      default: 'pending',
      index: true,
    },
    timestamp: {
      type: Date,
      required: true,
      index: true,
    },
    ack: {
      type: Number,
      default: null,
    },
    failureReason: {
      type: String,
      default: null,
    },
    metadata: {
      caption: {
        type: String,
        default: null,
      },
      duration: {
        type: Number,
        default: null,
      },
      latitude: {
        type: Number,
        default: null,
      },
      longitude: {
        type: Number,
        default: null,
      },
      accuracy: {
        type: Number,
        default: null,
      },
      vCard: {
        type: String,
        default: null,
      },
      mentions: {
        type: [String],
        default: [],
      },
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    customFields: {
      type: Map,
      of: Schema.Types.Mixed,
      default: new Map(),
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'messages',
  }
);

// Índices compostos para queries otimizadas (crítico para performance com milhões de docs)
messageSchema.index({ workspaceId: 1, instanceId: 1, timestamp: -1 });
messageSchema.index({ workspaceId: 1, from: 1, timestamp: -1 });
messageSchema.index({ workspaceId: 1, to: 1, timestamp: -1 });
messageSchema.index({ workspaceId: 1, status: 1, timestamp: -1 });
messageSchema.index({ workspaceId: 1, type: 1, timestamp: -1 });
messageSchema.index({ workspaceId: 1, direction: 1, timestamp: -1 });
messageSchema.index({ instanceId: 1, timestamp: -1 });
messageSchema.index({ from: 1, to: 1, timestamp: -1 });
messageSchema.index({ tags: 1 });
messageSchema.index({ messageId: 1, instanceId: 1 }, { unique: true });

// TTL Index - Expiração automática após período de retenção (90 dias por padrão)
messageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

export const Message = model<IMessage>('Message', messageSchema);