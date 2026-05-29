import { Schema, model, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * User Interface
 * Representa um usuário do sistema
 * Multi-tenant: cada usuário pertence a workspaces
 */
export interface IUser extends Document {
  _id: string;
  workspaceId: string;
  email: string;
  name: string;
  passwordHash: string;
  role: 'owner' | 'admin' | 'manager' | 'user' | 'viewer';
  permissions: string[];
  avatar?: string;
  phone?: string;
  department?: string;
  isActive: boolean;
  emailVerified: boolean;
  verificationToken?: string;
  verificationTokenExpiry?: Date;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  passwordResetToken?: string;
  passwordResetExpiry?: Date;
  lastLogin?: Date;
  lastLoginIp?: string;
  loginAttempts: number;
  isLocked: boolean;
  lockedUntil?: Date;
  metadata?: {
    language?: string;
    timezone?: string;
    theme?: 'light' | 'dark';
    notifications?: {
      email: boolean;
      slack: boolean;
      inApp: boolean;
    };
  };
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  comparePassword(password: string): Promise<boolean>;
  hashPassword(password: string): Promise<void>;
  generateVerificationToken(): string;
  generatePasswordResetToken(): string;
  hasPermission(permission: string): boolean;
}

const userSchema = new Schema<IUser>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'manager', 'user', 'viewer'],
      default: 'user',
      index: true,
    },
    permissions: {
      type: [String],
      default: [],
    },
    avatar: {
      type: String,
      default: null,
    },
    phone: {
      type: String,
      default: null,
    },
    department: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
      default: null,
      select: false,
    },
    verificationTokenExpiry: {
      type: Date,
      default: null,
      select: false,
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
      default: null,
      select: false,
    },
    passwordResetToken: {
      type: String,
      default: null,
      select: false,
    },
    passwordResetExpiry: {
      type: Date,
      default: null,
      select: false,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    lastLoginIp: {
      type: String,
      default: null,
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    lockedUntil: {
      type: Date,
      default: null,
    },
    metadata: {
      language: {
        type: String,
        default: 'pt-BR',
      },
      timezone: {
        type: String,
        default: 'America/Sao_Paulo',
      },
      theme: {
        type: String,
        enum: ['light', 'dark'],
        default: 'light',
      },
      notifications: {
        email: { type: Boolean, default: true },
        slack: { type: Boolean, default: false },
        inApp: { type: Boolean, default: true },
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
    collection: 'users',
  }
);

// Índices compostos para performance
userSchema.index({ workspaceId: 1, email: 1 }, { unique: true, sparse: true });
userSchema.index({ workspaceId: 1, isActive: 1 });
userSchema.index({ workspaceId: 1, role: 1 });
userSchema.index({ workspaceId: 1, deletedAt: 1 });
userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ createdAt: -1 });

// Virtual para dados de usuário sem deletedAt
userSchema.query.active = function () {
  return this.where({ deletedAt: { $eq: null } });
};

// Methods
userSchema.methods.comparePassword = async function (
  password: string
): Promise<boolean> {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.methods.hashPassword = async function (
  password: string
): Promise<void> {
  const salt = await bcrypt.genSalt(12);
  this.passwordHash = await bcrypt.hash(password, salt);
};

userSchema.methods.generateVerificationToken = function (): string {
  const token = Math.random().toString(36).substring(2, 15);
  this.verificationToken = token;
  this.verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return token;
};

userSchema.methods.generatePasswordResetToken = function (): string {
  const token = Math.random().toString(36).substring(2, 15);
  this.passwordResetToken = token;
  this.passwordResetExpiry = new Date(Date.now() + 1 * 60 * 60 * 1000);
  return token;
};

userSchema.methods.hasPermission = function (permission: string): boolean {
  return this.permissions.includes(permission);
};

// Pre-save hook para hash de password
userSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  try {
    if (!this.passwordHash.startsWith('$2')) {
      await this.hashPassword(this.passwordHash);
    }
    next();
  } catch (error) {
    next(error as Error);
  }
});

export const User = model<IUser>('User', userSchema);