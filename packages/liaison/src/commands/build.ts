import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

export function createBuildCommand(): Command {
  const command = new Command('build')
    .description('Start the BUILD phase - create feature backlog from plan')
    .action(async () => {
      const spinner = ora('Starting BUILD phase...').start();

      try {
        const projectRoot = process.cwd();
        const codyDir = join(projectRoot, '.cody');
        const planDir = join(codyDir, 'project', 'plan');
        const buildDir = join(codyDir, 'project', 'build');

        const featureBacklogPath = join(buildDir, 'feature-backlog.md');

        if (existsSync(featureBacklogPath)) {
          spinner.stop();
          console.log(chalk.yellow('⚠️  Build phase already started'));
          console.log(chalk.gray('Feature backlog exists at: ') + chalk.cyan(featureBacklogPath));
          console.log(chalk.gray('\nUse ') + chalk.cyan('liaison task create') + chalk.gray(' to create tasks from backlog items'));
          return;
        }

        if (!existsSync(join(planDir, 'plan.md'))) {
          spinner.stop();
          console.log(chalk.red('❌ No plan found. Run ') + chalk.cyan('liaison plan') + chalk.red(' first'));
          return;
        }

        spinner.text = 'Creating feature backlog...';
        mkdirSync(buildDir, { recursive: true });

        const planContent = readFileSync(join(planDir, 'plan.md'), 'utf-8');
        const featureBacklog = generateFeatureBacklog(planContent);

        writeFileSync(featureBacklogPath, featureBacklog);

        spinner.succeed(chalk.green('✅ Feature backlog created'));

        console.log(chalk.bold('\n+---------------+'));
        console.log(chalk.bold('BUILD PHASE START'));
        console.log(chalk.bold('+---------------+'));
        console.log();
        console.log(chalk.gray('📁 Feature backlog: ') + chalk.cyan(featureBacklogPath));
        console.log();
        console.log(chalk.blue('💡 Next: ') + chalk.cyan('liaison task create "<feature>"') + chalk.blue(' to create tasks'));
        console.log(chalk.gray('   Or: ') + chalk.cyan('liaison workflow list') + chalk.gray(' to see available workflows'));

      } catch (error) {
        spinner.fail(chalk.red('Build failed'));
        console.error(chalk.red(error));
        process.exit(1);
      }
    });

  return command;
}

function generateFeatureBacklog(planContent: string): string {
  const timestamp = new Date().toISOString();
  return `# Feature Backlog

**Generated:** ${timestamp}
**Status:** Ready for Implementation

## Backlog Items

_Generated from Liaison Plan. Convert each to a task using: liaison task create_

### Implementation Tasks

1. [ ] **Task 1** - _Description pending_
   - Priority: medium
   - Workflow: development

2. [ ] **Task 2** - _Description pending_
   - Priority: medium
   - Workflow: development

## Notes

- Review plan.md for full requirements
- Use \`liaison task create --auto-trigger <workflow>\` for automatic workflow triggering
- Run \`liaison refresh\` to sync state after creating tasks
`;
}
