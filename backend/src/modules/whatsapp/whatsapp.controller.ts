import { Request, Response, NextFunction } from 'express';
import { BaileysInstanceManager } from '../../services/baileys';
import { WhatsappInstance } from '../../models';
import { AppError } from '../../middleware/error.middleware';
import { logger } from '../../config/logger';
const QRCode = require('qrcode');

/**
 * Controller de Instâncias WhatsApp
 * Gerencia criação, conexão e desconexão de instâncias
 */

export class WhatsappController {
  /**
   * POST /instances
   * Criar nova instância WhatsApp
   */
  static async createInstance(req: Request, res: Response, next: NextFunction) {
    try {
      const { phoneNumber, displayName } = req.body;
      const workspaceId = (req as any).workspaceId;

      if (!phoneNumber || !displayName) {
        throw new AppError(
          400,
          'missing_fields',
          'phoneNumber e displayName são obrigatórios'
        );
      }

      // Validar formato de número de telefone
      if (!/^\d{10,15}$/.test(phoneNumber)) {
        throw new AppError(
          400,
          'invalid_phone',
          'Número de telefone inválido. Use apenas dígitos (10-15 caracteres)'
        );
      }

      // Verificar limite de instâncias
      const workspace = await require('../../models').Workspace.findById(workspaceId);
      const instanceCount = await WhatsappInstance.countDocuments({
        workspaceId,
        deletedAt: null,
      });

      if (instanceCount >= workspace.maxInstances) {
        throw new AppError(
          403,
          'instance_limit_exceeded',
          `Limite de ${workspace.maxInstances} instância(s) atingido`
        );
      }

      const result = await BaileysInstanceManager.createInstance(
        workspaceId,
        phoneNumber,
        displayName
      );

      // Iniciar conexão
      const instanceId = result.data.id.toString();
      await BaileysInstanceManager.connect(instanceId);

      res.status(201).json({
        success: true,
        message: 'Instância criada. Aguardando QR Code...',
        data: result.data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /instances
   * Listar todas as instâncias do workspace
   */
  static async listInstances(req: Request, res: Response, next: NextFunction) {
    try {
      const workspaceId = (req as any).workspaceId;

      const instances = await WhatsappInstance.find({
        workspaceId,
        deletedAt: null,
      }).select('-sessionData -qrCode');

      res.status(200).json({
        success: true,
        data: instances.map((instance) => ({
          id: instance._id,
          phoneNumber: instance.phoneNumber,
          displayName: instance.displayName,
          status: instance.status,
          isOnline: instance.isOnline,
          batteryLevel: instance.batteryLevel,
          statistics: instance.statistics,
          createdAt: instance.createdAt,
          lastStatusCheck: instance.lastStatusCheck,
        })),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /instances/:id
   * Obter detalhes de uma instância
   */
  static async getInstance(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const workspaceId = (req as any).workspaceId;

      const instance = await WhatsappInstance.findOne({
        _id: id,
        workspaceId,
        deletedAt: null,
      }).select('-sessionData -qrCode');

      if (!instance) {
        throw new AppError(404, 'not_found', 'Instância não encontrada');
      }

      res.status(200).json({
        success: true,
        data: {
          id: instance._id,
          phoneNumber: instance.phoneNumber,
          displayName: instance.displayName,
          status: instance.status,
          isOnline: instance.isOnline,
          batteryLevel: instance.batteryLevel,
          isPaired: instance.isPaired,
          statistics: instance.statistics,
          metadata: instance.metadata,
          createdAt: instance.createdAt,
          lastStatusCheck: instance.lastStatusCheck,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /instances/:id/qr
   * Obter QR Code em Base64
   */
  static async getQRCode(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const workspaceId = (req as any).workspaceId;

      const instance = await WhatsappInstance.findOne({
        _id: id,
        workspaceId,
        deletedAt: null,
      }).select('qrCode status');

      if (!instance) {
        throw new AppError(404, 'not_found', 'Instância não encontrada');
      }

      if (!instance.qrCode) {
        // Se não houver QR Code armazenado, verificar status
        if (instance.status === 'connected') {
          throw new AppError(
            400,
            'already_connected',
            'Instância já está conectada'
          );
        } else if (instance.status === 'scanning') {
          throw new AppError(
            400,
            'qr_not_ready',
            'QR Code ainda não foi gerado. Tente novamente em alguns segundos.'
          );
        } else {
          throw new AppError(400, 'no_qr_code', 'QR Code não disponível');
        }
      }

      res.status(200).json({
        success: true,
        data: {
          qrCode: instance.qrCode,
          status: instance.status,
          generatedAt: instance.lastQrCodeRefresh,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /instances/:id/reconnect
   * Reconectar instância
   */
  static async reconnectInstance(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const workspaceId = (req as any).workspaceId;

      const instance = await WhatsappInstance.findOne({
        _id: id,
        workspaceId,
        deletedAt: null,
      });

      if (!instance) {
        throw new AppError(404, 'not_found', 'Instância não encontrada');
      }

      // Desconectar se estiver conectada
      if (instance.status === 'connected') {
        await BaileysInstanceManager.disconnect(id);
      }

      // Reconectar
      await BaileysInstanceManager.reconnect(id);

      res.status(200).json({
        success: true,
        message: 'Reconexão iniciada. Aguarde o QR Code...',
        data: {
          id: instance._id,
          status: 'reconnecting',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /instances/:id
   * Deletar instância
   */
  static async deleteInstance(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const workspaceId = (req as any).workspaceId;

      const instance = await WhatsappInstance.findOne({
        _id: id,
        workspaceId,
        deletedAt: null,
      });

      if (!instance) {
        throw new AppError(404, 'not_found', 'Instância não encontrada');
      }

      // Desconectar
      if (instance.status === 'connected') {
        await BaileysInstanceManager.disconnect(id);
      }

      // Soft delete
      await WhatsappInstance.updateOne(
        { _id: id },
        { deletedAt: new Date() }
      );

      logger.info('Instância WhatsApp deletada', { instanceId: id });

      res.status(200).json({
        success: true,
        message: 'Instância deletada com sucesso',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /instances/:id/send
   * Enviar mensagem
   */
  static async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { to, message, mediaUrl } = req.body;
      const workspaceId = (req as any).workspaceId;

      if (!to || !message) {
        throw new AppError(400, 'missing_fields', 'to e message são obrigatórios');
      }

      const instance = await WhatsappInstance.findOne({
        _id: id,
        workspaceId,
        deletedAt: null,
      });

      if (!instance) {
        throw new AppError(404, 'not_found', 'Instância não encontrada');
      }

      if (instance.status !== 'connected') {
        throw new AppError(
          400,
          'instance_not_connected',
          'Instância não está conectada'
        );
      }

      const result = await BaileysInstanceManager.sendMessage(
        id,
        to,
        message,
        mediaUrl
      );

      res.status(200).json({
        success: true,
        message: 'Mensagem enviada com sucesso',
        data: {
          messageId: result.key.id,
          to,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /instances/:id/status
   * Obter status em tempo real
   */
  static async getInstanceStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const workspaceId = (req as any).workspaceId;

      const instance = await WhatsappInstance.findOne({
        _id: id,
        workspaceId,
        deletedAt: null,
      });

      if (!instance) {
        throw new AppError(404, 'not_found', 'Instância não encontrada');
      }

      const status = BaileysInstanceManager.getStatus(id);

      await WhatsappInstance.updateOne(
        { _id: id },
        { lastStatusCheck: new Date() }
      );

      res.status(200).json({
        success: true,
        data: {
          id: instance._id,
          status,
          isOnline: instance.isOnline,
          batteryLevel: instance.batteryLevel,
          lastStatusCheck: new Date(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
