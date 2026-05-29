import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { AppError } from '../../middleware/error.middleware';
import { logger } from '../../config/logger';

/**
 * Controller de Autenticação
 * Gerencia requisições HTTP de autenticação
 */

export class AuthController {
  /**
   * POST /auth/register
   */
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, name, password, workspaceName } = req.body;

      // Validação básica
      if (!email || !name || !password || !workspaceName) {
        throw new AppError(400, 'missing_fields', 'Email, nome, senha e workspace são obrigatórios');
      }

      const result = await authService.register({
        email,
        name,
        password,
        workspaceName,
      });

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/login
   */
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new AppError(400, 'missing_fields', 'Email e senha são obrigatórios');
      }

      const ip = req.ip || 'unknown';
      const result = await authService.login({ email, password }, ip);

      // Definir refresh token como HTTP-only cookie
      res.cookie('refreshToken', result.data.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/refresh-token
   */
  static async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.body.refreshToken || req.cookies.refreshToken;

      if (!refreshToken) {
        throw new AppError(400, 'missing_refresh_token', 'Refresh token é obrigatório');
      }

      const result = await authService.refreshToken({ refreshToken });

      // Atualizar refresh token no cookie
      res.cookie('refreshToken', result.data.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/verify-email
   */
  static async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.body;

      if (!token) {
        throw new AppError(400, 'missing_token', 'Token é obrigatório');
      }

      const result = await authService.verifyEmail(token);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/forgot-password
   */
  static async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;

      if (!email) {
        throw new AppError(400, 'missing_email', 'Email é obrigatório');
      }

      const result = await authService.forgotPassword({ email });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/reset-password
   */
  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        throw new AppError(400, 'missing_fields', 'Token e senha são obrigatórios');
      }

      const result = await authService.resetPassword({ token, password });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/change-password
   */
  static async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { oldPassword, newPassword } = req.body;
      const userId = (req as any).userId;

      if (!userId) {
        throw new AppError(401, 'unauthorized', 'Usuário não autenticado');
      }

      if (!oldPassword || !newPassword) {
        throw new AppError(400, 'missing_fields', 'Senhas antigas e novas são obrigatórias');
      }

      const result = await authService.changePassword(userId, oldPassword, newPassword);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /auth/me
   */
  static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;

      if (!userId) {
        throw new AppError(401, 'unauthorized', 'Usuário não autenticado');
      }

      const result = await authService.getUserProfile(userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/logout
   */
  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      // Limpar refresh token cookie
      res.clearCookie('refreshToken');

      logger.info('Logout realizado', { userId: (req as any).userId });

      res.status(200).json({
        success: true,
        message: 'Logout realizado com sucesso',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/verify-token
   */
  static async verifyToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.body;

      if (!token) {
        throw new AppError(400, 'missing_token', 'Token é obrigatório');
      }

      const result = authService.verifyTokenPayload(token);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
