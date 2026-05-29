import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { AuthPayload, TokenResponse } from '../types/express';
import { logger } from '../config/logger';

/**
 * Serviço de JWT
 * Gerencia criação, validação e refresh de tokens
 */

export class JwtService {
  private accessTokenSecret: string;
  private refreshTokenSecret: string;
  private accessTokenExpiry: string;
  private refreshTokenExpiry: string;

  constructor() {
    this.accessTokenSecret = process.env.JWT_SECRET || 'your-secret-key';
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';
    this.accessTokenExpiry = process.env.JWT_EXPIRY || '15m';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';

    if (!this.accessTokenSecret || !this.refreshTokenSecret) {
      throw new Error('JWT secrets não estão configurados');
    }
  }

  /**
   * Gerar tokens (Access + Refresh)
   */
  generateTokens(payload: AuthPayload): TokenResponse {
    try {
      const accessToken = jwt.sign(payload, this.accessTokenSecret, {
        expiresIn: this.accessTokenExpiry,
        algorithm: 'HS256',
        issuer: 'whatsapp-saas',
        audience: 'whatsapp-saas-client',
      });

      const refreshToken = jwt.sign(
        { userId: payload.userId, email: payload.email, type: 'refresh' },
        this.refreshTokenSecret,
        {
          expiresIn: this.refreshTokenExpiry,
          algorithm: 'HS256',
          issuer: 'whatsapp-saas',
        }
      );

      // Decodificar para obter tempo de expiração
      const decoded = jwt.decode(accessToken) as any;
      const expiresIn = decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 900;

      return {
        accessToken,
        refreshToken,
        expiresIn,
        type: 'Bearer',
      };
    } catch (error) {
      logger.error('Erro ao gerar tokens', { error });
      throw new Error('Falha ao gerar tokens');
    }
  }

  /**
   * Validar e decodificar Access Token
   */
  verifyAccessToken(token: string): AuthPayload {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret, {
        algorithms: ['HS256'],
        issuer: 'whatsapp-saas',
        audience: 'whatsapp-saas-client',
      }) as AuthPayload;

      return decoded;
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expirado');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Token inválido');
      }
      throw error;
    }
  }

  /**
   * Validar e decodificar Refresh Token
   */
  verifyRefreshToken(token: string): { userId: string; email: string } {
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret, {
        algorithms: ['HS256'],
        issuer: 'whatsapp-saas',
      }) as any;

      if (decoded.type !== 'refresh') {
        throw new Error('Token type inválido');
      }

      return {
        userId: decoded.userId,
        email: decoded.email,
      };
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Refresh token expirado');
      }
      throw new Error('Refresh token inválido');
    }
  }

  /**
   * Decodificar token sem validação (para extrair payload)
   */
  decodeToken(token: string): AuthPayload | null {
    try {
      return jwt.decode(token) as AuthPayload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Gerar token de verificação de email
   */
  generateEmailVerificationToken(userId: string, email: string): string {
    const token = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');

    // Armazenar hash no banco (não o token)
    // Retornar token para o usuário
    return token;
  }

  /**
   * Gerar token de reset de senha
   */
  generatePasswordResetToken(userId: string): string {
    const token = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');

    // Armazenar hash no banco (não o token)
    // Retornar token para o usuário
    return token;
  }

  /**
   * Hash um token
   */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Verificar se token está expirado
   */
  isTokenExpired(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded?.exp) return true;

      const now = Math.floor(Date.now() / 1000);
      return decoded.exp < now;
    } catch (error) {
      return true;
    }
  }

  /**
   * Extrair tempo até expiração em segundos
   */
  getTimeUntilExpiration(token: string): number {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded?.exp) return 0;

      const now = Math.floor(Date.now() / 1000);
      return Math.max(0, decoded.exp - now);
    } catch (error) {
      return 0;
    }
  }
}

export const jwtService = new JwtService();
