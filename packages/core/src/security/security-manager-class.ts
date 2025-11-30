import { SecurityContext, SecurityError } from '../types/index.js';
import chalk from 'chalk';

/**
 * Security management for OpenCode Workflow Kit
 */
export class SecurityManager {
  private permissions = new Map<string, string[]>();
  private sessions = new Map<string, SecurityContext>();

  /**
   * Create security context for user
   */
  createContext(user: string, permissions: string[]): SecurityContext {
    const context: SecurityContext = {
      user,
      permissions,
      timestamp: Date.now()
    };

    this.sessions.set(user, context);
    return context;
  }

  /**
   * Validate permissions for security context
   */
  validatePermissions(context: SecurityContext, required: string[]): boolean {
    const userPermissions = context.permissions;
    
    for (const permission of required) {
      if (!userPermissions.includes(permission)) {
        console.error(chalk.red(`❌ Permission denied: ${permission}`));
        console.error(chalk.yellow(`Required permissions: ${required.join(', ')}`));
        console.error(chalk.yellow(`User permissions: ${userPermissions.join(', ')}`));
        return false;
      }
    }

    return true;
  }

  /**
   * Audit security action
   */
  async audit(action: string, context: SecurityContext): Promise<boolean> {
    console.log(chalk.blue(`🔒 Auditing action: ${action}`));
    console.log(chalk.gray(`User: ${context.user}`));
    console.log(chalk.gray(`Permissions: ${context.permissions.join(', ')}`));

    // Log security event
    const event = {
      action,
      user: context.user,
      permissions: context.permissions,
      timestamp: Date.now(),
      result: 'pending'
    };

    try {
      // Perform basic security checks
      if (action.includes('delete') || action.includes('remove')) {
        const hasDeletePermission = context.permissions.includes('delete') || 
                               context.permissions.includes('admin');
        
        if (!hasDeletePermission) {
          throw new SecurityError('Insufficient permissions for delete action', action, context);
        }
      }

      if (action.includes('write') || action.includes('modify')) {
        const hasWritePermission = context.permissions.includes('write') || 
                              context.permissions.includes('admin');
        
        if (!hasWritePermission) {
          throw new SecurityError('Insufficient permissions for write action', action, context);
        }
      }

      event.result = 'approved';
      console.log(chalk.green('✅ Security audit passed'));
      return true;

    } catch (error) {
      event.result = 'denied';
      
      if (error instanceof SecurityError) {
        console.error(chalk.red(`❌ Security violation: ${error.message}`));
        console.error(chalk.yellow(`Action: ${error.action}`));
        console.error(chalk.yellow(`User: ${error.context.user}`));
      } else {
        console.error(chalk.red(`❌ Security audit failed: ${error}`));
      }

      return false;
    }
  }

  /**
   * Get active sessions
   */
  getActiveSessions(): SecurityContext[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Clear expired sessions
   */
  clearExpiredSessions(maxAge: number = 3600000): void { // 1 hour default
    const now = Date.now();
    let cleared = 0;

    for (const [user, context] of this.sessions.entries()) {
      if (now - context.timestamp > maxAge) {
        this.sessions.delete(user);
        cleared++;
      }
    }

    if (cleared > 0) {
      console.log(chalk.gray(`🧹 Cleared ${cleared} expired security sessions`));
    }
  }

  /**
   * Revoke user session
   */
  revokeSession(user: string): boolean {
    const revoked = this.sessions.delete(user);
    
    if (revoked) {
      console.log(chalk.yellow(`🔒 Revoked session for user: ${user}`));
    }

    return revoked;
  }
}