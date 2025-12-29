/**
 * Task Command
 * CLI command: liaison task
 * Manage tasks in the backend (create, list, get, update status)
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { BeadsAdapter } from '../reconciler/adapters/beads-adapter';
import type { Task, TaskFilter, DependencyType, DependencyNode } from '../reconciler/types';
import { getAgenticWorkflowManager } from '../agentic-workflow-manager';
import { checkForDuplicates, formatDuplicateMatches } from '../utils/duplicate-checker';



/**
 * Format table header
 */
function printTableHeader(): void {
  console.log(
    chalk.bold(
      'ID'.padEnd(12) + ' | Task'.padEnd(40) + ' | Status'.padEnd(10) + ' | Description'
    )
  );
  console.log(chalk.gray('-'.repeat(100)));
}

/**
 * Format task as table row
 */
function formatTaskRow(task: Task): string {
  const statusEmoji = task.status === 'closed' ? '🟢' : task.status === 'deleted' ? '❌' : '🔴';
  return (
    task.id.padEnd(12) +
    ' | ' +
    (task.title.substring(0, 38) + '...').padEnd(40) +
    ' | ' +
    statusEmoji.padEnd(10) +
    ' | ' +
    (task.description || '').substring(0, 40)
  );
}

export function createTaskCommand(): Command {
  const command = new Command('task');

  command.description('Manage tasks in the backend');

  // liaison task create
  command
    .command('create <title>')
    .description('Create a new task')
    .option('--description <text>', 'Task description')
    .option('--assigned-to <user>', 'Assign task to user')
    .option('--auto-trigger <workflow>', 'Automatically trigger workflow when task is created')
    .option('--priority <level>', 'Task priority (low, medium, high, critical)')
    .option('--check-duplicates', 'Check for duplicate issues before creating (default: true)', true)
    .option('--no-check-duplicates', 'Skip duplicate check')
    .option('--force-create', 'Create task even if duplicates found')
    .option('--json', 'Output as JSON')
    .action(async (title: string, options) => {
      let spinner = ora('Creating task...').start();

      try {
        const adapter = new BeadsAdapter(true);

        // Health check first
        const healthy = await adapter.healthCheck();
        if (!healthy) {
          spinner.fail(chalk.red('Backend is not available. Check your setup.'));
          process.exit(1);
        }

        // Check for duplicates unless explicitly bypassed
        if (options.checkDuplicates && !options.forceCreate) {
          spinner.text = 'Checking for duplicate issues...';
          const dupCheck = await checkForDuplicates(title, false);

          if (dupCheck.error) {
            spinner.warn(chalk.yellow(`Duplicate check failed: ${dupCheck.error}`));
            // Continue anyway, don't block task creation
          } else if (dupCheck.hasDuplicates && dupCheck.matches.length > 0) {
            spinner.stop();
            console.log(formatDuplicateMatches(dupCheck.matches));
            console.log(chalk.yellow('\nUse --force-create to create this task anyway\n'));
            process.exit(0);
          }
        }

        spinner.start();
        const task = await adapter.createTask({
          title,
          description: options.description,
          assignedTo: options.assignedTo,
          priority: options.priority || 'medium',
        });

        // Emit task creation event for agentic workflow triggers
        console.log(`🔄 Task created: ${task.id} - checking for auto-triggers...`);
        
        // Auto-trigger workflows if requested
        if (options.autoTrigger) {
          console.log(`🚀 Auto-triggering workflow: ${options.autoTrigger}`);
          // This would integrate with workflow engine
          console.log(`📋 Task priority: ${task.priority || 'medium'}`);
          console.log(`🎯 Ready for agentic workflow integration`);
          
          // Process task event through agentic workflow manager
          const agenticWorkflowManager = getAgenticWorkflowManager();
          const triggeredWorkflows = await agenticWorkflowManager.processTaskEvent({
            type: 'created',
            taskId: task.id,
            task,
            timestamp: new Date()
          });
          
          if (triggeredWorkflows.length > 0) {
            console.log(chalk.green(`✨ Agentic workflows triggered: ${triggeredWorkflows.join(', ')}`));
          }
        }
        
        // Check if this task should trigger any workflows (handled by agentic workflow manager)
        // This is now handled by the agentic workflow manager above

        if (options.json) {
          spinner.stop();
          console.log(JSON.stringify(task, null, 2));
        } else {
          spinner.succeed(chalk.green('Task created'));
          console.log(`ID: ${chalk.cyan(task.id)}`);
          console.log(`Title: ${task.title}`);
          if (task.description) {
            console.log(`Description: ${task.description}`);
          }
        }
        process.exit(0);
      } catch (error) {
        spinner.fail(chalk.red(`Failed to create task: ${error}`));
        process.exit(1);
      }
    });

  // liaison task list
  command
    .command('list')
    .description('List all tasks')
    .option('--status <status>', 'Filter by status (open, closed, deleted)')
    .option('--assigned-to <user>', 'Filter by assignee')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const spinner = ora('Fetching tasks...').start();

      try {
        const adapter = new BeadsAdapter(true);

        // Health check first
        const healthy = await adapter.healthCheck();
        if (!healthy) {
          spinner.fail(chalk.red('Backend is not available. Check your setup.'));
          process.exit(1);
        }

        const filters: TaskFilter = {};
        if (options.status) {
          filters.status = options.status;
        }
        if (options.assignedTo) {
          filters.assignedTo = options.assignedTo;
        }

        const tasks = await adapter.listTasks(filters);

        if (options.json) {
          spinner.stop();
          // Stream JSON to avoid buffer issues
          process.stdout.write('[\n');
          tasks.forEach((task, index) => {
            process.stdout.write(JSON.stringify(task, null, 2));
            if (index < tasks.length - 1) {
              process.stdout.write(',\n');
            } else {
              process.stdout.write('\n');
            }
          });
          process.stdout.write(']\n');
        } else {
          spinner.stop();
          if (tasks.length === 0) {
            console.log(chalk.yellow('No tasks found'));
            process.exit(0);
          }

          console.log(chalk.blue(`\n📋 Tasks (${tasks.length})\n`));
          printTableHeader();
          tasks.forEach((task) => console.log(formatTaskRow(task)));
          console.log();
        }
        process.exit(0);
      } catch (error) {
        spinner.fail(chalk.red(`Failed to list tasks: ${error}`));
        process.exit(1);
      }
    });

  // liaison task get
  command
    .command('get <id>')
    .description('Get task details')
    .option('--json', 'Output as JSON')
    .action(async (id: string, options) => {
      const spinner = ora(`Fetching task ${id}...`).start();

      try {
        const adapter = new BeadsAdapter(true);

        // Health check first
        const healthy = await adapter.healthCheck();
        if (!healthy) {
          spinner.fail(chalk.red('Backend is not available. Check your setup.'));
          process.exit(1);
        }

        const task = await adapter.getTask(id);

        if (!task) {
          spinner.fail(chalk.red(`Task not found: ${id}`));
          process.exit(1);
        }

        if (options.json) {
          spinner.stop();
          console.log(JSON.stringify(task, null, 2));
        } else {
          spinner.succeed(chalk.green('Task found'));
          console.log(`\nID: ${chalk.cyan(task.id)}`);
          console.log(`Title: ${task.title}`);
          console.log(`Status: ${task.status}`);
          if (task.description) {
            console.log(`Description: ${task.description}`);
          }
          if (task.createdAt) {
            console.log(`Created: ${task.createdAt.toISOString().split('T')[0]}`);
          }
          if (task.closedAt) {
            console.log(`Closed: ${task.closedAt.toISOString().split('T')[0]}`);
          }
          console.log();
        }
        process.exit(0);
      } catch (error) {
        spinner.fail(chalk.red(`Failed to get task: ${error}`));
        process.exit(1);
      }
    });

  // liaison task update
  command
    .command('update <id>')
    .description('Update task status')
    .option('--status <status>', 'New status (open, closed, deleted)', 'closed')
    .option('--notes <text>', 'Additional notes')
    .option('--json', 'Output as JSON')
    .action(async (id: string, options) => {
      const spinner = ora(`Updating task ${id}...`).start();

      try {
        const adapter = new BeadsAdapter(true);

        // Health check first
        const healthy = await adapter.healthCheck();
        if (!healthy) {
          spinner.fail(chalk.red('Backend is not available. Check your setup.'));
          process.exit(1);
        }

        const task = await adapter.updateTaskStatus(id, options.status, options.notes);

        if (options.json) {
          spinner.stop();
          console.log(JSON.stringify(task, null, 2));
        } else {
          spinner.succeed(chalk.green('Task updated'));
          console.log(`ID: ${chalk.cyan(task.id)}`);
          console.log(`Status: ${task.status}`);
          console.log();
        }
        process.exit(0);
      } catch (error) {
        spinner.fail(chalk.red(`Failed to update task: ${error}`));
        process.exit(1);
      }
    });

  // ==========================================
  // Ready Work Commands (Beads v0.40+)
  // ==========================================

  // liaison task ready
  command
    .command('ready')
    .description('List tasks ready to work on (no blockers)')
    .option('--priority <level>', 'Filter by priority (0=critical, 1=high, 2=medium, 3=low, 4=backlog)')
    .option('--limit <n>', 'Maximum number of tasks to return', '10')
    .option('--sort <order>', 'Sort order: priority (strict) or hybrid (recent by priority, old by age)', 'priority')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const spinner = ora('Finding ready tasks...').start();

      try {
        const adapter = new BeadsAdapter(true);

        // Health check first
        const healthy = await adapter.healthCheck();
        if (!healthy) {
          spinner.fail(chalk.red('Backend is not available. Check your setup.'));
          process.exit(1);
        }

        const tasks = await adapter.getReadyTasks({
          priority: options.priority ? parseInt(options.priority, 10) : undefined,
          limit: parseInt(options.limit, 10),
          sort: options.sort as 'priority' | 'hybrid',
        });

        if (options.json) {
          spinner.stop();
          console.log(JSON.stringify(tasks, null, 2));
        } else {
          spinner.stop();
          if (tasks.length === 0) {
            console.log(chalk.yellow('\n🎉 No tasks ready - everything is blocked or completed!\n'));
            process.exit(0);
          }

          console.log(chalk.blue(`\n🚀 Ready Tasks (${tasks.length})\n`));
          console.log(chalk.gray('These tasks have no blockers and can be started immediately.\n'));
          printTableHeader();
          tasks.forEach((task) => console.log(formatTaskRow(task)));
          console.log();
        }
        process.exit(0);
      } catch (error) {
        spinner.fail(chalk.red(`Failed to get ready tasks: ${error}`));
        process.exit(1);
      }
    });

  // liaison task blocked
  command
    .command('blocked')
    .description('List tasks that are blocked by other tasks')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const spinner = ora('Finding blocked tasks...').start();

      try {
        const adapter = new BeadsAdapter(true);

        // Health check first
        const healthy = await adapter.healthCheck();
        if (!healthy) {
          spinner.fail(chalk.red('Backend is not available. Check your setup.'));
          process.exit(1);
        }

        const tasks = await adapter.getBlockedTasks();

        if (options.json) {
          spinner.stop();
          console.log(JSON.stringify(tasks, null, 2));
        } else {
          spinner.stop();
          if (tasks.length === 0) {
            console.log(chalk.green('\n✅ No blocked tasks!\n'));
            process.exit(0);
          }

          console.log(chalk.yellow(`\n🚫 Blocked Tasks (${tasks.length})\n`));
          console.log(chalk.gray('These tasks are waiting on other tasks to complete.\n'));
          printTableHeader();
          tasks.forEach((task) => console.log(formatTaskRow(task)));
          console.log();
        }
        process.exit(0);
      } catch (error) {
        spinner.fail(chalk.red(`Failed to get blocked tasks: ${error}`));
        process.exit(1);
      }
    });

  // ==========================================
  // Dependency Commands (Beads v0.40+)
  // ==========================================

  // liaison task tree
  command
    .command('tree <id>')
    .description('Show dependency tree for a task')
    .option('--json', 'Output as JSON')
    .action(async (id: string, options) => {
      const spinner = ora(`Building dependency tree for ${id}...`).start();

      try {
        const adapter = new BeadsAdapter(true);

        // Health check first
        const healthy = await adapter.healthCheck();
        if (!healthy) {
          spinner.fail(chalk.red('Backend is not available. Check your setup.'));
          process.exit(1);
        }

        const tree = await adapter.getDependencyTree(id);

        if (!tree) {
          spinner.fail(chalk.red(`Task not found or has no dependencies: ${id}`));
          process.exit(1);
        }

        if (options.json) {
          spinner.stop();
          console.log(JSON.stringify(tree, null, 2));
        } else {
          spinner.succeed(chalk.green('Dependency tree'));
          console.log();
          printDependencyTree(tree, 0);
          console.log();
        }
        process.exit(0);
      } catch (error) {
        spinner.fail(chalk.red(`Failed to get dependency tree: ${error}`));
        process.exit(1);
      }
    });

  // liaison task add-dep
  command
    .command('add-dep <childId> <parentId>')
    .description('Add a dependency (child depends on parent)')
    .option('--type <type>', 'Dependency type: blocks, related, parent-child, discovered-from', 'blocks')
    .action(async (childId: string, parentId: string, options) => {
      const spinner = ora(`Adding dependency ${childId} → ${parentId}...`).start();

      try {
        const adapter = new BeadsAdapter(true);

        // Health check first
        const healthy = await adapter.healthCheck();
        if (!healthy) {
          spinner.fail(chalk.red('Backend is not available. Check your setup.'));
          process.exit(1);
        }

        await adapter.addDependency(childId, parentId, options.type as DependencyType);

        spinner.succeed(chalk.green(`Dependency added: ${childId} ${getDepSymbol(options.type)} ${parentId}`));
        console.log();
        process.exit(0);
      } catch (error) {
        spinner.fail(chalk.red(`Failed to add dependency: ${error}`));
        process.exit(1);
      }
    });

  // liaison task remove-dep
  command
    .command('remove-dep <childId> <parentId>')
    .description('Remove a dependency between two tasks')
    .action(async (childId: string, parentId: string) => {
      const spinner = ora(`Removing dependency ${childId} → ${parentId}...`).start();

      try {
        const adapter = new BeadsAdapter(true);

        // Health check first
        const healthy = await adapter.healthCheck();
        if (!healthy) {
          spinner.fail(chalk.red('Backend is not available. Check your setup.'));
          process.exit(1);
        }

        await adapter.removeDependency(childId, parentId);

        spinner.succeed(chalk.green(`Dependency removed: ${childId} ✕ ${parentId}`));
        console.log();
        process.exit(0);
      } catch (error) {
        spinner.fail(chalk.red(`Failed to remove dependency: ${error}`));
        process.exit(1);
      }
    });

  // liaison task cycles
  command
    .command('cycles')
    .description('Detect circular dependencies in the task graph')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const spinner = ora('Checking for circular dependencies...').start();

      try {
        const adapter = new BeadsAdapter(true);

        // Health check first
        const healthy = await adapter.healthCheck();
        if (!healthy) {
          spinner.fail(chalk.red('Backend is not available. Check your setup.'));
          process.exit(1);
        }

        const cycles = await adapter.detectCycles();

        if (options.json) {
          spinner.stop();
          console.log(JSON.stringify(cycles, null, 2));
        } else {
          spinner.stop();
          if (cycles.length === 0) {
            console.log(chalk.green('\n✅ No circular dependencies detected!\n'));
          } else {
            console.log(chalk.red(`\n⚠️  Found ${cycles.length} circular dependency chain(s):\n`));
            cycles.forEach((cycle, i) => {
              console.log(chalk.yellow(`  ${i + 1}. ${cycle.cycle.join(' → ')} → ${cycle.cycle[0]}`));
              if (cycle.message) {
                console.log(chalk.gray(`     ${cycle.message}`));
              }
            });
            console.log();
          }
        }
        process.exit(0);
      } catch (error) {
        spinner.fail(chalk.red(`Failed to detect cycles: ${error}`));
        process.exit(1);
      }
    });

  // liaison task info
  command
    .command('info')
    .description('Show Beads system information (version, daemon status)')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const spinner = ora('Getting Beads info...').start();

      try {
        const adapter = new BeadsAdapter(true);
        const info = await adapter.getInfo();

        if (!info) {
          spinner.fail(chalk.red('Could not get Beads info. Is bd installed?'));
          process.exit(1);
        }

        if (options.json) {
          spinner.stop();
          console.log(JSON.stringify(info, null, 2));
        } else {
          spinner.succeed(chalk.green('Beads System Info'));
          console.log();
          console.log(`  Version:        ${chalk.cyan(info.version)}`);
          console.log(`  Daemon Running: ${info.daemonRunning ? chalk.green('Yes') : chalk.yellow('No')}`);
          if (info.socketPath) {
            console.log(`  Socket Path:    ${chalk.gray(info.socketPath)}`);
          }
          if (info.databasePath) {
            console.log(`  Database Path:  ${chalk.gray(info.databasePath)}`);
          }
          console.log();
        }
        process.exit(0);
      } catch (error) {
        spinner.fail(chalk.red(`Failed to get info: ${error}`));
        process.exit(1);
      }
    });

  return command;
}

/**
 * Get symbol for dependency type
 */
function getDepSymbol(type: string): string {
  switch (type) {
    case 'blocks':
      return '⏳ blocks';
    case 'related':
      return '↔️ related to';
    case 'parent-child':
      return '👶 child of';
    case 'discovered-from':
      return '🔍 discovered from';
    default:
      return '→';
  }
}

/**
 * Print dependency tree recursively
 */
function printDependencyTree(node: DependencyNode, depth: number): void {
  const indent = '  '.repeat(depth);
  const statusIcon = node.status === 'closed' ? '✅' : node.status === 'blocked' ? '🚫' : '🔵';
  const depType = node.dependencyType ? ` (${node.dependencyType})` : '';

  console.log(`${indent}${statusIcon} ${chalk.cyan(node.id)} - ${node.title}${chalk.gray(depType)}`);

  if (node.children && node.children.length > 0) {
    node.children.forEach((child) => printDependencyTree(child, depth + 1));
  }
}

export const taskCommand = createTaskCommand();
