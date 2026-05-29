import { Router } from 'express';
import { AuthController } from './auth.controller';
import { AuthMiddleware } from '../../middleware/auth.middleware';
import { createRateLimiter } from '../../middleware/rate-limit.middleware';

const router = Router();

// Rate limiting para endpoints de autenticação
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutos
  maxRequests: 5, // 5 requisições
});

const refreshLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minuto
  maxRequests: 10, // 10 requisições
});

/**
 * POST /auth/register
 * Registrar novo usuário
 */
router.post('/register', authLimiter, AuthController.register);

/**
 * POST /auth/login
 * Fazer login
 */
router.post('/login', authLimiter, AuthController.login);

/**
 * POST /auth/refresh-token
 * Renovar token
 */
router.post('/refresh-token', refreshLimiter, AuthController.refreshToken);

/**
 * POST /auth/verify-email
 * Verificar email com token
 */
router.post('/verify-email', AuthController.verifyEmail);

/**
 * POST /auth/forgot-password
 * Solicitar reset de senha
 */
router.post('/forgot-password', createRateLimiter({ maxRequests: 3 }), AuthController.forgotPassword);

/**
 * POST /auth/reset-password
 * Resetar senha com token
 */
router.post('/reset-password', authLimiter, AuthController.resetPassword);

/**
 * POST /auth/verify-token
 * Verificar token JWT
 */
router.post('/verify-token', AuthController.verifyToken);

// Rotas protegidas
router.use(AuthMiddleware.validateToken);

/**
 * POST /auth/change-password
 * Alterar senha (requer autenticação)
 */
router.post('/change-password', AuthController.changePassword);

/**
 * GET /auth/me
 * Obter perfil do usuário autenticado
 */
router.get('/me', AuthController.getMe);

/**
 * POST /auth/logout
 * Fazer logout
 */
router.post('/logout', AuthController.logout);

export default router;
