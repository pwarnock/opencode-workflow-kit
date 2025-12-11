import { spawn } from 'child_process';
import { BeadsIssue, BeadsComment, BeadsClient } from '../types/index.js';
import chalk from 'chalk';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Real BeadsClient implementation using @beads/bd npm package
 */
export class BeadsClientImpl implements BeadsClient {
  public projectPath: string;
  private useFallback: boolean = false;

  constructor(config: { projectPath?: string }) {
    if (!config.projectPath) {
      throw new Error('Beads project path is required');
    }
    this.projectPath = config.projectPath;
  }

  private async runBeadsCommand(
    args: string[],
    projectPath?: string,
    input?: any
  ): Promise<any> {
    const cwd = projectPath || this.projectPath;

    // Check if bd command is available, if not use fallback
    if (this.useFallback) {
      return this.runFallbackCommand(args, cwd, input);
    }

    return new Promise((resolve, reject) => {
      const child = spawn('bun', ['x', 'bd', ...args], {
        cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          try {
            const result = stdout.trim() ? JSON.parse(stdout) : {};
            resolve(result);
          } catch (error) {
            // If JSON parsing fails, return raw stdout
            resolve(stdout.trim());
          }
        } else {
          // If bd command fails, switch to fallback mode
          console.warn(
            chalk.yellow(
              `⚠️  bd command failed, switching to fallback mode: ${stderr}`
            )
          );
          this.useFallback = true;
          this.runFallbackCommand(args, cwd, input).then(resolve).catch(reject);
        }
      });

      child.on('error', (error) => {
        // If bd command fails to spawn, switch to fallback mode
        console.warn(
          chalk.yellow(
            `⚠️  Failed to run bd command, switching to fallback mode: ${error.message}`
          )
        );
        this.useFallback = true;
        this.runFallbackCommand(args, cwd, input).then(resolve).catch(reject);
      });

      // Send input if provided
      if (input) {
        if (typeof input === 'string') {
          child.stdin?.write(input);
        } else {
          child.stdin?.write(JSON.stringify(input));
        }
        child.stdin?.end();
      }
    });
  }

  private async runFallbackCommand(
    args: string[],
    projectPath: string,
    input?: any
  ): Promise<any> {
    const command = args[0];

    try {
      if (command === 'list') {
        return this.getIssuesFromFile(projectPath);
      } else if (command === 'create') {
        return this.createIssueInFile(projectPath, input);
      } else if (command === 'update') {
        const issueId = args[1];
        return this.updateIssueInFile(projectPath, issueId, input);
      } else {
        throw new Error(`Unsupported command in fallback mode: ${command}`);
      }
    } catch (error) {
      console.error(chalk.red(`❌ Fallback command failed: ${error}`));
      throw error;
    }
  }

  private async getIssuesFromFile(projectPath: string): Promise<any> {
    const filePath = join(projectPath, '.beads', 'issues.jsonl');
    if (!existsSync(filePath)) {
      return [];
    }

    try {
      const content = await readFile(filePath, 'utf-8');
      if (!content.trim()) {
        return [];
      }

      const lines = content.trim().split('\n');
      return lines
        .map((line) => {
          try {
            return JSON.parse(line);
          } catch (error) {
            console.warn(
              chalk.yellow(`⚠️  Failed to parse issue line: ${error}`)
            );
            return null;
          }
        })
        .filter(Boolean);
    } catch (error) {
      console.error(chalk.red(`❌ Failed to read issues file: ${error}`));
      return [];
    }
  }

  private async createIssueInFile(
    projectPath: string,
    input: any
  ): Promise<any> {
    const filePath = join(projectPath, '.beads', 'issues.jsonl');
    const issues = await this.getIssuesFromFile(projectPath);

    // Parse input to get issue data
    let title = '';
    let description = '';
    let status = 'open';
    let priority: string | undefined;
    let assignee: string | undefined;
    let labels: string[] = [];
    let metadata: Record<string, any> = {};

    if (typeof input === 'string') {
      try {
        const parsed = JSON.parse(input);
        title = parsed.title || '';
        description = parsed.description || '';
        status = parsed.status || 'open';
        priority = parsed.priority;
        assignee = parsed.assignee;
        labels = parsed.labels || [];
        metadata = parsed.metadata || {};
      } catch (error) {
        // If JSON parsing fails, use the string as title
        title = input;
      }
    } else if (typeof input === 'object') {
      title = input.title || '';
      description = input.description || '';
      status = input.status || 'open';
      priority = input.priority;
      assignee = input.assignee;
      labels = input.labels || [];
      metadata = input.metadata || {};
    }

    const newIssue = {
      id: `local-${Date.now()}`,
      title,
      description,
      status,
      priority,
      assignee,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      labels,
      metadata,
      comments: [],
    };

    issues.push(newIssue);
    await this.writeIssuesToFile(filePath, issues);
    return newIssue;
  }

  private async updateIssueInFile(
    projectPath: string,
    issueId: string,
    input: any
  ): Promise<any> {
    const filePath = join(projectPath, '.beads', 'issues.jsonl');
    const issues = await this.getIssuesFromFile(projectPath);
    const issueIndex = issues.findIndex((issue: any) => issue.id === issueId);

    if (issueIndex === -1) {
      throw new Error(`Issue not found: ${issueId}`);
    }

    // Parse input to get update data
    let updates: Record<string, any> = {};

    if (typeof input === 'string') {
      try {
        updates = JSON.parse(input);
      } catch (error) {
        // If JSON parsing fails, assume it's a status update
        updates = { status: input };
      }
    } else if (typeof input === 'object') {
      updates = input;
    }

    const updatedIssue = {
      ...issues[issueIndex],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    issues[issueIndex] = updatedIssue;
    await this.writeIssuesToFile(filePath, issues);
    return updatedIssue;
  }

  private async writeIssuesToFile(
    filePath: string,
    issues: any[]
  ): Promise<void> {
    const content = issues.map((issue) => JSON.stringify(issue)).join('\n');
    const { writeFile } = await import('fs/promises');
    await writeFile(filePath, content + '\n');
  }

  async getIssues(
    projectPath: string,
    options?: { since?: Date }
  ): Promise<BeadsIssue[]> {
    try {
      const args = ['list', '--json'];

      if (options?.since) {
        args.push('--since', options.since.toISOString());
      }

      const result = await this.runBeadsCommand(args, projectPath);

      // Handle different output formats from bd
      let issues: any[] = [];
      if (Array.isArray(result)) {
        issues = result;
      } else if (result.issues) {
        issues = result.issues;
      } else if (typeof result === 'object') {
        issues = Object.values(result);
      }

      return issues.map(this.mapToBeadsIssue);
    } catch (error) {
      console.warn(
        chalk.yellow(`⚠️  Failed to get issues from Beads: ${error}`)
      );
      return [];
    }
  }

  async createIssue(
    projectPath: string,
    issue: Partial<BeadsIssue>
  ): Promise<BeadsIssue> {
    const args = ['create', issue.title || '', '--json'];

    if (issue.description) {
      args.push('--description', issue.description);
    }

    if (issue.status) {
      args.push('--status', issue.status);
    }

    if (issue.priority) {
      args.push('--priority', issue.priority);
    }

    if (issue.assignee) {
      args.push('--assignee', issue.assignee);
    }

    if (issue.labels && issue.labels.length > 0) {
      args.push('--labels', issue.labels.join(','));
    }

    if (issue.metadata) {
      args.push('--metadata', JSON.stringify(issue.metadata));
    }

    const result = await this.runBeadsCommand(args, projectPath);
    return this.mapToBeadsIssue(result);
  }

  async updateIssue(
    projectPath: string,
    issueId: string,
    update: Partial<BeadsIssue>
  ): Promise<BeadsIssue> {
    const args = ['update', issueId, '--json'];

    if (update.title !== undefined) {
      args.push('--title', update.title);
    }

    if (update.description !== undefined) {
      args.push('--description', update.description);
    }

    if (update.status !== undefined) {
      args.push('--status', update.status);
    }

    if (update.priority !== undefined) {
      args.push('--priority', update.priority);
    }

    if (update.assignee !== undefined) {
      args.push('--assignee', update.assignee);
    }

    if (update.labels !== undefined) {
      args.push('--labels', update.labels.join(','));
    }

    if (update.metadata !== undefined) {
      args.push('--metadata', JSON.stringify(update.metadata));
    }

    const result = await this.runBeadsCommand(args, projectPath);
    return this.mapToBeadsIssue(result);
  }

  async createComment(
    projectPath: string,
    issueId: string,
    comment: Partial<BeadsComment>
  ): Promise<BeadsComment> {
    const args = [
      'comment',
      'create',
      issueId,
      comment.content || '',
      '--json',
    ];

    if (comment.author) {
      args.push('--author', comment.author);
    }

    const result = await this.runBeadsCommand(args, projectPath);
    return this.mapToBeadsComment(result);
  }

  async updateComment(
    projectPath: string,
    issueId: string,
    commentId: string,
    comment: Partial<BeadsComment>
  ): Promise<BeadsComment> {
    const args = ['comment', 'update', issueId, commentId, '--json'];

    if (comment.content !== undefined) {
      args.push('--content', comment.content);
    }

    const result = await this.runBeadsCommand(args, projectPath);
    return this.mapToBeadsComment(result);
  }

  async deleteComment(
    projectPath: string,
    issueId: string,
    commentId: string
  ): Promise<void> {
    const args = ['comment', 'delete', issueId, commentId];

    await this.runBeadsCommand(args, projectPath);
  }

  async addLabel(
    projectPath: string,
    issueId: string,
    label: string
  ): Promise<void> {
    const args = ['label', 'add', issueId, label];

    await this.runBeadsCommand(args, projectPath);
  }

  async removeLabel(
    projectPath: string,
    issueId: string,
    label: string
  ): Promise<void> {
    const args = ['label', 'remove', issueId, label];

    await this.runBeadsCommand(args, projectPath);
  }

  private mapToBeadsIssue(data: any): BeadsIssue {
    return {
      id: data.id || data.number || data.key || '',
      title: data.title || data.summary || '',
      description: data.description || data.body || '',
      status: data.status || data.state || 'open',
      priority: data.priority,
      assignee: data.assignee || data.assigned_to,
      labels: data.labels || data.tags || [],
      created_at: data.created_at || data.created || new Date().toISOString(),
      updated_at: data.updated_at || data.updated || new Date().toISOString(),
      metadata: data.metadata || data.extra || {},
      comments: data.comments?.map(this.mapToBeadsComment) || [],
    };
  }

  private mapToBeadsComment(data: any): BeadsComment {
    return {
      id: data.id || data.comment_id || '',
      content: data.content || data.body || data.text || '',
      author: data.author || data.user || data.created_by || '',
      created_at: data.created_at || data.created || new Date().toISOString(),
      updated_at: data.updated_at || data.updated || new Date().toISOString(),
    };
  }

  /**
   * Check if bd command is available
   */
  async isAvailable(): Promise<boolean> {
    // Directly call the static method to avoid circular dependency
    return BeadsClientImpl.isAvailable();
  }

  /**
   * Get bd version
   */
  async getVersion(): Promise<string> {
    return BeadsClientImpl.getVersion();
  }

  /**
   * Static check if bd command is available
   */
  static async isAvailable(): Promise<boolean> {
    try {
      await new Promise((resolve, reject) => {
        const child = spawn('bun', ['x', 'bd', '--version'], {
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        child.on('close', (code) => {
          if (code === 0) {
            resolve(true);
          } else {
            reject(new Error(`bd command failed with code ${code}`));
          }
        });

        child.on('error', (error) => {
          reject(new Error(`Failed to run bd command: ${error.message}`));
        });
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get bd version
   */
  static async getVersion(): Promise<string> {
    try {
      return new Promise((resolve, reject) => {
        const child = spawn('bun', ['x', 'bd', '--version'], {
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        let stdout = '';

        child.stdout?.on('data', (data) => {
          stdout += data.toString();
        });

        child.on('close', (code) => {
          if (code === 0) {
            resolve(stdout.trim());
          } else {
            reject(new Error(`bd command failed with code ${code}`));
          }
        });

        child.on('error', (error) => {
          reject(new Error(`Failed to run bd command: ${error.message}`));
        });
      });
    } catch {
      return 'unknown';
    }
  }
}
