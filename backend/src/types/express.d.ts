import { Request } from 'express';
import { IUser } from '../models';

/**
 * Extensão de tipos do Express
 * Adiciona propriedades customizadas ao objeto Request
 */

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      userId?: string;
      workspaceId?: string;
      email?: string;
      role?: string;
      permissions?: string[];
      requestId?: string;
      ip?: string;
    }
  }
}

export interface AuthPayload {
  userId: string;
  email: string;
  workspaceId: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'AGENT';
  permissions: string[];
  iat?: number;
  exp?: number;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  type: 'Bearer';
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  name: string;
  role: string;
  workspaceId: string;
  permissions: string[];
  lastLogin?: Date;
}
