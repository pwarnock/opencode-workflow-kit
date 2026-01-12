import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { promises as fs } from 'fs';
import { join } from 'path';
import inquirer from 'inquirer';
import { detectConflicts, promptUserForConflict, mergeConfigs, ConflictInfo } from '../utils/merge-manager';
import { createBackup } from '../utils/backup-manager';

interface OpenCodeSetupOptions {
  directory?: string;
  agent?: string;
  template?: string;
  model?: string;
  overwrite?: boolean;
  merge?: boolean;
}

interface ClaudeSetupOptions {
  directory?: string;
  name?: string;
  model?: string;
  temperature?: string;
  maxTokens?: string;
  systemPrompt?: string;
  overwrite?: boolean;
  merge?: boolean;
}

async function promptForOpenCodeSetup(): Promise<{ agentName: string; template: string; model: string }> {
  const { agentName } = await inquirer.prompt([
    {
      type: 'input',
      name: 'agentName',
      message: 'Enter agent name:',
      default: 'liaison-agent',
      validate: (input: string) => {
        if (!input.trim()) return 'Agent name is required';
        if (!/^[a-zA-Z0-9_-]+$/.test(input)) return 'Agent name can only contain letters, numbers, hyphens, and underscores';
        return true;
      }
    }
  ]);

  const templates = [
    { name: 'custom-agent', description: 'Generic agent template for any purpose' },
    { name: 'library-researcher', description: 'Library and API research specialist' },
    { name: 'code-reviewer', description: 'Code review and quality assurance specialist' },
    { name: 'qa-subagent', description: 'Quality assurance and testing specialist' },
    { name: 'security-subagent', description: 'Security assurance and compliance specialist' },
    { name: 'docs-writer', description: 'Technical writing and documentation specialist' },
    { name: 'cli-specialist', description: 'CLI development and command implementation' },
    { name: 'ci-cd-specialist', description: 'CI/CD pipeline automation and quality gates' },
    { name: 'release-engineer', description: 'Release management and deployment coordination' },
    { name: 'security-validator', description: 'Security reviews and vulnerability scanning' },
    { name: 'workflow-architect', description: 'Multi-agent workflow design and orchestration' },
    { name: 'liaison-specialist', description: 'Liaison architecture and workflow automation' }
  ];

  const { template } = await inquirer.prompt([
    {
      type: 'list',
      name: 'template',
      message: 'Select agent template:',
      choices: templates.map(t => ({ name: `${chalk.cyan(t.name)} - ${t.description}`, value: t.name })),
      default: 'custom-agent'
    }
  ]);

  const models = [
    { id: 'big-pickle', name: 'Big Pickle (Free)', context: 16384 },
    { id: 'openrouter/z-ai/zpm-202506', name: 'Z-AI ZPM (Free)', context: 16384 },
    { id: 'anthropic/claude-sonnet-4-20250514', name: 'Claude Sonnet 4', context: 200000 },
    { id: 'anthropic/claude-opus-4-20250501', name: 'Claude Opus 4', context: 200000 }
  ];

  const { model } = await inquirer.prompt([
    {
      type: 'list',
      name: 'model',
      message: 'Select model:',
      choices: models.map(m => ({ 
        name: `${chalk.cyan(m.id)} - ${m.name} (${m.context.toLocaleString()} ctx)`, 
        value: m.id 
      })),
      default: 'big-pickle'
    }
  ]);

  return { agentName, template, model };
}

async function promptForClaudeSetup(): Promise<{ name: string; model: string; temperature: number; maxTokens: number; systemPrompt: string }> {
  const { name } = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Enter agent name:',
      default: 'liaison-agent',
      validate: (input: string) => {
        if (!input.trim()) return 'Agent name is required';
        return true;
      }
    }
  ]);

  const models = [
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
    { id: 'claude-opus-4-20250501', name: 'Claude Opus 4' },
    { id: 'claude-haiku-3-20250520', name: 'Claude Haiku 3' }
  ];

  const { model } = await inquirer.prompt([
    {
      type: 'list',
      name: 'model',
      message: 'Select Claude model:',
      choices: models.map(m => ({ name: `${chalk.cyan(m.id)} - ${m.name}`, value: m.id })),
      default: 'claude-sonnet-4-20250514'
    }
  ]);

  const { temperature } = await inquirer.prompt([
    {
      type: 'number',
      name: 'temperature',
      message: 'Enter temperature (0.0-1.0):',
      default: 0.7,
      validate: (input: number) => {
        if (input < 0 || input > 1) return 'Temperature must be between 0.0 and 1.0';
        return true;
      }
    }
  ]);

  const { maxTokens } = await inquirer.prompt([
    {
      type: 'number',
      name: 'maxTokens',
      message: 'Enter max tokens:',
      default: 8192,
      validate: (input: number) => {
        if (input < 1) return 'Max tokens must be at least 1';
        return true;
      }
    }
  ]);

  const { systemPrompt } = await inquirer.prompt([
    {
      type: 'editor',
      name: 'systemPrompt',
      message: 'Enter system prompt (will open editor):',
      default: 'You are the Liaison agent, helping with workflow automation and task management. You coordinate multiple specialized agents to accomplish complex software engineering tasks efficiently.'
    }
  ]);

  return { name, model, temperature, maxTokens, systemPrompt };
}

export function createSetupCommand(): Command {
  const command = new Command('setup');

  command.description('Setup configuration for OpenCode or Claude (interactive prompts)');

  command
    .command('opencode')
    .description('Setup OpenCode with agent_primitives (interactive prompts)')
    .option('-d, --directory <path>', 'Target directory for configuration', process.cwd())
    .option('-a, --agent <name>', 'Agent name (non-interactive mode)')
    .option('-t, --template <name>', 'Agent template (non-interactive mode)', 'custom-agent')
    .option('-m, --model <model>', 'Model ID (non-interactive mode)', 'big-pickle')
    .option('--overwrite', 'Overwrite existing configuration')
    .option('--merge', 'Merge with existing configuration', false)
    .action(async (options: OpenCodeSetupOptions) => {
      const spinner = ora('Setting up OpenCode configuration...').start();

      try {
        const targetDir = options.directory || process.cwd();
        const opencodeDir = join(targetDir, '.opencode');
        const configPath = join(opencodeDir, 'config.json');

        spinner.text = 'Getting setup options...';

        let agentName: string;
        let template: string;
        let model: string;

        if (!options.agent || !options.template || !options.model) {
          spinner.stop();
          const answers = await promptForOpenCodeSetup();
          agentName = answers.agentName;
          template = answers.template;
          model = answers.model;
          spinner.start();
        } else {
          agentName = options.agent;
          template = options.template;
          model = options.model;
        }

        spinner.text = 'Creating configuration directory...';
        await fs.mkdir(opencodeDir, { recursive: true });

        const projectName = targetDir.split('/').pop() || 'unknown-project';

        const opencodeConfig = {
          $schema: 'https://opencode.ai/config.json',
          version: '1.0.0',
          project: {
            name: projectName,
            path: targetDir
          },
          generated: new Date().toISOString(),
          agent: {
            name: agentName,
            template,
            model,
            temperature: 0.1
          },
          tools: {
            read: true,
            write: false,
            edit: true,
            bash: false,
            webfetch: true,
            grep: false,
            glob: false,
            list: false,
            patch: false,
            todowrite: false,
            todoread: false
          },
          behavior: {
            conservative: ['qa-subagent', 'security-subagent', 'code-reviewer'].includes(template),
            confirmation_required: ['qa-subagent', 'security-subagent', 'code-reviewer'].includes(template),
            context_preservation: true,
            rollback_enabled: false,
            system_aware: true,
            version_aware: true
          }
        };

        const existingExists = await fs.access(configPath).then(() => true).catch(() => false);

        if (existingExists) {
          const existingContent = await fs.readFile(configPath, 'utf-8');
          const existingConfig = JSON.parse(existingContent);

          if (options.merge) {
            spinner.text = 'Merging with existing configuration...';

            const conflicts = await detectConflicts(opencodeConfig, existingConfig);

            if (conflicts.length > 0) {
              console.log(chalk.yellow(`\n⚠️  Found ${conflicts.length} conflicts:`));
              for (const conflict of conflicts) {
                console.log(`  ${chalk.cyan(conflict.key)}: template="${JSON.stringify(conflict.templateValue)}" vs existing="${JSON.stringify(conflict.existingValue)}"`);
              }
              console.log();

              if (options.overwrite) {
                await createBackup(configPath);
              }

              const mergedResult = await mergeConfigs(opencodeConfig, existingConfig, {
                overwrite: options.overwrite,
                promptUser: true
              });

              await fs.writeFile(configPath, JSON.stringify(mergedResult.merged, null, 2));

              spinner.succeed(chalk.green('OpenCode configuration merged with user choices!'));
              console.log(chalk.gray(`📁 Configuration: ${configPath}`));
              console.log(chalk.gray(`🤖 Agent: ${agentName}`));
              console.log(chalk.gray(`📝 Template: ${template}`));
              if (mergedResult.backupPath) {
                console.log(chalk.gray(`📁 Backup: ${mergedResult.backupPath}`));
              }
            } else {
              const merged = { ...existingConfig, ...opencodeConfig };
              await fs.writeFile(configPath, JSON.stringify(merged, null, 2));
              spinner.succeed(chalk.green('OpenCode configuration merged!'));
            }
          } else if (options.overwrite) {
            spinner.text = 'Creating backup and overwriting...';
            await createBackup(configPath);
            await fs.writeFile(configPath, JSON.stringify(opencodeConfig, null, 2));
            spinner.succeed(chalk.green('OpenCode configuration overwritten!'));
            console.log(chalk.gray(`📁 Backup created`));
          } else {
            spinner.warn(chalk.yellow('Configuration already exists. Use --overwrite to replace or --merge to combine.'));
            process.exit(0);
          }
        } else {
          await fs.writeFile(configPath, JSON.stringify(opencodeConfig, null, 2));
          spinner.succeed(chalk.green('OpenCode configuration created successfully!'));
        }

        console.log(chalk.gray(`📁 Configuration directory: ${opencodeDir}`));
        console.log(chalk.gray(`🤖 Agent name: ${agentName}`));
        console.log(chalk.gray(`📝 Template: ${template}`));
        console.log(chalk.gray(`📄 Config file: ${configPath}`));
        process.exit(0);

      } catch (error) {
        spinner.fail(chalk.red('OpenCode setup failed'));
        console.error(chalk.red(`❌ ${error instanceof Error ? error.message : String(error)}`));
        process.exit(1);
      }
    });

  command
    .command('claude')
    .description('Setup Claude with claude_config (interactive prompts)')
    .option('-d, --directory <path>', 'Target directory for configuration', process.cwd())
    .option('-n, --name <name>', 'Agent name (non-interactive mode)')
    .option('-m, --model <model>', 'Model ID (non-interactive mode)')
    .option('--temperature <temp>', 'Temperature (non-interactive mode)')
    .option('--max-tokens <n>', 'Max tokens (non-interactive mode)')
    .option('--system-prompt <text>', 'System prompt (non-interactive mode)')
    .option('--overwrite', 'Overwrite existing configuration')
    .option('--merge', 'Merge with existing configuration', false)
    .action(async (options: ClaudeSetupOptions) => {
      const spinner = ora('Setting up Claude configuration...').start();

      try {
        const targetDir = options.directory || process.cwd();
        const claudeDir = join(targetDir, '.claude');
        const configPath = join(claudeDir, 'config.json');

        spinner.text = 'Getting setup options...';

        let name: string;
        let model: string;
        let temperature: number;
        let maxTokens: number;
        let systemPrompt: string;

        if (!options.name || !options.model || !options.temperature || !options.maxTokens || !options.systemPrompt) {
          spinner.stop();
          const answers = await promptForClaudeSetup();
          name = answers.name;
          model = answers.model;
          temperature = answers.temperature;
          maxTokens = answers.maxTokens;
          systemPrompt = answers.systemPrompt;
          spinner.start();
        } else {
          name = options.name;
          model = options.model;
          temperature = parseFloat(options.temperature);
          maxTokens = parseInt(options.maxTokens, 10);
          systemPrompt = options.systemPrompt;
        }

        spinner.text = 'Creating configuration directory...';
        await fs.mkdir(claudeDir, { recursive: true });

        const projectName = targetDir.split('/').pop() || 'unknown-project';

        const claudeConfig = {
          $schema: 'https://claude.com/config.json',
          version: '1.0.0',
          project: {
            name: projectName,
            path: targetDir
          },
          generated: new Date().toISOString(),
          name,
          model,
          temperature,
          maxTokens,
          systemPrompt,
          capabilities: {
            tools: {
              read: true,
              write: true,
              edit: true,
              bash: true,
              webfetch: true,
              grep: true,
              glob: true,
              list: true,
              patch: true,
              todowrite: true,
              todoread: true
            },
            modes: ['agent', 'tool-use', 'prompt-gen']
          }
        };

        const existingExists = await fs.access(configPath).then(() => true).catch(() => false);

        if (existingExists) {
          const existingContent = await fs.readFile(configPath, 'utf-8');
          const existingConfig = JSON.parse(existingContent);

          if (options.merge) {
            spinner.text = 'Merging with existing configuration...';

            const conflicts = await detectConflicts(claudeConfig, existingConfig);

            if (conflicts.length > 0) {
              console.log(chalk.yellow(`\n⚠️  Found ${conflicts.length} conflicts:`));
              for (const conflict of conflicts) {
                console.log(`  ${chalk.cyan(conflict.key)}: template="${JSON.stringify(conflict.templateValue)}" vs existing="${JSON.stringify(conflict.existingValue)}"`);
              }
              console.log();

              if (options.overwrite) {
                await createBackup(configPath);
              }

              const mergedResult = await mergeConfigs(claudeConfig, existingConfig, {
                overwrite: options.overwrite,
                promptUser: true
              });

              await fs.writeFile(configPath, JSON.stringify(mergedResult.merged, null, 2));

              spinner.succeed(chalk.green('Claude configuration merged with user choices!'));
              console.log(chalk.gray(`📁 Configuration: ${configPath}`));
              console.log(chalk.gray(`🤖 Agent: ${name}`));
              console.log(chalk.gray(`📝 Model: ${model}`));
              if (mergedResult.backupPath) {
                console.log(chalk.gray(`📁 Backup: ${mergedResult.backupPath}`));
              }
            } else {
              const merged = { ...existingConfig, ...claudeConfig };
              await fs.writeFile(configPath, JSON.stringify(merged, null, 2));
              spinner.succeed(chalk.green('Claude configuration merged!'));
            }
          } else if (options.overwrite) {
            spinner.text = 'Creating backup and overwriting...';
            await createBackup(configPath);
            await fs.writeFile(configPath, JSON.stringify(claudeConfig, null, 2));
            spinner.succeed(chalk.green('Claude configuration overwritten!'));
            console.log(chalk.gray(`📁 Backup created`));
          } else {
            spinner.warn(chalk.yellow('Configuration already exists. Use --overwrite to replace or --merge to combine.'));
            process.exit(0);
          }
        } else {
          await fs.writeFile(configPath, JSON.stringify(claudeConfig, null, 2));
          spinner.succeed(chalk.green('Claude configuration created successfully!'));
        }

        console.log(chalk.gray(`📁 Configuration directory: ${claudeDir}`));
        console.log(chalk.gray(`🤖 Agent name: ${name}`));
        console.log(chalk.gray(`📝 Model: ${model}`));
        console.log(chalk.gray(`🌡️  Temperature: ${temperature}`));
        console.log(chalk.gray(`📄 Config file: ${configPath}`));
        process.exit(0);

      } catch (error) {
        spinner.fail(chalk.red('Claude setup failed'));
        console.error(chalk.red(`❌ ${error instanceof Error ? error.message : String(error)}`));
        process.exit(1);
      }
    });

  return command;
}

export const setupCommand = createSetupCommand();
