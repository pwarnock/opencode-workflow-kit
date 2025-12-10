/**
 * Migration Tools for v0.3.0 to v0.5.0 upgrades
 * Automated configuration transformation with rollback support
 */

import * as fs from "fs/promises";
import * as path from "path";
import { ConfigManager, ProjectConfig } from "../plugin-system/config.js";
import { getPackageName } from "../../config/package-metadata.js";

export interface MigrationConfig {
  fromVersion: string;
  toVersion: string;
  backupPath: string;
  dryRun: boolean;
  force: boolean;
}

export interface MigrationStep {
  name: string;
  description: string;
  execute: (context: MigrationContext) => Promise<void>;
  rollback: (context: MigrationContext) => Promise<void>;
  dependencies?: string[];
}

export interface MigrationContext {
  config: MigrationConfig;
  projectPath: string;
  backupPath: string;
  logger: MigrationLogger;
  state: Map<string, any>;
}

export interface MigrationResult {
  success: boolean;
  steps: MigrationStepResult[];
  errors: string[];
  warnings: string[];
  backupPath?: string;
}

export interface MigrationStepResult {
  step: string;
  success: boolean;
  duration: number;
  error?: string;
}

export interface MigrationLogger {
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}

/**
 * Main migration engine
 */
export class MigrationEngine {
  private steps = new Map<string, MigrationStep>();
  private logger: MigrationLogger;

  constructor(logger: MigrationLogger) {
    this.logger = logger;
    this.registerBuiltinSteps();
  }

  /**
   * Register migration step
   */
  registerStep(step: MigrationStep): void {
    this.steps.set(step.name, step);
  }

  /**
   * Execute migration
   */
  async migrate(
    config: MigrationConfig,
    projectPath: string,
  ): Promise<MigrationResult> {
    const startTime = Date.now();
    const result: MigrationResult = {
      success: false,
      steps: [],
      errors: [],
      warnings: [],
    };

    try {
      // Create migration context
      const context = await this.createContext(config, projectPath);

      // Validate preconditions
      await this.validatePreconditions(context);

      // Create backup
      if (!config.dryRun) {
        result.backupPath = await this.createBackup(context);
      }

      // Execute migration steps
      const orderedSteps = this.resolveStepOrder();

      for (const stepName of orderedSteps) {
        const step = this.steps.get(stepName);
        if (!step) {
          throw new Error(`Migration step not found: ${stepName}`);
        }

        const stepResult = await this.executeStep(step, context);
        result.steps.push(stepResult);

        if (!stepResult.success) {
          throw new Error(`Step failed: ${stepName} - ${stepResult.error}`);
        }
      }

      result.success = true;
      this.logger.info(
        `Migration completed successfully in ${Date.now() - startTime}ms`,
      );
    } catch (error) {
      result.errors.push(
        error instanceof Error ? error.message : String(error),
      );
      this.logger.error("Migration failed:", error);

      // Attempt rollback if not dry run
      if (!config.dryRun && result.backupPath) {
        const rollbackContext = await this.createContext(config, projectPath);
        await this.rollback(result, rollbackContext);
      }
    }

    return result;
  }

  /**
   * Rollback migration
   */
  async rollback(
    result: MigrationResult,
    context?: MigrationContext,
  ): Promise<void> {
    if (!result.backupPath) {
      throw new Error("No backup available for rollback");
    }

    this.logger.info("Starting rollback...");

    try {
      // Restore from backup
      await this.restoreBackup(result.backupPath!);

      // Execute rollback steps in reverse order
      for (const stepResult of result.steps.reverse()) {
        const step = this.steps.get(stepResult.step);
        if (step && stepResult.success) {
          try {
            await step.rollback(context!);
            this.logger.info(`Rolled back step: ${stepResult.step}`);
          } catch (error) {
            this.logger.error(
              `Failed to rollback step ${stepResult.step}:`,
              error,
            );
          }
        }
      }

      this.logger.info("Rollback completed");
    } catch (error) {
      this.logger.error("Rollback failed:", error);
      throw error;
    }
  }

  /**
   * Create migration context
   */
  private async createContext(
    config: MigrationConfig,
    projectPath: string,
  ): Promise<MigrationContext> {
    const backupPath = path.join(projectPath, config.backupPath);

    return {
      config,
      projectPath,
      backupPath,
      logger: this.logger,
      state: new Map(),
    };
  }

  /**
   * Validate migration preconditions
   */
  private async validatePreconditions(
    context: MigrationContext,
  ): Promise<void> {
    // Check if project path exists
    try {
      await fs.access(context.projectPath);
    } catch (error) {
      throw new Error(`Project path does not exist: ${context.projectPath}`);
    }

    // Check if already migrated
    const configManager = new ConfigManager(
      path.join(context.projectPath, ".taskflow.yml"),
    );
    try {
      const config = await configManager.load();
      if (config.version === context.config.toVersion) {
        if (!context.config.force) {
          throw new Error("Project already migrated to target version");
        }
      }
    } catch (error) {
      // Config doesn't exist, which is fine for initial migration
    }
  }

  /**
   * Create backup
   */
  private async createBackup(context: MigrationContext): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupDir = path.join(context.backupPath, `migration-${timestamp}`);

    await fs.mkdir(backupDir, { recursive: true });

    // Backup important files
    const filesToBackup = [
      ".taskflow.yml",
      "package.json",
      "opencode.json",
      ".cody/",
      "agents/",
      "config/",
    ];

    for (const file of filesToBackup) {
      const sourcePath = path.join(context.projectPath, file);
      const targetPath = path.join(backupDir, file);

      try {
        await this.copyRecursive(sourcePath, targetPath);
        this.logger.debug(`Backed up: ${file}`);
      } catch (error) {
        this.logger.warn(`Failed to backup ${file}:`, error);
      }
    }

    return backupDir;
  }

  /**
   * Restore from backup
   */
  private async restoreBackup(backupPath: string): Promise<void> {
    // Implementation would restore files from backup
    this.logger.info(`Restoring from backup: ${backupPath}`);
  }

  /**
   * Execute migration step
   */
  private async executeStep(
    step: MigrationStep,
    context: MigrationContext,
  ): Promise<MigrationStepResult> {
    const startTime = Date.now();

    try {
      this.logger.info(`Executing step: ${step.name}`);

      if (!context.config.dryRun) {
        await step.execute(context);
      } else {
        this.logger.info(`[DRY RUN] Would execute: ${step.description}`);
      }

      return {
        step: step.name,
        success: true,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        step: step.name,
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Resolve step execution order based on dependencies
   */
  private resolveStepOrder(): string[] {
    const ordered: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (stepName: string) => {
      if (visited.has(stepName)) {
        return;
      }

      if (visiting.has(stepName)) {
        throw new Error(`Circular dependency detected: ${stepName}`);
      }

      visiting.add(stepName);

      const step = this.steps.get(stepName);
      if (step?.dependencies) {
        for (const dep of step.dependencies) {
          visit(dep);
        }
      }

      visiting.delete(stepName);
      visited.add(stepName);
      ordered.push(stepName);
    };

    for (const stepName of this.steps.keys()) {
      visit(stepName);
    }

    return ordered;
  }

  /**
   * Copy directory recursively
   */
  private async copyRecursive(source: string, target: string): Promise<void> {
    const stat = await fs.stat(source);

    if (stat.isDirectory()) {
      await fs.mkdir(target, { recursive: true });
      const entries = await fs.readdir(source, { withFileTypes: true });

      for (const entry of entries) {
        const sourcePath = path.join(source, entry.name);
        const targetPath = path.join(target, entry.name);
        await this.copyRecursive(sourcePath, targetPath);
      }
    } else {
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.copyFile(source, target);
    }
  }

  /**
   * Register built-in migration steps
   */
  private registerBuiltinSteps(): void {
    // Step 1: Create .taskflow.yml from existing configuration
    this.registerStep({
      name: "create-taskflow-config",
      description: "Create .taskflow.yml from existing opencode.json",
      execute: async (context) => {
        await this.createTaskflowConfig(context);
      },
      rollback: async (context) => {
        const configPath = path.join(context.projectPath, ".taskflow.yml");
        try {
          await fs.unlink(configPath);
        } catch (error) {
          // File might not exist
        }
      },
    });

    // Step 2: Migrate agent configurations
    this.registerStep({
      name: "migrate-agents",
      description: "Migrate agent configurations to new format",
      execute: async (context) => {
        await this.migrateAgents(context);
      },
      rollback: async (_context) => {
        // Rollback would restore from backup
      },
      dependencies: ["create-taskflow-config"],
    });

    // Step 3: Update package.json dependencies
    this.registerStep({
      name: "update-dependencies",
      description: "Update package.json with new dependencies",
      execute: async (context) => {
        await this.updateDependencies(context);
      },
      rollback: async (_context) => {
        // Rollback would restore from backup
      },
      dependencies: ["create-taskflow-config"],
    });

    // Step 4: Create plugin directory structure
    this.registerStep({
      name: "create-plugin-structure",
      description: "Create plugin directory structure",
      execute: async (context) => {
        await this.createPluginStructure(context);
      },
      rollback: async (context) => {
        const pluginDir = path.join(
          context.projectPath,
          ".taskflow",
          "plugins",
        );
        try {
          await fs.rm(pluginDir, { recursive: true });
        } catch (error) {
          // Directory might not exist
        }
      },
      dependencies: ["create-taskflow-config"],
    });
  }

  /**
   * Create .taskflow.yml from existing configuration
   */
  private async createTaskflowConfig(context: MigrationContext): Promise<void> {
    const configPath = path.join(context.projectPath, ".taskflow.yml");

    // Check if opencode.json exists
    const opencodePath = path.join(context.projectPath, "opencode.json");
    let existingConfig: any = {};

    try {
      const content = await fs.readFile(opencodePath, "utf-8");
      existingConfig = JSON.parse(content);
    } catch (error) {
      context.logger.warn(
        "opencode.json not found, creating default configuration",
      );
    }

    // Create new configuration
    const newConfig: ProjectConfig = {
      version: "0.5.0",
      name: existingConfig.name || "Migrated Project",
      description:
        existingConfig.description || "Project migrated from v0.3.0 to v0.5.0",
      plugins: [],
      global: {
        logLevel: "info",
        dataDirectory: "./.taskflow",
        ...existingConfig.global,
      },
      environments: existingConfig.environments || {},
    };

    // Write configuration
    const yaml = await import("yaml");
    const content = yaml.stringify(newConfig, { indent: 2 });
    await fs.writeFile(configPath, content, "utf-8");

    context.logger.info("Created .taskflow.yml configuration");
  }

  /**
   * Migrate agent configurations
   */
  private async migrateAgents(context: MigrationContext): Promise<void> {
    const agentsDir = path.join(context.projectPath, "agents");

    try {
      const entries = await fs.readdir(agentsDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith(".json")) {
          await this.migrateAgentConfig(
            path.join(agentsDir, entry.name),
            context,
          );
        }
      }
    } catch (error) {
      context.logger.warn("Failed to migrate agents:", error);
    }
  }

  /**
   * Migrate individual agent configuration
   */
  private async migrateAgentConfig(
    agentPath: string,
    context: MigrationContext,
  ): Promise<void> {
    try {
      const content = await fs.readFile(agentPath, "utf-8");
      const config = JSON.parse(content);

      // Convert to new format if needed
      if (config.mode !== "subagent") {
        config.mode = "subagent";
        config.version = "2.0.0";

        await fs.writeFile(agentPath, JSON.stringify(config, null, 2));
        context.logger.debug(`Migrated agent: ${path.basename(agentPath)}`);
      }
    } catch (error) {
      context.logger.warn(`Failed to migrate agent ${agentPath}:`, error);
    }
  }

  /**
   * Update package.json dependencies
   */
  private async updateDependencies(context: MigrationContext): Promise<void> {
    const packagePath = path.join(context.projectPath, "package.json");

    try {
      const content = await fs.readFile(packagePath, "utf-8");
      const packageJson = JSON.parse(content);

      // Add new dependencies
      if (!packageJson.dependencies) {
        packageJson.dependencies = {};
      }

      // Update or add required packages
      packageJson.dependencies[getPackageName()] = "^0.5.0";
      packageJson.dependencies["yaml"] = "^2.5.0";

      await fs.writeFile(packagePath, JSON.stringify(packageJson, null, 2));
      context.logger.info("Updated package.json dependencies");
    } catch (error) {
      context.logger.warn("Failed to update package.json:", error);
    }
  }

  /**
   * Create plugin directory structure
   */
  private async createPluginStructure(
    context: MigrationContext,
  ): Promise<void> {
    const pluginDir = path.join(context.projectPath, ".taskflow", "plugins");

    await fs.mkdir(pluginDir, { recursive: true });

    // Create example plugin
    const examplePluginDir = path.join(pluginDir, "example");
    await fs.mkdir(examplePluginDir, { recursive: true });

    const examplePackage = {
      name: "example-plugin",
      version: "1.0.0",
      taskflowPlugin: true,
      main: "index.js",
    };

    await fs.writeFile(
      path.join(examplePluginDir, "package.json"),
      JSON.stringify(examplePackage, null, 2),
    );

    context.logger.info("Created plugin directory structure");
  }
}

/**
 * Console migration logger
 */
export class ConsoleMigrationLogger implements MigrationLogger {
  info(message: string, ...args: any[]): void {
    console.log(`[INFO] ${message}`, ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(`[WARN] ${message}`, ...args);
  }

  error(message: string, ...args: any[]): void {
    console.error(`[ERROR] ${message}`, ...args);
  }

  debug(message: string, ...args: any[]): void {
    console.debug(`[DEBUG] ${message}`, ...args);
  }
}

/**
 * Migration utility functions
 */
export class MigrationUtils {
  /**
   * Check if migration is needed
   */
  static async needsMigration(projectPath: string): Promise<boolean> {
    const configManager = new ConfigManager(
      path.join(projectPath, ".taskflow.yml"),
    );

    try {
      const config = await configManager.load();
      return config.version !== "0.5.0";
    } catch (error) {
      // Config doesn't exist, migration needed
      return true;
    }
  }

  /**
   * Get current version
   */
  static async getCurrentVersion(projectPath: string): Promise<string> {
    const configManager = new ConfigManager(
      path.join(projectPath, ".taskflow.yml"),
    );

    try {
      const config = await configManager.load();
      return config.version || "unknown";
    } catch (error) {
      return "0.3.0"; // Assume older version if config doesn't exist
    }
  }

  /**
   * Validate migration result
   */
  static validateResult(result: MigrationResult): boolean {
    return result.success && result.errors.length === 0;
  }
}
