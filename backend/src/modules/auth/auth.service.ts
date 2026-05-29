import { User, Workspace, ApiToken } from '../../models';
import { jwtService, JwtService } from '../../services/jwt.service';
import { emailService, EmailService } from '../../services/email.service';
import { passwordService, PasswordService } from '../../services/password.service';
import { getPermissions, UserRole } from '../../utils/permissions';
import { AppError } from '../../middleware/error.middleware';
import { logger } from '../../config/logger';
import bcrypt from 'bcryptjs';

/**
 * Serviço de Autenticação
 * Gerencia login, cadastro, reset de senha, etc
 */

export interface RegisterInput {
  email: string;
  name: string;
  password: string;
  workspaceName: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RefreshTokenInput {
  refreshToken: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  password: string;
}

export class AuthService {
  private jwtService: JwtService;
  private emailService: EmailService;
  private passwordService: PasswordService;

  constructor() {
    this.jwtService = jwtService;
    this.emailService = emailService;
    this.passwordService = passwordService;
  }

  /**
   * Registrar novo usuário
   */
  async register(input: RegisterInput) {
    try {
      // Validar email
      const existingUser = await User.findOne({ email: input.email });
      if (existingUser) {
        throw new AppError(409, 'email_already_exists', 'Este email já está cadastrado');
      }

      // Validar força da senha
      const passwordValidation = this.passwordService.validateStrength(input.password);
      if (!passwordValidation.isValid) {
        throw new AppError(400, 'weak_password', 'Senha fraca', {
          errors: passwordValidation.errors,
        });
      }

      // Criar workspace
      const workspace = await Workspace.create({
        name: input.workspaceName,
        slug: input.workspaceName.toLowerCase().replace(/\s+/g, '-') + `-${Date.now()}`,
        billingEmail: input.email,
        plan: 'free',
        currency: 'BRL',
        timezone: 'America/Sao_Paulo',
      });

      // Criar usuário
      const user = new User({
        workspaceId: workspace._id,
        email: input.email,
        name: input.name,
        passwordHash: input.password, // Será hashado no pre-save hook
        role: 'SUPER_ADMIN', // Primeiro usuário do workspace é SUPER_ADMIN
        isActive: true,
        emailVerified: false,
      });

      // Gerar token de verificação
      const verificationToken = user.generateVerificationToken();
      await user.save();

      // Adicionar usuário aos membros do workspace
      workspace.members = [
        {
          userId: user._id as any,
          role: 'SUPER_ADMIN',
          joinedAt: new Date(),
        },
      ];
      workspace.ownerId = user._id as any;
      await workspace.save();

      // Enviar email de confirmação
      const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
      await this.emailService.sendVerificationEmail(user.email, user.name, verificationLink);

      logger.info('Novo usuário registrado', {
        userId: user._id,
        email: user.email,
        workspaceId: workspace._id,
      });

      return {
        success: true,
        message: 'Usuário registrado com sucesso. Verifique seu email para confirmar a conta.',
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Erro ao registrar usuário', { error });
      throw new AppError(500, 'registration_failed', 'Erro ao registrar usuário');
    }
  }

  /**
   * Login
   */
  async login(input: LoginInput, ip: string) {
    try {
      // Buscar usuário com senha (select: false por padrão)
      const user = await User.findOne({ email: input.email }).select('+passwordHash');

      if (!user) {
        // Não revelar se email existe
        throw new AppError(401, 'invalid_credentials', 'Email ou senha inválidos');
      }

      // Verificar se usuário está ativo
      if (!user.isActive) {
        throw new AppError(401, 'account_disabled', 'Sua conta foi desativada');
      }

      // Verificar se usuário está bloqueado
      if (user.isLocked && user.lockedUntil && new Date() < user.lockedUntil) {
        throw new AppError(401, 'account_locked', 'Conta bloqueada. Tente novamente mais tarde.');
      }

      // Comparar senha
      const isPasswordValid = await user.comparePassword(input.password);
      if (!isPasswordValid) {
        // Incrementar tentativas de login falhas
        user.loginAttempts = (user.loginAttempts || 0) + 1;

        if (user.loginAttempts >= 5) {
          user.isLocked = true;
          user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos
        }

        await user.save();

        logger.warn('Tentativa de login falha', {
          email: input.email,
          attempts: user.loginAttempts,
          ip,
        });

        throw new AppError(401, 'invalid_credentials', 'Email ou senha inválidos');
      }

      // Resetar tentativas de login
      user.loginAttempts = 0;
      user.isLocked = false;
      user.lastLogin = new Date();
      user.lastLoginIp = ip;
      await user.save();

      // Gerar tokens
      const permissions = getPermissions(user.role as UserRole);
      const tokens = this.jwtService.generateTokens({
        userId: user._id.toString(),
        email: user.email,
        workspaceId: user.workspaceId.toString(),
        role: user.role as UserRole,
        permissions,
      });

      // Log de sucesso
      logger.info('Login realizado com sucesso', {
        userId: user._id,
        email: user.email,
        ip,
      });

      return {
        success: true,
        message: 'Login realizado com sucesso',
        data: {
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            role: user.role,
            workspaceId: user.workspaceId,
          },
          tokens,
        },
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Erro ao fazer login', { error });
      throw new AppError(500, 'login_failed', 'Erro ao fazer login');
    }
  }

  /**
   * Refresh Token
   */
  async refreshToken(input: RefreshTokenInput) {
    try {
      // Validar refresh token
      const decoded = this.jwtService.verifyRefreshToken(input.refreshToken);

      // Buscar usuário
      const user = await User.findOne({
        _id: decoded.userId,
        email: decoded.email,
      });

      if (!user || !user.isActive) {
        throw new AppError(401, 'invalid_refresh_token', 'Refresh token inválido');
      }

      // Gerar novos tokens
      const permissions = getPermissions(user.role as UserRole);
      const tokens = this.jwtService.generateTokens({
        userId: user._id.toString(),
        email: user.email,
        workspaceId: user.workspaceId.toString(),
        role: user.role as UserRole,
        permissions,
      });

      logger.info('Token refresh realizado', { userId: user._id });

      return {
        success: true,
        data: { tokens },
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(401, 'refresh_token_failed', 'Erro ao renovar token');
    }
  }

  /**
   * Verificar Email
   */
  async verifyEmail(token: string) {
    try {
      // Hash do token
      const tokenHash = this.passwordService.hashToken(token);

      // Buscar usuário
      const user = await User.findOne({
        verificationToken: token,
        verificationTokenExpiry: { $gt: new Date() },
      });

      if (!user) {
        throw new AppError(400, 'invalid_verification_token', 'Token de verificação inválido ou expirado');
      }

      // Marcar como verificado
      user.emailVerified = true;
      user.verificationToken = undefined;
      user.verificationTokenExpiry = undefined;
      await user.save();

      // Enviar email de boas-vindas
      await this.emailService.sendWelcomeEmail(user.email, user.name);

      logger.info('Email verificado', { userId: user._id, email: user.email });

      return {
        success: true,
        message: 'Email verificado com sucesso!',
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(400, 'email_verification_failed', 'Erro ao verificar email');
    }
  }

  /**
   * Forgot Password
   */
  async forgotPassword(input: ForgotPasswordInput) {
    try {
      const user = await User.findOne({ email: input.email });

      // Não revelar se email existe
      if (!user) {
        return {
          success: true,
          message: 'Se o email existe, um link de reset será enviado.',
        };
      }

      // Gerar token de reset
      const resetToken = user.generatePasswordResetToken();
      await user.save();

      // Enviar email
      const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      await this.emailService.sendPasswordResetEmail(user.email, user.name, resetLink);

      logger.info('Email de reset enviado', { email: input.email });

      return {
        success: true,
        message: 'Se o email existe, um link de reset será enviado.',
      };
    } catch (error) {
      logger.error('Erro ao processar forgot password', { error });
      throw new AppError(500, 'forgot_password_failed', 'Erro ao processar solicitação');
    }
  }

  /**
   * Reset Password
   */
  async resetPassword(input: ResetPasswordInput) {
    try {
      // Validar senha
      const passwordValidation = this.passwordService.validateStrength(input.password);
      if (!passwordValidation.isValid) {
        throw new AppError(400, 'weak_password', 'Senha fraca', {
          errors: passwordValidation.errors,
        });
      }

      // Buscar usuário
      const user = await User.findOne({
        passwordResetToken: input.token,
        passwordResetExpiry: { $gt: new Date() },
      });

      if (!user) {
        throw new AppError(400, 'invalid_reset_token', 'Token de reset inválido ou expirado');
      }

      // Atualizar senha
      user.passwordHash = input.password; // Será hashado no pre-save hook
      user.passwordResetToken = undefined;
      user.passwordResetExpiry = undefined;
      user.loginAttempts = 0;
      user.isLocked = false;
      await user.save();

      logger.info('Senha resetada', { userId: user._id, email: user.email });

      return {
        success: true,
        message: 'Senha alterada com sucesso. Faça login com sua nova senha.',
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(500, 'reset_password_failed', 'Erro ao resetar senha');
    }
  }

  /**
   * Change Password
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    try {
      // Buscar usuário
      const user = await User.findById(userId).select('+passwordHash');
      if (!user) {
        throw new AppError(404, 'user_not_found', 'Usuário não encontrado');
      }

      // Validar senha antiga
      const isPasswordValid = await user.comparePassword(oldPassword);
      if (!isPasswordValid) {
        throw new AppError(401, 'invalid_old_password', 'Senha atual incorreta');
      }

      // Validar nova senha
      const passwordValidation = this.passwordService.validateStrength(newPassword);
      if (!passwordValidation.isValid) {
        throw new AppError(400, 'weak_password', 'Senha fraca', {
          errors: passwordValidation.errors,
        });
      }

      // Atualizar senha
      user.passwordHash = newPassword;
      await user.save();

      logger.info('Senha alterada pelo usuário', { userId });

      return {
        success: true,
        message: 'Senha alterada com sucesso',
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(500, 'change_password_failed', 'Erro ao alterar senha');
    }
  }

  /**
   * Get User Profile
   */
  async getUserProfile(userId: string) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError(404, 'user_not_found', 'Usuário não encontrado');
      }

      const permissions = getPermissions(user.role as UserRole);

      return {
        success: true,
        data: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          workspaceId: user.workspaceId,
          avatar: user.avatar,
          phone: user.phone,
          department: user.department,
          emailVerified: user.emailVerified,
          twoFactorEnabled: user.twoFactorEnabled,
          lastLogin: user.lastLogin,
          metadata: user.metadata,
          permissions,
          createdAt: user.createdAt,
        },
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(500, 'get_profile_failed', 'Erro ao obter perfil');
    }
  }

  /**
   * Verificar token
   */
  verifyTokenPayload(token: string) {
    try {
      const payload = this.jwtService.verifyAccessToken(token);
      return {
        success: true,
        data: payload,
      };
    } catch (error) {
      throw new AppError(401, 'invalid_token', 'Token inválido');
    }
  }
}

export const authService = new AuthService();
