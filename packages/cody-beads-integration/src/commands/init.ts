import chalk from 'chalk';
import inquirer from 'inquirer';
import path from 'path';
import fs from 'fs-extra';

/**
 * Init Command - Initialize new cody-beads integration project
 */
import { Command } from 'commander';

export const initCommand = new Command('init')
  .description('Initialize new cody-beads integration project')
  .option('-t, --template <type>', 'Template type', 'minimal')
  .option('-n, --name <name>', 'Project name')
  .action(async (options) => {
    console.log(chalk.blue('🚀 Initializing cody-beads integration project...'));

    try {
      let projectName = options.name;
      let templateType = options.template;

      if (!projectName) {
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'name',
            message: 'Project name:',
            validate: (input: string) => input.trim() !== '' || 'Project name is required'
          }
        ]);
        projectName = answers.name;
      }

      if (!templateType) {
        const answers = await inquirer.prompt([
          {
            type: 'list',
            name: 'template',
            message: 'Choose template:',
            choices: ['minimal', 'web-development', 'python-development'],
            default: 'minimal'
          }
        ]);
        templateType = answers.template;
      }

      const projectDir = path.join(process.cwd(), projectName);
      
      if (await fs.pathExists(projectDir)) {
        console.error(chalk.red(`❌ Directory ${projectName} already exists`));
        process.exit(1);
      }

      await fs.ensureDir(projectDir);

      // Create basic structure
      const config = {
        version: '1.0.0',
        github: {
          owner: '${GITHUB_OWNER}',
          repo: projectName
        },
        cody: {
          projectId: '${CODY_PROJECT_ID}',
          apiUrl: 'https://api.cody.ai'
        },
        beads: {
          projectPath: `./${projectName}`,
          autoSync: false,
          syncInterval: 60
        },
        sync: {
          defaultDirection: 'bidirectional' as const,
          conflictResolution: 'manual' as const,
          preserveComments: true,
          preserveLabels: true,
          syncMilestones: false
        },
        templates: {
          defaultTemplate: templateType
        }
      };

      await fs.writeJSON(path.join(projectDir, 'cody-beads.config.json'), config, { spaces: 2 });
      await fs.writeFile(path.join(projectDir, '.gitignore'), `
# Dependencies
node_modules/
.venv/
__pycache__/
*.pyc

# Configuration
cody-beads.config.json
.env

# Logs
*.log
logs/

# OS
.DS_Store
Thumbs.db
      `.trim());

      console.log(chalk.green(`✅ Project ${projectName} initialized successfully!`));
      console.log(chalk.gray(`  Directory: ${projectDir}`));
      console.log(chalk.gray('  Next steps:'));
      console.log(chalk.gray(`    cd ${projectName}`));
      console.log(chalk.gray('    cody-beads config setup'));

    } catch (error) {
      console.error(chalk.red('❌ Initialization failed:'), error);
      process.exit(1);
    }
  });