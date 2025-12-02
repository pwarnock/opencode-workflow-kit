/**
 * Advanced Workflow Automation System
 * Provides triggers, conditions, and automated actions
 */

import { EventEmitter } from 'events';
import chalk from 'chalk';
import { OpenCodeError, ErrorCode, ErrorFactory } from './errors/index.js';

export interface WorkflowTrigger {
  id: string;
  name: string;
  type: 'event' | 'schedule' | 'file' | 'api' | 'manual';
  config: any;
  enabled: boolean;
  conditions?: WorkflowCondition[];
}

export interface WorkflowCondition {
  type: 'time' | 'file_exists' | 'file_changed' | 'api_response' | 'config_value' | 'git_status';
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'matches';
  value: any;
  path?: string;
}

export interface WorkflowAction {
  id: string;
  type: 'command' | 'api_call' | 'file_operation' | 'notification' | 'sync' | 'plugin_execute';
  config: any;
  retryPolicy?: {
    maxRetries: number;
    backoffMs: number;
  };
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  version: string;
  enabled: boolean;
  triggers: WorkflowTrigger[];
  conditions?: WorkflowCondition[];
  actions: WorkflowAction[];
  metadata: {
    created: string;
    updated: string;
    author: string;
    tags: string[];
  };
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  trigger: string;
  results: any[];
  errors: string[];
  context: any;
}

/**
 * Workflow Automation Engine
 */
export class WorkflowEngine extends EventEmitter {
  private workflows = new Map<string, Workflow>();
  private executions = new Map<string, WorkflowExecution>();
  private schedules = new Map<string, NodeJS.Timeout>();
  private fileWatchers = new Map<string, any>();
  private executionHistory: WorkflowExecution[] = [];
  private isRunning = false;

  constructor() {
    super();
    this.setupEventHandlers();
  }

  /**
   * Register a new workflow
   */
  async registerWorkflow(workflow: Workflow): Promise<void> {
    try {
      // Validate workflow
      this.validateWorkflow(workflow);

      // Store workflow
      this.workflows.set(workflow.id, workflow);

      // Setup triggers
      await this.setupWorkflowTriggers(workflow);

      console.log(chalk.green(`✅ Workflow registered: ${workflow.name} (${workflow.id})`));
      this.emit('workflow.registered', workflow);

    } catch (error) {
      const workflowError = ErrorFactory.workflow(
        ErrorCode.WORKFLOW_REGISTRATION_FAILED,
        `Failed to register workflow: ${workflow.id}`,
        { workflowId: workflow.id },
        undefined,
        error as Error
      );
      this.emit('workflow.error', workflowError);
      throw workflowError;
    }
  }

  /**
   * Unregister a workflow
   */
  async unregisterWorkflow(workflowId: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw ErrorFactory.workflow(
        ErrorCode.WORKFLOW_NOT_FOUND,
        `Workflow not found: ${workflowId}`
      );
    }

    try {
      // Cleanup triggers
      await this.cleanupWorkflowTriggers(workflow);

      // Remove workflow
      this.workflows.delete(workflowId);

      // Cancel any running executions
      await this.cancelWorkflowExecutions(workflowId);

      console.log(chalk.yellow(`🗑️  Workflow unregistered: ${workflow.name} (${workflowId})`));
      this.emit('workflow.unregistered', workflow);

    } catch (error) {
      throw ErrorFactory.workflow(
        ErrorCode.WORKFLOW_UNREGISTRATION_FAILED,
        `Failed to unregister workflow: ${workflowId}`,
        undefined,
        undefined,
        error as Error
      );
    }
  }

  /**
   * Execute a workflow manually
   */
  async executeWorkflow(workflowId: string, context?: any): Promise<WorkflowExecution> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw ErrorFactory.workflow(
        ErrorCode.WORKFLOW_NOT_FOUND,
        `Workflow not found: ${workflowId}`
      );
    }

    if (!workflow.enabled) {
      throw ErrorFactory.workflow(
        ErrorCode.WORKFLOW_DISABLED,
        `Workflow is disabled: ${workflowId}`
      );
    }

    const execution: WorkflowExecution = {
      id: this.generateExecutionId(),
      workflowId,
      status: 'pending',
      startTime: new Date(),
      trigger: 'manual',
      results: [],
      errors: [],
      context: context || {}
    };

    this.executions.set(execution.id, execution);
    this.emit('execution.started', execution);

    try {
      execution.status = 'running';
      await this.executeWorkflowActions(workflow, execution, context);
      execution.status = 'completed';
      execution.endTime = new Date();

      console.log(chalk.green(`✅ Workflow completed: ${workflow.name} (${execution.id})`));
      this.emit('execution.completed', execution);

    } catch (error) {
      execution.status = 'failed';
      execution.endTime = new Date();
      execution.errors.push(error instanceof Error ? error.message : String(error));

      console.log(chalk.red(`❌ Workflow failed: ${workflow.name} (${execution.id})`));
      this.emit('execution.failed', execution);

    } finally {
      this.addToHistory(execution);
      this.executions.delete(execution.id);
    }

    return execution;
  }

  /**
   * Get all registered workflows
   */
  getWorkflows(): Workflow[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Get workflow by ID
   */
  getWorkflow(workflowId: string): Workflow | undefined {
    return this.workflows.get(workflowId);
  }

  /**
   * Get execution history
   */
  getExecutionHistory(limit?: number): WorkflowExecution[] {
    const history = [...this.executionHistory].sort((a, b) => 
      b.startTime.getTime() - a.startTime.getTime()
    );
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Get active executions
   */
  getActiveExecutions(): WorkflowExecution[] {
    return Array.from(this.executions.values()).filter(exec => 
      exec.status === 'running' || exec.status === 'pending'
    );
  }

  /**
   * Enable/disable workflow
   */
  async toggleWorkflow(workflowId: string, enabled: boolean): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw ErrorFactory.workflow(
        ErrorCode.WORKFLOW_NOT_FOUND,
        `Workflow not found: ${workflowId}`
      );
    }

    workflow.enabled = enabled;
    
    if (enabled) {
      await this.setupWorkflowTriggers(workflow);
    } else {
      await this.cleanupWorkflowTriggers(workflow);
    }

    const status = enabled ? 'enabled' : 'disabled';
    console.log(chalk.blue(`🔄 Workflow ${status}: ${workflow.name} (${workflowId})`));
    this.emit('workflow.toggled', { workflow, enabled });
  }

  /**
   * Setup workflow triggers
   */
  private async setupWorkflowTriggers(workflow: Workflow): Promise<void> {
    for (const trigger of workflow.triggers) {
      if (!trigger.enabled) continue;

      switch (trigger.type) {
        case 'event':
          this.setupEventTrigger(workflow, trigger);
          break;
        case 'schedule':
          this.setupScheduleTrigger(workflow, trigger);
          break;
        case 'file':
          this.setupFileTrigger(workflow, trigger);
          break;
        case 'api':
          this.setupApiTrigger(workflow, trigger);
          break;
      }
    }
  }

  /**
   * Setup event-based trigger
   */
  private setupEventTrigger(workflow: Workflow, trigger: WorkflowTrigger): void {
    const eventName = trigger.config.eventName;
    
    const handler = async (data: any) => {
      if (await this.evaluateConditions(workflow.conditions, { event: data })) {
        await this.executeWorkflow(workflow.id, { trigger: trigger.id, event: data });
      }
    };

    this.on(eventName, handler);
    console.log(chalk.blue(`🎯 Event trigger setup: ${eventName} for workflow ${workflow.name}`));
  }

  /**
   * Setup schedule-based trigger
   */
  private setupScheduleTrigger(workflow: Workflow, trigger: WorkflowTrigger): void {
    const cron = trigger.config.cron;
    const interval = this.parseCronToInterval(cron);
    
    const scheduleId = `${workflow.id}:${trigger.id}`;
    const timer = setInterval(async () => {
      if (await this.evaluateConditions(workflow.conditions, { time: new Date() })) {
        await this.executeWorkflow(workflow.id, { trigger: trigger.id, time: new Date() });
      }
    }, interval);

    this.schedules.set(scheduleId, timer);
    console.log(chalk.blue(`⏰ Schedule trigger setup: ${cron} for workflow ${workflow.name}`));
  }

  /**
   * Setup file-based trigger
   */
  private setupFileTrigger(workflow: Workflow, trigger: WorkflowTrigger): void {
    const watchPath = trigger.config.path;
    const events = trigger.config.events || ['change'];
    
    try {
      const watcher = require('chokidar').watch(watchPath, {
        ignored: trigger.config.ignore || [],
        persistent: true
      });

      const watcherId = `${workflow.id}:${trigger.id}`;
      this.fileWatchers.set(watcherId, watcher);

      events.forEach(event => {
        watcher.on(event, async (path: string) => {
          if (await this.evaluateConditions(workflow.conditions, { file: { path, event } })) {
            await this.executeWorkflow(workflow.id, { trigger: trigger.id, file: { path, event } });
          }
        });
      });

      console.log(chalk.blue(`📁 File trigger setup: ${watchPath} for workflow ${workflow.name}`));

    } catch (error) {
      throw ErrorFactory.workflow(
        ErrorCode.FILE_WATCHER_SETUP_FAILED,
        `Failed to setup file watcher for ${watchPath}`,
        undefined,
        undefined,
        error as Error
      );
    }
  }

  /**
   * Setup API-based trigger
   */
  private setupApiTrigger(workflow: Workflow, trigger: WorkflowTrigger): void {
    const endpoint = trigger.config.endpoint;
    const method = trigger.config.method || 'GET';
    
    // This would integrate with API monitoring system
    console.log(chalk.blue(`🌐 API trigger setup: ${method} ${endpoint} for workflow ${workflow.name}`));
  }

  /**
   * Evaluate workflow conditions
   */
  private async evaluateConditions(conditions: WorkflowCondition[] | undefined, context: any): Promise<boolean> {
    if (!conditions || conditions.length === 0) {
      return true;
    }

    for (const condition of conditions) {
      if (!(await this.evaluateCondition(condition, context))) {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluate single condition
   */
  private async evaluateCondition(condition: WorkflowCondition, context: any): Promise<boolean> {
    let actualValue: any;

    switch (condition.type) {
      case 'time':
        actualValue = new Date();
        break;
      case 'file_exists':
        actualValue = await this.checkFileExists(condition.path);
        break;
      case 'file_changed':
        actualValue = context.file?.path === condition.path;
        break;
      case 'config_value':
        actualValue = this.getConfigValue(condition.path);
        break;
      case 'git_status':
        actualValue = await this.getGitStatus(condition.path);
        break;
      default:
        return true;
    }

    return this.compareValues(actualValue, condition.operator, condition.value);
  }

  /**
   * Compare values based on operator
   */
  private compareValues(actual: any, operator: string, expected: any): boolean {
    switch (operator) {
      case 'equals':
        return actual === expected;
      case 'not_equals':
        return actual !== expected;
      case 'contains':
        return String(actual).includes(String(expected));
      case 'not_contains':
        return !String(actual).includes(String(expected));
      case 'greater_than':
        return Number(actual) > Number(expected);
      case 'less_than':
        return Number(actual) < Number(expected);
      case 'matches':
        return new RegExp(expected).test(String(actual));
      default:
        return true;
    }
  }

  /**
   * Execute workflow actions
   */
  private async executeWorkflowActions(workflow: Workflow, execution: WorkflowExecution, context: any): Promise<void> {
    for (const action of workflow.actions) {
      try {
        const result = await this.executeAction(action, context);
        execution.results.push({
          actionId: action.id,
          result,
          timestamp: new Date()
        });
      } catch (error) {
        const errorMessage = `Action ${action.id} failed: ${error}`;
        execution.errors.push(errorMessage);
        
        // Decide whether to continue or abort
        if (action.config?.continueOnError !== true) {
          throw new Error(errorMessage);
        }
      }
    }
  }

  /**
   * Execute single action
   */
  private async executeAction(action: WorkflowAction, context: any): Promise<any> {
    const retryPolicy = action.retryPolicy || { maxRetries: 0, backoffMs: 1000 };
    let lastError: Error;

    for (let attempt = 1; attempt <= retryPolicy.maxRetries + 1; attempt++) {
      try {
        switch (action.type) {
          case 'command':
            return await this.executeCommandAction(action, context);
          case 'api_call':
            return await this.executeApiCallAction(action, context);
          case 'file_operation':
            return await this.executeFileOperationAction(action, context);
          case 'notification':
            return await this.executeNotificationAction(action, context);
          case 'sync':
            return await this.executeSyncAction(action, context);
          case 'plugin_execute':
            return await this.executePluginAction(action, context);
          default:
            throw new Error(`Unknown action type: ${action.type}`);
        }
      } catch (error) {
        lastError = error as Error;
        
        if (attempt <= retryPolicy.maxRetries) {
          const delay = retryPolicy.backoffMs * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  /**
   * Execute command action
   */
  private async executeCommandAction(action: WorkflowAction, context: any): Promise<any> {
    const command = action.config.command;
    const args = action.config.args || [];
    const cwd = action.config.cwd || process.cwd();

    console.log(chalk.blue(`🔧 Executing command: ${command}`));
    
    const { spawn } = require('child_process');
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd,
        stdio: 'pipe',
        shell: true
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      child.on('close', (code: number) => {
        resolve({
          exitCode: code,
          stdout,
          stderr,
          success: code === 0
        });
      });

      child.on('error', reject);
    });
  }

  /**
   * Execute API call action
   */
  private async executeApiCallAction(action: WorkflowAction, context: any): Promise<any> {
    const url = action.config.url;
    const method = action.config.method || 'GET';
    const headers = action.config.headers || {};
    const body = action.config.body;

    console.log(chalk.blue(`🌐 Making API call: ${method} ${url}`));

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    return {
      status: response.status,
      headers: response.headers,
      body: await response.text(),
      success: response.ok
    };
  }

  /**
   * Execute file operation action
   */
  private async executeFileOperationAction(action: WorkflowAction, context: any): Promise<any> {
    const operation = action.config.operation;
    const path = action.config.path;

    console.log(chalk.blue(`📁 File operation: ${operation} ${path}`));

    switch (operation) {
      case 'create':
        await this.writeFile(path, action.config.content);
        return { created: path };
      case 'delete':
        await this.deleteFile(path);
        return { deleted: path };
      case 'copy':
        await this.copyFile(action.config.source, path);
        return { copied: { from: action.config.source, to: path } };
      case 'move':
        await this.moveFile(action.config.source, path);
        return { moved: { from: action.config.source, to: path } };
      default:
        throw new Error(`Unknown file operation: ${operation}`);
    }
  }

  /**
   * Execute notification action
   */
  private async executeNotificationAction(action: WorkflowAction, context: any): Promise<any> {
    const message = action.config.message;
    const type = action.config.type || 'info';
    const channels = action.config.channels || ['console'];

    console.log(chalk.blue(`📢 Sending notification: ${message}`));

    for (const channel of channels) {
      switch (channel) {
        case 'console':
          this.logNotification(type, message);
          break;
        case 'email':
          await this.sendEmailNotification(action.config);
          break;
        case 'slack':
          await this.sendSlackNotification(action.config);
          break;
        case 'webhook':
          await this.sendWebhookNotification(action.config);
          break;
      }
    }

    return { notified: channels };
  }

  /**
   * Execute sync action
   */
  private async executeSyncAction(action: WorkflowAction, context: any): Promise<any> {
    const direction = action.config.direction || 'bidirectional';
    const dryRun = action.config.dryRun || false;

    console.log(chalk.blue(`🔄 Executing sync: ${direction}`));

    // This would integrate with the sync engine
    return {
      sync: {
        direction,
        dryRun,
        timestamp: new Date()
      }
    };
  }

  /**
   * Execute plugin action
   */
  private async executePluginAction(action: WorkflowAction, context: any): Promise<any> {
    const pluginName = action.config.plugin;
    const method = action.config.method;
    const args = action.config.args || [];

    console.log(chalk.blue(`🔌 Executing plugin: ${pluginName}.${method}`));

    // This would integrate with the plugin system
    return {
      plugin: pluginName,
      method,
      args,
      result: `Plugin ${pluginName}.${method} executed`
    };
  }

  /**
   * Utility methods
   */
  private generateExecutionId(): string {
    return `exec-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private parseCronToInterval(cron: string): number {
    // Simple cron parser - in production would use a proper cron library
    if (cron === '0 * * * *') return 60 * 60 * 1000; // Hourly
    if (cron === '0 0 * * *') return 24 * 60 * 60 * 1000; // Daily
    return 60 * 60 * 1000; // Default to hourly
  }

  private async checkFileExists(path: string): Promise<boolean> {
    const fs = require('fs').promises;
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  private getConfigValue(path: string): any {
    // This would integrate with config system
    return process.env[path.replace('.', '_')];
  }

  private async getGitStatus(path?: string): Promise<string> {
    const { exec } = require('child_process');
    return new Promise((resolve, reject) => {
      exec('git status --porcelain', { cwd: path }, (error, stdout) => {
        if (error) reject(error);
        else resolve(stdout.trim());
      });
    });
  }

  private async writeFile(path: string, content: string): Promise<void> {
    const fs = require('fs').promises;
    await fs.writeFile(path, content, 'utf8');
  }

  private async deleteFile(path: string): Promise<void> {
    const fs = require('fs').promises;
    await fs.unlink(path);
  }

  private async copyFile(source: string, target: string): Promise<void> {
    const fs = require('fs').promises;
    await fs.copyFile(source, target);
  }

  private async moveFile(source: string, target: string): Promise<void> {
    const fs = require('fs').promises;
    await fs.rename(source, target);
  }

  private logNotification(type: string, message: string): void {
    const colors = {
      info: chalk.blue,
      success: chalk.green,
      warning: chalk.yellow,
      error: chalk.red
    };
    const color = colors[type as keyof typeof colors] || chalk.blue;
    console.log(color(`📢 ${message}`));
  }

  private async sendEmailNotification(config: any): Promise<void> {
    // Email implementation would go here
    console.log(chalk.blue(`📧 Email sent to ${config.to}`));
  }

  private async sendSlackNotification(config: any): Promise<void> {
    // Slack implementation would go here
    console.log(chalk.blue(`💬 Slack message sent to ${config.channel}`));
  }

  private async sendWebhookNotification(config: any): Promise<void> {
    // Webhook implementation would go here
    console.log(chalk.blue(`🪝 Webhook sent to ${config.url}`));
  }

  private validateWorkflow(workflow: Workflow): void {
    if (!workflow.id || !workflow.name) {
      throw ErrorFactory.validation(
        ErrorCode.VALIDATION_FAILED,
        'Workflow must have id and name'
      );
    }

    if (!workflow.triggers || workflow.triggers.length === 0) {
      throw ErrorFactory.validation(
        ErrorCode.VALIDATION_FAILED,
        'Workflow must have at least one trigger'
      );
    }

    if (!workflow.actions || workflow.actions.length === 0) {
      throw ErrorFactory.validation(
        ErrorCode.VALIDATION_FAILED,
        'Workflow must have at least one action'
      );
    }
  }

  private async cleanupWorkflowTriggers(workflow: Workflow): Promise<void> {
    // Cleanup schedules
    for (const [scheduleId, timer] of this.schedules) {
      if (scheduleId.startsWith(workflow.id)) {
        clearInterval(timer);
        this.schedules.delete(scheduleId);
      }
    }

    // Cleanup file watchers
    for (const [watcherId, watcher] of this.fileWatchers) {
      if (watcherId.startsWith(workflow.id)) {
        await watcher.close();
        this.fileWatchers.delete(watcherId);
      }
    }

    // Remove event listeners (simplified - would need more sophisticated tracking)
    this.removeAllListeners();
  }

  private async cancelWorkflowExecutions(workflowId: string): Promise<void> {
    for (const [executionId, execution] of this.executions) {
      if (execution.workflowId === workflowId && 
          (execution.status === 'pending' || execution.status === 'running')) {
        execution.status = 'cancelled';
        execution.endTime = new Date();
        this.addToHistory(execution);
        this.executions.delete(executionId);
      }
    }
  }

  private addToHistory(execution: WorkflowExecution): void {
    this.executionHistory.push(execution);
    if (this.executionHistory.length > 1000) {
      this.executionHistory.splice(0, 500); // Keep last 500
    }
  }

  private setupEventHandlers(): void {
    this.on('error', (error) => {
      console.error(chalk.red('Workflow Engine Error:'), error);
    });
  }
}

// Export singleton instance
export const workflowEngine = new WorkflowEngine();