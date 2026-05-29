import { Schema, model, Document } from 'mongoose';

/**
 * FlowExecution Interface
 * Rastreamento de execução de fluxos
 * Essencial para debugging e analytics
 */
export interface IFlowExecution extends Document {
  _id: string;
  workspaceId: string;
  flowId: string;
  instanceId: string;
  triggeredBy: 'message' | 'webhook' | 'schedule' | 'manual';
  triggerId?: string;
  triggerData: Record<string, any>;
  status: 'running' | 'completed' | 'failed' | 'paused';
  startedAt: Date;
  completedAt?: Date;
  executionTime: number;
  nodeExecutions: Array<{
    nodeId: string;
    nodeType: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    input?: Record<string, any>;
    output?: Record<string, any>;
    error?: string;
    duration: number;
  }>;
  variables: Record<string, any>;
  errors?: Array<{
    nodeId: string;
    message: string;
    stack?: string;
  }>;
  result?: Record<string, any>;
  metadata?: {
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
  };
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const flowExecutionSchema = new Schema<IFlowExecution>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    flowId: {
      type: Schema.Types.ObjectId,
      ref: 'Flow',
      required: true,
      index: true,
    },
    instanceId: {
      type: Schema.Types.ObjectId,
      ref: 'WhatsappInstance',
      required: true,
      index: true,
    },
    triggeredBy: {
      type: String,
      enum: ['message', 'webhook', 'schedule', 'manual'],
      required: true,
      index: true,
    },
    triggerId: {
      type: String,
      default: null,
    },
    triggerData: {
      type: Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      enum: ['running', 'completed', 'failed', 'paused'],
      default: 'running',
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    executionTime: {
      type: Number,
      default: 0,
    },
    nodeExecutions: [
      {
        nodeId: String,
        nodeType: String,
        status: {
          type: String,
          enum: ['pending', 'running', 'completed', 'failed', 'skipped'],
        },
        input: Schema.Types.Mixed,
        output: Schema.Types.Mixed,
        error: String,
        duration: Number,
      },
    ],
    variables: {
      type: Map,
      of: Schema.Types.Mixed,
      default: new Map(),
    },
    errors: [
      {
        nodeId: String,
        message: String,
        stack: String,
      },
    ],
    result: {
      type: Schema.Types.Mixed,
      default: null,
    },
    metadata: {
      userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
      ipAddress: String,
      userAgent: String,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'flow_executions',
  }
);

// Índices para queries de execução
flowExecutionSchema.index({ workspaceId: 1, flowId: 1, createdAt: -1 });
flowExecutionSchema.index({ workspaceId: 1, status: 1, createdAt: -1 });
flowExecutionSchema.index({ flowId: 1, startedAt: -1 });
flowExecutionSchema.index({ createdAt: -1 });
flowExecutionSchema.index({ deletedAt: 1 });

// TTL Index - Manter execuções por 30 dias
flowExecutionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

export const FlowExecution = model<IFlowExecution>(
  'FlowExecution',
  flowExecutionSchema
);