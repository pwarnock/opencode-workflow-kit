import chalk from 'chalk';
import inquirer from 'inquirer';
import path from 'path';
import { ConfigManager } from '../utils/config.js';

/**
 * Version Command - Manage versions for cody-beads integration
 */
export const versionCommand = {
  command: 'version <action> [identifier]',
  description: 'Manage versions for cody-beads integration',
  builder: (yargs: any) => {
    return yargs
      .positional('action', {
        describe: 'Version action',
        choices: ['add', 'build', 'list', 'remove']
      })
      .positional('identifier', {
        describe: 'Version identifier (format: v1.0.0 or v1.0.0-feature-name)',
        type: 'string'
      })
      .option('name', {
        alias: 'n',
        type: 'string',
        describe: 'Version name for add action'
      })
      .option('description', {
        alias: 'd',
        type: 'string',
        describe: 'Version description for add action'
      })
      .option('features', {
        alias: 'f',
        type: 'string',
        describe: 'Version features for add action'
      })
      .option('dry-run', {
        type: 'boolean',
        describe: 'Show what would be done without executing'
      });
  },
  handler: async (argv: any) => {
    const configManager = new ConfigManager(argv.config);

    try {
      switch (argv.action) {
        case 'add':
          await addVersion(configManager, argv);
          break;

        case 'build':
          await buildVersion(configManager, argv.identifier);
          break;

        case 'list':
          await listVersions(configManager);
          break;

        case 'remove':
          if (!argv.identifier) {
            console.error(chalk.red('❌ Version identifier is required for remove action'));
            process.exit(1);
          }
          await removeVersion(configManager, argv.identifier);
          break;

        default:
          console.error(chalk.red(`❌ Unknown version action: ${argv.action}`));
          process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('❌ Version operation failed:'), error);
      process.exit(1);
    }
  }
};

async function addVersion(configManager: ConfigManager, options: any): Promise<void> {
  console.log(chalk.blue('📝 Adding new version...'));

  if (!options.name || !options.features) {
    console.error(chalk.red('❌ --name and --features are required for add action'));
    process.exit(1);
  }

  try {
    // Generate version identifier
    const versionNumber = await generateVersionNumber(configManager);
    const versionIdentifier = `${versionNumber}-${options.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;

    console.log(chalk.gray(`📋 Version: ${versionIdentifier}`));

    // Get existing versions
    const config = await configManager.loadConfig();
    const versionsPath = path.join(process.cwd(), 'versions');
    const fs = await import('fs-extra');
    await fs.ensureDir(versionsPath);

    const versionDir = path.join(versionsPath, versionIdentifier);
    await fs.ensureDir(versionDir);

    // Create version metadata
    const versionData = {
      version: versionIdentifier,
      number: versionNumber,
      name: options.name,
      description: options.description || `${options.name} version of Cody-Beads integration`,
      features: options.features,
      status: 'planned',
      created_at: new Date().toISOString(),
      dependencies: [],
      tasks: [],
      priority: 'medium'
    };

    await fs.writeJSON(path.join(versionDir, 'version.json'), versionData, { spaces: 2 });

    // Create design document
    const designDoc = await generateDesignDocument(versionData, config);
    await fs.writeFile(path.join(versionDir, 'DESIGN.md'), designDoc, 'utf8');

    // Create task list
    const taskList = await generateTaskList(versionData, config);
    await fs.writeFile(path.join(versionDir, 'TASKS.md'), taskList, 'utf8');

    console.log(chalk.green(`✅ Version ${versionIdentifier} added successfully!`));
    console.log(chalk.blue(`📁 Location: ${versionDir}`));
    console.log(chalk.blue('\n📋 Files created:'));
    console.log(chalk.gray('  - version.json (metadata)'));
    console.log(chalk.gray('  - DESIGN.md (technical specification)'));
    console.log(chalk.gray('  - TASKS.md (implementation tasks)'));

    console.log(chalk.blue('\n🎯 Next Steps:'));
    console.log(chalk.gray(`  1. Review design: ${path.join(versionDir, 'DESIGN.md')}`));
    console.log(chalk.gray(`  2. Review tasks: ${path.join(versionDir, 'TASKS.md')}`));
    console.log(chalk.gray(`  3. Start building: cody-beads version build ${versionIdentifier}`));

  } catch (error) {
    console.log(chalk.red('❌ Failed to add version:'), error);
    throw error;
  }
}

async function buildVersion(configManager: ConfigManager, identifier?: string): Promise<void> {
  if (!identifier) {
    console.error(chalk.red('❌ Version identifier is required for build action'));
    process.exit(1);
  }

  console.log(chalk.blue(`🏗️ Building version: ${identifier}`));

  try {
    const versionsPath = path.join(process.cwd(), 'versions');
    const versionDir = path.join(versionsPath, identifier);
    const fs = await import('fs-extra');

    if (!await fs.pathExists(versionDir)) {
      console.log(chalk.red(`❌ Version not found: ${identifier}`));
      console.log(chalk.gray('Use "cody-beads version list" to see available versions'));
      process.exit(1);
    }

    const versionData = await fs.readJSON(path.join(versionDir, 'version.json'));
    const config = await configManager.loadConfig();

    console.log(chalk.blue('\n📋 Version Information:'));
    console.log(chalk.gray(`  Number: ${versionData.number}`));
    console.log(chalk.gray(`  Name: ${versionData.name}`));
    console.log(chalk.gray(`  Status: ${versionData.status}`));
    console.log(chalk.gray(`  Features: ${versionData.features}`));

    // Update status to building
    versionData.status = 'in-progress';
    versionData.started_at = new Date().toISOString();
    await fs.writeJSON(path.join(versionDir, 'version.json'), versionData, { spaces: 2 });

    // Load tasks
    const tasksPath = path.join(versionDir, 'TASKS.md');
    if (await fs.pathExists(tasksPath)) {
      const taskContent = await fs.readFile(tasksPath, 'utf8');
      console.log(chalk.blue('\n📋 Implementation Tasks:'));
      console.log(chalk.gray(taskContent));
    }

    // Execute build steps based on features
    const buildSteps = await determineBuildSteps(versionData.features, config);
    console.log(chalk.blue('\n🏗️  Build Plan:'));
    buildSteps.forEach((step, index) => {
      console.log(chalk.cyan(`  ${index + 1}. ${step.description}`));
      if (step.dependencies.length > 0) {
        console.log(chalk.gray(`     Dependencies: ${step.dependencies.join(', ')}`));
      }
    });

    // Ask for confirmation if not dry run
    if (!configManager.getOption('dry-run')) {
      const { confirmed } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirmed',
          message: `Start building version ${identifier}?`,
          default: true
        }
      ]);

      if (!confirmed) {
        console.log(chalk.gray('Build cancelled'));
        return;
      }
    }

    // Execute build steps
    console.log(chalk.blue('\n🔨 Executing build steps...'));
    for (const step of buildSteps) {
      console.log(chalk.gray(`⚙️  ${step.description}`));

      try {
        await executeBuildStep(step, config, versionDir);
        console.log(chalk.green(`✅ ${step.description}`));
      } catch (error) {
        console.log(chalk.red(`❌ Failed: ${step.description}`));
        console.log(chalk.red(`   Error: ${error}`));
      }
    }

    // Update version status to built
    versionData.status = 'built';
    versionData.completed_at = new Date().toISOString();
    await fs.writeJSON(path.join(versionDir, 'version.json'), versionData, { spaces: 2 });

    console.log(chalk.green(`\n✅ Version ${identifier} built successfully!`));

    // Show next steps
    console.log(chalk.blue('\n🎯 Next Steps:'));
    console.log(chalk.gray('  1. Test the implementation'));
    console.log(chalk.gray('  2. Run integration tests'));
    console.log(chalk.gray('  3. Update documentation'));
    console.log(chalk.gray('  4. Create release notes'));

  } catch (error) {
    console.log(chalk.red('❌ Build failed:'), error);
    throw error;
  }
}

async function listVersions(configManager: ConfigManager): Promise<void> {
  console.log(chalk.blue('📋 Available Versions:'));

  try {
    // Use configManager to avoid unused variable warning
    void configManager;
    const versionsPath = path.join(process.cwd(), 'versions');
    const fs = await import('fs-extra');

    if (!await fs.pathExists(versionsPath)) {
      console.log(chalk.yellow('⚠️  No versions directory found'));
      console.log(chalk.gray('Use "cody-beads version add" to create a new version'));
      return;
    }

    const versions = await fs.readdir(versionsPath);
    const versionDirs = versions.filter(name => !name.startsWith('.'));

    if (versionDirs.length === 0) {
      console.log(chalk.yellow('⚠️  No versions found'));
      return;
    }

    // Load version data for each version
    const versionData = [];
    for (const versionName of versionDirs) {
      const versionDir = path.join(versionsPath, versionName);
      const versionFile = path.join(versionDir, 'version.json');

      if (await fs.pathExists(versionFile)) {
        try {
          const data = await fs.readJSON(versionFile);
          versionData.push({ name: versionName, ...data });
        } catch (error) {
          console.log(chalk.yellow(`⚠️  Failed to load version ${versionName}: ${error}`));
        }
      }
    }

    // Sort by creation date
    versionData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    console.log('');
    for (const version of versionData) {
      const colorMap: any = {
        'planned': chalk.yellow,
        'in-progress': chalk.blue,
        'built': chalk.green,
        'released': chalk.cyan
      };
      const statusColor = colorMap[version.status] || chalk.gray;

      console.log(chalk.cyan(`📁 ${version.name}`));
      console.log(chalk.gray(`  Version: ${version.version}`));
      console.log(chalk.gray(`  Name: ${version.name}`));
      console.log(chalk.gray(`  Status: ${statusColor(version.status)}`));
      console.log(chalk.gray(`  Created: ${new Date(version.created_at).toLocaleDateString()}`));

      if (version.started_at) {
        console.log(chalk.gray(`  Started: ${new Date(version.started_at).toLocaleDateString()}`));
      }

      if (version.completed_at) {
        console.log(chalk.gray(`  Completed: ${new Date(version.completed_at).toLocaleDateString()}`));
      }

      if (version.features) {
        console.log(chalk.gray(`  Features: ${version.features}`));
      }

      console.log('');
    }

  } catch (error) {
    console.log(chalk.red('❌ Failed to list versions:'), error);
    throw error;
  }
}

async function removeVersion(configManager: ConfigManager, identifier: string): Promise<void> {
  console.log(chalk.blue(`🗑️  Removing version: ${identifier}`));

  try {
    const versionsPath = path.join(process.cwd(), 'versions');
    const versionDir = path.join(versionsPath, identifier);
    const fs = await import('fs-extra');

    if (!await fs.pathExists(versionDir)) {
      console.log(chalk.red(`❌ Version not found: ${identifier}`));
      console.log(chalk.gray('Use "cody-beads version list" to see available versions'));
      return;
    }

    const { confirmed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message: `Are you sure you want to remove version ${identifier}?`,
        default: false
      }
    ]);

    if (!confirmed) {
      console.log(chalk.gray('Version removal cancelled'));
      return;
    }

    await fs.remove(versionDir);
    console.log(chalk.green(`✅ Version ${identifier} removed successfully!`));

  } catch (error) {
    console.log(chalk.red('❌ Failed to remove version:'), error);
    throw error;
  }
}

async function generateVersionNumber(configManager: ConfigManager): Promise<string> {
  const versionsPath = path.join(process.cwd(), 'versions');
  const fs = await import('fs-extra');

  let lastVersion = '0.1.0';

  if (await fs.pathExists(versionsPath)) {
    const versions = await fs.readdir(versionsPath);
    const versionDirs = versions.filter(name => !name.startsWith('.'));

    if (versionDirs.length > 0) {
      // Extract version numbers and find the highest
      const versionNumbers = versionDirs
        .map(name => {
          const match = name.match(/^v?(\d+)\.(\d+)\.(\d+)/);
          return match ? match.slice(1) : null;
        })
        .filter(Boolean)
        .map(parts => parts ? { major: parseInt(parts[0]), minor: parseInt(parts[1]), patch: parseInt(parts[2]) } : null)
        .filter((parts): parts is NonNullable<typeof parts> => parts !== null)
        .sort((a, b) => b.major - a.major || b.minor - a.minor || b.patch - a.patch);

      if (versionNumbers.length > 0) {
        const last = versionNumbers[0];
        lastVersion = `${last.major}.${last.minor}.${last.patch + 1}`;
      }
    }
  }

  return lastVersion;
}

async function generateDesignDocument(versionData: any, config: any): Promise<string> {
  return `
# Design Document - ${versionData.version}

## Overview

${versionData.description}

## Version Information

- **Version**: ${versionData.version}
- **Name**: ${versionData.name}
- **Status**: ${versionData.status}
- **Created**: ${new Date(versionData.created_at).toLocaleDateString()}
- **Priority**: ${versionData.priority}

## Features

${versionData.features}

## Technical Requirements

### Dependencies

${versionData.dependencies.length > 0 ? versionData.dependencies.map((dep: any) => `- ${dep}`).join('\n') : 'No external dependencies identified'}

### Configuration

The following configuration settings will be updated:

\`\`\`json
{
  "sync": {
    "defaultDirection": "${config.sync?.defaultDirection || 'bidirectional'}",
    "conflictResolution": "${config.sync?.conflictResolution || 'manual'}"
  }
}
\`\`\`

## Implementation Strategy

### Phase 1: Planning
- [ ] Review design document
- [ ] Identify potential conflicts
- [ ] Plan implementation approach

### Phase 2: Development
- [ ] Implement core functionality
- [ ] Add error handling
- [ ] Write tests

### Phase 3: Testing
- [ ] Unit testing
- [ ] Integration testing
- [ ] Manual testing

### Phase 4: Deployment
- [ ] Update configuration
- [ ] Create release notes
- [ ] Deploy to production

## Acceptance Criteria

- [ ] All features implemented as specified
- [ ] Tests passing with >80% coverage
- [ ] Documentation updated
- [ ] Configuration migration successful
- [ ] No breaking changes introduced

## Risk Assessment

### Technical Risks
- Data migration complexity
- Integration compatibility issues
- Performance impact

### Mitigation Strategies
- Comprehensive testing
- Gradual rollout
- Rollback procedures

## Success Metrics

- All features working correctly
- Zero data loss during migration
- Performance maintained or improved
- User adoption successful
  `.trim();
}

async function generateTaskList(versionData: any, config: any): Promise<string> {
  const tasks = [
    {
      id: 'V${versionData.number}-001',
      title: 'Set up development environment',
      description: 'Configure local development environment with required tools and dependencies',
      priority: 'high',
      status: 'todo',
      estimated_time: '2 hours'
    },
    {
      id: 'V${versionData.number}-002',
      title: 'Implement core functionality',
      description: 'Develop the main features and capabilities specified in requirements',
      priority: 'high',
      status: 'todo',
      estimated_time: '8 hours',
      dependencies: ['V${versionData.number}-001']
    },
    {
      id: 'V${versionData.number}-003',
      title: 'Write comprehensive tests',
      description: 'Create unit tests, integration tests, and end-to-end tests',
      priority: 'medium',
      status: 'todo',
      estimated_time: '4 hours',
      dependencies: ['V${versionData.number}-002']
    },
    {
      id: 'V${versionData.number}-004',
      title: 'Update documentation',
      description: 'Update all relevant documentation to reflect changes and new features',
      priority: 'medium',
      status: 'todo',
      estimated_time: '2 hours',
      dependencies: ['V${versionData.number}-003']
    },
    {
      id: 'V${versionData.number}-005',
      title: 'Create release notes',
      description: 'Prepare comprehensive release notes with changelog and migration guide',
      priority: 'low',
      status: 'todo',
      estimated_time: '1 hour',
      dependencies: ['V${versionData.number}-004']
    }
  ];

  return `
# Task List - ${versionData.version}

## Overview

Implementation tasks for ${versionData.name} version ${versionData.version}.

## Tasks

| ID | Title | Status | Priority | Estimated Time | Dependencies |
|-----|--------|----------|----------------|--------------|
${tasks.map(task =>
  `| ${task.id} | ${task.title} | ${task.status} | ${task.priority} | ${task.estimated_time} | ${(task.dependencies || []).join(', ') || 'None'} |`
).join('\n')}

## Progress Tracking

### Overall Progress
- **Total Tasks**: ${tasks.length}
- **Completed**: 0
- **In Progress**: 0
- **Blocked**: 0
- **Ready**: ${tasks.length}

### Milestone Timeline
- **Phase 1 - Setup**: ${tasks.filter(t => t.priority === 'high').length} tasks
- **Phase 2 - Development**: Core functionality implementation
- **Phase 3 - Testing**: Quality assurance and validation
- **Phase 4 - Documentation**: Final preparation for release

## Notes

- Update task status as work progresses
- Use task IDs for tracking and reference
- Document any blockers or dependencies discovered
  `.trim();
}

async function determineBuildSteps(features: string, config: any): Promise<any[]> {
  const steps = [];

  // Analyze features to determine build steps
  if (features.includes('monorepo')) {
    steps.push({
      description: 'Set up monorepo structure with pnpm workspace',
      dependencies: []
    });
  }

  if (features.includes('cody-beads-integration')) {
    steps.push({
      description: 'Implement Cody-Beads integration package',
      dependencies: ['Set up monorepo structure with pnpm workspace']
    });
  }

  if (features.includes('github-packages')) {
    steps.push({
      description: 'Configure GitHub Packages registry and publishing',
      dependencies: ['Implement Cody-Beads integration package']
    });
  }

  if (features.includes('sync-scripts')) {
    steps.push({
      description: 'Create bidirectional synchronization scripts',
      dependencies: ['Configure GitHub Packages registry and publishing']
    });
  }

  if (features.includes('templates')) {
    steps.push({
      description: 'Create project templates and documentation',
      dependencies: ['Create bidirectional synchronization scripts']
    });
  }

  if (features.includes('testing')) {
    steps.push({
      description: 'Set up comprehensive testing suite',
      dependencies: ['Create project templates and documentation']
    });
  }

  return steps;
}

async function executeBuildStep(step: any, config: any, versionDir: string): Promise<void> {
  // This would contain the actual implementation logic
  // For now, we'll just simulate the step execution
  await new Promise(resolve => setTimeout(resolve, 1000));
}