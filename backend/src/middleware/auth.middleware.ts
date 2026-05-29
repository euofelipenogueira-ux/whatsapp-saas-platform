import { Request, Response, NextFunction } from 'express';
import { jwtService } from '../services/jwt.service';
import { logger } from '../config/logger';

/**
 * Middleware de Autenticação
 * Valida JWT e extrai dados do usuário
 */

export class AuthMiddleware {
  /**
   * Validar Token JWT
   */
  static validateToken = (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        return res.status(401).json({
          success: false,
          error: 'Token não fornecido',
          message: 'Header Authorization é obrigatório',
        });
      }

      // Extrair token do header "Bearer <token>"
      const [scheme, token] = authHeader.split(' ');

      if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({
          success: false,
          error: 'Formato de token inválido',
          message: 'Use o formato: Authorization: Bearer <token>',
        });
      }

      // Validar token
      const payload = jwtService.verifyAccessToken(token);

      // Adicionar dados ao request
      req.user = {
        _id: payload.userId,
        email: payload.email,
        role: payload.role,
        permissions: payload.permissions,
      } as any;
      req.userId = payload.userId;
      req.email = payload.email;
      req.role = payload.role;
      req.permissions = payload.permissions;
      req.workspaceId = payload.workspaceId;

      next();
    } catch (error: any) {
      logger.warn('Erro ao validar token', {
        error: error.message,
        ip: req.ip,
      });

      if (error.message === 'Token expirado') {
        return res.status(401).json({
          success: false,
          error: 'token_expired',
          message: 'Token expirado. Use o refresh token para obter um novo.',
        });
      }

      return res.status(401).json({
        success: false,
        error: 'invalid_token',
        message: 'Token inválido ou malformado',
      });
    }
  };

  /**
   * Validar Workspace Access
   */
  static validateWorkspace = (req: Request, res: Response, next: NextFunction) => {
    const workspaceId = req.params.workspaceId || req.query.workspaceId;

    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        error: 'workspace_id_required',
        message: 'WorkspaceId é obrigatório',
      });
    }

    // Verificar se usuário tem acesso a este workspace
    if (req.workspaceId !== workspaceId && req.role !== 'SUPER_ADMIN') {
      logger.warn('Acesso negado a workspace', {
        userId: req.userId,
        requestedWorkspace: workspaceId,
        userWorkspace: req.workspaceId,
      });

      return res.status(403).json({
        success: false,
        error: 'forbidden',
        message: 'Você não tem acesso a este workspace',
      });
    }

    next();
  };

  /**
   * Validar Role
   */
  static validateRole = (allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.role || !allowedRoles.includes(req.role)) {
        return res.status(403).json({
          success: false,
          error: 'insufficient_role',
          message: `Apenas ${allowedRoles.join(', ')} têm acesso`,
          required_roles: allowedRoles,
          current_role: req.role,
        });
      }

      next();
    };
  };

  /**
   * Validar Permissão
   */
  static validatePermission = (requiredPermission: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.permissions) {
        return res.status(403).json({
          success: false,
          error: 'no_permissions',
          message: 'Usuário não tem permissões definidas',
        });
      }

      // Suportar wildcards
      const hasPermission =
        req.permissions.includes(requiredPermission) ||
        req.permissions.includes(requiredPermission.split(':')[0] + ':*') ||
        req.permissions.includes('*');

      if (!hasPermission) {
        logger.warn('Acesso negado por permissão', {
          userId: req.userId,
          required: requiredPermission,
          available: req.permissions,
        });

        return res.status(403).json({
          success: false,
          error: 'insufficient_permission',
          message: `Permissão "${requiredPermission}" não concedida`,
          required: requiredPermission,
        });
      }

      next();
    };
  };
}

/**
 * Middleware de autenticação (sem validação obrigatória)
 * Para rotas que suportam usuário autenticado mas não exigem
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const [scheme, token] = authHeader.split(' ');

      if (scheme === 'Bearer' && token) {
        const payload = jwtService.verifyAccessToken(token);
        req.userId = payload.userId;
        req.workspaceId = payload.workspaceId;
        req.role = payload.role;
        req.permissions = payload.permissions;
      }
    }

    next();
  } catch (error) {
    // Ignorar erro e continuar sem autenticação
    next();
  }
};
