/**
 * Agent Mail Client
 *
 * Provides real-time multi-agent coordination via Beads Agent Mail.
 * This enables sub-100ms task reservation and prevents collisions
 * when multiple AI agents work on the same project.
 *
 * Agent Mail is optional - if unavailable, falls back to git-based sync
 * with higher latency but full functionality.
 */

import type { AgentMailConfig, ReservationResult, Reservation } from './reconciler/types';

/**
 * Default Agent Mail configuration from environment variables
 */
function getDefaultConfig(): AgentMailConfig {
  return {
    url: process.env.BEADS_AGENT_MAIL_URL,
    agentName: process.env.BEADS_AGENT_NAME || `liaison-${process.pid}`,
    projectId: process.env.BEADS_PROJECT_ID || 'default',
    enabled: !!process.env.BEADS_AGENT_MAIL_URL,
  };
}

/**
 * Agent Mail client for real-time multi-agent coordination
 */
export class AgentMailClient {
  private config: AgentMailConfig;
  private available: boolean | null = null;

  constructor(config?: Partial<AgentMailConfig>) {
    const defaults = getDefaultConfig();
    this.config = {
      ...defaults,
      ...config,
      enabled: config?.enabled ?? defaults.enabled,
    };
  }

  /**
   * Check if Agent Mail server is available
   * Caches result after first check
   */
  async isAvailable(): Promise<boolean> {
    if (this.available !== null) {
      return this.available;
    }

    if (!this.config.enabled || !this.config.url) {
      this.available = false;
      return false;
    }

    try {
      const response = await fetch(`${this.config.url}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      });
      this.available = response.ok;
      return this.available;
    } catch {
      this.available = false;
      return false;
    }
  }

  /**
   * Reserve a task for this agent
   * Prevents other agents from claiming the same task
   *
   * @param taskId - The task ID to reserve
   * @returns Reservation result with success status
   */
  async reserve(taskId: string): Promise<ReservationResult> {
    if (!await this.isAvailable()) {
      return {
        success: false,
        taskId,
        error: 'Agent Mail not available - using git-based coordination',
      };
    }

    try {
      const response = await fetch(`${this.config.url}/api/reservations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task_id: taskId,
          agent_name: this.config.agentName,
          project_id: this.config.projectId,
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          taskId,
          reservedBy: this.config.agentName,
          reservedAt: new Date(),
        };
      }

      if (response.status === 409) {
        const data = await response.json();
        return {
          success: false,
          taskId,
          reservedBy: data.reserved_by,
          reservedAt: data.reserved_at ? new Date(data.reserved_at) : undefined,
          error: `Task already reserved by ${data.reserved_by}`,
        };
      }

      return {
        success: false,
        taskId,
        error: `Reservation failed: ${response.statusText}`,
      };
    } catch (error) {
      return {
        success: false,
        taskId,
        error: `Reservation failed: ${error}`,
      };
    }
  }

  /**
   * Release a task reservation
   *
   * @param taskId - The task ID to release
   */
  async release(taskId: string): Promise<void> {
    if (!await this.isAvailable()) {
      return; // Graceful degradation
    }

    try {
      await fetch(`${this.config.url}/api/reservations/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_name: this.config.agentName,
          project_id: this.config.projectId,
        }),
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      // Graceful degradation - reservation will expire naturally
    }
  }

  /**
   * List all active reservations for this project
   */
  async listReservations(): Promise<Reservation[]> {
    if (!await this.isAvailable()) {
      return [];
    }

    try {
      const response = await fetch(
        `${this.config.url}/api/reservations?project_id=${this.config.projectId}`,
        {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
        }
      );

      if (response.ok) {
        const data = await response.json();
        return (data.reservations || []).map((r: any) => ({
          taskId: r.task_id,
          agentName: r.agent_name,
          projectId: r.project_id,
          reservedAt: new Date(r.reserved_at),
          expiresAt: r.expires_at ? new Date(r.expires_at) : undefined,
        }));
      }

      return [];
    } catch {
      return [];
    }
  }

  /**
   * Check if a specific task is reserved
   *
   * @param taskId - The task ID to check
   * @returns The reservation if exists, null otherwise
   */
  async checkReservation(taskId: string): Promise<Reservation | null> {
    if (!await this.isAvailable()) {
      return null;
    }

    try {
      const response = await fetch(
        `${this.config.url}/api/reservations/${taskId}?project_id=${this.config.projectId}`,
        {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
        }
      );

      if (response.ok) {
        const data = await response.json();
        return {
          taskId: data.task_id,
          agentName: data.agent_name,
          projectId: data.project_id,
          reservedAt: new Date(data.reserved_at),
          expiresAt: data.expires_at ? new Date(data.expires_at) : undefined,
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get the current configuration
   */
  getConfig(): AgentMailConfig {
    return { ...this.config };
  }

  /**
   * Update the configuration
   */
  updateConfig(config: Partial<AgentMailConfig>): void {
    this.config = { ...this.config, ...config };
    this.available = null; // Reset availability check
  }
}

// Singleton instance for shared use
let defaultClient: AgentMailClient | null = null;

/**
 * Get the default Agent Mail client
 * Uses singleton pattern for efficient resource usage
 */
export function getAgentMailClient(): AgentMailClient {
  if (!defaultClient) {
    defaultClient = new AgentMailClient();
  }
  return defaultClient;
}

/**
 * Create a new Agent Mail client with custom configuration
 */
export function createAgentMailClient(config?: Partial<AgentMailConfig>): AgentMailClient {
  return new AgentMailClient(config);
}
