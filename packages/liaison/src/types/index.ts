/**
 * Core types for Cody-Beads integration
 */

export interface CodyBeadsConfig {
  version: string;
  github: {
    token?: string;
    apiUrl?: string;
    owner: string;
    repo: string;
  };
  cody: {
    projectId?: string;
    apiUrl?: string;
    webhookSecret?: string;
  };
  beads: {
    projectPath?: string;
    configPath?: string;
    autoSync?: boolean;
    syncInterval?: number;
  };
  sync: {
    defaultDirection: SyncDirection;
    conflictResolution: ConflictResolutionStrategy;
    preserveComments: boolean;
    preserveLabels: boolean;
    syncMilestones: boolean;
    excludeLabels?: string[];
    includeLabels?: string[];
  };
  templates: {
    defaultTemplate: string;
    templatePath?: string;
  };
}

export type SyncDirection = "cody-to-beads" | "beads-to-cody" | "bidirectional";

export type ConflictResolutionStrategy =
  | "manual"
  | "cody-wins"
  | "beads-wins"
  | "newer-wins"
  | "prompt";

export interface SyncOptions {
  direction: SyncDirection;
  dryRun: boolean;
  force: boolean;
  since?: Date | undefined;
}

export interface SyncResult {
  success: boolean;
  issuesSynced: number;
  prsSynced: number;
  conflicts: SyncConflict[];
  errors: string[];
  duration: number;
  timestamp: Date;
}

export interface SyncConflict {
  type: "issue" | "pull-request" | "comment" | "label";
  itemId: string;
  itemType: string;
  message: string;
  codyData?: any;
  beadsData?: any;
  resolution?: ConflictResolutionStrategy;
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string;
  state: "open" | "closed";
  labels: { name: string }[];
  assignees: { login: string }[];
  milestone?: { title: string } | undefined;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  html_url: string;
  user: { login: string };
  comments: number;
  pull_request?: any;
}

export interface GitHubComment {
  id: number;
  body: string;
  user: { login: string };
  created_at: string;
  updated_at: string;
  html_url: string;
}

export interface BeadsIssue {
  id: string;
  title: string;
  description: string;
  status: string;
  priority?: string;
  assignee?: string;
  labels?: string[];
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
  comments?: BeadsComment[];
}

export interface BeadsComment {
  id: string;
  content: string;
  author: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectTemplate {
  name: string;
  description: string;
  type:
    | "cody"
    | "beads"
    | "combined"
    | "minimal"
    | "web-development"
    | "python-development";
  config: Partial<CodyBeadsConfig>;
  files: {
    path: string;
    content: string;
    executable?: boolean;
  }[];
  postSetup?: {
    commands: string[];
    instructions: string[];
  };
}

export interface SyncEngine {
  executeSync(options: SyncOptions): Promise<SyncResult>;
  detectConflicts(): Promise<SyncConflict[]>;
  resolveConflict(
    conflict: SyncConflict,
    resolution: ConflictResolutionStrategy,
  ): Promise<void>;
}

export interface GitHubClient {
  getIssues(
    owner: string,
    repo: string,
    options?: { since?: Date },
  ): Promise<GitHubIssue[]>;
  getPullRequests(
    owner: string,
    repo: string,
    options?: { since?: Date },
  ): Promise<GitHubIssue[]>;
  getComments(
    owner: string,
    repo: string,
    issueNumber: number,
  ): Promise<GitHubComment[]>;
  createIssue(
    owner: string,
    repo: string,
    issue: Partial<GitHubIssue>,
  ): Promise<GitHubIssue>;
  updateIssue(
    owner: string,
    repo: string,
    issueNumber: number,
    update: Partial<GitHubIssue>,
  ): Promise<GitHubIssue>;
  createComment(
    owner: string,
    repo: string,
    issueNumber: number,
    body: string,
  ): Promise<GitHubComment>;
  updateComment(
    owner: string,
    repo: string,
    commentId: number,
    body: string,
  ): Promise<GitHubComment>;
  deleteComment(owner: string, repo: string, commentId: number): Promise<void>;
  addLabel(
    owner: string,
    repo: string,
    issueNumber: number,
    label: string,
  ): Promise<void>;
  removeLabel(
    owner: string,
    repo: string,
    issueNumber: number,
    label: string,
  ): Promise<void>;
}

export interface BeadsClient {
  getIssues(
    projectPath: string,
    options?: { since?: Date },
  ): Promise<BeadsIssue[]>;
  createIssue(
    projectPath: string,
    issue: Partial<BeadsIssue>,
  ): Promise<BeadsIssue>;
  updateIssue(
    projectPath: string,
    issueId: string,
    update: Partial<BeadsIssue>,
  ): Promise<BeadsIssue>;
  createComment(
    projectPath: string,
    issueId: string,
    comment: Partial<BeadsComment>,
  ): Promise<BeadsComment>;
  updateComment(
    projectPath: string,
    issueId: string,
    commentId: string,
    comment: Partial<BeadsComment>,
  ): Promise<BeadsComment>;
  deleteComment(
    projectPath: string,
    issueId: string,
    commentId: string,
  ): Promise<void>;
  addLabel(projectPath: string, issueId: string, label: string): Promise<void>;
  removeLabel(
    projectPath: string,
    issueId: string,
    label: string,
  ): Promise<void>;
  isAvailable(): Promise<boolean>;
  getVersion(): Promise<string>;
}

export interface IConfigManager {
  loadConfig(configPath?: string): Promise<CodyBeadsConfig>;
  saveConfig(
    config: Partial<CodyBeadsConfig>,
    configPath?: string,
  ): Promise<void>;
  validateConfig(config: Partial<CodyBeadsConfig>): {
    valid: boolean;
    errors: string[];
  };
  getConfigSchema(): any;
  getOption(path: string): Promise<any>;
  setOption(path: string, value: any): Promise<void>;
  testConfig(): Promise<{ github: boolean; beads: boolean; errors: string[] }>;
}
