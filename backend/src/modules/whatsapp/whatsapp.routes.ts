import { Router } from 'express';
import { WhatsappController } from './whatsapp.controller';
import { AuthMiddleware } from '../../middleware/auth.middleware';
import { createRateLimiter } from '../../middleware/rate-limit.middleware';

const router = Router();

// Middleware de autenticação
router.use(AuthMiddleware.validateToken);

// Rate limiting para endpoints de WhatsApp
const whatsappLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minuto
  maxRequests: 30, // 30 requisiçõess
});

router.use(whatsappLimiter);

/**
 * POST /instances
 * Criar nova instância WhatsApp
 */
router.post('/', WhatsappController.createInstance);

/**
 * GET /instances
 * Listar instâncias do workspace
 */
router.get('/', WhatsappController.listInstances);

/**
 * GET /instances/:id
 * Obter detalhes de uma instância
 */
router.get('/:id', WhatsappController.getInstance);

/**
 * GET /instances/:id/status
 * Obter status em tempo real
 */
router.get('/:id/status', WhatsappController.getInstanceStatus);

/**
 * GET /instances/:id/qr
 * Obter QR Code em Base64
 */
router.get('/:id/qr', WhatsappController.getQRCode);

/**
 * POST /instances/:id/send
 * Enviar mensagem
 */
router.post('/:id/send', WhatsappController.sendMessage);

/**
 * POST /instances/:id/reconnect
 * Reconectar instância
 */
router.post('/:id/reconnect', WhatsappController.reconnectInstance);

/**
 * DELETE /instances/:id
 * Deletar instância
 */
router.delete('/:id', WhatsappController.deleteInstance);

export default router;
