import crypto from 'crypto';
import { logger } from '../config/logger';

/**
 * Serviço de Senha
 * Validação, hashing e reset de senhas
 */

export class PasswordService {
  /**
   * Validar força da senha
   * Requisitos:
   * - Mínimo 8 caracteres
   * - Pelo menos 1 letra maiúscula
   * - Pelo menos 1 letra minúscula
   * - Pelo menos 1 número
   * - Pelo menos 1 caractere especial
   */
  validateStrength(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Senha deve ter no mínimo 8 caracteres');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Senha deve conter pelo menos 1 letra maiúscula');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Senha deve conter pelo menos 1 letra minúscula');
    }

    if (!/\d/.test(password)) {
      errors.push('Senha deve conter pelo menos 1 número');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};:'",.<>?]/.test(password)) {
      errors.push('Senha deve conter pelo menos 1 caractere especial (!@#$%^&*)');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Gerar hash de token (para armazenar no banco)
   */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Comparar token com hash
   */
  compareToken(token: string, hash: string): boolean {
    return this.hashToken(token) === hash;
  }

  /**
   * Verificar se token expirou
   */
  isTokenExpired(expiresAt: Date | null): boolean {
    if (!expiresAt) return true;
    return new Date() > expiresAt;
  }

  /**
   * Calcular data de expiração
   */
  getExpirationDate(minutes: number): Date {
    const date = new Date();
    date.setMinutes(date.getMinutes() + minutes);
    return date;
  }
}

export const passwordService = new PasswordService();
