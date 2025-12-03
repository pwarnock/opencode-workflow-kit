import { spawn } from "child_process";
import { BeadsIssue, BeadsComment, BeadsClient } from "../types/index.js";
import chalk from "chalk";

/**
 * Real BeadsClient implementation using @beads/bd npm package
 */
export class BeadsClientImpl implements BeadsClient {
  public projectPath: string;

  constructor(config: { projectPath?: string }) {
    if (!config.projectPath) {
      throw new Error("Beads project path is required");
    }
    this.projectPath = config.projectPath;
  }

  private async runBeadsCommand(
    args: string[],
    projectPath?: string,
    input?: any,
  ): Promise<any> {
    const cwd = projectPath || this.projectPath;
    return new Promise((resolve, reject) => {
      const child = spawn("bd", args, {
        cwd,
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      child.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("close", (code) => {
        if (code === 0) {
          try {
            const result = stdout.trim() ? JSON.parse(stdout) : {};
            resolve(result);
          } catch (error) {
            // If JSON parsing fails, return raw stdout
            resolve(stdout.trim());
          }
        } else {
          reject(new Error(`bd command failed with code ${code}: ${stderr}`));
        }
      });

      child.on("error", (error) => {
        reject(new Error(`Failed to run bd command: ${error.message}`));
      });

      // Send input if provided
      if (input) {
        if (typeof input === "string") {
          child.stdin?.write(input);
        } else {
          child.stdin?.write(JSON.stringify(input));
        }
        child.stdin?.end();
      }
    });
  }

  async getIssues(
    projectPath: string,
    options?: { since?: Date },
  ): Promise<BeadsIssue[]> {
    try {
      const args = ["list", "--json"];

      if (options?.since) {
        args.push("--since", options.since.toISOString());
      }

      const result = await this.runBeadsCommand(args, projectPath);

      // Handle different output formats from bd
      let issues: any[] = [];
      if (Array.isArray(result)) {
        issues = result;
      } else if (result.issues) {
        issues = result.issues;
      } else if (typeof result === "object") {
        issues = Object.values(result);
      }

      return issues.map(this.mapToBeadsIssue);
    } catch (error) {
      console.warn(
        chalk.yellow(`⚠️  Failed to get issues from Beads: ${error}`),
      );
      return [];
    }
  }

  async createIssue(
    projectPath: string,
    issue: Partial<BeadsIssue>,
  ): Promise<BeadsIssue> {
    const args = ["create", issue.title || "", "--json"];

    if (issue.description) {
      args.push("--description", issue.description);
    }

    if (issue.status) {
      args.push("--status", issue.status);
    }

    if (issue.priority) {
      args.push("--priority", issue.priority);
    }

    if (issue.assignee) {
      args.push("--assignee", issue.assignee);
    }

    if (issue.labels && issue.labels.length > 0) {
      args.push("--labels", issue.labels.join(","));
    }

    if (issue.metadata) {
      args.push("--metadata", JSON.stringify(issue.metadata));
    }

    const result = await this.runBeadsCommand(args, projectPath);
    return this.mapToBeadsIssue(result);
  }

  async updateIssue(
    projectPath: string,
    issueId: string,
    update: Partial<BeadsIssue>,
  ): Promise<BeadsIssue> {
    const args = ["update", issueId, "--json"];

    if (update.title !== undefined) {
      args.push("--title", update.title);
    }

    if (update.description !== undefined) {
      args.push("--description", update.description);
    }

    if (update.status !== undefined) {
      args.push("--status", update.status);
    }

    if (update.priority !== undefined) {
      args.push("--priority", update.priority);
    }

    if (update.assignee !== undefined) {
      args.push("--assignee", update.assignee);
    }

    if (update.labels !== undefined) {
      args.push("--labels", update.labels.join(","));
    }

    if (update.metadata !== undefined) {
      args.push("--metadata", JSON.stringify(update.metadata));
    }

    const result = await this.runBeadsCommand(args, projectPath);
    return this.mapToBeadsIssue(result);
  }

  async createComment(
    projectPath: string,
    issueId: string,
    comment: Partial<BeadsComment>,
  ): Promise<BeadsComment> {
    const args = [
      "comment",
      "create",
      issueId,
      comment.content || "",
      "--json",
    ];

    if (comment.author) {
      args.push("--author", comment.author);
    }

    const result = await this.runBeadsCommand(args, projectPath);
    return this.mapToBeadsComment(result);
  }

  async updateComment(
    projectPath: string,
    issueId: string,
    commentId: string,
    comment: Partial<BeadsComment>,
  ): Promise<BeadsComment> {
    const args = ["comment", "update", issueId, commentId, "--json"];

    if (comment.content !== undefined) {
      args.push("--content", comment.content);
    }

    const result = await this.runBeadsCommand(args, projectPath);
    return this.mapToBeadsComment(result);
  }

  async deleteComment(
    projectPath: string,
    issueId: string,
    commentId: string,
  ): Promise<void> {
    const args = ["comment", "delete", issueId, commentId];

    await this.runBeadsCommand(args, projectPath);
  }

  async addLabel(
    projectPath: string,
    issueId: string,
    label: string,
  ): Promise<void> {
    const args = ["label", "add", issueId, label];

    await this.runBeadsCommand(args, projectPath);
  }

  async removeLabel(
    projectPath: string,
    issueId: string,
    label: string,
  ): Promise<void> {
    const args = ["label", "remove", issueId, label];

    await this.runBeadsCommand(args, projectPath);
  }

  private mapToBeadsIssue(data: any): BeadsIssue {
    return {
      id: data.id || data.number || data.key || "",
      title: data.title || data.summary || "",
      description: data.description || data.body || "",
      status: data.status || data.state || "open",
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
      id: data.id || data.comment_id || "",
      content: data.content || data.body || data.text || "",
      author: data.author || data.user || data.created_by || "",
      created_at: data.created_at || data.created || new Date().toISOString(),
      updated_at: data.updated_at || data.updated || new Date().toISOString(),
    };
  }

  /**
   * Check if bd command is available
   */
  async isAvailable(): Promise<boolean> {
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
        const child = spawn("bd", ["--version"], {
          stdio: ["pipe", "pipe", "pipe"],
        });

        child.on("close", (code) => {
          if (code === 0) {
            resolve(true);
          } else {
            reject(new Error(`bd command failed with code ${code}`));
          }
        });

        child.on("error", (error) => {
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
        const child = spawn("bd", ["--version"], {
          stdio: ["pipe", "pipe", "pipe"],
        });

        let stdout = "";

        child.stdout?.on("data", (data) => {
          stdout += data.toString();
        });

        child.on("close", (code) => {
          if (code === 0) {
            resolve(stdout.trim());
          } else {
            reject(new Error(`bd command failed with code ${code}`));
          }
        });

        child.on("error", (error) => {
          reject(new Error(`Failed to run bd command: ${error.message}`));
        });
      });
    } catch {
      return "unknown";
    }
  }
}
