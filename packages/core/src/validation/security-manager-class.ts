import { SecurityContext, SecurityError } from '../types/index.js';
import chalk from 'chalk';

/**
 * Security management utilities
 */
export class SecurityManager {
  private sessions = new Map<string, SecurityContext>();

  /**
   * Create security context
   */
  createContext(user: string, permissions: string[]): SecurityContext {
    const context: SecurityContext = {
      user,
      permissions,
      session: this.generateSessionId(),
      timestamp: Date.now()
    };

    this.sessions.set(context.session!, context);
    return context;
  }

  /**
   * Validate permissions
   */
  validatePermissions(context: SecurityContext, required: string[]): boolean {
    return required.every(permission => context.permissions.includes(permission));
  }

  /**
   * Audit action
   */
  async audit(action: string, context: SecurityContext): Promise<boolean> {
    console.log(chalk.blue(`🔒 Audit: ${context.user} performed ${action}`));
    // In a real implementation, this would log to an audit store
    return true;
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  /**
   * Validate security context
   */
  validateContext(context: unknown): SecurityContext {
    if (!context || typeof context !== 'object') {
      throw new SecurityError('Invalid security context', 'validate', {} as SecurityContext);
    }

    const ctx = context as any;
    if (!ctx.user || !Array.isArray(ctx.permissions)) {
      throw new SecurityError('Invalid security context structure', 'validate', {} as SecurityContext);
    }

    return ctx as SecurityContext;
  }

  /**
   * Check if session is valid
   */
  isSessionValid(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    // Check if session is older than 24 hours
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours in ms
    return (Date.now() - session.timestamp) < maxAge;
  }

  /**
   * Cleanup expired sessions
   */
  cleanup(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.timestamp > maxAge) {
        this.sessions.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(chalk.gray(`🧹 Security cleanup: removed ${cleaned} expired sessions`));
    }
  }
}