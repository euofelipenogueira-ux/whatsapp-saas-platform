import winston from 'winston';
const { combine, timestamp, printf, colorize, errors, json } = winston.format;

/**
 * Configuração de logging centralizada
 * Estruturado em JSON para melhor processamento
 */

const logFormat = printf(({ level, message, timestamp, ...rest }) => {
  return JSON.stringify({
    timestamp,
    level,
    message,
    ...rest,
  });
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    json(),
    logFormat
  ),
  defaultMeta: {
    service: 'whatsapp-saas',
    environment: process.env.NODE_ENV,
  },
  transports: [
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        printf(({ level, message, timestamp }) => {
          return `${timestamp} [${level}]: ${message}`;
        })
      ),
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880,
      maxFiles: 5,
    }),
  ],
});

// Métodos auxiliares para logging
export const logAudit = (action: string, resource: string, userId: string, details: any) => {
  logger.info(`AUDIT: ${action} on ${resource}`, {
    userId,
    ...details,
  });
};

export const logError = (error: any, context: string, userId?: string) => {
  logger.error(`ERROR in ${context}`, {
    error: error.message,
    stack: error.stack,
    userId,
  });
};