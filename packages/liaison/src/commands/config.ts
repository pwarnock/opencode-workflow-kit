/**
 * Config Command
 * CLI command: liaison config
 * Manage environment configurations (OpenCode, Claude)
 * Supports template variable substitution and backup/merge operations
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { promises as fs } from 'fs';
import { join } from 'path';
import { createBackup } from '../utils/backup-manager';

interface TemplateVariables {
  projectName: string;
  projectPath: string;
  timestamp: string;
  userName: string;
  userEmail: string;
}

function substituteTemplateVariables(content: string, variables: TemplateVariables): string {
  let result = content;
  result = result.replace(/\{\{projectName\}\}/g, variables.projectName);
  result = result.replace(/\{\{projectPath\}\}/g, variables.projectPath);
  result = result.replace(/\{\{timestamp\}\}/g, variables.timestamp);
  result = result.replace(/\{\{userName\}\}/g, variables.userName);
  result = result.replace(/\{\{userEmail\}\}/g, variables.userEmail);
  return result;
}

async function mergeConfigs(baseConfig: Record<string, unknown>, overrideConfig: Record<string, unknown>): Promise<Record<string, unknown>> {
  const merged = { ...baseConfig };
  for (const [key, value] of Object.entries(overrideConfig)) {
    if (value !== undefined) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value) && typeof merged[key] === 'object' && merged[key] !== null && !Array.isArray(merged[key])) {
        merged[key] = await mergeConfigs(merged[key] as Record<string, unknown>, value as Record<string, unknown>);
      } else {
        merged[key] = value;
      }
    }
  }
  return merged;
}

export function createConfigCommand(): Command {
  const command = new Command('config');

  command.description('Manage environment configurations (OpenCode, Claude)');

  command
    .command('opencode')
    .description('Configure OpenCode environment')
    .option('-d, --directory <path>', 'Target directory for configuration', process.cwd())
    .option('-a, --agents <agents>', 'Comma-separated list of agents to create', 'library-researcher,code-reviewer')
    .option('--overwrite', 'Overwrite existing configuration')
    .option('--merge', 'Merge with existing configuration', false)
    .option('--template <name>', 'Configuration template (minimal, standard, full)', 'standard')
    .action(async (options) => {
      const spinner = ora('Configuring OpenCode environment...').start();

      try {
        // @ts-ignore - Internal dependency
        const { createAgentPrimitive, validateAgentConfig } = await import('@pwarnock/agent_primitives');

        const targetDir = options.directory;
        const opencodeDir = join(targetDir, '.opencode');

        spinner.text = 'Creating configuration directory...';
        await fs.mkdir(opencodeDir, { recursive: true });

        const variables: TemplateVariables = {
          projectName: targetDir.split('/').pop() || 'unknown-project',
          projectPath: targetDir,
          timestamp: new Date().toISOString(),
          userName: process.env.USER || process.env.USERNAME || 'unknown',
          userEmail: process.env.EMAIL || ''
        };

        const agentList = options.agents.split(',').map((a: string) => a.trim());

        spinner.text = 'Generating agent configurations...';

        const agentConfigs: Record<string, unknown> = {};

        for (const agentName of agentList) {
          const agentConfig = createAgentPrimitive(agentName, '1.0.0');
          agentConfigs[agentName] = agentConfig;
        }

        const opencodeConfig = {
          $schema: 'https://opencode.ai/config.json',
          version: '1.0.0',
          template: options.template,
          project: {
            name: variables.projectName,
            path: variables.projectPath
          },
          generated: variables.timestamp,
          agents: agentConfigs
        };

        const configPath = join(opencodeDir, 'config.json');
        let existingConfig: Record<string, unknown> = {};

        if (await fs.access(configPath).then(() => true).catch(() => false)) {
          if (options.merge) {
            spinner.text = 'Merging with existing configuration...';
            const existingContent = await fs.readFile(configPath, 'utf-8');
            existingConfig = JSON.parse(existingContent);
            if (options.overwrite) {
              await createBackup(configPath, { type: 'config' });
            }
            const mergedConfig = await mergeConfigs(existingConfig, opencodeConfig);
            await fs.writeFile(configPath, JSON.stringify(mergedConfig, null, 2));
            spinner.succeed(chalk.green('OpenCode configuration merged successfully!'));
          } else if (options.overwrite) {
            await createBackup(configPath, { type: 'config' });
            await fs.writeFile(configPath, JSON.stringify(opencodeConfig, null, 2));
            spinner.succeed(chalk.green('OpenCode configuration updated!'));
          } else {
            spinner.warn(chalk.yellow('Configuration already exists. Use --overwrite to replace or --merge to combine.'));
            process.exit(0);
          }
        } else {
          await fs.writeFile(configPath, JSON.stringify(opencodeConfig, null, 2));
          spinner.succeed(chalk.green('OpenCode configuration created successfully!'));
        }

        console.log(chalk.gray(`📁 Configuration directory: ${opencodeDir}`));
        console.log(chalk.gray(`🤖 Agents configured: ${agentList.join(', ')}`));
        console.log(chalk.gray(`📄 Config file: ${configPath}`));
        process.exit(0);

      } catch (error) {
        spinner.fail(chalk.red('OpenCode configuration failed'));
        console.error(chalk.red(`❌ ${error instanceof Error ? error.message : String(error)}`));
        process.exit(1);
      }
    });

  command
    .command('claude')
    .description('Configure Claude environment')
    .option('-d, --directory <path>', 'Target directory for configuration', process.cwd())
    .option('-n, --name <name>', 'Agent name', 'liaison-agent')
    .option('--model <model>', 'Claude model to use', 'claude-sonnet-4-20250514')
    .option('--temperature <temp>', 'Temperature (0.0-1.0)', '0.7')
    .option('--max-tokens <n>', 'Max tokens', '8192')
    .option('--system-prompt <text>', 'System prompt')
    .option('--overwrite', 'Overwrite existing configuration')
    .option('--merge', 'Merge with existing configuration', false)
    .option('--template <name>', 'Configuration template (minimal, standard, full)', 'standard')
    .action(async (options) => {
      const spinner = ora('Configuring Claude environment...').start();

      try {
        // @ts-ignore - Internal dependency
        const { createClaudeConfig, validateAgentConfig } = await import('@pwarnock/claude_config');

        const targetDir = options.directory;
        const claudeDir = join(targetDir, '.claude');

        spinner.text = 'Creating configuration directory...';
        await fs.mkdir(claudeDir, { recursive: true });

        const variables: TemplateVariables = {
          projectName: targetDir.split('/').pop() || 'unknown-project',
          projectPath: targetDir,
          timestamp: new Date().toISOString(),
          userName: process.env.USER || process.env.USERNAME || 'unknown',
          userEmail: process.env.EMAIL || ''
        };

        spinner.text = 'Generating Claude configuration...';

        const config = createClaudeConfig({
          name: options.name,
          description: `Liaison agent for ${variables.projectName}`,
          model: options.model,
          temperature: parseFloat(options.temperature),
          maxTokens: parseInt(options.maxTokens, 10),
          systemPrompt: options.systemPrompt || `You are the Liaison agent for ${variables.projectName}. You help with workflow automation and task management.`
        });

        const claudeConfig = {
          ...config,
          $schema: 'https://claude.com/config.json'
        };

        const configPath = join(claudeDir, 'config.json');
        let existingConfig: Record<string, unknown> = {};

        if (await fs.access(configPath).then(() => true).catch(() => false)) {
          if (options.merge) {
            spinner.text = 'Merging with existing configuration...';
            const existingContent = await fs.readFile(configPath, 'utf-8');
            existingConfig = JSON.parse(existingContent);
            if (options.overwrite) {
              await createBackup(configPath, { type: 'config' });
            }
            const mergedConfig = await mergeConfigs(existingConfig, claudeConfig);
            await fs.writeFile(configPath, JSON.stringify(mergedConfig, null, 2));
            spinner.succeed(chalk.green('Claude configuration merged successfully!'));
          } else if (options.overwrite) {
            await createBackup(configPath, { type: 'config' });
            await fs.writeFile(configPath, JSON.stringify(claudeConfig, null, 2));
            spinner.succeed(chalk.green('Claude configuration updated!'));
          } else {
            spinner.warn(chalk.yellow('Configuration already exists. Use --overwrite to replace or --merge to combine.'));
            process.exit(0);
          }
        } else {
          await fs.writeFile(configPath, JSON.stringify(claudeConfig, null, 2));
          spinner.succeed(chalk.green('Claude configuration created successfully!'));
        }

        console.log(chalk.gray(`📁 Configuration directory: ${claudeDir}`));
        console.log(chalk.gray(`🤖 Agent name: ${options.name}`));
        console.log(chalk.gray(`📄 Config file: ${configPath}`));
        process.exit(0);

      } catch (error) {
        spinner.fail(chalk.red('Claude configuration failed'));
        console.error(chalk.red(`❌ ${error instanceof Error ? error.message : String(error)}`));
        process.exit(1);
      }
    });

  command
    .command('list')
    .description('List existing configurations')
    .option('-d, --directory <path>', 'Directory to search', process.cwd())
    .action(async (options) => {
      try {
        const targetDir = options.directory;
        const configs: Array<{ type: string; path: string; exists: boolean }> = [];

        const opencodeConfig = join(targetDir, '.opencode', 'config.json');
        const claudeConfig = join(targetDir, '.claude', 'config.json');
        const opencodeDir = join(targetDir, '.opencode');
        const claudeDir = join(targetDir, '.claude');

        if (await fs.access(opencodeDir).then(() => true).catch(() => false)) {
          configs.push({ type: 'opencode', path: opencodeConfig, exists: true });
        } else {
          configs.push({ type: 'opencode', path: opencodeDir, exists: false });
        }

        if (await fs.access(claudeDir).then(() => true).catch(() => false)) {
          configs.push({ type: 'claude', path: claudeConfig, exists: true });
        } else {
          configs.push({ type: 'claude', path: claudeDir, exists: false });
        }

        console.log(chalk.bold('📋 Existing Configurations:\n'));

        for (const config of configs) {
          const status = config.exists ? chalk.green('✓') : chalk.gray('○');
          const label = config.type.charAt(0).toUpperCase() + config.type.slice(1);
          console.log(`  ${status} ${chalk.cyan(label)}: ${config.exists ? config.path : chalk.gray(config.path + ' (not created)')}`);
        }

        console.log();
        process.exit(0);
      } catch (error) {
        console.error(chalk.red(`❌ Failed to list configurations: ${error}`));
        process.exit(1);
      }
    });

  command
    .command('validate')
    .description('Validate configuration files')
    .option('-d, --directory <path>', 'Directory to search', process.cwd())
    .action(async (options) => {
      const spinner = ora('Validating configurations...').start();

      try {
        // @ts-ignore - Internal dependency
        const { validateAgentConfig } = await import('@pwarnock/agent_primitives');

        const targetDir = options.directory;
        const results: Array<{ type: string; valid: boolean; error?: string }> = [];

        const opencodeConfigPath = join(targetDir, '.opencode', 'config.json');
        const claudeConfigPath = join(targetDir, '.claude', 'config.json');

        if (await fs.access(opencodeConfigPath).then(() => true).catch(() => false)) {
          const content = await fs.readFile(opencodeConfigPath, 'utf-8');
          try {
            const config = JSON.parse(content);
            const isValid = validateAgentConfig(config);
            results.push({ type: 'opencode', valid: isValid, error: isValid ? undefined : 'Invalid agent configuration structure' });
          } catch {
            results.push({ type: 'opencode', valid: false, error: 'Invalid JSON format' });
          }
        } else {
          results.push({ type: 'opencode', valid: true });
        }

        if (await fs.access(claudeConfigPath).then(() => true).catch(() => false)) {
          const content = await fs.readFile(claudeConfigPath, 'utf-8');
          try {
            const config = JSON.parse(content);
            const isValid = validateAgentConfig(config);
            results.push({ type: 'claude', valid: isValid, error: isValid ? undefined : 'Invalid Claude configuration structure' });
          } catch {
            results.push({ type: 'claude', valid: false, error: 'Invalid JSON format' });
          }
        } else {
          results.push({ type: 'claude', valid: true });
        }

        spinner.stop();

        console.log(chalk.bold('📋 Validation Results:\n'));

        let allValid = true;
        for (const result of results) {
          if (result.type === 'opencode' && !results.find(r => r.type === 'opencode')?.valid) {
            continue;
          }
          if (result.type === 'claude' && !results.find(r => r.type === 'claude')?.valid) {
            continue;
          }

          const label = result.type.charAt(0).toUpperCase() + result.type.slice(1);
          if (result.valid) {
            console.log(`  ${chalk.green('✓')} ${chalk.cyan(label)}: Valid`);
          } else {
            console.log(`  ${chalk.red('✗')} ${chalk.cyan(label)}: ${chalk.red(result.error || 'Invalid')}`);
            allValid = false;
          }
        }

        console.log();
        process.exit(allValid ? 0 : 1);
      } catch (error) {
        spinner.fail(chalk.red('Validation failed'));
        console.error(chalk.red(`❌ ${error instanceof Error ? error.message : String(error)}`));
        process.exit(1);
      }
    });

  command
    .command('template')
    .description('List available templates or show template details')
    .argument('[template-name]', 'Template name to show details for')
    .action(async (templateName) => {
      try {
        // @ts-ignore - Internal dependency
        const { getAvailableTemplates, getTemplateDetails } = await import('../utils/template-engine');

        if (templateName) {
          const details = getTemplateDetails(templateName);
          if (!details) {
            console.log(chalk.red(`❌ Template '${templateName}' not found`));
            console.log(chalk.gray('\nAvailable templates:'));
            const templates = getAvailableTemplates();
            for (const t of templates) {
              console.log(`  - ${t.name}: ${t.description}`);
            }
            process.exit(1);
          }

          console.log(chalk.bold(`📄 Template: ${templateName}\n`));
          console.log(chalk.cyan('Description:'), details.description);
          console.log(chalk.cyan('Schema:'), 'schema' in details ? details.schema : 'opencode');

          if ('systemPrompt' in details) {
            console.log(chalk.cyan('Model:'), details.model);
            console.log(chalk.cyan('Temperature:'), details.temperature);
            console.log(chalk.cyan('Max Tokens:'), details.maxTokens);
            console.log(chalk.cyan('System Prompt:'));
            console.log(chalk.gray(`  ${details.systemPrompt.substring(0, 200)}${details.systemPrompt.length > 200 ? '...' : ''}`));
          } else {
            console.log(chalk.cyan('Agents:'), details.agents?.join(', ') || 'none');
            console.log(chalk.cyan('Features:'), details.features?.join(', ') || 'none');
          }
        } else {
          const templates = getAvailableTemplates();

          console.log(chalk.bold('📋 Available Configuration Templates:\n'));

          for (const template of templates) {
            console.log(`  ${chalk.cyan(template.name)}`);
            console.log(`    ${chalk.gray(template.description)}`);
            console.log(`    ${chalk.gray(`Schema: ${template.schema}`)}`);
            console.log();
          }

          console.log(chalk.gray('Use: liaison config template <name> for details'));
        }

        process.exit(0);
      } catch (error) {
        console.error(chalk.red(`❌ Failed to show template: ${error}`));
        process.exit(1);
      }
    });

  command
    .command('status')
    .description('Show current configuration status')
    .option('-d, --directory <path>', 'Directory to check', process.cwd())
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const targetDir = options.directory;
        const status: Record<string, unknown> = {
          directory: targetDir,
          projectName: targetDir.split('/').pop() || 'unknown',
          configurations: {},
          lastChecked: new Date().toISOString()
        };

        const opencodeDir = join(targetDir, '.opencode');
        const claudeDir = join(targetDir, '.claude');
        const opencodeConfigPath = join(opencodeDir, 'config.json');
        const claudeConfigPath = join(claudeDir, 'config.json');

        const configStatus: Record<string, unknown> = {};

        if (await fs.access(opencodeDir).then(() => true).catch(() => false)) {
          configStatus.opencode = { exists: true, path: opencodeDir };

          if (await fs.access(opencodeConfigPath).then(() => true).catch(() => false)) {
            const content = await fs.readFile(opencodeConfigPath, 'utf-8');
            try {
              const config = JSON.parse(content);
              configStatus.opencode = {
                exists: true,
                path: opencodeConfigPath,
                valid: true,
                version: config.version || 'unknown',
                template: config.template || 'unknown',
                agents: Object.keys(config.agents || {}).length
              };
            } catch {
              configStatus.opencode = { exists: true, path: opencodeConfigPath, valid: false, error: 'Invalid JSON' };
            }
          } else {
            configStatus.opencode = { exists: true, path: opencodeDir, valid: false, error: 'No config.json' };
          }
        } else {
          configStatus.opencode = { exists: false };
        }

        if (await fs.access(claudeDir).then(() => true).catch(() => false)) {
          configStatus.claude = { exists: true, path: claudeDir };

          if (await fs.access(claudeConfigPath).then(() => true).catch(() => false)) {
            const content = await fs.readFile(claudeConfigPath, 'utf-8');
            try {
              const config = JSON.parse(content);
              configStatus.claude = {
                exists: true,
                path: claudeConfigPath,
                valid: true,
                name: config.name || 'unknown',
                model: config.model || 'unknown',
                temperature: config.temperature || 'unknown'
              };
            } catch {
              configStatus.claude = { exists: true, path: claudeConfigPath, valid: false, error: 'Invalid JSON' };
            }
          } else {
            configStatus.claude = { exists: true, path: claudeDir, valid: false, error: 'No config.json' };
          }
        } else {
          configStatus.claude = { exists: false };
        }

        status.configurations = configStatus;

        if (options.json) {
          console.log(JSON.stringify(status, null, 2));
        } else {
          console.log(chalk.bold('📊 Configuration Status\n'));

          const opencodeCfg = configStatus.opencode as Record<string, unknown>;
          const claudeCfg = configStatus.claude as Record<string, unknown>;

          console.log(`${chalk.blue('Project:')} ${status.projectName}`);
          console.log(`${chalk.blue('Directory:')} ${targetDir}`);
          console.log();

          const opencodeStatus = opencodeCfg.exists ?
            (opencodeCfg.valid ? chalk.green('✓ Configured') : chalk.yellow('⚠ Incomplete')) :
            chalk.gray('○ Not configured');

          const claudeStatus = claudeCfg.exists ?
            (claudeCfg.valid ? chalk.green('✓ Configured') : chalk.yellow('⚠ Incomplete')) :
            chalk.gray('○ Not configured');

          console.log(`${chalk.cyan('OpenCode:')} ${opencodeStatus}`);
          if (opencodeCfg.exists && opencodeCfg.template) {
            console.log(`  ${chalk.gray(`Template: ${opencodeCfg.template}`)}`);
          }
          if (opencodeCfg.exists && (opencodeCfg as { agents?: number }).agents !== undefined) {
            console.log(`  ${chalk.gray(`Agents: ${(opencodeCfg as { agents: number }).agents}`)}`);
          }

          console.log(`${chalk.cyan('Claude:')} ${claudeStatus}`);
          if (claudeCfg.exists && claudeCfg.name) {
            console.log(`  ${chalk.gray(`Agent: ${claudeCfg.name}`)}`);
          }
          if (claudeCfg.exists && claudeCfg.model) {
            console.log(`  ${chalk.gray(`Model: ${claudeCfg.model}`)}`);
          }
        }

        process.exit(0);
      } catch (error) {
        console.error(chalk.red(`❌ Failed to show status: ${error}`));
        process.exit(1);
      }
    });

  command
    .command('export')
    .description('Export configuration to a file')
    .option('-d, --directory <path>', 'Directory to export from', process.cwd())
    .option('-o, --output <path>', 'Output file path', 'liaison-config-export.json')
    .option('--format <format>', 'Output format (json, yaml)', 'json')
    .action(async (options) => {
      const spinner = ora('Exporting configuration...').start();

      try {
        const targetDir = options.directory;
        const outputPath = options.output;

        const exportData: Record<string, unknown> = {
          exportedAt: new Date().toISOString(),
          sourceDirectory: targetDir,
          configurations: {}
        };

        const opencodeConfigPath = join(targetDir, '.opencode', 'config.json');
        const claudeConfigPath = join(targetDir, '.claude', 'config.json');

        if (await fs.access(opencodeConfigPath).then(() => true).catch(() => false)) {
          const content = await fs.readFile(opencodeConfigPath, 'utf-8');
          (exportData.configurations as Record<string, unknown>).opencode = JSON.parse(content);
        }

        if (await fs.access(claudeConfigPath).then(() => true).catch(() => false)) {
          const content = await fs.readFile(claudeConfigPath, 'utf-8');
          (exportData.configurations as Record<string, unknown>).claude = JSON.parse(content);
        }

        if (options.format === 'yaml') {
          const yaml = await import('js-yaml');
          await fs.writeFile(outputPath, yaml.dump(exportData), 'utf-8');
        } else {
          await fs.writeFile(outputPath, JSON.stringify(exportData, null, 2), 'utf-8');
        }

        spinner.succeed(chalk.green('Configuration exported successfully!'));
        console.log(chalk.gray(`📁 Exported to: ${outputPath}`));
        console.log(chalk.gray(`📊 Size: ${JSON.stringify(exportData).length} bytes`));

        process.exit(0);
      } catch (error) {
        spinner.fail(chalk.red('Export failed'));
        console.error(chalk.red(`❌ ${error instanceof Error ? error.message : String(error)}`));
        process.exit(1);
      }
    });

  command
    .command('import')
    .description('Import configuration from a file')
    .option('-f, --file <path>', 'Input file path', '-')
    .option('-d, --directory <path>', 'Directory to import to', process.cwd())
    .option('--overwrite', 'Overwrite existing configurations')
    .option('--merge', 'Merge with existing configurations', false)
    .action(async (options) => {
      const spinner = ora('Importing configuration...').start();

      try {
        const targetDir = options.directory;
        let inputContent: string;

        if (options.file === '-') {
          const { stdin } = await import('process');
          inputContent = '';
          for await (const chunk of stdin) {
            inputContent += chunk;
          }
        } else {
          inputContent = await fs.readFile(options.file, 'utf-8');
        }

        let importData: Record<string, unknown>;

        try {
          importData = JSON.parse(inputContent);
        } catch {
          try {
            const yaml = await import('js-yaml');
            importData = yaml.load(inputContent) as Record<string, unknown>;
          } catch {
            spinner.fail(chalk.red('Invalid file format'));
            console.error(chalk.red('❌ File must be valid JSON or YAML'));
            process.exit(1);
          }
        }

        const opencodeConfig = (importData.configurations as Record<string, unknown>)?.opencode as Record<string, unknown> | undefined;
        const claudeConfig = (importData.configurations as Record<string, unknown>)?.claude as Record<string, unknown> | undefined;

        const opencodeDir = join(targetDir, '.opencode');
        const claudeDir = join(targetDir, '.claude');

        if (opencodeConfig) {
          spinner.text = 'Importing OpenCode configuration...';
          await fs.mkdir(opencodeDir, { recursive: true });

          const opencodeConfigPath = join(opencodeDir, 'config.json');
          const exists = await fs.access(opencodeConfigPath).then(() => true).catch(() => false);

          if (exists && !options.overwrite && !options.merge) {
            spinner.warn(chalk.yellow('OpenCode configuration exists. Use --overwrite or --merge.'));
          } else if (exists && options.merge) {
            const existingContent = await fs.readFile(opencodeConfigPath, 'utf-8');
            const existing = JSON.parse(existingContent);
            const merged = { ...existing, ...opencodeConfig };
            await fs.writeFile(opencodeConfigPath, JSON.stringify(merged, null, 2));
          } else {
            if (exists) {
              await createBackup(opencodeConfigPath);
            }
            await fs.writeFile(opencodeConfigPath, JSON.stringify(opencodeConfig, null, 2));
          }
        }

        if (claudeConfig) {
          spinner.text = 'Importing Claude configuration...';
          await fs.mkdir(claudeDir, { recursive: true });

          const claudeConfigPath = join(claudeDir, 'config.json');
          const exists = await fs.access(claudeConfigPath).then(() => true).catch(() => false);

          if (exists && !options.overwrite && !options.merge) {
            spinner.warn(chalk.yellow('Claude configuration exists. Use --overwrite or --merge.'));
          } else if (exists && options.merge) {
            const existingContent = await fs.readFile(claudeConfigPath, 'utf-8');
            const existing = JSON.parse(existingContent);
            const merged = { ...existing, ...claudeConfig };
            await fs.writeFile(claudeConfigPath, JSON.stringify(merged, null, 2));
          } else {
            if (exists) {
              await createBackup(claudeConfigPath);
            }
            await fs.writeFile(claudeConfigPath, JSON.stringify(claudeConfig, null, 2));
          }
        }

        spinner.succeed(chalk.green('Configuration imported successfully!'));
        console.log(chalk.gray(`📁 Imported to: ${targetDir}`));

        process.exit(0);
      } catch (error) {
        spinner.fail(chalk.red('Import failed'));
        console.error(chalk.red(`❌ ${error instanceof Error ? error.message : String(error)}`));
        process.exit(1);
      }
    });

  return command;
}

export const configCommand = createConfigCommand();
