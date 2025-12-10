import fs from "fs-extra";
import path from "path";
import yaml from "yaml";
import {
  CodyBeadsConfig,
  SyncDirection,
  ConflictResolutionStrategy,
} from "../types";

/**
 * Configuration loader interface
 * Defines the contract for all configuration loaders
 */
export interface ConfigLoader {
  /**
   * Load configuration from the specified source
   * @param sourcePath Path to configuration file or source identifier
   */
  load(sourcePath?: string): Promise<CodyBeadsConfig>;

  /**
   * Validate the loaded configuration
   * @param config Configuration to validate
   */
  validate(config: Partial<CodyBeadsConfig>): {
    valid: boolean;
    errors: string[];
  };

  /**
   * Get the source type/format this loader handles
   */
  getSourceType(): string;

  /**
   * Check if the source exists and is accessible
   * @param sourcePath Path to check
   */
  sourceExists(sourcePath?: string): Promise<boolean>;

  /**
   * Get debugging information about the configuration source
   */
  getDebugInfo(): any;
}

/**
 * Base configuration loader with common functionality
 */
export abstract class BaseConfigLoader implements ConfigLoader {
  protected sourcePath: string = "";
  protected debugInfo: any = {};

  constructor(sourcePath?: string) {
    this.sourcePath = sourcePath ?? "";
  }

  abstract load(sourcePath?: string): Promise<CodyBeadsConfig>;
  abstract getSourceType(): string;

  validate(config: Partial<CodyBeadsConfig>): {
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

  async sourceExists(): Promise<boolean> {
    const checkPath = this.sourcePath;
    if (!checkPath) return false;
    return fs.pathExists(checkPath);
  }

  getDebugInfo(): any {
    return {
      sourceType: this.getSourceType(),
      sourcePath: this.sourcePath,
      ...this.debugInfo,
    };
  }

  protected getDefaultConfig(): CodyBeadsConfig {
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

  protected mergeWithEnvVars(config: any): any {
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
      envConfig.github = {
        ...envConfig.github,
        apiUrl: process.env.GITHUB_API_URL,
      };
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
}

/**
 * JSON configuration loader
 * Loads configuration from JSON files
 */
export class JSONConfigLoader extends BaseConfigLoader {
  getSourceType(): string {
    return "json";
  }

  async load(): Promise<CodyBeadsConfig> {
    const configPath =
      this.sourcePath || path.resolve(process.cwd(), "liaison.config.json");

    try {
      this.sourcePath = configPath;
      if (await this.sourceExists()) {
        const configContent = await fs.readFile(configPath, "utf8");
        const config = JSON.parse(configContent);

        this.debugInfo = {
          fileSize: (await fs.stat(configPath)).size,
          lastModified: (await fs.stat(configPath)).mtime,
        };

        // Merge with environment variables
        const mergedConfig = this.mergeWithEnvVars(config);

        // Validate loaded configuration
        const validation = this.validate(mergedConfig);
        if (!validation.valid) {
          throw new Error(
            `Configuration validation failed: ${(validation.errors || []).join(", ")}`,
          );
        }

        return mergedConfig;
      } else {
        // Return default configuration without validation to avoid deadlock
        return this.getDefaultConfig();
      }
    } catch (error: any) {
      // If file doesn't exist, return default config
      if (
        error.message.includes("ENOENT") ||
        error.message.includes("no such file")
      ) {
        return this.getDefaultConfig();
      }
      throw new Error(
        `Failed to load JSON configuration: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}

/**
 * YAML configuration loader
 * Loads configuration from YAML files
 */
export class YAMLConfigLoader extends BaseConfigLoader {
  getSourceType(): string {
    return "yaml";
  }

  async load(sourcePath?: string): Promise<CodyBeadsConfig> {
    const configPath =
      sourcePath ||
      this.sourcePath ||
      path.resolve(process.cwd(), "liaison.config.yaml");

    try {
      this.sourcePath = configPath;
      if (await this.sourceExists()) {
        const configContent = await fs.readFile(configPath, "utf8");
        const config = yaml.parse(configContent);

        this.debugInfo = {
          fileSize: (await fs.stat(configPath)).size,
          lastModified: (await fs.stat(configPath)).mtime,
        };

        // Merge with environment variables
        const mergedConfig = this.mergeWithEnvVars(config);

        // Validate loaded configuration
        const validation = this.validate(mergedConfig);
        if (!validation.valid) {
          throw new Error(
            `Configuration validation failed: ${(validation.errors || []).join(", ")}`,
          );
        }

        return mergedConfig;
      } else {
        // Return default configuration without validation to avoid deadlock
        return this.getDefaultConfig();
      }
    } catch (error: any) {
      // If file doesn't exist, return default config
      if (
        error.message.includes("ENOENT") ||
        error.message.includes("no such file")
      ) {
        return this.getDefaultConfig();
      }
      throw new Error(
        `Failed to load YAML configuration: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}

/**
 * Environment configuration loader
 * Loads configuration from environment variables
 */
export class EnvConfigLoader extends BaseConfigLoader {
  getSourceType(): string {
    return "env";
  }

  async load(): Promise<CodyBeadsConfig> {
    try {
      // Build configuration from environment variables
      const config: Partial<CodyBeadsConfig> = {
        version: process.env.CONFIG_VERSION || "1.0.0",
        github: {
          owner: process.env.GITHUB_OWNER || "",
          repo: process.env.GITHUB_REPO || "",
          token: process.env.GITHUB_TOKEN || "",
          apiUrl: process.env.GITHUB_API_URL || "https://api.github.com",
        },
        cody: {
          projectId: process.env.CODY_PROJECT_ID || "",
          apiUrl: process.env.CODY_API_URL || "https://api.cody.ai",
        },
        beads: {
          projectPath: process.env.BEADS_PROJECT_PATH || "./.beads",
          configPath: process.env.BEADS_CONFIG_PATH || ".beads/beads.json",
          autoSync: process.env.BEADS_AUTO_SYNC === "true",
          syncInterval: process.env.BEADS_SYNC_INTERVAL
            ? parseInt(process.env.BEADS_SYNC_INTERVAL)
            : 60,
        },
        sync: {
          defaultDirection:
            (process.env.SYNC_DEFAULT_DIRECTION as SyncDirection) ||
            "bidirectional",
          conflictResolution:
            (process.env
              .SYNC_CONFLICT_RESOLUTION as ConflictResolutionStrategy) ||
            "manual",
          includeLabels: process.env.SYNC_INCLUDE_LABELS
            ? process.env.SYNC_INCLUDE_LABELS.split(",")
            : ["bug", "feature", "enhancement"],
          excludeLabels: process.env.SYNC_EXCLUDE_LABELS
            ? process.env.SYNC_EXCLUDE_LABELS.split(",")
            : ["wontfix", "duplicate"],
          preserveComments: process.env.SYNC_PRESERVE_COMMENTS !== "false",
          preserveLabels: process.env.SYNC_PRESERVE_LABELS !== "false",
          syncMilestones: process.env.SYNC_MILESTONES === "true",
        },
        templates: {
          defaultTemplate: process.env.TEMPLATES_DEFAULT || "minimal",
          templatePath: process.env.TEMPLATES_PATH || "./templates",
        },
      };

      this.debugInfo = {
        envVarsDetected: Object.keys(process.env).filter(
          (key) =>
            key.startsWith("GITHUB_") ||
            key.startsWith("CODY_") ||
            key.startsWith("BEADS_") ||
            key.startsWith("SYNC_") ||
            key.startsWith("TEMPLATES_"),
        ).length,
      };

      // Validate loaded configuration
      const validation = this.validate(config);
      if (!validation.valid) {
        // Return default config if validation fails for env loader
        // This allows the system to run with defaults when env vars are incomplete
        return this.getDefaultConfig();
      }

      return config as CodyBeadsConfig;
    } catch (error: any) {
      throw new Error(
        `Failed to load environment configuration: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async sourceExists(): Promise<boolean> {
    // Environment variables always "exist"
    return true;
  }
}

/**
 * Configuration loader factory
 * Creates appropriate loader based on file extension or source type
 */
export class ConfigLoaderFactory {
  static createLoader(sourcePath?: string): ConfigLoader {
    if (!sourcePath) {
      return new EnvConfigLoader();
    }

    const ext = path.extname(sourcePath).toLowerCase();
    switch (ext) {
      case ".json":
        return new JSONConfigLoader(sourcePath);
      case ".yaml":
      case ".yml":
        return new YAMLConfigLoader(sourcePath);
      default:
        // If no specific file extension, try to detect based on content
        // For now, default to JSON
        return new JSONConfigLoader(sourcePath);
    }
  }

  static createEnvLoader(): EnvConfigLoader {
    return new EnvConfigLoader();
  }

  static createJSONLoader(sourcePath?: string): JSONConfigLoader {
    return new JSONConfigLoader(sourcePath);
  }

  static createYAMLLoader(sourcePath?: string): YAMLConfigLoader {
    return new YAMLConfigLoader(sourcePath);
  }
}
