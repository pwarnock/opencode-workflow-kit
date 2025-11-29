import chalk from 'chalk';
import inquirer from 'inquirer';
import { ConfigManager } from '../utils/config.js';

/**
 * Init Command - Initialize new cody-beads integration project
 */
export const initCommand = {
  command: 'init',
  description: 'Initialize new cody-beads integration project',
  builder: (yargs: any) => {
    return yargs
      .option('template', {
        alias: 't',
        choices: ['minimal', 'web-development', 'python-development', 'full-stack'],
        default: 'minimal',
        describe: 'Project template to use'
      })
      .option('name', {
        alias: 'n',
        type: 'string',
        describe: 'Project name'
      })
      .option('description', {
        alias: 'd',
        type: 'string',
        describe: 'Project description'
      })
      .option('skip-install', {
        alias: 's',
        type: 'boolean',
        default: false,
        describe: 'Skip dependency installation'
      })
      .option('skip-git', {
        alias: 'g',
        type: 'boolean',
        default: false,
        describe: 'Skip git initialization'
      });
  },
  handler: async (argv: any) => {
    console.log(chalk.blue('🚀 Initializing Cody-Beads integration project...'));

    try {
      const ora = (await import('ora')).default;

      // Step 1: Collect project information
      const spinner = ora('📝 Gathering project information...').start();

      let projectAnswers = { template: argv.template };
      if (!argv.name || !argv.description) {
        const additionalAnswers = await inquirer.prompt([
          {
            type: !argv.name ? 'input' : 'text',
            name: 'name',
            message: 'Project name:',
            default: argv.name,
            validate: (input: string) => input.length > 0 || 'Project name is required'
          },
          {
            type: !argv.description ? 'input' : 'text',
            name: 'description',
            message: 'Project description:',
            default: argv.description
          }
        ]);
        projectAnswers = { ...projectAnswers, ...additionalAnswers };
      } else {
        projectAnswers.name = argv.name;
        projectAnswers.description = argv.description;
      }

      spinner.succeed();

      // Step 2: Validate project name
      if (!/^[a-zA-Z0-9_-]+$/.test(projectAnswers.name)) {
        throw new Error(`Invalid project name: ${projectAnswers.name}`);
      }

      // Step 3: Create project directory
      const projectDir = path.join(process.cwd(), projectAnswers.name);
      const fs = await import('fs-extra');

      if (await fs.pathExists(projectDir)) {
        spinner.start(chalk.yellow('📁 Project directory already exists'));

        const { action } = await inquirer.prompt([
          {
            type: 'list',
            name: 'action',
            message: 'Project directory already exists:',
            choices: [
              { name: 'Overwrite', value: 'overwrite' },
              { name: 'Create backup and overwrite', value: 'backup' },
              { name: 'Use existing directory', value: 'use' },
              { name: 'Cancel', value: 'cancel' }
            ]
          }
        ]);

        if (action === 'cancel') {
          spinner.succeed(chalk.gray('Project initialization cancelled'));
          return;
        }

        if (action === 'backup') {
          const backupDir = `${projectDir}.backup.${Date.now()}`;
          await fs.move(projectDir, backupDir);
          spinner.succeed(chalk.green(`📦 Backup created: ${backupDir}`));
        }

        await fs.remove(projectDir);
      }

      spinner.start(chalk.blue('📁 Creating project directory'));
      await fs.ensureDir(projectDir);
      spinner.succeed();

      // Step 4: Apply template
      spinner.start(chalk.blue('📝 Applying project template'));
      await applyTemplate(projectAnswers.template, projectAnswers, projectDir);
      spinner.succeed();

      // Step 5: Initialize git repository
      if (!argv.skipGit) {
        spinner.start(chalk.blue('🔧 Initializing Git repository'));
        await initializeGit(projectDir, projectAnswers.name);
        spinner.succeed();
      }

      // Step 6: Install dependencies
      if (!argv.skipInstall) {
        spinner.start(chalk.blue('📦 Installing dependencies'));
        await installDependencies(projectDir, projectAnswers.template);
        spinner.succeed();
      }

      // Step 7: Create configuration
      spinner.start(chalk.blue('⚙️  Creating configuration'));
      await createConfiguration(projectDir, projectAnswers);
      spinner.succeed();

      // Step 8: Success
      console.log(chalk.green('\n✅ Project initialized successfully!'));
      console.log(chalk.blue('\n📁 Project Location:'), projectDir);

      console.log(chalk.blue('\n🎯 Next Steps:'));
      console.log(chalk.gray('  1. cd'), projectAnswers.name);
      console.log(chalk.gray('  2. cody-beads config setup'));
      console.log(chalk.gray('  3. cody-beads sync --dry-run'));
      console.log(chalk.gray('  4. cody-beads sync'));

      console.log(chalk.blue('\n📚 Documentation:'));
      console.log(chalk.gray('  - Read the README.md for detailed usage'));
      console.log(chalk.gray('  - Check cody-beads.config.json for configuration options'));
      console.log(chalk.gray('  - Visit https://github.com/pwarnock/opencode-workflow-kit for help'));

    } catch (error) {
      console.log(chalk.red('❌ Project initialization failed:'), error);
      process.exit(1);
    }
  }
};

async function applyTemplate(templateType: string, projectInfo: any, projectDir: string): Promise<void> {
  const path = await import('path');
  const fs = await import('fs-extra');

  // Basic files for all templates
  const commonFiles = [
    {
      path: 'README.md',
      content: `# ${projectInfo.name}

${projectInfo.description}

## Getting Started

1. Configure Cody-Beads integration:
   \`\`\`bash
   cody-beads config setup
   \`\`\`

2. Test your configuration:
   \`\`\`bash
   cody-beads config test
   \`\`\`

3. Run your first sync:
   \`\`\`bash
   cody-beads sync --dry-run
   cody-beads sync
   \`\`\`

## Project Structure

- \`src/\` - Your source code
- \`docs/\` - Documentation
- \`tests/\` - Tests
- \`cody-beads.config.json\` - Configuration

## Features

- Cody Product Builder Toolkit integration
- Beads project management
- Automated synchronization
- Conflict resolution
- Project templates

## Documentation

- [OpenCode Workflow Kit](https://github.com/pwarnock/opencode-workflow-kit)
- [Cody Documentation](https://cody.ai/docs)
- [Beads Documentation](https://beads.dev/docs)

## Support

- Issues: [GitHub Issues](https://github.com/pwarnock/opencode-workflow-kit/issues)
- Discussions: [GitHub Discussions](https://github.com/pwarnock/opencode-workflow-kit/discussions)
      `.trim()
    },
    {
      path: 'cody-beads.config.json',
      content: JSON.stringify({
        version: '1.0.0',
        github: {
          owner: process.env.GITHUB_OWNER || '',
          repo: process.env.PROJECT_NAME || projectInfo.name
        },
        cody: {
          projectId: '',
          apiUrl: 'https://api.cody.ai'
        },
        beads: {
          projectPath: './',
          autoSync: false,
          syncInterval: 60
        },
        sync: {
          defaultDirection: 'bidirectional',
          conflictResolution: 'manual',
          preserveComments: true,
          preserveLabels: true,
          syncMilestones: false
        },
        templates: {
          defaultTemplate: templateType
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
.env
.env.local
cody-beads.config.json

# Logs
*.log
logs/

# OS
.DS_Store
Thumbs.db

# Build
dist/
build/

# IDE
.vscode/
.idea/
*.swp
*.swo
      `.trim()
    }
  ];

  // Add template-specific files
  switch (templateType) {
    case 'web-development':
      commonFiles.push(
        {
          path: 'package.json',
          content: JSON.stringify({
            name: projectInfo.name,
            version: '1.0.0',
            description: projectInfo.description,
            scripts: {
              start: 'node src/index.js',
              dev: 'nodemon src/index.js',
              test: 'jest',
              build: 'webpack --mode production'
            },
            dependencies: {
              express: '^4.18.0',
              '@pwarnock/cody-beads-integration': '^0.5.0'
            },
            devDependencies: {
              nodemon: '^3.0.0',
              jest: '^29.0.0',
              webpack: '^5.88.0'
            }
          }, null, 2)
        },
        {
          path: 'src/index.js',
          content: `
const express = require('express');
const { CodyBeadsIntegration } = require('@pwarnock/cody-beads-integration');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(\`🚀 Server running on port \${PORT}\`);
  console.log('🔗 Cody-Beads integration ready');
});
          `.trim()
        }
      );
      break;

    case 'python-development':
      commonFiles.push(
        {
          path: 'requirements.txt',
          content: `@pwarnock/cody-beads-integration==0.5.0
flask==2.3.0
pytest==7.4.0
          `.trim()
        },
        {
          path: 'main.py',
          content: `
#!/usr/bin/env python3
"""
${projectInfo.name}
${projectInfo.description}
"""

from flask import Flask, request, jsonify
from cody_beads_integration import CodyBeadsClient

app = Flask(__name__)
cody_client = None

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'ok',
        'timestamp': datetime.utcnow().isoformat()
    })

@app.route('/sync', methods=['POST'])
def trigger_sync():
    """Trigger Cody-Beads sync"""
    global cody_client

    if not cODY_CLIENT:
        return jsonify({'error': 'Cody client not configured'}), 500

    try:
        # Trigger sync logic here
        result = cody_client.sync_issues()
        return jsonify({'result': result})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
          `.trim()
        }
      );
      break;

    case 'full-stack':
      commonFiles.push(
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
      - POSTGRES_DB=${projectInfo.name}
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
          `.trim()
        },
        {
          path: 'frontend/package.json',
          content: JSON.stringify({
            name: `${projectInfo.name}-frontend`,
            version: '1.0.0',
            private: true,
            scripts: {
              start: 'react-scripts start',
              build: 'react-scripts build',
              test: 'react-scripts test'
            },
            dependencies: {
              react: '^18.2.0',
              'react-scripts': '^5.0.1'
            }
          }, null, 2)
        }
      );
      break;
  }

  // Write all files
  for (const file of commonFiles) {
    const filePath = path.join(projectDir, file.path);
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, file.content, 'utf8');

    if (file.executable) {
      await fs.chmod(filePath, '755');
    }
  }
}

async function initializeGit(projectDir: string, projectName: string): Promise<void> {
  const { spawn } = await import('child_process');

  // Change to project directory
  process.chdir(projectDir);

  return new Promise((resolve, reject) => {
    const git = spawn('git', ['init'], { stdio: 'pipe' });

    git.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Git initialization failed: ${code}`));
        return;
      }

      // Add files and create initial commit
      const add = spawn('git', ['add', '.'], { stdio: 'pipe' });
      add.on('close', (addCode) => {
        if (addCode !== 0) {
          reject(new Error(`Git add failed: ${addCode}`));
          return;
        }

        const commit = spawn('git', ['commit', '-m', `Initial commit: ${projectName}`], { stdio: 'pipe' });
        commit.on('close', (commitCode) => {
          if (commitCode !== 0) {
            reject(new Error(`Git commit failed: ${commitCode}`));
          } else {
            resolve();
          }
        });
      });
    });
  });
}

async function installDependencies(projectDir: string, templateType: string): Promise<void> {
  const { spawn } = await import('child_process');

  // Change to project directory
  process.chdir(projectDir);

  return new Promise((resolve, reject) => {
    let command = '';
    let args: string[] = [];

    switch (templateType) {
      case 'web-development':
      case 'full-stack':
        command = 'npm';
        args = ['install'];
        break;
      case 'python-development':
        command = 'pip';
        args = ['install', '-r', 'requirements.txt'];
        break;
      default:
        resolve(); // No dependencies to install
        return;
    }

    const install = spawn(command, args, { stdio: 'inherit' });

    install.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Dependency installation failed: ${code}`));
      }
    });
  });
}

async function createConfiguration(projectDir: string, projectInfo: any): Promise<void> {
  const fs = await import('fs-extra');
  const path = await import('path');

  const configPath = path.join(projectDir, 'cody-beads.config.json');

  // Configuration already exists during init, don't overwrite
  if (!await fs.pathExists(configPath)) {
    const config = {
      version: '1.0.0',
      github: {
        owner: process.env.GITHUB_OWNER || '',
        repo: process.env.PROJECT_NAME || projectInfo.name
      },
      cody: {
        projectId: '',
        apiUrl: 'https://api.cody.ai'
      },
      beads: {
        projectPath: './',
        autoSync: false,
        syncInterval: 60
      },
      sync: {
        defaultDirection: 'bidirectional',
        conflictResolution: 'manual',
        preserveComments: true,
        preserveLabels: true,
        syncMilestones: false
      },
      templates: {
        defaultTemplate: projectInfo.template
      }
    };

    await fs.writeJSON(configPath, config, { spaces: 2 });
  }
}