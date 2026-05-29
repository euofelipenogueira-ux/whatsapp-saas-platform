import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

/**
 * Erro customizado da aplicação
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Middleware de tratamento de erros
 * Deve ser o último middleware da aplicação
 */
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const requestId = req.requestId || 'unknown';

  // Log do erro
  logger.error('Erro não tratado', {
    requestId,
    error: err.message,
    stack: err.stack,
    statusCode: err.statusCode,
    code: err.code,
    userId: (req as any).userId,
    path: req.path,
    method: req.method,
  });

  // Erro customizado da aplicação
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.code,
      message: err.message,
      details: err.details,
      requestId,
    });
  }

  // Erro de validação Joi
  if (err.isJoi) {
    return res.status(400).json({
      success: false,
      error: 'validation_error',
      message: 'Erro de validação nos dados enviados',
      details: err.details?.map((d: any) => ({
        field: d.path.join('.'),
        message: d.message,
      })),
      requestId,
    });
  }

  // Erro Mongoose
  if (err.name === 'MongooseError' || err.name === 'MongoServerError') {
    return res.status(500).json({
      success: false,
      error: 'database_error',
      message: 'Erro ao processar requisição no banco de dados',
      requestId,
    });
  }

  // Erro genérico
  res.status(500).json({
    success: false,
    error: 'internal_server_error',
    message: process.env.NODE_ENV === 'production' ? 'Erro interno do servidor' : err.message,
    requestId,
  });
};

/**
 * Middleware para rotas não encontradas
 */
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'not_found',
    message: `Rota ${req.method} ${req.path} não encontrada`,
    requestId: req.requestId,
  });
};
