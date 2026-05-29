import { EventEmitter } from 'events';
import { logger } from '../../config/logger';

/**
 * Serviço de Eventos Baileys
 * Coordena eventos entre múltiplas instâncias
 * Integra com Socket.IO para comunicação em tempo real
 */

export class BaileysEventService extends EventEmitter {
  /**
   * Emitir QR Code gerado
   */
  emitQRCode(instanceId: string, qrCode: string): void {
    this.emit('qrcode', { instanceId, qrCode });
    logger.info('Evento QR Code emitido', { instanceId });
  }

  /**
   * Emitir instância conectada
   */
  emitInstanceConnected(instanceId: string): void {
    this.emit('instance.connected', { instanceId, timestamp: new Date() });
    logger.info('Evento instância conectada emitido', { instanceId });
  }

  /**
   * Emitir instância desconectada
   */
  emitInstanceDisconnected(instanceId: string, reason: string): void {
    this.emit('instance.disconnected', { instanceId, reason, timestamp: new Date() });
    logger.info('Evento instância desconectada emitido', { instanceId, reason });
  }

  /**
   * Emitir mensagem recebida
   */
  emitMessageReceived(instanceId: string, message: any): void {
    this.emit('message.received', { instanceId, message });
    logger.info('Evento mensagem recebida emitido', { instanceId, messageId: message._id });
  }

  /**
   * Emitir erro
   */
  emitError(instanceId: string, error: string): void {
    this.emit('error', { instanceId, error, timestamp: new Date() });
    logger.error('Evento erro emitido', { instanceId, error });
  }
}

export const baileysEventService = new BaileysEventService();
