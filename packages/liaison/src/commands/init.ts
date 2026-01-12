/**
 * Init Command
 * CLI command: liaison init
 * Initialize liaison in a project by augmenting AGENTS.md with liaison-specific guidance
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

interface InitOptions {
  force?: boolean;
  verbose?: boolean;
  dryRun?: boolean;
}

export function createInitCommand(): Command {
  const command = new Command('init');

  command
    .description('Initialize liaison in a project by augmenting AGENTS.md')
    .option('--force', 'Force re-initialization even if already initialized', false)
    .option('--verbose', 'Show detailed output', false)
    .option('--dry-run', 'Preview changes without applying', false)
    .action(async (options: InitOptions) => {
      const spinner = ora('🔧 Initializing liaison...').start();

      try {
        const projectRoot = process.cwd();
        const agentsMdPath = join(projectRoot, 'AGENTS.md');

        // Check if AGENTS.md exists
        const agentsMdExists = existsSync(agentsMdPath);

        if (options.verbose) {
          spinner.text = `📁 Checking for AGENTS.md in ${projectRoot}`;
          console.log(chalk.gray(`  Project root: ${projectRoot}`));
          console.log(chalk.gray(`  AGENTS.md exists: ${agentsMdExists}`));
        }

        // Check if already initialized
        let alreadyInitialized = false;
        if (agentsMdExists) {
          const content = await readFile(agentsMdPath, 'utf-8');
          alreadyInitialized = content.includes('<!-- LIAISON_INIT_MARKER -->');

          if (options.verbose) {
            console.log(chalk.gray(`  Already initialized: ${alreadyInitialized}`));
          }
        }

        // Handle force flag
        if (alreadyInitialized && !options.force) {
          spinner.warn(chalk.yellow('⚠️  Liaison already initialized in this project'));
          console.log(chalk.gray('  Use --force to re-initialize'));
          process.exit(0);
        }

        // Generate liaison-specific content
        const liaisonContent = generateLiaisonContent();

        if (options.dryRun) {
          spinner.stop();
          console.log(chalk.yellow('🔍 Dry Run - No changes will be made\n'));

          if (agentsMdExists) {
            console.log(chalk.blue('  Would augment existing AGENTS.md with liaison content'));
          } else {
            console.log(chalk.blue('  Would create new AGENTS.md with liaison content'));
          }

          console.log(chalk.gray('\n  Liaison content to be added:'));
          console.log(chalk.gray('  ' + '-'.repeat(50)));
          console.log(liaisonContent.split('\n').map(line => chalk.gray(`  ${line}`)).join('\n'));
          console.log(chalk.gray('  ' + '-'.repeat(50)));
          console.log(chalk.gray('\n  Remove --dry-run to apply changes'));
          process.exit(0);
        }

        // Apply changes
        if (agentsMdExists) {
          // Augment existing AGENTS.md
          let content = await readFile(agentsMdPath, 'utf-8');

          // Remove existing liaison content if present
          content = content.replace(/<!-- LIAISON_INIT_MARKER -->[\s\S]*?<!-- \/LIAISON_INIT_MARKER -->/g, '');

          // Add liaison content at the end
          content = content.trim() + '\n\n' + liaisonContent;

          await writeFile(agentsMdPath, content);
          spinner.succeed(chalk.green('✅ AGENTS.md augmented with liaison guidance'));
        } else {
          // Create new AGENTS.md
          await writeFile(agentsMdPath, liaisonContent);
          spinner.succeed(chalk.green('✅ AGENTS.md created with liaison guidance'));
        }

        console.log(chalk.blue('\n📋 Next steps:'));
        console.log(chalk.gray('  1. Review the AGENTS.md file for liaison-specific guidance'));
        console.log(chalk.gray('  2. Customize the liaison integration for your project needs'));
        console.log(chalk.gray('  3. Run `liaison --help` to see available commands'));
        console.log();

        process.exit(0);
      } catch (error) {
        spinner.fail(chalk.red(`❌ Initialization failed: ${error}`));
        process.exit(1);
      }
    });

  return command;
}

/**
 * Generate liaison-specific content for AGENTS.md
 */
function generateLiaisonContent(): string {
  return `<!-- LIAISON_INIT_MARKER -->
## Liaison CLI Integration

This project uses the **Liaison CLI** for workflow automation and task management. The liaison tool provides intelligent, event-driven automation systems.

### 🚀 Getting Started with Liaison

**Installation:**
\`\`\`bash
npm install @pwarnock/liaison --save-dev
# or
yarn add @pwarnock/liaison --dev
# or
bun add @pwarnock/liaison --dev
\`\`\`

**Basic Usage:**
\`\`\`bash
# Initialize liaison (you just did this!)
npx liaison init

# Check system health
npx liaison health

# Create tasks with intelligent workflows
npx liaison task create "Implement feature X" --priority high

# List available workflows
npx liaison workflow list

# Run automated sync between systems
npx liaison sync
\`\`\`

### 🤖 Agent Integration Patterns

**For AI Agents:**
- Use \`liaison task create\` for all task management
- Leverage \`liaison workflow\` commands for automation
- Check \`liaison health\` for system status
- Use \`liaison sync\` to keep systems in sync

**Task Creation Examples:**
\`\`\`bash
# Create a critical security task (auto-triggers security workflow)
liaison task create "Security vulnerability found" --priority critical

# Create a documentation task (auto-triggers docs workflow)
liaison task create "Update API documentation" --auto-trigger "documentation-update"

# Create a feature task with dependencies
liaison task create "Implement user authentication" --priority medium --deps "bd-123,bd-456"
\`\`\`

### 🎯 Project-Specific Optimization

**Recommended Setup:**
1. **Configure workflows**: Set up project-specific workflow triggers
   \`\`\`bash
   liaison workflow create "ci-pipeline" --trigger "task-created:tag=ci"
   \`\`\`

2. **Initialize skills**: Set up agent skills for your domain
   \`\`\`bash
   liaison skill init
   liaison skill create my-project-skill --template workflow
   \`\`\`

3. **Customize AGENTS.md**: Add your project-specific liaison patterns below

### 📚 Learning Resources

**Documentation:**
- Run \`liaison --help\` for command reference
- Check \`docs/workflows/task-driven-workflow-order.md\` for workflow patterns
- See \`docs/AGENTS.md\` for agent integration guidelines

**Advanced Usage:**
- **Multi-agent coordination**: Use \`liaison agent\` commands
- **Task-driven workflows**: Explore \`liaison workflow\` automation
- **Plugin system**: Extend with \`liaison plugin\` commands

### 🔄 Keeping Updated

**Update liaison regularly:**
\`\`\`bash
npm update @pwarnock/liaison
# or
bun update @pwarnock/liaison
\`\`\`

**Check for new features:**
\`\`\`bash
liaison --version
liaison health --component all
\`\`\`

<!-- /LIAISON_INIT_MARKER -->`;
}

export const initCommand = createInitCommand();
