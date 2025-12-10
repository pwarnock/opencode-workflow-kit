import { BeadsIssue, BeadsComment, BeadsClient } from "../../types/index.js";
import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import chalk from "chalk";

/**
 * Fallback Beads Client
 * Direct file-based implementation for when bd CLI is not available
 */
export class FallbackBeadsClient implements BeadsClient {
  public projectPath: string;

  constructor(config: { projectPath?: string }) {
    if (!config.projectPath) {
      throw new Error("Beads project path is required");
    }
    this.projectPath = config.projectPath;
  }

  private getIssuesFilePath(): string {
    return join(this.projectPath, ".beads", "issues.jsonl");
  }

  private async ensureIssuesFileExists(): Promise<void> {
    const filePath = this.getIssuesFilePath();
    if (!existsSync(filePath)) {
      // Create the .beads directory if it doesn't exist
      const beadsDir = join(this.projectPath, ".beads");
      if (!existsSync(beadsDir)) {
        await import("fs/promises").then((fs) =>
          fs.mkdir(beadsDir, { recursive: true }),
        );
      }
      // Create empty file
      await writeFile(filePath, "");
    }
  }

  private async readIssuesFromFile(): Promise<BeadsIssue[]> {
    const filePath = this.getIssuesFilePath();
    if (!existsSync(filePath)) {
      return [];
    }

    try {
      const content = await readFile(filePath, "utf-8");
      if (!content.trim()) {
        return [];
      }

      const lines = content.trim().split("\n");
      return lines
        .map((line) => {
          try {
            const data = JSON.parse(line);
            return this.mapToBeadsIssue(data);
          } catch (error) {
            console.warn(
              chalk.yellow(`⚠️  Failed to parse issue line: ${error}`),
            );
            return null;
          }
        })
        .filter(Boolean) as BeadsIssue[];
    } catch (error) {
      console.error(chalk.red(`❌ Failed to read issues file: ${error}`));
      return [];
    }
  }

  private async writeIssuesToFile(issues: BeadsIssue[]): Promise<void> {
    const filePath = this.getIssuesFilePath();
    const content = issues.map((issue) => JSON.stringify(issue)).join("\n");
    await writeFile(filePath, content + "\n");
  }

  async getIssues(
    _projectPath: string,
    options?: { since?: Date },
  ): Promise<BeadsIssue[]> {
    try {
      const issues = await this.readIssuesFromFile();

      // Filter by since date if provided
      if (options?.since) {
        return issues.filter(
          (issue) => new Date(issue.created_at) >= options.since!,
        );
      }

      return issues;
    } catch (error) {
      console.error(chalk.red(`❌ Failed to get issues: ${error}`));
      return [];
    }
  }

  async createIssue(
    _projectPath: string,
    issue: Partial<BeadsIssue>,
  ): Promise<BeadsIssue> {
    await this.ensureIssuesFileExists();

    const newIssue: BeadsIssue = {
      id: `local-${Date.now()}`,
      title: issue.title || "Untitled",
      description: issue.description || "",
      status: issue.status || "open",
      priority: issue.priority || "",
      assignee: issue.assignee || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      labels: issue.labels || [],
      metadata: issue.metadata || {},
      comments: issue.comments || [],
    };

    try {
      const existingIssues = await this.readIssuesFromFile();
      existingIssues.push(newIssue);
      await this.writeIssuesToFile(existingIssues);
      return newIssue;
    } catch (error) {
      console.error(chalk.red(`❌ Failed to create issue: ${error}`));
      throw error;
    }
  }

  async updateIssue(
    _projectPath: string,
    issueId: string,
    update: Partial<BeadsIssue>,
  ): Promise<BeadsIssue> {
    try {
      const existingIssues = await this.readIssuesFromFile();
      const issueIndex = existingIssues.findIndex(
        (issue) => issue.id === issueId,
      );

      if (issueIndex === -1) {
        throw new Error(`Issue not found: ${issueId}`);
      }

      const updatedIssue = {
        ...existingIssues[issueIndex],
        ...update,
        updated_at: new Date().toISOString(),
      };

      existingIssues[issueIndex] = updatedIssue;
      await this.writeIssuesToFile(existingIssues);

      return updatedIssue;
    } catch (error) {
      console.error(chalk.red(`❌ Failed to update issue: ${error}`));
      throw error;
    }
  }

  async createComment(
    _projectPath: string,
    issueId: string,
    comment: Partial<BeadsComment>,
  ): Promise<BeadsComment> {
    try {
      const existingIssues = await this.readIssuesFromFile();
      const issueIndex = existingIssues.findIndex(
        (issue) => issue.id === issueId,
      );

      if (issueIndex === -1) {
        throw new Error(`Issue not found: ${issueId}`);
      }

      const newComment: BeadsComment = {
        id: `comment-${Date.now()}`,
        content: comment.content || "",
        author: comment.author || "system",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const updatedIssue = {
        ...existingIssues[issueIndex],
        comments: [...(existingIssues[issueIndex].comments || []), newComment],
        updated_at: new Date().toISOString(),
      };

      existingIssues[issueIndex] = updatedIssue;
      await this.writeIssuesToFile(existingIssues);

      return newComment;
    } catch (error) {
      console.error(chalk.red(`❌ Failed to create comment: ${error}`));
      throw error;
    }
  }

  async updateComment(
    _projectPath: string,
    issueId: string,
    commentId: string,
    comment: Partial<BeadsComment>,
  ): Promise<BeadsComment> {
    try {
      const existingIssues = await this.readIssuesFromFile();
      const issueIndex = existingIssues.findIndex(
        (issue) => issue.id === issueId,
      );

      if (issueIndex === -1) {
        throw new Error(`Issue not found: ${issueId}`);
      }

      const issue = existingIssues[issueIndex];
      const commentIndex =
        issue.comments?.findIndex((c) => c.id === commentId) || -1;

      if (commentIndex === -1) {
        throw new Error(`Comment not found: ${commentId}`);
      }

      const updatedComment: BeadsComment = {
        ...issue.comments?.[commentIndex],
        ...comment,
        id:
          comment.id ||
          issue.comments?.[commentIndex]?.id ||
          `comment-${Date.now()}`,
        content:
          comment.content || issue.comments?.[commentIndex]?.content || "",
        author:
          comment.author || issue.comments?.[commentIndex]?.author || "system",
        created_at:
          comment.created_at ||
          issue.comments?.[commentIndex]?.created_at ||
          new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      issue.comments = issue.comments || [];
      issue.comments[commentIndex] = updatedComment;
      issue.updated_at = new Date().toISOString();

      existingIssues[issueIndex] = issue;
      await this.writeIssuesToFile(existingIssues);

      return updatedComment;
    } catch (error) {
      console.error(chalk.red(`❌ Failed to update comment: ${error}`));
      throw error;
    }
  }

  async deleteComment(
    _projectPath: string,
    issueId: string,
    commentId: string,
  ): Promise<void> {
    try {
      const existingIssues = await this.readIssuesFromFile();
      const issueIndex = existingIssues.findIndex(
        (issue) => issue.id === issueId,
      );

      if (issueIndex === -1) {
        throw new Error(`Issue not found: ${issueId}`);
      }

      const issue = existingIssues[issueIndex];
      issue.comments = issue.comments?.filter((c) => c.id !== commentId) || [];
      issue.updated_at = new Date().toISOString();

      existingIssues[issueIndex] = issue;
      await this.writeIssuesToFile(existingIssues);
    } catch (error) {
      console.error(chalk.red(`❌ Failed to delete comment: ${error}`));
      throw error;
    }
  }

  async addLabel(
    _projectPath: string,
    issueId: string,
    label: string,
  ): Promise<void> {
    try {
      const existingIssues = await this.readIssuesFromFile();
      const issueIndex = existingIssues.findIndex(
        (issue) => issue.id === issueId,
      );

      if (issueIndex === -1) {
        throw new Error(`Issue not found: ${issueId}`);
      }

      const issue = existingIssues[issueIndex];
      if (!issue.labels) {
        issue.labels = [];
      }

      if (!issue.labels.includes(label)) {
        issue.labels.push(label);
        issue.updated_at = new Date().toISOString();
        await this.writeIssuesToFile(existingIssues);
      }
    } catch (error) {
      console.error(chalk.red(`❌ Failed to add label: ${error}`));
      throw error;
    }
  }

  async removeLabel(
    _projectPath: string,
    issueId: string,
    label: string,
  ): Promise<void> {
    try {
      const existingIssues = await this.readIssuesFromFile();
      const issueIndex = existingIssues.findIndex(
        (issue) => issue.id === issueId,
      );

      if (issueIndex === -1) {
        throw new Error(`Issue not found: ${issueId}`);
      }

      const issue = existingIssues[issueIndex];
      issue.labels = issue.labels?.filter((l) => l !== label) || [];
      issue.updated_at = new Date().toISOString();

      await this.writeIssuesToFile(existingIssues);
    } catch (error) {
      console.error(chalk.red(`❌ Failed to remove label: ${error}`));
      throw error;
    }
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

  async isAvailable(): Promise<boolean> {
    // Fallback client is always available
    return true;
  }

  async getVersion(): Promise<string> {
    return "fallback-1.0.0";
  }
}
