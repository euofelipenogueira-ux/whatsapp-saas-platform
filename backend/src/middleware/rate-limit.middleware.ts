import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

/**
 * Rate Limiting por IP
 * Protege contra abuso de API
 */

interface RateLimitStore {
  [ip: string]: { count: number; resetTime: number };
}

const store: RateLimitStore = {};

export const createRateLimiter = (options: {
  windowMs?: number;
  maxRequests?: number;
  keyGenerator?: (req: Request) => string;
  handler?: (req: Request, res: Response) => void;
}) => {
  const windowMs = options.windowMs || 60000; // 1 minuto
  const maxRequests = options.maxRequests || 100;
  const keyGenerator = options.keyGenerator || ((req) => req.ip || 'unknown');

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();

    if (!store[key]) {
      store[key] = { count: 0, resetTime: now + windowMs };
    }

    // Reset se a janela expirou
    if (now > store[key].resetTime) {
      store[key] = { count: 0, resetTime: now + windowMs };
    }

    store[key].count++;

    // Adicionar headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - store[key].count));
    res.setHeader('X-RateLimit-Reset', store[key].resetTime);

    if (store[key].count > maxRequests) {
      logger.warn('Rate limit excedido', {
        key,
        count: store[key].count,
        limit: maxRequests,
      });

      if (options.handler) {
        return options.handler(req, res);
      }

      return res.status(429).json({
        success: false,
        error: 'rate_limit_exceeded',
        message: `Limite de ${maxRequests} requisições por ${windowMs / 1000} segundos excedido`,
        retryAfter: Math.ceil((store[key].resetTime - now) / 1000),
      });
    }

    next();
  };
};

// Limpar store periodicamente
setInterval(() => {
  const now = Date.now();
  for (const key in store) {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  }
}, 60000);
