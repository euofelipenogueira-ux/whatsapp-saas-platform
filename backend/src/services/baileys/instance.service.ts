import { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import P from 'pino';
import makeWASocket, { AnyMessageContent, proto, delay } from '@whiskeysockets/baileys';
import { logger } from '../../config/logger';
import { WhatsappInstance, Message, Contact, Conversation } from '../../models';
import { baileysSessionService } from './session.service';
import { EventEmitter } from 'events';
import { baileysEventService } from './event.service';

/**
 * Gerenciador de Instâncias Baileys
 * Controla múltiplas conexões WhatsApp simultâneas
 */

export interface IInstanceManager {
  start(): Promise<void>;
  stop(): Promise<void>;
  sendMessage(to: string, message: string): Promise<void>;
  getStatus(): 'connected' | 'disconnected' | 'scanning';
}

const instances = new Map<string, any>();
const reconnectTimers = new Map<string, NodeJS.Timeout>();

export class BaileysInstanceManager {
  /**
   * Criar e conectar nova instância
   */
  static async createInstance(workspaceId: string, phoneNumber: string, displayName: string): Promise<any> {
    try {
      // Salvar instância no banco
      const instance = await WhatsappInstance.create({
        workspaceId,
        phoneNumber,
        displayName,
        status: 'disconnected',
      });

      logger.info('Instância WhatsApp criada', {
        instanceId: instance._id,
        phoneNumber,
      });

      return {
        success: true,
        data: {
          id: instance._id,
          phoneNumber: instance.phoneNumber,
          displayName: instance.displayName,
          status: instance.status,
        },
      };
    } catch (error) {
      logger.error('Erro ao criar instância WhatsApp', { error, phoneNumber });
      throw error;
    }
  }

  /**
   * Conectar instância e obter QR Code
   */
  static async connect(instanceId: string): Promise<void> {
    try {
      const instance = await WhatsappInstance.findById(instanceId);
      if (!instance) {
        throw new Error('Instância não encontrada');
      }

      // Se já está conectada, retornar
      if (instances.has(instanceId.toString())) {
        logger.warn('Instância já está conectada', { instanceId });
        return;
      }

      // Tentar restaurar sessão salva
      const sessionRestored = await baileysSessionService.restoreSessionFromDatabase(instanceId.toString());

      // Carregar/criar estado de autenticação
      const { state, saveCreds } = await baileysSessionService.loadSession(instanceId.toString());

      // Criar socket Baileys com logger silencioso
      const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: P({ level: 'silent' }),
        browser: ['WhatsApp SaaS', 'Chrome', '120.0'],
        generateHighQualityLinkPreview: true,
        syncFullHistory: false,
        markOnlineOnConnect: true,
        emitOwnEvents: true,
      });

      // Armazenar instância em memória
      instances.set(instanceId.toString(), sock);

      // ===== EVENT HANDLERS =====

      /**
       * QR Code gerado
       */
      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          // Converter QR para Base64
          const qrBase64 = qr;

          // Salvar QR no banco
          await WhatsappInstance.updateOne(
            { _id: instanceId },
            {
              qrCode: qrBase64,
              status: 'scanning',
            }
          );

          logger.info('QR Code gerado', { instanceId });

          // Emitir via Socket.IO
          baileysEventService.emitQRCode(instanceId.toString(), qrBase64);
        }

        if (connection === 'open') {
          // Conectado com sucesso
          await WhatsappInstance.updateOne(
            { _id: instanceId },
            {
              status: 'connected',
              isOnline: true,
              qrCode: null,
              errorMessage: null,
              lastStatusCheck: new Date(),
            }
          );

          logger.info('Instância WhatsApp conectada', { instanceId });
          baileysEventService.emitInstanceConnected(instanceId.toString());

          // Limpar QR Code local após conexão bem-sucedida
          await baileysSessionService.saveSessionToDatabase(instanceId.toString());
        }

        if (connection === 'close') {
          // Desconectado
          const shouldReconnect =
            lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut &&
            lastDisconnect?.error?.output?.statusCode !== DisconnectReason.userInitiatedLogout;

          const disconnectReason = lastDisconnect?.error?.output?.statusCode || 'unknown';

          logger.warn('Instância WhatsApp desconectada', {
            instanceId,
            disconnectReason,
            shouldReconnect,
          });

          await WhatsappInstance.updateOne(
            { _id: instanceId },
            {
              status: 'disconnected',
              isOnline: false,
              errorMessage: `Desconectado: ${disconnectReason}`,
            }
          );

          baileysEventService.emitInstanceDisconnected(instanceId.toString(), disconnectReason);

          // Remover da memória
          instances.delete(instanceId.toString());

          // Reconectar automaticamente se não foi logout intencional
          if (shouldReconnect) {
            BaileysInstanceManager.scheduleReconnect(instanceId.toString());
          } else {
            // Logout intencional - limpar sessão
            await baileysSessionService.clearSession(instanceId.toString());
          }
        }
      });

      /**
       * Credenciais atualizadas
       */
      sock.ev.on('creds.update', saveCreds);

      /**
       * Mensagem recebida
       */
      sock.ev.on('messages.upsert', async (m: any) => {
        const msg = m.messages[0];

        if (!msg.key.fromMe && msg.message) {
          try {
            await BaileysInstanceManager.handleIncomingMessage(instanceId.toString(), msg, sock);
          } catch (error) {
            logger.error('Erro ao processar mensagem recebida', { error, instanceId });
          }
        }
      });

      /**
       * Status de mensagem atualizado
       */
      sock.ev.on('message.update', async (updates: any) => {
        for (const { key, update } of updates) {
          try {
            await Message.updateOne(
              { messageId: key.id, instanceId },
              {
                status: BaileysInstanceManager.mapAckToStatus(update.status),
                ack: update.status,
              }
            );
          } catch (error) {
            logger.error('Erro ao atualizar status de mensagem', { error, instanceId });
          }
        }
      });

      /**
       * Contatos carregados
       */
      sock.ev.on('contacts.upsert', async (contacts: any) => {
        try {
          for (const contact of contacts) {
            await Contact.updateOne(
              { instanceId, phoneNumber: contact.id },
              {
                workspaceId: instance.workspaceId,
                instanceId,
                phoneNumber: contact.id,
                displayName: contact.name || null,
                isGroup: contact.id.endsWith('@g.us'),
              },
              { upsert: true }
            );
          }
        } catch (error) {
          logger.error('Erro ao atualizar contatos', { error, instanceId });
        }
      });

      /**
       * Conversa atualizada
       */
      sock.ev.on('chats.upsert', async (chats: any) => {
        try {
          for (const chat of chats) {
            await Conversation.updateOne(
              { instanceId, participantJid: chat.id },
              {
                workspaceId: instance.workspaceId,
                instanceId,
                participantJid: chat.id,
                participantName: chat.name || null,
                isGroup: chat.id.endsWith('@g.us'),
                messageCount: chat.count || 0,
                unreadCount: chat.unreadCount || 0,
              },
              { upsert: true }
            );
          }
        } catch (error) {
          logger.error('Erro ao atualizar conversas', { error, instanceId });
        }
      });

      logger.info('Instância Baileys inicializada e aguardando QR Code', { instanceId });
    } catch (error) {
      logger.error('Erro ao conectar instância Baileys', { error, instanceId });

      await WhatsappInstance.updateOne(
        { _id: instanceId },
        {
          status: 'error',
          errorMessage: error instanceof Error ? error.message : 'Erro desconhecido',
        }
      );

      throw error;
    }
  }

  /**
   * Desconectar instância
   */
  static async disconnect(instanceId: string): Promise<void> {
    try {
      const sock = instances.get(instanceId);

      if (!sock) {
        logger.warn('Instância não encontrada em memória', { instanceId });
        return;
      }

      // Enviar logout
      await sock.logout();

      logger.info('Instância desconectada', { instanceId });
    } catch (error) {
      logger.error('Erro ao desconectar instância', { error, instanceId });
    }
  }

  /**
   * Reconectar instância
   */
  static async reconnect(instanceId: string): Promise<void> {
    try {
      // Desconectar se ainda está conectada
      const sock = instances.get(instanceId);
      if (sock) {
        sock.end(new Error('Reconnecting...'));
        instances.delete(instanceId);
      }

      // Limpar timer de reconexão se existir
      const timer = reconnectTimers.get(instanceId);
      if (timer) {
        clearTimeout(timer);
        reconnectTimers.delete(instanceId);
      }

      // Conectar novamente
      await BaileysInstanceManager.connect(instanceId);

      logger.info('Instância reconectada', { instanceId });
    } catch (error) {
      logger.error('Erro ao reconectar instância', { error, instanceId });
      BaileysInstanceManager.scheduleReconnect(instanceId);
    }
  }

  /**
   * Agendar reconexão com backoff exponencial
   */
  static scheduleReconnect(instanceId: string, attempt: number = 1): void {
    const maxAttempts = 10;
    const baseDelay = 5000; // 5 segundos
    const maxDelay = 300000; // 5 minutos

    if (attempt > maxAttempts) {
      logger.error('Máximo de tentativas de reconexão atingido', { instanceId });
      return;
    }

    const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);

    logger.info(`Agendando reconexão em ${delay}ms (tentativa ${attempt}/${maxAttempts})`, {
      instanceId,
    });

    const timer = setTimeout(() => {
      reconnectTimers.delete(instanceId);
      BaileysInstanceManager.reconnect(instanceId).catch((error) => {
        logger.error('Erro na reconexão agendada', { error, instanceId });
        BaileysInstanceManager.scheduleReconnect(instanceId, attempt + 1);
      });
    }, delay);

    reconnectTimers.set(instanceId, timer);
  }

  /**
   * Enviar mensagem
   */
  static async sendMessage(
    instanceId: string,
    to: string,
    message: string,
    mediaUrl?: string
  ): Promise<proto.WebMessageInfo> {
    try {
      const sock = instances.get(instanceId);

      if (!sock) {
        throw new Error('Instância não conectada');
      }

      let messageContent: AnyMessageContent;

      if (mediaUrl) {
        // Enviar com mídia
        const response = await fetch(mediaUrl);
        const buffer = await response.arrayBuffer();

        messageContent = {
          image: Buffer.from(buffer),
          caption: message,
        };
      } else {
        // Enviar texto simples
        messageContent = {
          text: message,
        };
      }

      const result = await sock.sendMessage(to, messageContent);

      // Salvar mensagem no banco
      await Message.create({
        workspaceId: (await WhatsappInstance.findById(instanceId))?.workspaceId,
        instanceId,
        messageId: result.key.id,
        from: result.key.participant || sock.user?.id,
        to,
        body: message,
        type: mediaUrl ? 'image' : 'text',
        direction: 'outgoing',
        status: 'sent',
        timestamp: new Date(),
        ack: 1,
      });

      logger.info('Mensagem enviada', { instanceId, to, messageId: result.key.id });

      return result;
    } catch (error) {
      logger.error('Erro ao enviar mensagem', { error, instanceId, to });
      throw error;
    }
  }

  /**
   * Processar mensagem recebida
   */
  private static async handleIncomingMessage(instanceId: string, msg: proto.IWebMessageInfo, sock: any) {
    try {
      const instance = await WhatsappInstance.findById(instanceId);
      if (!instance) return;

      const from = msg.key.remoteJid || '';
      const messageId = msg.key.id || '';
      let body = '';
      let type = 'text';
      let mediaUrl: string | undefined;

      // Extrair conteúdo da mensagem
      if (msg.message?.conversation) {
        body = msg.message.conversation;
      } else if (msg.message?.extendedTextMessage?.text) {
        body = msg.message.extendedTextMessage.text;
      } else if (msg.message?.imageMessage) {
        type = 'image';
        body = msg.message.imageMessage.caption || '';
        mediaUrl = await BaileysInstanceManager.downloadMedia(sock, msg);
      } else if (msg.message?.videoMessage) {
        type = 'video';
        body = msg.message.videoMessage.caption || '';
        mediaUrl = await BaileysInstanceManager.downloadMedia(sock, msg);
      } else if (msg.message?.audioMessage) {
        type = 'audio';
        mediaUrl = await BaileysInstanceManager.downloadMedia(sock, msg);
      } else if (msg.message?.documentMessage) {
        type = 'document';
        body = msg.message.documentMessage.fileName || '';
        mediaUrl = await BaileysInstanceManager.downloadMedia(sock, msg);
      }

      // Salvar mensagem no banco
      const savedMessage = await Message.create({
        workspaceId: instance.workspaceId,
        instanceId,
        messageId,
        from,
        to: sock.user?.id,
        body,
        type,
        mediaUrl,
        direction: 'incoming',
        status: 'delivered',
        timestamp: new Date(msg.messageTimestamp! * 1000),
      });

      // Atualizar contato
      await Contact.updateOne(
        { instanceId, phoneNumber: from },
        {
          $inc: { messageCount: 1, unreadMessageCount: 1 },
          lastInteraction: new Date(),
        },
        { upsert: true }
      );

      // Atualizar conversa
      await Conversation.updateOne(
        { instanceId, participantJid: from },
        {
          workspaceId: instance.workspaceId,
          lastMessage: {
            id: messageId,
            body: body.substring(0, 500),
            direction: 'incoming',
            timestamp: new Date(),
            type,
          },
          $inc: { messageCount: 1, unreadCount: 1 },
        },
        { upsert: true }
      );

      // Emitir via Socket.IO
      baileysEventService.emitMessageReceived(instanceId, savedMessage);

      logger.info('Mensagem recebida e salva', {
        instanceId,
        from,
        messageId,
        type,
      });
    } catch (error) {
      logger.error('Erro ao processar mensagem recebida', { error, instanceId });
    }
  }

  /**
   * Download de mídia
   */
  private static async downloadMedia(sock: any, msg: proto.IWebMessageInfo): Promise<string | undefined> {
    try {
      // Implementar download real se necessário
      // Por enquanto, retornar undefined
      return undefined;
    } catch (error) {
      logger.error('Erro ao fazer download de mídia', { error });
      return undefined;
    }
  }

  /**
   * Mapear ACK para status
   */
  private static mapAckToStatus(ack?: number): string {
    switch (ack) {
      case 1:
        return 'sent';
      case 2:
        return 'delivered';
      case 3:
        return 'read';
      case 4:
        return 'read';
      default:
        return 'pending';
    }
  }

  /**
   * Obter status da instância
   */
  static getStatus(instanceId: string): 'connected' | 'disconnected' | 'connecting' {
    return instances.has(instanceId) ? 'connected' : 'disconnected';
  }

  /**
   * Listar todas as instâncias conectadas
   */
  static getConnectedInstances(): string[] {
    return Array.from(instances.keys());
  }
}

export const baileysInstanceManager = BaileysInstanceManager;
