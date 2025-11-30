/**
 * Enhanced CLI with Plugin Support
 * Comprehensive CLI with plugin management and unified command interface
 */

import chalk from 'chalk';
import { Command } from 'commander';
import { ConfigManager, ProjectConfig } from '../core/plugin-system/config.js';
import { ConsoleLogger, FileStorage, NodeEventEmitter } from '../core/plugin-system/loader.js';

/**
 * Plugin Management Command
 */
export const pluginCommand = new Command('plugin')
  .description('Manage TaskFlow plugins')
  .argument('<action>', 'Plugin action', ['list', 'install', 'remove', 'enable', 'disable', 'info', 'search'])
  .option('-n, --name <name>', 'Plugin name')
  .option('-s, --source <source>', 'Plugin source (URL or local path)')
  .option('-v, --version <version>', 'Plugin version')
  .option('--dry-run', 'Show what would be done without executing')
  .action(async (action, options) => {
    const configManager = new ConfigManager();
    const logger = new ConsoleLogger();
    const storage = new FileStorage('./.taskflow/data');
    const events = new NodeEventEmitter();

    try {
      const config = await configManager.load();
      
      switch (action) {
        case 'list':
          await listPlugins(config, logger);
          break;
        case 'install':
          await installPlugin(config, options, logger, storage, events);
          break;
        case 'remove':
          await removePlugin(config, options, logger);
          break;
        case 'enable':
          await enablePlugin(config, options, logger);
          break;
        case 'disable':
          await disablePlugin(config, options, logger);
          break;
        case 'info':
          await showPluginInfo(config, options, logger);
          break;
        case 'search':
          await searchPlugins(options, logger);
          break;
        default:
          console.error(chalk.red(`Unknown action: ${action}`));
          process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('Plugin command failed:'), error);
      process.exit(1);
    }
  });

/**
 * Task Management Command
 */
export const taskCommand = new Command('task')
  .description('Manage tasks and workflows')
  .argument('<action>', 'Task action', ['list', 'create', 'update', 'delete', 'sync', 'assign'])
  .option('-i, --id <id>', 'Task ID')
  .option('-t, --title <title>', 'Task title')
  .option('-d, --description <description>', 'Task description')
  .option('-s, --status <status>', 'Task status')
  .option('-p, --priority <priority>', 'Task priority')
  .option('-a, --assignee <assignee>', 'Task assignee')
  .option('--format <format>', 'Output format', 'table')
  .action(async (action, options) => {
    const configManager = new ConfigManager();
    
    try {
      const config = await configManager.load();
      
      switch (action) {
        case 'list':
          await listTasks(config, options);
          break;
        case 'create':
          await createTask(config, options);
          break;
        case 'update':
          await updateTask(config, options);
          break;
        case 'delete':
          await deleteTask(config, options);
          break;
        case 'sync':
          await syncTasks(config, options);
          break;
        case 'assign':
          await assignTask(config, options);
          break;
        default:
          console.error(chalk.red(`Unknown action: ${action}`));
          process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('Task command failed:'), error);
      process.exit(1);
    }
  });

/**
 * Workflow Management Command
 */
export const workflowCommand = new Command('workflow')
  .description('Manage workflows and automation')
  .argument('<action>', 'Workflow action', ['list', 'create', 'run', 'schedule', 'logs'])
  .option('-n, --name <name>', 'Workflow name')
  .option('-t, --trigger <trigger>', 'Workflow trigger')
  .option('-s, --schedule <schedule>', 'Workflow schedule (cron)')
  .option('--dry-run', 'Show what would be done without executing')
  .action(async (action, options) => {
    const configManager = new ConfigManager();
    
    try {
      const config = await configManager.load();
      
      switch (action) {
        case 'list':
          await listWorkflows(config, options);
          break;
        case 'create':
          await createWorkflow(config, options);
          break;
        case 'run':
          await runWorkflow(config, options);
          break;
        case 'schedule':
          await scheduleWorkflow(config, options);
          break;
        case 'logs':
          await showWorkflowLogs(config, options);
          break;
        default:
          console.error(chalk.red(`Unknown action: ${action}`));
          process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('Workflow command failed:'), error);
      process.exit(1);
    }
  });

/**
 * Migration Command
 */
export const migrateCommand = new Command('migrate')
  .description('Migrate configuration and data between versions')
  .argument('<version>', 'Target version', ['0.5.0'])
  .option('--dry-run', 'Show what would be done without executing')
  .option('--force', 'Force migration even if already migrated')
  .option('--backup-path <path>', 'Backup path', './.taskflow/backups')
  .action(async (version, options) => {
    const { MigrationEngine, ConsoleMigrationLogger } = await import('../core/migration/tools.js');
    
    try {
      const logger = new ConsoleMigrationLogger();
      const engine = new MigrationEngine(logger);
      
      const migrationConfig = {
        fromVersion: '0.3.0',
        toVersion: version,
        backupPath: options.backupPath,
        dryRun: options.dryRun,
        force: options.force,
      };

      console.log(chalk.blue(`🚀 Starting migration to v${version}...`));
      
      const result = await engine.migrate(migrationConfig, process.cwd());
      
      if (result.success) {
        console.log(chalk.green('✅ Migration completed successfully!'));
        if (result.backupPath) {
          console.log(chalk.blue(`📦 Backup created at: ${result.backupPath}`));
        }
      } else {
        console.log(chalk.red('❌ Migration failed:'));
        result.errors.forEach(error => console.log(chalk.red(`   - ${error}`)));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('Migration failed:'), error);
      process.exit(1);
    }
  });

/**
 * Plugin Management Functions
 */

async function listPlugins(config: ProjectConfig, _logger: any): Promise<void> {
  console.log(chalk.blue('📦 Installed plugins:'));
  
  if (!config.plugins || config.plugins.length === 0) {
    console.log(chalk.gray('  No plugins installed'));
    return;
  }

  config.plugins.forEach((plugin, index) => {
    const status = plugin.enabled ? chalk.green('✓') : chalk.red('✗');
    console.log(`  ${index + 1}. ${plugin.name} ${status}`);
    if (plugin.config && Object.keys(plugin.config).length > 0) {
      console.log(chalk.gray(`     Config: ${JSON.stringify(plugin.config)}`));
    }
  });
}

async function installPlugin(
  _config: ProjectConfig,
  options: any,
  _logger: any,
  _storage: any,
  _events: any
): Promise<void> {
  if (!options.name) {
    console.error(chalk.red('Plugin name is required'));
    return;
  }

  console.log(chalk.blue(`📦 Installing plugin: ${options.name}`));
  
  if (options.dryRun) {
    console.log(chalk.yellow('[DRY RUN] Would install plugin:'), options.name);
    return;
  }

  try {
    const configManager = new ConfigManager();
    
    // For now, add plugin to config
    const pluginConfig = {
      name: options.name,
      enabled: true,
      config: {},
      dependencies: [],
    };

    await configManager.addPlugin(pluginConfig);
    console.log(chalk.green(`✅ Plugin ${options.name} installed successfully`));
    
  } catch (error) {
    console.error(chalk.red('❌ Plugin installation failed:'), error);
  }
}

async function removePlugin(_config: ProjectConfig, options: any, _logger: any): Promise<void> {
  if (!options.name) {
    console.error(chalk.red('Plugin name is required'));
    return;
  }

  console.log(chalk.blue(`🗑️  Removing plugin: ${options.name}`));
  
  try {
    const configManager = new ConfigManager();
    await configManager.removePlugin(options.name);
    console.log(chalk.green(`✅ Plugin ${options.name} removed successfully`));
  } catch (error) {
    console.error(chalk.red('❌ Plugin removal failed:'), error);
  }
}

async function enablePlugin(_config: ProjectConfig, options: any, _logger: any): Promise<void> {
  if (!options.name) {
    console.error(chalk.red('Plugin name is required'));
    return;
  }

  try {
    const configManager = new ConfigManager();
    await configManager.updatePlugin(options.name, { enabled: true });
    console.log(chalk.green(`✅ Plugin ${options.name} enabled`));
  } catch (error) {
    console.error(chalk.red('❌ Failed to enable plugin:'), error);
  }
}

async function disablePlugin(_config: ProjectConfig, options: any, _logger: any): Promise<void> {
  if (!options.name) {
    console.error(chalk.red('Plugin name is required'));
    return;
  }

  try {
    const configManager = new ConfigManager();
    await configManager.updatePlugin(options.name, { enabled: false });
    console.log(chalk.green(`✅ Plugin ${options.name} disabled`));
  } catch (error) {
    console.error(chalk.red('❌ Failed to disable plugin:'), error);
  }
}

async function showPluginInfo(_config: ProjectConfig, options: any, _logger: any): Promise<void> {
  if (!options.name) {
    console.error(chalk.red('Plugin name is required'));
    return;
  }

  try {
    const configManager = new ConfigManager();
    const plugin = configManager.getPluginConfig(options.name);
    if (!plugin) {
      console.error(chalk.red(`Plugin not found: ${options.name}`));
      return;
    }

    console.log(chalk.blue(`📋 Plugin information: ${plugin.name}`));
    console.log(`  Status: ${plugin.enabled ? chalk.green('Enabled') : chalk.red('Disabled')}`);
    console.log(`  Dependencies: ${plugin.dependencies?.join(', ') || 'None'}`);
    console.log(`  Configuration: ${JSON.stringify(plugin.config, null, 2)}`);
  } catch (error) {
    console.error(chalk.red('❌ Failed to get plugin info:'), error);
  }
}

async function searchPlugins(_options: any, _logger: any): Promise<void> {
  console.log(chalk.blue('🔍 Searching for plugins...'));
  console.log(chalk.gray('Plugin search not implemented yet'));
}

/**
 * Task Management Functions
 */

async function listTasks(_config: ProjectConfig, _options: any): Promise<void> {
  console.log(chalk.blue('📋 Tasks:'));
  console.log(chalk.gray('Task listing not implemented yet'));
}

async function createTask(_config: ProjectConfig, options: any): Promise<void> {
  if (!options.title) {
    console.error(chalk.red('Task title is required'));
    return;
  }

  console.log(chalk.blue(`➕ Creating task: ${options.title}`));
  console.log(chalk.gray('Task creation not implemented yet'));
}

async function updateTask(_config: ProjectConfig, options: any): Promise<void> {
  if (!options.id) {
    console.error(chalk.red('Task ID is required'));
    return;
  }

  console.log(chalk.blue(`📝 Updating task: ${options.id}`));
  console.log(chalk.gray('Task update not implemented yet'));
}

async function deleteTask(_config: ProjectConfig, options: any): Promise<void> {
  if (!options.id) {
    console.error(chalk.red('Task ID is required'));
    return;
  }

  console.log(chalk.blue(`🗑️  Deleting task: ${options.id}`));
  console.log(chalk.gray('Task deletion not implemented yet'));
}

async function syncTasks(_config: ProjectConfig, _options: any): Promise<void> {
  console.log(chalk.blue('🔄 Syncing tasks...'));
  console.log(chalk.gray('Task sync not implemented yet'));
}

async function assignTask(_config: ProjectConfig, options: any): Promise<void> {
  if (!options.id || !options.assignee) {
    console.error(chalk.red('Task ID and assignee are required'));
    return;
  }

  console.log(chalk.blue(`👤 Assigning task ${options.id} to ${options.assignee}`));
  console.log(chalk.gray('Task assignment not implemented yet'));
}

/**
 * Workflow Management Functions
 */

async function listWorkflows(_config: ProjectConfig, _options: any): Promise<void> {
  console.log(chalk.blue('🔄 Workflows:'));
  console.log(chalk.gray('Workflow listing not implemented yet'));
}

async function createWorkflow(_config: ProjectConfig, options: any): Promise<void> {
  if (!options.name) {
    console.error(chalk.red('Workflow name is required'));
    return;
  }

  console.log(chalk.blue(`➕ Creating workflow: ${options.name}`));
  console.log(chalk.gray('Workflow creation not implemented yet'));
}

async function runWorkflow(_config: ProjectConfig, options: any): Promise<void> {
  if (!options.name) {
    console.error(chalk.red('Workflow name is required'));
    return;
  }

  console.log(chalk.blue(`🏃 Running workflow: ${options.name}`));
  console.log(chalk.gray('Workflow execution not implemented yet'));
}

async function scheduleWorkflow(_config: ProjectConfig, options: any): Promise<void> {
  if (!options.name || !options.schedule) {
    console.error(chalk.red('Workflow name and schedule are required'));
    return;
  }

  console.log(chalk.blue(`⏰ Scheduling workflow: ${options.name}`));
  console.log(chalk.gray(`Schedule: ${options.schedule}`));
  console.log(chalk.gray('Workflow scheduling not implemented yet'));
}

async function showWorkflowLogs(_config: ProjectConfig, _options: any): Promise<void> {
  console.log(chalk.blue('📄 Workflow logs:'));
  console.log(chalk.gray('Workflow logs not implemented yet'));
}