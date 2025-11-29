import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import { ConfigManager } from '../utils/config.js';
import { ProjectTemplate } from '../types/index.js';

/**
 * Template Command - Manage project templates
 */
export const templateCommand = {
  command: 'template <action> [name]',
  description: 'Manage project templates for Cody-Beads integration',
  builder: (yargs: any) => {
    return yargs
      .positional('action', {
        describe: 'Template action',
        choices: ['list', 'create', 'apply', 'remove']
      })
      .positional('name', {
        describe: 'Template name (required for create, apply, remove)',
        type: 'string'
      })
      .option('template-path', {
        alias: 't',
        type: 'string',
        describe: 'Template path for apply action'
      })
      .option('output-dir', {
        alias: 'o',
        type: 'string',
        describe: 'Output directory for apply action'
      })
      .option('description', {
        alias: 'd',
        type: 'string',
        describe: 'Template description for create action'
      })
      .option('type', {
        alias: 'y',
        choices: ['minimal', 'web-development', 'python-development', 'full-stack'],
        default: 'minimal',
        describe: 'Template type for create action'
      });
  },
  handler: async (argv: any) => {
    const configManager = new ConfigManager(argv.config);

    try {
      switch (argv.action) {
        case 'list':
          await listTemplates(configManager);
          break;

        case 'create':
          if (!argv.name) {
            console.error(chalk.red('❌ Template name is required for create action'));
            process.exit(1);
          }
          await createTemplate(configManager, argv.name, argv);
          break;

        case 'apply':
          if (!argv.templatePath && !argv.name) {
            console.error(chalk.red('❌ Either --template-path or template name is required'));
            process.exit(1);
          }
          await applyTemplate(configManager, argv.templatePath || argv.name, argv.outputDir);
          break;

        case 'remove':
          if (!argv.name) {
            console.error(chalk.red('❌ Template name is required for remove action'));
            process.exit(1);
          }
          await removeTemplate(configManager, argv.name);
          break;

        default:
          console.error(chalk.red(`❌ Unknown template action: ${argv.action}`));
          process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('❌ Template operation failed:'), error);
      process.exit(1);
    }
  }
};

async function listTemplates(configManager: ConfigManager): Promise<void> {
  console.log(chalk.blue('📋 Available Templates:'));

  try {
    const config = await configManager.loadConfig();
    const templatePath = config.templates?.templatePath || path.join(process.cwd(), 'templates');

    if (!await fs.pathExists(templatePath)) {
      console.log(chalk.yellow('⚠️  No templates directory found'));
      return;
    }

    const templates = await fs.readdir(templatePath);

    if (templates.length === 0) {
      console.log(chalk.yellow('⚠️  No templates found'));
      return;
    }

    console.log('');
    for (const templateName of templates) {
      const templateDir = path.join(templatePath, templateName);
      const stat = await fs.stat(templateDir);

      if (stat.isDirectory()) {
        const templateFile = path.join(templateDir, 'template.json');
        if (await fs.pathExists(templateFile)) {
          const templateConfig = await fs.readJSON(templateFile);
          console.log(chalk.cyan(`  📁 ${templateName}`));
          console.log(chalk.gray(`    Type: ${templateConfig.type || 'custom'}`));
          console.log(chalk.gray(`    Description: ${templateConfig.description || 'No description'}`));

          if (templateConfig.files) {
            console.log(chalk.gray(`    Files: ${templateConfig.files.length}`));
          }

          if (templateConfig.postSetup) {
            console.log(chalk.gray(`    Post-setup: ${templateConfig.postSetup.commands?.length || 0} commands`));
          }
          console.log('');
        }
      }
    }

  } catch (error) {
    console.log(chalk.red('❌ Failed to list templates:'), error);
  }
}

async function createTemplate(configManager: ConfigManager, name: string, options: any): Promise<void> {
  console.log(chalk.blue(`📝 Creating template: ${name}`));

  try {
    const config = await configManager.loadConfig();
    const templatePath = config.templates?.templatePath || path.join(process.cwd(), 'templates');
    const newTemplateDir = path.join(templatePath, name);

    await fs.ensureDir(templatePath);

    if (await fs.pathExists(newTemplateDir)) {
      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: `Template '${name}' already exists. Overwrite?`,
          default: false
        }
      ]);

      if (!overwrite) {
        console.log(chalk.gray('Template creation cancelled'));
        return;
      }

      await fs.remove(newTemplateDir);
    }

    await fs.ensureDir(newTemplateDir);

    const templateConfig: ProjectTemplate = {
      name,
      description: options.description || `${name} template for Cody-Beads integration`,
      type: options.type as any,
      config: {
        version: '1.0.0',
        github: {
          owner: 'your-org',
          repo: name
        },
        cody: {
          projectId: `cody-${name}`,
          apiUrl: 'https://api.cody.ai'
        },
        beads: {
          projectPath: `./${name}`,
          autoSync: true,
          syncInterval: 30
        },
        sync: {
          defaultDirection: 'bidirectional',
          conflictResolution: 'manual',
          preserveComments: true,
          preserveLabels: true,
          syncMilestones: false
        },
        templates: {
          defaultTemplate: options.type
        }
      },
      files: await generateTemplateFiles(options.type, name),
      postSetup: {
        commands: [
          'cody-beads config setup',
          'cody-beads sync --dry-run',
          'cody-beads sync'
        ],
        instructions: [
          '1. Configure GitHub repository in Beads settings',
          '2. Set up Cody project integration',
          '3. Run initial sync to connect projects',
          '4. Customize sync preferences as needed'
        ]
      }
    };

    // Write template configuration
    await fs.writeJSON(path.join(newTemplateDir, 'template.json'), templateConfig, { spaces: 2 });

    // Write template files
    for (const file of templateConfig.files) {
      const filePath = path.join(newTemplateDir, file.path);
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, file.content, 'utf8');

      if (file.executable) {
        await fs.chmod(filePath, '755');
      }
    }

    console.log(chalk.green(`✅ Template '${name}' created successfully!`));
    console.log(chalk.blue(`📁 Location: ${newTemplateDir}`));
    console.log(chalk.gray('\nTo use this template:'));
    console.log(chalk.gray(`  cody-beads template apply ${name}`));

  } catch (error) {
    console.log(chalk.red('❌ Failed to create template:'), error);
  }
}

async function applyTemplate(configManager: ConfigManager, templateIdentifier: string, outputDir?: string): Promise<void> {
  console.log(chalk.blue(`🚀 Applying template: ${templateIdentifier}`));

  try {
    const config = await configManager.loadConfig();
    let templateConfig: ProjectTemplate;

    // Check if it's a built-in template
    if (['minimal', 'web-development', 'python-development', 'full-stack'].includes(templateIdentifier)) {
      templateConfig = await getBuiltInTemplate(templateIdentifier);
    } else {
      // Load custom template
      const templatePath = config.templates?.templatePath || path.join(process.cwd(), 'templates');
      const templateDir = path.join(templatePath, templateIdentifier);
      const templateFile = path.join(templateDir, 'template.json');

      if (!await fs.pathExists(templateFile)) {
        console.log(chalk.red(`❌ Template not found: ${templateIdentifier}`));
        return;
      }

      templateConfig = await fs.readJSON(templateFile);
    }

    const projectDir = outputDir || path.join(process.cwd(), templateConfig.name);

    if (await fs.pathExists(projectDir)) {
      const { overwrite, backup } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: `Directory '${projectDir}' already exists. Overwrite?`,
          default: false
        },
        {
          type: 'confirm',
          name: 'backup',
          message: 'Create backup before overwriting?',
          default: true,
          when: (answers: any) => answers.overwrite
        }
      ]);

      if (!overwrite) {
        console.log(chalk.gray('Template application cancelled'));
        return;
      }

      if (backup) {
        const backupDir = `${projectDir}.backup.${Date.now()}`;
        await fs.move(projectDir, backupDir);
        console.log(chalk.green(`📦 Backup created: ${backupDir}`));
      } else {
        await fs.remove(projectDir);
      }
    }

    // Create project directory and files
    await fs.ensureDir(projectDir);

    for (const file of templateConfig.files) {
      const filePath = path.join(projectDir, file.path);
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, file.content, 'utf8');

      if (file.executable) {
        await fs.chmod(filePath, '755');
      }
    }

    // Apply configuration from template
    if (templateConfig.config) {
      const mergedConfig = { ...config, ...templateConfig.config };
      await configManager.saveConfig(mergedConfig);
      console.log(chalk.green('✅ Configuration updated with template settings'));
    }

    console.log(chalk.green(`✅ Template '${templateIdentifier}' applied successfully!`));
    console.log(chalk.blue(`📁 Project location: ${projectDir}`));

    if (templateConfig.postSetup) {
      console.log(chalk.blue('\n🎯 Next Steps:'));
      templateConfig.postSetup.instructions.forEach((instruction, index) => {
        console.log(chalk.yellow(`${index + 1}. ${instruction}`));
      });

      console.log(chalk.blue('\n🔧 Post-setup commands:'));
      templateConfig.postSetup.commands.forEach(command => {
        console.log(chalk.gray(`  ${command}`));
      });
    }

  } catch (error) {
    console.log(chalk.red('❌ Failed to apply template:'), error);
  }
}

async function removeTemplate(configManager: ConfigManager, name: string): Promise<void> {
  console.log(chalk.blue(`🗑️  Removing template: ${name}`));

  try {
    const config = await configManager.loadConfig();
    const templatePath = config.templates?.templatePath || path.join(process.cwd(), 'templates');
    const templateDir = path.join(templatePath, name);

    if (!await fs.pathExists(templateDir)) {
      console.log(chalk.yellow(`⚠️  Template not found: ${name}`));
      return;
    }

    const { confirmed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message: `Are you sure you want to remove template '${name}'?`,
        default: false
      }
    ]);

    if (!confirmed) {
      console.log(chalk.gray('Template removal cancelled'));
      return;
    }

    await fs.remove(templateDir);
    console.log(chalk.green(`✅ Template '${name}' removed successfully!`));

  } catch (error) {
    console.log(chalk.red('❌ Failed to remove template:'), error);
  }
}

async function getBuiltInTemplate(type: string): Promise<ProjectTemplate> {
  const templates = {
    minimal: {
      name: 'minimal',
      description: 'Minimal Cody-Beads integration setup',
      type: 'minimal',
      config: {
        version: '1.0.0',
        github: {
          owner: '${GITHUB_OWNER}',
          repo: '${PROJECT_NAME}'
        },
        cody: {
          projectId: '${CODY_PROJECT_ID}',
          apiUrl: 'https://api.cody.ai'
        },
        beads: {
          projectPath: './${PROJECT_NAME}',
          autoSync: false,
          syncInterval: 60
        },
        sync: {
          defaultDirection: 'bidirectional',
          conflictResolution: 'manual',
          preserveComments: true,
          preserveLabels: true,
          syncMilestones: false
        }
      },
      files: [
        {
          path: 'cody-beads.config.json',
          content: JSON.stringify({
            version: '1.0.0',
            github: {
              owner: '${GITHUB_OWNER}',
              repo: '${PROJECT_NAME}',
              token: '${GITHUB_TOKEN}'
            },
            cody: {
              projectId: '${CODY_PROJECT_ID}',
              apiUrl: 'https://api.cody.ai'
            },
            beads: {
              projectPath: './${PROJECT_NAME}',
              autoSync: false,
              syncInterval: 60
            },
            sync: {
              defaultDirection: 'bidirectional',
              conflictResolution: 'manual',
              preserveComments: true,
              preserveLabels: true,
              syncMilestones: false
            }
          }, null, 2)
        },
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
          `.trim()
        }
      ],
      postSetup: {
        commands: ['cody-beads config setup'],
        instructions: [
          '1. Run cody-beads config setup to configure integration',
          '2. Set up GitHub repository and Cody project IDs',
          '3. Test configuration with cody-beads config test'
        ]
      }
    },

    webDevelopment: {
      name: 'web-development',
      description: 'Web development project with React/Node.js',
      type: 'web-development',
      config: {
        version: '1.0.0',
        github: {
          owner: '${GITHUB_OWNER}',
          repo: '${PROJECT_NAME}'
        },
        cody: {
          projectId: '${CODY_PROJECT_ID}',
          apiUrl: 'https://api.cody.ai'
        },
        beads: {
          projectPath: './${PROJECT_NAME}',
          autoSync: true,
          syncInterval: 15
        },
        sync: {
          defaultDirection: 'cody-to-beads',
          conflictResolution: 'cody-wins',
          preserveComments: true,
          preserveLabels: true,
          syncMilestones: true,
          includeLabels: ['frontend', 'backend', 'bug', 'enhancement']
        }
      },
      files: [
        {
          path: 'package.json',
          content: JSON.stringify({
            name: '${PROJECT_NAME}',
            version: '1.0.0',
            scripts: {
              start: 'node src/index.js',
              dev: 'nodemon src/index.js',
              test: 'jest',
              build: 'webpack --mode production'
            },
            dependencies: {
              'express': '^4.18.0',
              'react': '^18.2.0',
              '@pwarnock/cody-beads-integration': '^0.5.0'
            },
            devDependencies: {
              'nodemon': '^3.0.0',
              'jest': '^29.0.0',
              'webpack': '^5.88.0'
            }
          }, null, 2)
        },
        {
          path: 'src/App.jsx',
          content: `
import React from 'react';

function App() {
  return (
    <div className="App">
      <header>
        <h1>${PROJECT_NAME}</h1>
        <p>Web project with Cody-Beads integration</p>
      </header>
    </div>
  );
}

export default App;
          `.trim()
        },
        {
          path: 'cody-beads.config.json',
          content: JSON.stringify({
            version: '1.0.0',
            github: {
              owner: '${GITHUB_OWNER}',
              repo: '${PROJECT_NAME}',
              token: '${GITHUB_TOKEN}'
            },
            cody: {
              projectId: '${CODY_PROJECT_ID}',
              apiUrl: 'https://api.cody.ai'
            },
            beads: {
              projectPath: './${PROJECT_NAME}',
              autoSync: true,
              syncInterval: 15
            },
            sync: {
              defaultDirection: 'cody-to-beads',
              conflictResolution: 'cody-wins',
              preserveComments: true,
              preserveLabels: true,
              syncMilestones: true,
              includeLabels: ['frontend', 'backend', 'bug', 'enhancement']
            }
          }, null, 2)
        }
      ],
      postSetup: {
        commands: [
          'npm install',
          'cody-beads config setup',
          'cody-beads sync'
        ],
        instructions: [
          '1. Install dependencies with npm install',
          '2. Configure Cody-Beads integration',
          '3. Start development with npm run dev'
        ]
      }
    }
  };

  return templates[type] || templates.minimal;
}

async function generateTemplateFiles(type: string, name: string): Promise<any[]> {
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
      `.trim()
    }
  ];

  switch (type) {
    case 'python-development':
      return [
        ...baseFiles,
        {
          path: 'requirements.txt',
          content: '@pwarnock/cody-beads-integration==0.5.0\n'
        },
        {
          path: 'main.py',
          content: `
#!/usr/bin/env python3
"""
${name} - Python project with Cody-Beads integration
"""

from cody_beads_integration import CodyBeadsClient

def main():
    print("Starting ${name}...")
    print("Cody-Beads integration configured")

if __name__ == "__main__":
    main()
          `.trim()
        }
      ];

    case 'full-stack':
      return [
        ...baseFiles,
        {
          path: 'README.md',
          content: `# ${name}

Full-stack project with Cody-Beads integration

## Getting Started

1. Install dependencies
2. Configure Cody-Beads integration
3. Start development

## Features

- Cody Product Builder Toolkit integration
- Beads project management
- Automated synchronization
- Conflict resolution
          `.trim()
        },
        {
          path: 'docker-compose.yml',
          content: `
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
    volumes:
      - .:/app
    depends_on:
      - db

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=${name}
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
          `.trim()
        }
      ];

    default:
      return baseFiles;
  }
}