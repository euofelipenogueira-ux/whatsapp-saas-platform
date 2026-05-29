/**
 * Definição de permissões por role
 * Modelo RBAC (Role-Based Access Control)
 */

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'AGENT';

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  SUPER_ADMIN: [
    // Workspace
    'workspace:create',
    'workspace:read',
    'workspace:update',
    'workspace:delete',
    'workspace:manage',

    // Users
    'user:create',
    'user:read',
    'user:update',
    'user:delete',
    'user:manage',
    'user:change-role',

    // Instances
    'instance:create',
    'instance:read',
    'instance:update',
    'instance:delete',
    'instance:connect',
    'instance:disconnect',

    // Messages
    'message:send',
    'message:read',
    'message:delete',
    'message:forward',

    // Webhooks
    'webhook:create',
    'webhook:read',
    'webhook:update',
    'webhook:delete',
    'webhook:test',

    // Flows
    'flow:create',
    'flow:read',
    'flow:update',
    'flow:delete',
    'flow:execute',
    'flow:publish',

    // Campaigns
    'campaign:create',
    'campaign:read',
    'campaign:update',
    'campaign:delete',
    'campaign:send',
    'campaign:schedule',

    // API Tokens
    'token:create',
    'token:read',
    'token:delete',
    'token:revoke',

    // Analytics
    'analytics:read',
    'analytics:export',

    // Audit Logs
    'audit:read',

    // Billing
    'billing:read',
    'billing:update',
  ],

  ADMIN: [
    // Workspace
    'workspace:read',
    'workspace:update',
    'workspace:manage',

    // Users
    'user:create',
    'user:read',
    'user:update',
    'user:delete',
    'user:manage',

    // Instances
    'instance:create',
    'instance:read',
    'instance:update',
    'instance:delete',
    'instance:connect',
    'instance:disconnect',

    // Messages
    'message:send',
    'message:read',
    'message:delete',

    // Webhooks
    'webhook:create',
    'webhook:read',
    'webhook:update',
    'webhook:delete',
    'webhook:test',

    // Flows
    'flow:create',
    'flow:read',
    'flow:update',
    'flow:delete',
    'flow:execute',
    'flow:publish',

    // Campaigns
    'campaign:create',
    'campaign:read',
    'campaign:update',
    'campaign:delete',
    'campaign:send',

    // API Tokens
    'token:create',
    'token:read',
    'token:delete',

    // Analytics
    'analytics:read',

    // Audit Logs
    'audit:read',
  ],

  MANAGER: [
    // Workspace
    'workspace:read',

    // Users
    'user:read',
    'user:update',

    // Instances
    'instance:read',
    'instance:connect',
    'instance:disconnect',

    // Messages
    'message:send',
    'message:read',

    // Webhooks
    'webhook:read',
    'webhook:test',

    // Flows
    'flow:read',
    'flow:execute',

    // Campaigns
    'campaign:create',
    'campaign:read',
    'campaign:update',
    'campaign:send',

    // API Tokens
    'token:read',

    // Analytics
    'analytics:read',
  ],

  AGENT: [
    // Workspace
    'workspace:read',

    // Users
    'user:read',

    // Instances
    'instance:read',

    // Messages
    'message:send',
    'message:read',

    // Conversations
    'conversation:read',
    'conversation:update',

    // Contacts
    'contact:read',
    'contact:update',
  ],
};

/**
 * Verificar se um role tem uma permissão específica
 */
export function hasPermission(role: UserRole, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;

  // Suporte para wildcards
  if (permission.endsWith('*')) {
    const prefix = permission.slice(0, -1);
    return permissions.some((p) => p.startsWith(prefix));
  }

  return permissions.includes(permission);
}

/**
 * Obter todas as permissões de um role
 */
export function getPermissions(role: UserRole): string[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Descrição dos roles
 */
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Acesso total ao sistema e todas as funcionalidades',
  ADMIN: 'Gerenciamento completo do workspace',
  MANAGER: 'Gerenciador de campanhas e fluxos',
  AGENT: 'Agente de vendas/atendimento',
};
