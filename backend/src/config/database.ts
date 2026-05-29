import mongoose, { Connection } from 'mongoose';
import { logger } from './logger';

let mongoConnection: Connection | null = null;

/**
 * Conectar ao MongoDB Atlas
 * Configuração otimizada para multi-tenancy
 */
export const connectDatabase = async (): Promise<Connection> => {
  if (mongoConnection) {
    return mongoConnection;
  }

  try {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error('MONGODB_URI não está configurada nas variáveis de ambiente');
    }

    await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      minPoolSize: 5,
      maxIdleTimeMS: 60000,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      retryWrites: true,
      w: 'majority',
      journal: true,
      // Usar nova estrutura de URL
      authSource: 'admin',
    });

    mongoConnection = mongoose.connection;

    // Event listeners
    mongoose.connection.on('connected', () => {
      logger.info('MongoDB conectado com sucesso');
    });

    mongoose.connection.on('error', (error) => {
      logger.error('Erro de conexão MongoDB:', error);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB desconectado');
    });

    // Criar índices automaticamente
    await createIndexes();

    return mongoConnection;
  } catch (error) {
    logger.error('Falha ao conectar ao MongoDB:', error);
    throw error;
  }
};

/**
 * Desconectar do MongoDB
 */
export const disconnectDatabase = async (): Promise<void> => {
  if (mongoConnection) {
    await mongoose.disconnect();
    mongoConnection = null;
    logger.info('Desconectado do MongoDB');
  }
};

/**
 * Criar índices de banco de dados
 * Executado automaticamente ao conectar
 */
async function createIndexes(): Promise<void> {
  try {
    // Os índices são criados automaticamente pelos schemas
    // Mas você pode adicionar índices adicionais aqui se necessário
    logger.info('Índices de banco de dados configurados');
  } catch (error) {
    logger.error('Erro ao criar índices:', error);
    throw error;
  }
}

/**
 * Health check do banco de dados
 */
export const healthCheckDatabase = async (): Promise<boolean> => {
  try {
    await mongoose.connection.db?.admin().ping();
    return true;
  } catch (error) {
    logger.error('Database health check falhou:', error);
    return false;
  }
};

/**
 * Obter estatísticas do banco de dados
 */
export const getDatabaseStats = async () => {
  try {
    const stats = await mongoose.connection.db?.stats();
    return stats;
  } catch (error) {
    logger.error('Erro ao obter estatísticas do banco:', error);
    return null;
  }
};