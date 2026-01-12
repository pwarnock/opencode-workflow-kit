import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { detectAndMerge, type MergeOptions } from '../utils/merge-manager';
import { createBackup } from '../utils/backup-manager';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface TemplateInfo {
  name: string;
  path: string;
  description: string;
}

async function getAvailableTemplates(): Promise<TemplateInfo[]> {
  const templates: TemplateInfo[] = [];
  
  try {
    const templatesDir = join(__dirname, '../../../claude_config/src/templates');
    
    const files = await fs.readdir(templatesDir);
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const templatePath = join(templatesDir, file);
        const content = await fs.readFile(templatePath, 'utf-8');
        const template = JSON.parse(content);
        
        templates.push({
          name: template.templateName || file.replace('.json', ''),
          path: templatePath,
          description: template.description || 'No description'
        });
      }
    }
  } catch (error) {
    console.warn(chalk.yellow('⚠️ Could not read templates directory'));
  }
  
  return templates;
}

async function getTemplateByName(name: string): Promise<TemplateInfo | null> {
  const templates = await getAvailableTemplates();
  return templates.find(t => t.name === name) || null;
}

async function findTargetConfig(templateName: string): Promise<string | null> {
  const targetDir = process.cwd();
  
  if (templateName === 'claude' || templateName.includes('claude')) {
    const claudePath = join(targetDir, '.claude', 'config.json');
    try {
      await fs.access(claudePath);
      return claudePath;
    } catch {
      return null;
    }
  }
  
  return null;
}

export function createTemplateUpdateCommand(): Command {
  const command = new Command('template');

  command.description('Update configurations from @pwarnock/claude_config templates');

  command
    .command('list')
    .description('List available templates')
    .action(async () => {
      const templates = await getAvailableTemplates();

      if (templates.length === 0) {
        console.log(chalk.yellow('No templates found'));
        process.exit(0);
      }

      console.log(chalk.bold('📋 Available Templates:\n'));

      for (const template of templates) {
        console.log(`  ${chalk.cyan(template.name)}`);
        console.log(`    ${chalk.gray(template.description)}`);
        console.log(`    ${chalk.gray(`Path: ${template.path}`)}`);
        console.log();
      }

      console.log(chalk.gray('Use: liaison template update <name>'));
    });

  command
    .command('update')
    .description('Update configuration from a template')
    .argument('[template-name]', 'Template name to update from (default: claude)', 'claude')
    .option('-f, --force', 'Overwrite existing configuration without prompting', false)
    .option('-d, --directory <path>', 'Target directory', process.cwd())
    .option('--no-backup', 'Skip creating backups before update', false)
    .action(async (templateName, options) => {
      const spinner = ora(`Updating from template '${templateName}'...`).start();

      try {
        const template = await getTemplateByName(templateName);

        if (!template) {
          spinner.fail(chalk.red(`Template '${templateName}' not found`));
          console.log(chalk.gray('\nAvailable templates:'));
          const templates = await getAvailableTemplates();
          for (const t of templates) {
            console.log(`  - ${t.name}: ${t.description}`);
          }
          process.exit(1);
        }

        spinner.text = 'Reading template configuration...';
        const templateContent = await fs.readFile(template.path, 'utf-8');
        const templateConfig = JSON.parse(templateContent);

        spinner.text = 'Finding target configuration...';
        const targetPath = await findTargetConfig(templateName);

        if (!targetPath) {
          spinner.fail(chalk.red(`No existing configuration found for template '${templateName}'`));
          console.log(chalk.gray(`\n💡 Run 'liaison config ${templateName}' first to create a configuration`));
          process.exit(1);
        }

        spinner.text = 'Merging configurations...';

        const mergeOptions: MergeOptions = {
          overwrite: options.force,
          promptUser: !options.force,
          backupDir: options.backup ? join(options.directory, '.liaison-backup', 'template-update') : undefined
        };

        const result = await detectAndMerge(template.path, targetPath, mergeOptions);

        if (result.backupPath) {
          console.log(chalk.gray(`📁 Backup created: ${result.backupPath}`));
        }

        if (result.conflicts.length > 0 && !options.force) {
          console.log(chalk.yellow(`\n⚠️  Found ${result.conflicts.length} conflicts resolved by user choice`));
        }

        spinner.succeed(chalk.green(`Configuration updated successfully!`));
        console.log(chalk.gray(`\n📄 Updated: ${targetPath}`));
        console.log(chalk.gray(`Strategy: ${result.strategy}`));

        if (result.conflicts.length > 0) {
          console.log(chalk.gray(`Conflicts resolved: ${result.conflicts.length}`));
        }

        process.exit(0);

      } catch (error) {
        spinner.fail(chalk.red('Template update failed'));
        console.error(chalk.red(`❌ ${error instanceof Error ? error.message : String(error)}`));
        process.exit(1);
      }
    });

  command
    .command('info')
    .description('Show details about a template')
    .argument('<template-name>', 'Template name')
    .action(async (templateName) => {
      try {
        const template = await getTemplateByName(templateName);

        if (!template) {
          console.log(chalk.red(`Template '${templateName}' not found`));
          process.exit(1);
        }

        const content = await fs.readFile(template.path, 'utf-8');
        const templateData = JSON.parse(content);

        console.log(chalk.bold(`📄 Template: ${templateName}\n`));
        console.log(chalk.cyan('Description:'), templateData.description || 'No description');

        if (templateData.variables) {
          console.log(chalk.cyan('\nVariables:'));
          for (const [name, info] of Object.entries(templateData.variables as Record<string, unknown>)) {
            const varInfo = info as { type: string; description: string; default?: unknown; required?: boolean };
            console.log(`  ${chalk.cyan(name)} (${varInfo.type})`);
            console.log(`    ${chalk.gray(varInfo.description)}`);
            if (varInfo.default !== undefined) {
              console.log(`    ${chalk.gray(`Default: ${JSON.stringify(varInfo.default)}`)}`);
            }
          }
        }

        if (templateData.config) {
          console.log(chalk.cyan('\nConfiguration structure:'));
          console.log(chalk.gray(JSON.stringify(templateData.config, null, 2)));
        }

        process.exit(0);

      } catch (error) {
        console.error(chalk.red(`Failed to show template info: ${error}`));
        process.exit(1);
      }
    });

  command
    .command('sources')
    .description('List template source locations')
    .action(async () => {
      console.log(chalk.bold('📋 Template Sources:\n'));

      console.log(`  ${chalk.cyan('@pwarnock/claude_config')}`);
      console.log(`    ${chalk.gray('Location: packages/claude_config/src/templates')}`);

      const templates = await getAvailableTemplates();
      console.log(`    ${chalk.gray(`Templates: ${templates.map(t => t.name).join(', ') || 'none'}`)}`);

      console.log();
    });

  return command;
}

export const templateUpdateCommand = createTemplateUpdateCommand();
