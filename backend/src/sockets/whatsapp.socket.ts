import { Server as SocketIOServer } from 'socket.io';
import { Server } from 'http';
import { logger } from '../../config/logger';
import { jwtService } from '../../services/jwt.service';
import { baileysEventService } from '../../services/baileys';

/**
 * Configuração do Socket.IO
 * Comunicação em tempo real para eventos WhatsApp
 */

export const setupSocket = (httpServer: Server) => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Middleware de autenticação
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Token não fornecido'));
      }

      const payload = jwtService.verifyAccessToken(token);
      socket.data.userId = payload.userId;
      socket.data.workspaceId = payload.workspaceId;
      socket.data.role = payload.role;

      next();
    } catch (error) {
      next(new Error('Autenticação falhou'));
    }
  });

  // Conexão
  io.on('connection', (socket) => {
    logger.info('Cliente Socket.IO conectado', {
      socketId: socket.id,
      userId: socket.data.userId,
    });

    // Entrar em sala do workspace
    socket.join(`workspace:${socket.data.workspaceId}`);

    // ===== EVENT HANDLERS =====

    /**
     * QR Code gerado
     */
    baileysEventService.on('qrcode', ({ instanceId, qrCode }) => {
      io.to(`workspace:${socket.data.workspaceId}`).emit('instance:qrcode', {
        instanceId,
        qrCode,
        timestamp: new Date(),
      });
    });

    /**
     * Instância conectada
     */
    baileysEventService.on('instance.connected', ({ instanceId, timestamp }) => {
      io.to(`workspace:${socket.data.workspaceId}`).emit('instance:connected', {
        instanceId,
        status: 'connected',
        timestamp,
      });
    });

    /**
     * Instância desconectada
     */
    baileysEventService.on('instance.disconnected', ({ instanceId, reason, timestamp }) => {
      io.to(`workspace:${socket.data.workspaceId}`).emit('instance:disconnected', {
        instanceId,
        status: 'disconnected',
        reason,
        timestamp,
      });
    });

    /**
     * Mensagem recebida
     */
    baileysEventService.on('message.received', ({ instanceId, message }) => {
      io.to(`workspace:${socket.data.workspaceId}`).emit('message:received', {
        instanceId,
        message,
        timestamp: new Date(),
      });
    });

    /**
     * Erro
     */
    baileysEventService.on('error', ({ instanceId, error, timestamp }) => {
      io.to(`workspace:${socket.data.workspaceId}`).emit('instance:error', {
        instanceId,
        error,
        timestamp,
      });
    });

    // Desconexão
    socket.on('disconnect', () => {
      logger.info('Cliente Socket.IO desconectado', { socketId: socket.id });
    });
  });

  return io;
};
