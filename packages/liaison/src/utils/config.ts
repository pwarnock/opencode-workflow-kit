import fs from "fs-extra";
import path from "path";
import yaml from "yaml";
import { CodyBeadsConfig, IConfigManager } from "../types";

/**
 * Configuration manager for Liaison integration
 */
export class ConfigManager implements IConfigManager {
  private configPath: string;
  private defaultConfig: CodyBeadsConfig;

  constructor(configPath?: string) {
    this.configPath =
      configPath || path.resolve(process.cwd(), "liaison.config.json");
    this.defaultConfig = this.getDefaultConfig();
  }

  async loadConfig(configPath?: string): Promise<CodyBeadsConfig> {
    const configFilePath = configPath || this.configPath;

    try {
      if (await fs.pathExists(configFilePath)) {
        const configContent = await fs.readFile(configFilePath, "utf8");
        const config =
          path.extname(configFilePath) === ".yaml" ||
          path.extname(configFilePath) === ".yml"
            ? yaml.parse(configContent)
            : JSON.parse(configContent);

        // Merge with environment variables
        const mergedConfig = this.mergeWithEnvVars(config);

        // Validate loaded configuration
        const validation = this.validateConfig(mergedConfig);
        if (!validation.valid) {
          throw new Error(
            `Configuration validation failed: ${(validation.errors || []).join(", ")}`,
          );
        }

        return mergedConfig;
      } else {
        // Return default configuration without saving to avoid deadlock in tests
        return this.defaultConfig;
      }
    } catch (error: any) {
      throw new Error(
        `Failed to load configuration: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async saveConfig(
    config: Partial<CodyBeadsConfig>,
    configPath?: string,
  ): Promise<void> {
    const configFilePath = configPath || this.configPath;

    try {
      // Ensure directory exists
      await fs.ensureDir(path.dirname(configFilePath));

      // Load existing config or use default
      let existingConfig: CodyBeadsConfig;
      try {
        existingConfig = await this.loadConfig(configFilePath);
      } catch {
        existingConfig = this.defaultConfig;
      }

      const configToSave = { ...existingConfig, ...config };
      const configContent =
        path.extname(configFilePath) === ".yaml" ||
        path.extname(configFilePath) === ".yml"
          ? yaml.stringify(configToSave)
          : JSON.stringify(configToSave, null, 2);

      await fs.writeFile(configFilePath, configContent, "utf8");
    } catch (error: any) {
      throw new Error(
        `Failed to save configuration: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async getOption(path: string): Promise<any> {
    const config = await this.loadConfig();
    const keys = path.split(".");
    let current: any = config;

    for (const key of keys) {
      if (current && typeof current === "object" && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }

    return current;
  }

  async setOption(path: string, value: any): Promise<void> {
    const config = await this.loadConfig();
    const keys = path.split(".");
    let current: any = config;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key] || typeof current[key] !== "object") {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
    await this.saveConfig(config);
  }

  private getDefaultConfig(): CodyBeadsConfig {
    return {
      version: "1.0.0",
      github: {
        owner: "",
        repo: "",
        token: "",
        apiUrl: "https://api.github.com",
      },
      cody: {
        projectId: "",
        apiUrl: "https://api.cody.ai",
      },
      beads: {
        projectPath: "./.beads",
        configPath: ".beads/beads.json",
        autoSync: false,
        syncInterval: 60,
      },
      sync: {
        defaultDirection: "bidirectional",
        conflictResolution: "manual",
        includeLabels: ["bug", "feature", "enhancement"],
        excludeLabels: ["wontfix", "duplicate"],
        preserveComments: true,
        preserveLabels: true,
        syncMilestones: false,
      },
      templates: {
        defaultTemplate: "minimal",
        templatePath: "./templates",
      },
    };
  }

  private mergeWithEnvVars(config: any): any {
    const envConfig = { ...config };

    // Merge GitHub environment variables
    if (process.env.GITHUB_TOKEN) {
      envConfig.github = {
        ...envConfig.github,
        token: process.env.GITHUB_TOKEN,
      };
    }
    if (process.env.GITHUB_OWNER) {
      envConfig.github = {
        ...envConfig.github,
        owner: process.env.GITHUB_OWNER,
      };
    }
    if (process.env.GITHUB_REPO) {
      envConfig.github = { ...envConfig.github, repo: process.env.GITHUB_REPO };
    }
    if (process.env.GITHUB_API_URL) {
      envConfig.github = { ...envConfig.github, apiUrl: process.env.GITHUB_API_URL };
    }

    // Merge Cody environment variables
    if (process.env.CODY_PROJECT_ID) {
      envConfig.cody = {
        ...envConfig.cody,
        projectId: process.env.CODY_PROJECT_ID,
      };
    }

    // Merge Beads environment variables
    if (process.env.BEADS_PROJECT_PATH) {
      envConfig.beads = {
        ...envConfig.beads,
        projectPath: process.env.BEADS_PROJECT_PATH,
      };
    }

    return envConfig;
  }

  validateConfig(config: Partial<CodyBeadsConfig>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Required fields
    if (!config.github?.owner) {
      errors.push("GitHub owner is required");
    }

    if (!config.github?.repo) {
      errors.push("GitHub repository is required");
    }

    if (!config.cody?.projectId && !config.beads?.projectPath) {
      errors.push(
        "Either Cody project ID or Beads project path must be configured",
      );
    }

    // Validate sync options
    if (config.sync?.defaultDirection) {
      const validDirections = [
        "cody-to-beads",
        "beads-to-cody",
        "bidirectional",
      ];
      if (!validDirections.includes(config.sync.defaultDirection)) {
        errors.push(`Invalid sync direction: ${config.sync.defaultDirection}`);
      }
    }

    if (config.sync?.conflictResolution) {
      const validResolutions = [
        "manual",
        "cody-wins",
        "beads-wins",
        "newer-wins",
        "prompt",
      ];
      if (!validResolutions.includes(config.sync.conflictResolution)) {
        errors.push(
          `Invalid conflict resolution strategy: ${config.sync.conflictResolution}`,
        );
      }
    }

    // Validate template configuration
    if (config.templates?.defaultTemplate && !config.templates?.templatePath) {
      errors.push(
        "Template path is required when default template is specified",
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async testConfig(): Promise<{
    github: boolean;
    beads: boolean;
    errors: string[];
  }> {
    const config = await this.loadConfig();
    const errors: string[] = [];
    let githubOk = false;
    let beadsOk = false;

    try {
      // Test GitHub connection
      if (config.github?.token && config.github?.owner && config.github?.repo) {
        const { Octokit } = await import("@octokit/rest");
        const octokitConfig: any = { auth: config.github.token };
        if (config.github.apiUrl) {
          octokitConfig.baseUrl = config.github.apiUrl;
        }
        const octokit = new Octokit(octokitConfig);

        // Simple test: try to get repository info
        await octokit.repos.get({
          owner: config.github.owner,
          repo: config.github.repo,
        });
        githubOk = true;
      } else {
        errors.push("GitHub configuration incomplete");
      }
    } catch (error: any) {
      errors.push(
        `GitHub connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }

    try {
      // Test Beads connection
      if (config.beads?.projectPath) {
        if (await fs.pathExists(config.beads.projectPath)) {
          beadsOk = true;
        } else {
          errors.push("Beads project path does not exist");
        }
      } else if (config.cody?.projectId) {
        // For now, just validate that we have a project ID
        beadsOk = true;
      } else {
        errors.push("No Beads or Cody project configured");
      }
    } catch (error: any) {
      errors.push(
        `Beads connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }

    return {
      github: githubOk,
      beads: beadsOk,
      errors,
    };
  }

  getConfigSchema(): any {
    return {
      type: "object",
      properties: {
        version: { type: "string" },
        github: {
          type: "object",
          properties: {
            token: { type: "string" },
            apiUrl: { type: "string" },
            owner: { type: "string" },
            repo: { type: "string" },
          },
          required: ["owner", "repo"],
        },
        cody: {
          type: "object",
          properties: {
            projectId: { type: "string" },
            apiUrl: { type: "string" },
            webhookSecret: { type: "string" },
          },
        },
        beads: {
          type: "object",
          properties: {
            projectPath: { type: "string" },
            configPath: { type: "string" },
            autoSync: { type: "boolean" },
            syncInterval: { type: "number" },
          },
        },
        sync: {
          type: "object",
          properties: {
            defaultDirection: {
              type: "string",
              enum: ["cody-to-beads", "beads-to-cody", "bidirectional"],
            },
            conflictResolution: {
              type: "string",
              enum: [
                "manual",
                "cody-wins",
                "beads-wins",
                "newer-wins",
                "prompt",
              ],
            },
            preserveComments: { type: "boolean" },
            preserveLabels: { type: "boolean" },
            syncMilestones: { type: "boolean" },
            excludeLabels: { type: "array", items: { type: "string" } },
            includeLabels: { type: "array", items: { type: "string" } },
          },
        },
        templates: {
          type: "object",
          properties: {
            defaultTemplate: { type: "string" },
            templatePath: { type: "string" },
          },
        },
      },
      required: ["version", "github", "sync", "templates"],
    };
  }
}
