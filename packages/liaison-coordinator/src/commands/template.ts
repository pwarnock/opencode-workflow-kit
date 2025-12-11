import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { ConfigManager } from '../utils/config.js';

/**
 * Template Command - Manage project templates
 */
import { Command } from 'commander';

export const templateCommand = new Command('template').description(
  'Manage project templates for Liaison integration'
);

// List subcommand
templateCommand
  .command('list')
  .description('List available templates')
  .action(async () => {
    const configManager = new ConfigManager();
    await listTemplates(configManager);
  });

// Create subcommand
templateCommand
  .command('create <name>')
  .description('Create a new template')
  .option('-t, --type <type>', 'Template type')
  .action(async (name, options) => {
    const configManager = new ConfigManager();
    await createTemplate(configManager, name, options);
  });

// Apply subcommand
templateCommand
  .command('apply <name>')
  .description('Apply a template to create a project')
  .option('-o, --output <dir>', 'Output directory')
  .action(async (name, options) => {
    const configManager = new ConfigManager();
    await applyTemplate(configManager, name, options.output);
  });

// Remove subcommand
templateCommand
  .command('remove <name>')
  .description('Remove a template')
  .action(async (name) => {
    const configManager = new ConfigManager();
    await removeTemplate(configManager, name);
  });

async function listTemplates(configManager: ConfigManager): Promise<void> {
  console.log(chalk.blue('📋 Available Templates:'));

  try {
    let config;
    try {
      config = await configManager.loadConfig();
    } catch (error) {
      // No config file exists, use defaults
      config = null;
    }
    const templatePath =
      config?.templates?.templatePath || path.join(process.cwd(), 'templates');

    if (!(await fs.pathExists(templatePath))) {
      console.log(chalk.yellow('⚠️  No templates directory found'));
      console.log(
        chalk.gray(
          '  Built-in templates: minimal, web-development, python-development'
        )
      );
      return;
    }

    const templates = await fs.readdir(templatePath);
    const templateDirs = templates.filter((name) => !name.startsWith('.'));

    if (templateDirs.length === 0) {
      console.log(chalk.yellow('⚠️  No templates found'));
      console.log(
        chalk.gray(
          '  Built-in templates: minimal, web-development, python-development'
        )
      );
      return;
    }

    console.log('');
    for (const templateName of templateDirs) {
      const templateDir = path.join(templatePath, templateName);
      const stat = await fs.stat(templateDir);

      if (stat.isDirectory()) {
        const templateFile = path.join(templateDir, 'template.json');
        if (await fs.pathExists(templateFile)) {
          const templateConfig = await fs.readJSON(templateFile);
          console.log(chalk.cyan(`  📁 ${templateName}`));
          console.log(
            chalk.gray(`    Type: ${templateConfig.type || 'custom'}`)
          );
          console.log(
            chalk.gray(
              `    Description: ${templateConfig.description || 'No description'}`
            )
          );
          console.log('');
        }
      }
    }

    console.log(
      chalk.gray(
        '  Built-in templates: minimal, web-development, python-development'
      )
    );
  } catch (error) {
    console.error(chalk.red('❌ Failed to list templates:'), error);
    process.exit(1);
  }
}

async function createTemplate(
  configManager: ConfigManager,
  name: string,
  options: any
): Promise<void> {
  console.log(chalk.blue(`📝 Creating template: ${name}`));

  try {
    const config = await configManager.loadConfig();
    const templatePath =
      config?.templates?.templatePath || path.join(process.cwd(), 'templates');
    await fs.ensureDir(templatePath);

    const newTemplateDir = path.join(templatePath, name);

    if (await fs.pathExists(newTemplateDir)) {
      console.error(chalk.red(`❌ Template ${name} already exists`));
      process.exit(1);
    }

    await fs.ensureDir(newTemplateDir);

    const templateConfig = {
      name,
      description: `${name} template`,
      type: options.type || 'custom',
      config: {
        version: '1.0.0',
        github: {
          owner: '${GITHUB_OWNER}',
          repo: '${PROJECT_NAME}',
        },
        cody: {
          projectId: '${CODY_PROJECT_ID}',
          apiUrl: 'https://api.cody.ai',
        },
        beads: {
          projectPath: './${PROJECT_NAME}',
          autoSync: false,
          syncInterval: 60,
        },
        sync: {
          defaultDirection: 'bidirectional',
          conflictResolution: 'manual',
          preserveComments: true,
          preserveLabels: true,
          syncMilestones: false,
        },
      },
      files: [
        {
          path: 'README.md',
          content: `# ${name}

Project created from ${name} template.

## Getting Started

1. Configure your integration:
   \`\`\`bash
   cody-beads config setup
   \`\`\`

2. Test your configuration:
   \`\`\`bash
   cody-beads config test
   \`\`\`

3. Start syncing:
   \`\`\`bash
   cody-beads sync
   \`\`\`
          `.trim(),
        },
      ],
      postSetup: {
        commands: ['liaison config setup'],
        instructions: [
          '1. Run liaison config setup to configure integration',
          '2. Set up GitHub repository and Cody project IDs',
          '3. Test configuration with liaison config test',
        ],
      },
    };

    await fs.writeJSON(
      path.join(newTemplateDir, 'template.json'),
      templateConfig,
      { spaces: 2 }
    );

    console.log(chalk.green(`✅ Template ${name} created successfully!`));
    console.log(chalk.gray(`  Directory: ${newTemplateDir}`));
  } catch (error) {
    console.error(chalk.red('❌ Failed to create template:'), error);
    process.exit(1);
  }
}

async function applyTemplate(
  _configManager: ConfigManager,
  templateIdentifier: string,
  outputDir?: string
): Promise<void> {
  console.log(chalk.blue(`🚀 Applying template: ${templateIdentifier}`));

  try {
    const targetDir = outputDir || process.cwd();
    await fs.ensureDir(targetDir);

    // For now, just create a basic structure from built-in templates
    const templateFiles = generateTemplateFiles(
      templateIdentifier,
      path.basename(targetDir)
    );

    for (const file of templateFiles) {
      const filePath = path.join(targetDir, file.path);
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, file.content);
    }

    console.log(
      chalk.green(`✅ Template ${templateIdentifier} applied successfully!`)
    );
    console.log(chalk.gray(`  Directory: ${targetDir}`));
  } catch (error) {
    console.error(chalk.red('❌ Failed to apply template:'), error);
    process.exit(1);
  }
}

async function removeTemplate(
  _configManager: ConfigManager,
  name: string
): Promise<void> {
  console.log(chalk.blue(`🗑️  Removing template: ${name}`));

  try {
    const config = await _configManager.loadConfig();
    const templatePath =
      config?.templates?.templatePath || path.join(process.cwd(), 'templates');
    const templateDir = path.join(templatePath, name);

    if (!(await fs.pathExists(templateDir))) {
      console.error(chalk.red(`❌ Template ${name} not found`));
      process.exit(1);
    }

    await fs.remove(templateDir);

    console.log(chalk.green(`✅ Template ${name} removed successfully!`));
  } catch (error) {
    console.error(chalk.red('❌ Failed to remove template:'), error);
    process.exit(1);
  }
}

function generateTemplateFiles(type: string, name: string): any[] {
  const baseFiles = [
    {
      path: '.gitignore',
      content: `
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
      `.trim(),
    },
  ];

  switch (type) {
    case 'minimal':
      return [
        ...baseFiles,
        {
          path: 'liaison.config.json',
          content: JSON.stringify(
            {
              version: '1.0.0',
              github: {
                owner: '${GITHUB_OWNER}',
                repo: name,
              },
              cody: {
                projectId: '${CODY_PROJECT_ID}',
                apiUrl: 'https://api.cody.ai',
              },
              beads: {
                projectPath: `./${name}`,
                autoSync: false,
                syncInterval: 60,
              },
              sync: {
                defaultDirection: 'bidirectional',
                conflictResolution: 'manual',
                preserveComments: true,
                preserveLabels: true,
                syncMilestones: false,
              },
            },
            null,
            2
          ),
        },
      ];

    case 'python-development':
      return [
        ...baseFiles,
        {
          path: 'requirements.txt',
          content: '@pwarnock/liaison==0.5.0\n',
        },
        {
          path: 'main.py',
          content: `#!/usr/bin/env python3
"""
${name} - Python project with Cody-Beads integration
"""

def main():
    print("Hello from ${name}!")

if __name__ == "__main__":
    main()
          `.trim(),
        },
      ];

    case 'web-development':
      return [
        ...baseFiles,
        {
          path: 'package.json',
          content: JSON.stringify(
            {
              name: name,
              version: '1.0.0',
              scripts: {
                start: 'node src/index.js',
                dev: 'nodemon src/index.js',
                test: 'jest',
              },
              dependencies: {
                '@pwarnock/liaison': '^0.5.0',
              },
            },
            null,
            2
          ),
        },
        {
          path: 'src/index.js',
          content: `/**
 * ${name} - Web project with Liaison integration
 */

console.log('Hello from ${name}!');
          `.trim(),
        },
      ];

    default:
      return baseFiles;
  }
}
