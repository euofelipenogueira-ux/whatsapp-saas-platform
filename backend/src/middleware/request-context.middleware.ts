import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Middleware para adicionar contexto ao request
 * Request ID para rastreamento de logs
 */

export const requestContextMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Gerar request ID único
  const requestId = req.headers['x-request-id'] as string || uuidv4();
  req.requestId = requestId;
  req.ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '';

  // Adicionar request ID aos headers da resposta
  res.setHeader('x-request-id', requestId);

  // Logging do request
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: (req as any).userId,
      ip: req.ip,
    };

    if (res.statusCode >= 400) {
      console.warn('[REQUEST]', log);
    } else {
      console.log('[REQUEST]', log);
    }
  });

  next();
};
