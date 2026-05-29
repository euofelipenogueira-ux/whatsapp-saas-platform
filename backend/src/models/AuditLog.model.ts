import { Schema, model, Document } from 'mongoose';

/**
 * AuditLog Interface
 * Log imutável de todas as operações críticas
 * Essencial para compliance e debugging
 */
export interface IAuditLog extends Document {
  _id: string;
  workspaceId: string;
  userId?: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'LOGIN' | 'LOGOUT' | 'PERMISSION_CHANGE';
  resource: 'workspace' | 'user' | 'instance' | 'message' | 'webhook' | 'flow' | 'campaign' | 'token' | 'contact' | 'api_call';
  resourceId: string;
  resourceName?: string;
  severity: 'info' | 'warning' | 'critical';
  changes?: {
    before: Record<string, any>;
    after: Record<string, any>;
  };
  metadata?: {
    ipAddress: string;
    userAgent: string;
    referer?: string;
    method?: string;
    statusCode?: number;
    errorMessage?: string;
    requestId?: string;
  };
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
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
      index: true,
    },
    action: {
      type: String,
      enum: ['CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'LOGIN', 'LOGOUT', 'PERMISSION_CHANGE'],
      required: true,
      index: true,
    },
    resource: {
      type: String,
      enum: [
        'workspace',
        'user',
        'instance',
        'message',
        'webhook',
        'flow',
        'campaign',
        'token',
        'contact',
        'api_call',
      ],
      required: true,
      index: true,
    },
    resourceId: {
      type: String,
      required: true,
      index: true,
    },
    resourceName: {
      type: String,
      default: null,
      maxlength: 200,
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical'],
      default: 'info',
      index: true,
    },
    changes: {
      before: Schema.Types.Mixed,
      after: Schema.Types.Mixed,
    },
    metadata: {
      ipAddress: {
        type: String,
        required: true,
        index: true,
      },
      userAgent: String,
      referer: String,
      method: String,
      statusCode: Number,
      errorMessage: String,
      requestId: {
        type: String,
        index: true,
      },
    },
  },
  {
    timestamps: false,
    collection: 'audit_logs',
  }
);

// Mover createdAt para fora do timestamps automático
auditLogSchema.add({ createdAt: { type: Date, default: Date.now, index: true, immutable: true } });

// Índices compostos para queries eficientes
auditLogSchema.index({ workspaceId: 1, createdAt: -1 });
auditLogSchema.index({ workspaceId: 1, action: 1, createdAt: -1 });
auditLogSchema.index({ workspaceId: 1, resource: 1, createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ resourceId: 1, createdAt: -1 });
auditLogSchema.index({ 'metadata.requestId': 1 });
auditLogSchema.index({ severity: 1, createdAt: -1 });

// TTL Index - Manter logs por 1 ano (31.536.000 segundos)
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 });

// Deixar documento imutável após criação
auditLogSchema.pre('save', function (next) {
  if (!this.isNew) {
    return next(new Error('Audit logs are immutable'));
  }
  next();
});

export const AuditLog = model<IAuditLog>('AuditLog', auditLogSchema);