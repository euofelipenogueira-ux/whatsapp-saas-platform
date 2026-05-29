import { Schema, model, Document } from 'mongoose';

/**
 * Conversation Interface
 * Agrupa mensagens de um contato/grupo
 * Desnormalizado para acesso rápido
 */
export interface IConversation extends Document {
  _id: string;
  workspaceId: string;
  instanceId: string;
  participantJid: string;
  participantName?: string;
  participantAvatar?: string;
  isGroup: boolean;
  isArchived: boolean;
  isPinned: boolean;
  isMuted: boolean;
  muteExpiration?: Date;
  lastMessage?: {
    id: string;
    body: string;
    direction: 'incoming' | 'outgoing';
    timestamp: Date;
    type: string;
  };
  messageCount: number;
  unreadCount: number;
  tags?: string[];
  customLabel?: string;
  metadata?: Record<string, any>;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>(
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
    participantJid: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    participantName: {
      type: String,
      default: null,
      trim: true,
      maxlength: 100,
    },
    participantAvatar: {
      type: String,
      default: null,
    },
    isGroup: {
      type: Boolean,
      default: false,
      index: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    isPinned: {
      type: Boolean,
      default: false,
      index: true,
    },
    isMuted: {
      type: Boolean,
      default: false,
    },
    muteExpiration: {
      type: Date,
      default: null,
    },
    lastMessage: {
      id: {
        type: String,
        default: null,
      },
      body: {
        type: String,
        default: null,
        maxlength: 500,
      },
      direction: {
        type: String,
        enum: ['incoming', 'outgoing'],
        default: null,
      },
      timestamp: {
        type: Date,
        default: null,
      },
      type: {
        type: String,
        default: 'text',
      },
    },
    messageCount: {
      type: Number,
      default: 0,
    },
    unreadCount: {
      type: Number,
      default: 0,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    customLabel: {
      type: String,
      default: null,
      trim: true,
      maxlength: 50,
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
      default: new Map(),
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'conversations',
  }
);

// Índices compostos
conversationSchema.index({ instanceId: 1, participantJid: 1 }, { unique: true, sparse: true });
conversationSchema.index({ workspaceId: 1, instanceId: 1 });
conversationSchema.index({ workspaceId: 1, isArchived: 1, updatedAt: -1 });
conversationSchema.index({ workspaceId: 1, isPinned: 1 });
conversationSchema.index({ workspaceId: 1, unreadCount: 1 });
conversationSchema.index({ tags: 1 });
conversationSchema.index({ createdAt: -1 });
conversationSchema.index({ deletedAt: 1 });

export const Conversation = model<IConversation>('Conversation', conversationSchema);