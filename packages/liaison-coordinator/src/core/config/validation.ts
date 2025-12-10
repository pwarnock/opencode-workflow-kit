/**
 * Configuration Schema Validation Framework
 * Provides comprehensive validation for Cody-Beads integration configuration
 */

import { z } from "zod";
import * as fs from "fs/promises";
import * as path from "path";
import * as yaml from "yaml";

/**
 * Base configuration schema definitions
 */

// GitHub configuration schema
const GitHubConfigSchema = z.object({
  owner: z.string().min(1, "GitHub owner is required"),
  repo: z.string().min(1, "GitHub repository is required"),
  token: z.string().min(1, "GitHub token is required"),
  apiUrl: z
    .string()
    .url("GitHub API URL must be valid")
    .default("https://api.github.com"),
  timeout: z.number().positive().default(30000),
  retries: z.number().min(0).max(10).default(3),
  rateLimit: z
    .object({
      enabled: z.boolean().default(true),
      maxRequests: z.number().positive().default(5000),
      windowMs: z.number().positive().default(3600000), // 1 hour
    })
    .optional(),
});

// Cody configuration schema
const CodyConfigSchema = z.object({
  projectId: z.string().min(1, "Cody project ID is required"),
  apiUrl: z
    .string()
    .url("Cody API URL must be valid")
    .default("https://api.cody.ai"),
  token: z.string().optional(),
  timeout: z.number().positive().default(30000),
  retries: z.number().min(0).max(10).default(3),
  workspace: z.string().default("./.cody"),
  autoAdvance: z.boolean().default(false),
});

// Beads configuration schema
const BeadsConfigSchema = z.object({
  projectPath: z
    .string()
    .min(1, "Beads project path is required")
    .default("./.beads"),
  configPath: z.string().default(".beads/beads.json"),
  autoSync: z.boolean().default(false),
  syncInterval: z.number().positive().default(60),
  daemon: z
    .object({
      enabled: z.boolean().default(false),
      port: z.number().positive().default(3001),
      host: z.string().default("localhost"),
    })
    .optional(),
  database: z
    .object({
      type: z.enum(["sqlite", "postgres", "mysql"]).default("sqlite"),
      path: z.string().optional(),
      host: z.string().optional(),
      port: z.number().optional(),
      database: z.string().optional(),
      username: z.string().optional(),
      password: z.string().optional(),
    })
    .optional(),
});

// Sync configuration schema
const SyncConfigSchema = z.object({
  defaultDirection: z
    .enum(["bidirectional", "cody-to-beads", "beads-to-cody"])
    .default("bidirectional"),
  conflictResolution: z
    .enum(["manual", "cody-wins", "beads-wins", "timestamp"])
    .default("manual"),
  includeLabels: z.array(z.string()).default(["bug", "feature", "enhancement"]),
  excludeLabels: z.array(z.string()).default(["wontfix", "duplicate"]),
  preserveComments: z.boolean().default(true),
  preserveLabels: z.boolean().default(true),
  syncMilestones: z.boolean().default(false),
  syncAssignees: z.boolean().default(true),
  syncProjects: z.boolean().default(false),
  batch: z
    .object({
      enabled: z.boolean().default(false),
      size: z.number().positive().default(100),
      delay: z.number().positive().default(1000),
    })
    .optional(),
  filters: z
    .object({
      states: z.array(z.enum(["open", "closed", "all"])).default(["open"]),
      types: z.array(z.enum(["issue", "pr", "all"])).default(["issue"]),
      assignees: z.array(z.string()).optional(),
      creators: z.array(z.string()).optional(),
      milestones: z.array(z.string()).optional(),
      projects: z.array(z.string()).optional(),
    })
    .optional(),
});

// Templates configuration schema
const TemplatesConfigSchema = z.object({
  defaultTemplate: z.string().default("minimal"),
  templatePath: z.string().default("./templates"),
  registry: z
    .object({
      enabled: z.boolean().default(false),
      url: z.string().url().optional(),
      username: z.string().optional(),
      token: z.string().optional(),
    })
    .optional(),
  custom: z
    .record(
      z.string(),
      z.object({
        path: z.string(),
        description: z.string().optional(),
        parameters: z.record(z.string(), z.any()).optional(),
      }),
    )
    .optional(),
});

// Plugin configuration schema
const PluginConfigSchema = z.object({
  enabled: z.boolean().default(true),
  directory: z.string().default("./plugins"),
  autoLoad: z.boolean().default(true),
  security: z
    .object({
      enabled: z.boolean().default(true),
      sandbox: z.boolean().default(true),
      allowedPermissions: z.array(z.string()).default([]),
      blockedPlugins: z.array(z.string()).default([]),
    })
    .optional(),
  registry: z
    .object({
      enabled: z.boolean().default(false),
      urls: z.array(z.string().url()).default([]),
    })
    .optional(),
});

// Logging configuration schema
const LoggingConfigSchema = z.object({
  level: z.enum(["debug", "info", "warn", "error"]).default("info"),
  format: z.enum(["json", "text"]).default("text"),
  file: z
    .object({
      enabled: z.boolean().default(false),
      path: z.string().default("./logs/cody-beads.log"),
      maxSize: z.string().default("10MB"),
      maxFiles: z.number().positive().default(5),
      rotation: z.enum(["daily", "weekly", "monthly"]).default("daily"),
    })
    .optional(),
  console: z
    .object({
      enabled: z.boolean().default(true),
      colorize: z.boolean().default(true),
    })
    .optional(),
});

// Main configuration schema
const ConfigurationSchema = z.object({
  version: z
    .string()
    .regex(
      /^\d+\.\d+\.\d+$/,
      "Version must be in semantic version format (x.y.z)",
    ),
  github: GitHubConfigSchema,
  cody: CodyConfigSchema,
  beads: BeadsConfigSchema,
  sync: SyncConfigSchema,
  templates: TemplatesConfigSchema,
  plugins: PluginConfigSchema.optional(),
  logging: LoggingConfigSchema.optional(),
  features: z
    .object({
      experimental: z.boolean().default(false),
      beta: z.boolean().default(false),
      deprecated: z.boolean().default(false),
    })
    .optional(),
  extends: z
    .string()
    .optional()
    .describe("Base configuration file to extend from"),
  overrides: z
    .record(z.string(), z.any())
    .optional()
    .describe("Configuration overrides"),
});

/**
 * Type definitions
 */
export type Configuration = z.infer<typeof ConfigurationSchema>;
export type GitHubConfig = z.infer<typeof GitHubConfigSchema>;
export type CodyConfig = z.infer<typeof CodyConfigSchema>;
export type BeadsConfig = z.infer<typeof BeadsConfigSchema>;
export type SyncConfig = z.infer<typeof SyncConfigSchema>;
export type TemplatesConfig = z.infer<typeof TemplatesConfigSchema>;
export type PluginConfig = z.infer<typeof PluginConfigSchema>;
export type LoggingConfig = z.infer<typeof LoggingConfigSchema>;

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  data?: Configuration;
}

export interface ValidationError {
  path: string;
  message: string;
  code: string;
  severity: "error";
}

export interface ValidationWarning {
  path: string;
  message: string;
  code: string;
  severity: "warning";
}

/**
 * Configuration validator class
 */
export class ConfigurationValidator {
  private schemas: Map<string, z.ZodSchema> = new Map();
  private customValidators: Map<string, (value: any) => ValidationResult> =
    new Map();

  constructor() {
    this.registerDefaultSchemas();
  }

  /**
   * Register default schemas
   */
  private registerDefaultSchemas(): void {
    this.schemas.set("configuration", ConfigurationSchema);
    this.schemas.set("github", GitHubConfigSchema);
    this.schemas.set("cody", CodyConfigSchema);
    this.schemas.set("beads", BeadsConfigSchema);
    this.schemas.set("sync", SyncConfigSchema);
    this.schemas.set("templates", TemplatesConfigSchema);
    this.schemas.set("plugins", PluginConfigSchema);
    this.schemas.set("logging", LoggingConfigSchema);
  }

  /**
   * Register a custom schema
   */
  registerSchema(name: string, schema: z.ZodSchema): void {
    this.schemas.set(name, schema);
  }

  /**
   * Register a custom validator
   */
  registerValidator(
    name: string,
    validator: (value: any) => ValidationResult,
  ): void {
    this.customValidators.set(name, validator);
  }

  /**
   * Validate configuration against schema
   */
  validate(
    config: any,
    schemaName: string = "configuration",
  ): ValidationResult {
    const schema = this.schemas.get(schemaName);
    if (!schema) {
      return {
        valid: false,
        errors: [
          {
            path: "",
            message: `Schema '${schemaName}' not found`,
            code: "SCHEMA_NOT_FOUND",
            severity: "error",
          },
        ],
        warnings: [],
      };
    }

    const result = schema.safeParse(config);

    if (result.success) {
      // Run custom validators
      const customValidation = this.runCustomValidators(config, schemaName);
      return {
        valid: customValidation.valid,
        errors: customValidation.errors,
        warnings: customValidation.warnings,
        data: result.data as Configuration,
      };
    } else {
      // Convert Zod errors to validation errors
      const errors: ValidationError[] = result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
        code: issue.code,
        severity: "error" as const,
      }));

      return {
        valid: false,
        errors,
        warnings: [],
      };
    }
  }

  /**
   * Run custom validators
   */
  private runCustomValidators(
    config: any,
    schemaName: string,
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check for custom validators
    for (const [name, validator] of this.customValidators) {
      if (name.startsWith(schemaName + ".")) {
        const result = validator(config);
        errors.push(...result.errors);
        warnings.push(...result.warnings);
      }
    }

    // Run built-in custom validations
    this.runBuiltInValidations(config, errors, warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Run built-in custom validations
   */
  private runBuiltInValidations(
    config: any,
    errors: ValidationError[],
    warnings: ValidationWarning[],
  ): void {
    // Suppress unused parameter warning - errors array available for future error validations
    void errors;

    // Validate GitHub token format
    if (
      config.github?.token &&
      !config.github.token.startsWith("ghp_") &&
      !config.github.token.startsWith("github_pat_")
    ) {
      warnings.push({
        path: "github.token",
        message: 'GitHub token should start with "ghp_" or "github_pat_"',
        code: "INVALID_TOKEN_FORMAT",
        severity: "warning",
      });
    }

    // Validate sync interval
    if (config.beads?.syncInterval && config.beads.syncInterval < 30) {
      warnings.push({
        path: "beads.syncInterval",
        message: "Sync interval less than 30 seconds may cause rate limiting",
        code: "LOW_SYNC_INTERVAL",
        severity: "warning",
      });
    }

    // Validate paths exist
    if (config.beads?.projectPath) {
      // This would be checked during runtime, but we can warn about obvious issues
      if (config.beads.projectPath.includes("..")) {
        warnings.push({
          path: "beads.projectPath",
          message:
            "Project path contains relative navigation, which may be unsafe",
          code: "UNSAFE_PATH",
          severity: "warning",
        });
      }
    }

    // Check for deprecated features
    if (config.features?.deprecated) {
      warnings.push({
        path: "features.deprecated",
        message:
          "Deprecated features are enabled and may be removed in future versions",
        code: "DEPRECATED_FEATURES",
        severity: "warning",
      });
    }
  }
  /**
   * Load configuration with inheritance support
   */
  async loadWithInheritance(
    configPath: string,
    basePath: string = process.cwd(),
  ): Promise<ValidationResult> {
    try {
      // Read the configuration file
      const configContent = await fs.readFile(configPath, "utf-8");
      let config =
        path.extname(configPath) === ".yaml" ||
        path.extname(configPath) === ".yml"
          ? yaml.parse(configContent)
          : JSON.parse(configContent);

      // Store overrides before merging
      const overrides = config.overrides;

      // Handle configuration inheritance
      if (config.extends) {
        const baseConfigPath = path.resolve(basePath, config.extends);
        const baseResult = await this.loadWithInheritance(
          baseConfigPath,
          basePath,
        );

        if (!baseResult.valid) {
          return baseResult;
        }

        // Merge base configuration with current configuration (excluding overrides)
        const { overrides: _, ...configWithoutOverrides } = config;
        config = this.mergeWithInheritance(
          baseResult.data || {},
          configWithoutOverrides,
        );
      }

      // Apply overrides if present
      if (overrides) {
        config = this.mergeWithInheritance(config, overrides);
      }

      // Validate the final configuration
      return this.validate(config);
    } catch (error: any) {
      return {
        valid: false,
        errors: [
          {
            path: "",
            message: `Failed to load configuration with inheritance: ${error instanceof Error ? error.message : "Unknown error"}`,
            code: "INHERITANCE_LOAD_ERROR",
            severity: "error",
          },
        ],
        warnings: [],
      };
    }
  }

  /**
   * Merge configurations with inheritance support
   */
  mergeWithInheritance(baseConfig: any, overrideConfig: any): any {
    const result = { ...baseConfig };

    // Deep merge configuration sections
    for (const key in overrideConfig) {
      if (key === "extends" || key === "overrides") {
        continue; // Skip inheritance metadata
      }

      if (
        overrideConfig[key] &&
        typeof overrideConfig[key] === "object" &&
        !Array.isArray(overrideConfig[key]) &&
        result[key] &&
        typeof result[key] === "object" &&
        !Array.isArray(result[key])
      ) {
        // Deep merge objects
        result[key] = this.mergeWithInheritance(
          result[key],
          overrideConfig[key],
        );
      } else {
        // Override with new value
        result[key] = overrideConfig[key];
      }
    }

    return result;
  }

  /**
   * Validate configuration file
   */
  async validateFile(filePath: string): Promise<ValidationResult> {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const config = JSON.parse(content);
      return this.validate(config);
    } catch (error) {
      return {
        valid: false,
        errors: [
          {
            path: "",
            message: `Failed to read or parse configuration file: ${error instanceof Error ? error.message : "Unknown error"}`,
            code: "FILE_ERROR",
            severity: "error",
          },
        ],
        warnings: [],
      };
    }
  }

  /**
   * Get schema as JSON
   */
  getSchemaAsJson(schemaName: string = "configuration"): any {
    const schema = this.schemas.get(schemaName);
    if (!schema) {
      throw new Error(`Schema '${schemaName}' not found`);
    }

    // Convert Zod schema to JSON schema format
    return this.zodToJsonSchema(schema);
  }

  /**
   * Convert Zod schema to JSON schema (simplified)
   */
  private zodToJsonSchema(_schema: z.ZodSchema): any {
    // This is a simplified version - in production, use zod-to-json-schema library
    return {
      type: "object",
      properties: {
        version: { type: "string", pattern: "^\\d+\\.\\d+\\.\\d+$" },
        github: { $ref: "#/$defs/GitHubConfig" },
        cody: { $ref: "#/$defs/CodyConfig" },
        beads: { $ref: "#/$defs/BeadsConfig" },
        sync: { $ref: "#/$defs/SyncConfig" },
        templates: { $ref: "#/$defs/TemplatesConfig" },
      },
      $defs: {
        GitHubConfig: {
          type: "object",
          properties: {
            owner: { type: "string", minLength: 1 },
            repo: { type: "string", minLength: 1 },
            token: { type: "string", minLength: 1 },
            apiUrl: {
              type: "string",
              format: "uri",
              default: "https://api.github.com",
            },
          },
          required: ["owner", "repo", "token"],
        },
        CodyConfig: {
          type: "object",
          properties: {
            projectId: { type: "string", minLength: 1 },
            apiUrl: {
              type: "string",
              format: "uri",
              default: "https://api.cody.ai",
            },
            workspace: { type: "string", default: "./.cody" },
          },
          required: ["projectId"],
        },
        BeadsConfig: {
          type: "object",
          properties: {
            projectPath: { type: "string", minLength: 1, default: "./.beads" },
            configPath: { type: "string", default: ".beads/beads.json" },
            autoSync: { type: "boolean", default: false },
            syncInterval: { type: "number", minimum: 1, default: 60 },
          },
          required: [],
        },
        SyncConfig: {
          type: "object",
          properties: {
            defaultDirection: {
              type: "string",
              enum: ["bidirectional", "cody-to-beads", "beads-to-cody"],
              default: "bidirectional",
            },
            conflictResolution: {
              type: "string",
              enum: ["manual", "cody-wins", "beads-wins", "timestamp"],
              default: "manual",
            },
            includeLabels: {
              type: "array",
              items: { type: "string" },
              default: ["bug", "feature", "enhancement"],
            },
            excludeLabels: {
              type: "array",
              items: { type: "string" },
              default: ["wontfix", "duplicate"],
            },
          },
          required: [],
        },
        TemplatesConfig: {
          type: "object",
          properties: {
            defaultTemplate: { type: "string", default: "minimal" },
            templatePath: { type: "string", default: "./templates" },
          },
          required: [],
        },
      },
      required: ["version", "github", "cody", "beads", "sync", "templates"],
    };
  }
}

/**
 * Global validator instance
 */
export const configValidator = new ConfigurationValidator();

/**
 * Convenience functions
 */
export function validateConfiguration(config: any): ValidationResult {
  return configValidator.validate(config);
}

export async function validateConfigurationFile(
  filePath: string,
): Promise<ValidationResult> {
  return configValidator.validateFile(filePath);
}

export function registerConfigurationSchema(
  name: string,
  schema: z.ZodSchema,
): void {
  configValidator.registerSchema(name, schema);
}

export function registerConfigurationValidator(
  name: string,
  validator: (value: any) => ValidationResult,
): void {
  configValidator.registerValidator(name, validator);
}

/**
 * Load configuration with inheritance support
 */
export async function loadConfigurationWithInheritance(
  configPath: string,
  basePath: string = process.cwd(),
): Promise<ValidationResult> {
  return configValidator.loadWithInheritance(configPath, basePath);
}

/**
 * Merge configurations with inheritance
 */
export function mergeConfigurations(baseConfig: any, overrideConfig: any): any {
  return configValidator.mergeWithInheritance(baseConfig, overrideConfig);
}
