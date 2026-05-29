import dotenv from 'dotenv';
import { createApp } from './app';
import { connectDatabase } from './config/database';
import { logger } from './config/logger';

/**
 * Entry point da aplicação
 */

dotenv.config();

const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

const start = async () => {
  try {
    // Conectar ao banco de dados
    logger.info('Conectando ao MongoDB...');
    await connectDatabase();
    logger.info('✓ Conectado ao MongoDB');

    // Criar app Express com Socket.IO
    const { app, httpServer } = createApp();

    // Iniciar servidor
    httpServer.listen(PORT, () => {
      logger.info(`✓ Servidor rodando em http://localhost:${PORT}`);
      logger.info(`✓ Ambiente: ${NODE_ENV}`);
      logger.info(`✓ API disponível em http://localhost:${PORT}/api/v1`);
      logger.info(`✓ Socket.IO disponível em ws://localhost:${PORT}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM recebido. Encerrando gracefully...');
      httpServer.close(async () => {
        logger.info('Servidor fechado');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT recebido. Encerrando gracefully...');
      httpServer.close(async () => {
        logger.info('Servidor fechado');
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error('Erro ao iniciar servidor', { error });
    process.exit(1);
  }
};

start();
