import { Schema, model, Document } from 'mongoose';

/**
 * Flow Interface
 * Automações baseadas em gatilhos e nós
 * Suporta condicionalidades e ramificações
 */
export interface IFlow extends Document {
  _id: string;
  workspaceId: string;
  instanceId?: string;
  name: string;
  description?: string;
  trigger: {
    type: 'message_received' | 'message_keyword' | 'webhook' | 'schedule' | 'custom';
    config: Record<string, any>;
  };
  nodes: IFlowNode[];
  edges: Array<{
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
    condition?: Record<string, any>;
  }>;
  isActive: boolean;
  testMode: boolean;
  errorHandling: {
    onError: 'stop' | 'retry' | 'skip_node';
    maxRetries?: number;
  };
  statistics: {
    executionsTotal: number;
    executionsSuccess: number;
    executionsFailed: number;
    averageExecutionTime: number;
    lastExecutedAt?: Date;
  };
  version: number;
  publishedAt?: Date;
  publishedBy?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFlowNode {
  id: string;
  type: string;
  label?: string;
  position: { x: number; y: number };
  data: {
    label?: string;
    [key: string]: any;
  };
  connections?: string[];
}

const flowSchema = new Schema<IFlow>(
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
    trigger: {
      type: {
        type: String,
        enum: ['message_received', 'message_keyword', 'webhook', 'schedule', 'custom'],
        required: true,
      },
      config: {
        type: Schema.Types.Mixed,
        required: true,
      },
    },
    nodes: [
      {
        id: String,
        type: String,
        label: String,
        position: {
          x: Number,
          y: Number,
        },
        data: Schema.Types.Mixed,
        connections: [String],
      },
    ],
    edges: [
      {
        source: String,
        target: String,
        sourceHandle: String,
        targetHandle: String,
        condition: Schema.Types.Mixed,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    testMode: {
      type: Boolean,
      default: false,
    },
    errorHandling: {
      onError: {
        type: String,
        enum: ['stop', 'retry', 'skip_node'],
        default: 'stop',
      },
      maxRetries: {
        type: Number,
        default: 3,
      },
    },
    statistics: {
      executionsTotal: {
        type: Number,
        default: 0,
      },
      executionsSuccess: {
        type: Number,
        default: 0,
      },
      executionsFailed: {
        type: Number,
        default: 0,
      },
      averageExecutionTime: {
        type: Number,
        default: 0,
      },
      lastExecutedAt: {
        type: Date,
        default: null,
      },
    },
    version: {
      type: Number,
      default: 1,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    publishedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
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
    collection: 'flows',
  }
);

// Índices
flowSchema.index({ workspaceId: 1, isActive: 1 });
flowSchema.index({ workspaceId: 1, instanceId: 1 });
flowSchema.index({ tags: 1 });
flowSchema.index({ createdAt: -1 });
flowSchema.index({ deletedAt: 1 });

export const Flow = model<IFlow>('Flow', flowSchema);