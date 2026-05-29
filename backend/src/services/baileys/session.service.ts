import { DisconnectReason, useMultiFileAuthState, Baileys, proto } from '@whiskeysockets/baileys';
import { logger } from '../../config/logger';
import { WhatsappInstance } from '../../models';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Serviço de Gerenciamento de Sessões Baileys
 * Salva e carrega sessões do MongoDB
 */

export interface SessionAuth {
  creds: any;
  keys: any;
}

export class BaileysSessionService {
  private baseDir = './sessions';

  constructor() {
    // Criar diretório de sessões se não existir
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  /**
   * Obter caminho da sessão
   */
  private getSessionPath(instanceId: string): string {
    return path.join(this.baseDir, `session-${instanceId}`);
  }

  /**
   * Carregar sessão do arquivo ou criar nova
   */
  async loadSession(instanceId: string): Promise<any> {
    try {
      const sessionPath = this.getSessionPath(instanceId);

      // Usar multi-file auth state do Baileys
      const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

      logger.info('Sessão Baileys carregada', { instanceId });

      return { state, saveCreds };
    } catch (error) {
      logger.error('Erro ao carregar sessão Baileys', { error, instanceId });
      throw error;
    }
  }

  /**
   * Salvar sessão em MongoDB
   */
  async saveSessionToDatabase(instanceId: string): Promise<void> {
    try {
      const sessionPath = this.getSessionPath(instanceId);
      const credsPath = path.join(sessionPath, 'creds.json');
      const keysPath = path.join(sessionPath, 'keys');

      let credsData = null;
      let keysData = null;

      // Ler credenciais
      if (fs.existsSync(credsPath)) {
        credsData = JSON.stringify(JSON.parse(fs.readFileSync(credsPath, 'utf8')));
      }

      // Ler chaves (é um diretório)
      if (fs.existsSync(keysPath)) {
        keysData = {};
        const files = fs.readdirSync(keysPath);
        for (const file of files) {
          const filePath = path.join(keysPath, file);
          const content = fs.readFileSync(filePath, 'utf8');
          keysData[file] = content;
        }
        keysData = JSON.stringify(keysData);
      }

      // Salvar no MongoDB
      await WhatsappInstance.updateOne(
        { _id: instanceId },
        {
          'sessionData.credentials': credsData,
          'sessionData.keys': keysData,
          updatedAt: new Date(),
        }
      );

      logger.info('Sessão salva no banco de dados', { instanceId });
    } catch (error) {
      logger.error('Erro ao salvar sessão no banco', { error, instanceId });
      // Não lançar erro aqui para não interromper a conexão
    }
  }

  /**
   * Restaurar sessão do MongoDB
   */
  async restoreSessionFromDatabase(instanceId: string): Promise<boolean> {
    try {
      const instance = await WhatsappInstance.findById(instanceId);

      if (!instance?.sessionData?.credentials || !instance?.sessionData?.keys) {
        logger.warn('Sessão não encontrada no banco de dados', { instanceId });
        return false;
      }

      const sessionPath = this.getSessionPath(instanceId);

      // Criar diretório se não existir
      if (!fs.existsSync(sessionPath)) {
        fs.mkdirSync(sessionPath, { recursive: true });
      }

      // Restaurar credenciais
      const credsPath = path.join(sessionPath, 'creds.json');
      fs.writeFileSync(credsPath, instance.sessionData.credentials, 'utf8');

      // Restaurar chaves
      const keysPath = path.join(sessionPath, 'keys');
      if (!fs.existsSync(keysPath)) {
        fs.mkdirSync(keysPath, { recursive: true });
      }

      const keysData = JSON.parse(instance.sessionData.keys);
      for (const [filename, content] of Object.entries(keysData)) {
        const filePath = path.join(keysPath, filename);
        fs.writeFileSync(filePath, content as string, 'utf8');
      }

      logger.info('Sessão restaurada do banco de dados', { instanceId });
      return true;
    } catch (error) {
      logger.error('Erro ao restaurar sessão do banco', { error, instanceId });
      return false;
    }
  }

  /**
   * Limpar sessão do arquivo
   */
  async clearSession(instanceId: string): Promise<void> {
    try {
      const sessionPath = this.getSessionPath(instanceId);

      if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true });
      }

      logger.info('Sessão local removida', { instanceId });
    } catch (error) {
      logger.error('Erro ao remover sessão local', { error, instanceId });
    }
  }
}

export const baileysSessionService = new BaileysSessionService();
