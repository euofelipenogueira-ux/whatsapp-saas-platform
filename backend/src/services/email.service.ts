import nodemailer from 'nodemailer';
import { logger } from '../config/logger';

/**
 * Serviço de Email
 * Envia emails para confirmação, reset de senha, etc
 */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private from: string;

  constructor() {
    this.from = process.env.SMTP_FROM || 'noreply@whatsapp-saas.com';

    // Configurar transporter
    if (process.env.NODE_ENV === 'production') {
      // SendGrid em produção
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
        port: parseInt(process.env.SMTP_PORT || '587'),
        auth: {
          user: process.env.SMTP_USER || 'apikey',
          pass: process.env.SMTP_PASS || '',
        },
      });
    } else {
      // Ethereal (teste) em desenvolvimento
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: {
          user: 'test@ethereal.email',
          pass: 'test-password',
        },
      });
    }
  }

  /**
   * Enviar email genérico
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      logger.info(`Email enviado para ${options.to}`, { subject: options.subject });
      return true;
    } catch (error) {
      logger.error(`Erro ao enviar email para ${options.to}`, { error });
      return false;
    }
  }

  /**
   * Email de confirmação
   */
  async sendVerificationEmail(email: string, name: string, verificationLink: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 5px; }
          .button { display: inline-block; padding: 12px 30px; background-color: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Bem-vindo ao WhatsApp SaaS!</h1>
          </div>
          <p>Olá ${name},</p>
          <p>Obrigado por se registrar. Para ativar sua conta, clique no botão abaixo:</p>
          <center><a href="${verificationLink}" class="button">Confirmar Email</a></center>
          <p>Ou copie e cole este link no seu navegador:</p>
          <p><small>${verificationLink}</small></p>
          <p>Este link expira em 24 horas.</p>
          <div class="footer">
            <p>Se você não solicitou este email, ignore esta mensagem.</p>
            <p>&copy; 2024 WhatsApp SaaS. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Confirme seu email - WhatsApp SaaS',
      html,
      text: `Clique aqui para confirmar: ${verificationLink}`,
    });
  }

  /**
   * Email de reset de senha
   */
  async sendPasswordResetEmail(email: string, name: string, resetLink: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 5px; }
          .button { display: inline-block; padding: 12px 30px; background-color: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .warning { background-color: #fff3cd; border: 1px solid #ffc107; padding: 10px; border-radius: 5px; margin: 15px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Reset de Senha</h1>
          </div>
          <p>Olá ${name},</p>
          <p>Você solicitou um reset de senha. Clique no botão abaixo para criar uma nova senha:</p>
          <center><a href="${resetLink}" class="button">Resetar Senha</a></center>
          <p>Ou copie e cole este link:</p>
          <p><small>${resetLink}</small></p>
          <div class="warning">
            <strong>Atenção:</strong> Este link expira em 1 hora. Se você não solicitou este reset, ignore esta mensagem.
          </div>
          <div class="footer">
            <p>&copy; 2024 WhatsApp SaaS. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Reset de Senha - WhatsApp SaaS',
      html,
      text: `Clique aqui para resetar sua senha: ${resetLink}`,
    });
  }

  /**
   * Email de boas-vindas
   */
  async sendWelcomeEmail(email: string, name: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 5px; }
          .features { margin: 20px 0; }
          .feature { margin: 10px 0; padding: 10px; background: #f5f5f5; border-radius: 5px; }
          .button { display: inline-block; padding: 12px 30px; background-color: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Bem-vindo ao WhatsApp SaaS!</h1>
          </div>
          <p>Olá ${name},</p>
          <p>Sua conta foi ativada com sucesso! Você agora tem acesso a todas as funcionalidades.</p>
          <div class="features">
            <h3>O que você pode fazer:</h3>
            <div class="feature">✓ Conectar múltiplas instâncias WhatsApp</div>
            <div class="feature">✓ Enviar e receber mensagens em tempo real</div>
            <div class="feature">✓ Criar fluxos automáticos</div>
            <div class="feature">✓ Gerenciar campanhas em massa</div>
            <div class="feature">✓ Integrar com APIs via webhooks</div>
          </div>
          <center><a href="${process.env.FRONTEND_URL}" class="button">Acessar Dashboard</a></center>
          <div class="footer">
            <p>&copy; 2024 WhatsApp SaaS. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Bem-vindo ao WhatsApp SaaS!',
      html,
    });
  }

  /**
   * Email de alerta de segurança
   */
  async sendSecurityAlert(email: string, name: string, action: string, ip: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 5px; }
          .alert { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .info { background: #f0f0f0; padding: 10px; margin: 10px 0; border-radius: 5px; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Alerta de Segurança</h1>
          </div>
          <p>Olá ${name},</p>
          <div class="alert">
            <strong>Detectamos uma atividade na sua conta:</strong>
            <div class="info">Ação: ${action}</div>
            <div class="info">IP: ${ip}</div>
            <div class="info">Data: ${new Date().toLocaleString('pt-BR')}</div>
          </div>
          <p>Se esta ação não foi realizada por você, altere sua senha imediatamente.</p>
          <div class="footer">
            <p>&copy; 2024 WhatsApp SaaS. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: '⚠️ Alerta de Segurança - WhatsApp SaaS',
      html,
    });
  }
}

export const emailService = new EmailService();
