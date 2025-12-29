/**
 * Workflow Command
 * CLI command: liaison workflow
 * Manage agentic workflows and automation
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';
import { getAgenticWorkflowManager } from '../agentic-workflow-manager';
import { APIEndpoint } from '../api-response-monitor';

/**
 * Get subtask definitions based on workflow type
 */
function getSubtaskDefinitions(workflowId: string): Array<{
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  workflowTrigger?: string;
}> {
  const definitions: Record<
    string,
    Array<{
      title: string;
      description?: string;
      priority?: 'low' | 'medium' | 'high' | 'critical';
      workflowTrigger?: string;
    }>
  > = {
    'security-response': [
      {
        title: 'Investigate security vulnerability',
        description: 'Analyze the security issue and determine impact',
        priority: 'critical',
        workflowTrigger: 'investigation',
      },
      {
        title: 'Isolate affected systems',
        description: 'Contain the vulnerability to prevent further damage',
        priority: 'high',
        workflowTrigger: 'containment',
      },
      {
        title: 'Develop security patch',
        description: 'Create and test patch for the vulnerability',
        priority: 'high',
        workflowTrigger: 'development',
      },
      {
        title: 'Verify fix effectiveness',
        description: 'Test that the patch resolves the security issue',
        priority: 'medium',
        workflowTrigger: 'verification',
      },
    ],
    'bug-fix': [
      {
        title: 'Reproduce the bug',
        description: 'Create reliable reproduction steps',
        priority: 'high',
        workflowTrigger: 'investigation',
      },
      {
        title: 'Debug root cause',
        description: 'Identify the underlying cause of the bug',
        priority: 'high',
        workflowTrigger: 'debugging',
      },
      {
        title: 'Implement fix',
        description: 'Code the solution for the bug',
        priority: 'medium',
        workflowTrigger: 'development',
      },
      {
        title: 'Test fix thoroughly',
        description: "Ensure the fix works and doesn't break other functionality",
        priority: 'medium',
        workflowTrigger: 'testing',
      },
      {
        title: 'Deploy fix to production',
        description: 'Release the fix to the production environment',
        priority: 'low',
        workflowTrigger: 'deployment',
      },
    ],
    'high-priority-response': [
      {
        title: 'Assign appropriate team members',
        description: 'Ensure the right people are working on this priority issue',
        priority: 'high',
        workflowTrigger: 'assignment',
      },
      {
        title: 'Escalate if needed',
        description: 'Bring in additional resources if required',
        priority: 'medium',
        workflowTrigger: 'escalation',
      },
      {
        title: 'Notify stakeholders',
        description: 'Keep relevant parties informed of progress',
        priority: 'medium',
        workflowTrigger: 'notification',
      },
      {
        title: 'Track progress closely',
        description: 'Monitor resolution progress and timeline',
        priority: 'low',
        workflowTrigger: 'monitoring',
      },
    ],
    'documentation-update': [
      {
        title: 'Update documentation content',
        description: 'Revise relevant documentation sections',
        priority: 'medium',
        workflowTrigger: 'content-update',
      },
      {
        title: 'Review documentation changes',
        description: 'Ensure accuracy and completeness of updates',
        priority: 'medium',
        workflowTrigger: 'review',
      },
      {
        title: 'Publish updated documentation',
        description: 'Release updated documentation to users',
        priority: 'low',
        workflowTrigger: 'publication',
      },
    ],
    'stability-remediation': [
      {
        title: 'Analyze stability issue',
        description:
          'Investigate root cause of stability problem including performance metrics, error logs, and system resources',
        priority: 'high',
        workflowTrigger: 'investigation',
      },
      {
        title: 'Implement remediation',
        description: 'Apply appropriate fix for stability issue based on analysis findings',
        priority: 'high',
        workflowTrigger: 'development',
      },
      {
        title: 'Verify fix effectiveness',
        description:
          'Test that stability issue is resolved and system performance meets requirements',
        priority: 'medium',
        workflowTrigger: 'verification',
      },
      {
        title: 'Monitor system stability',
        description: 'Continuously monitor system to ensure stability issue does not recur',
        priority: 'low',
        workflowTrigger: 'monitoring',
      },
    ],
  };

  return definitions[workflowId] || [];
}

/**
 * Execute Python workflow script with proper error handling
 */
function executeWorkflowScript(scriptName: string, args: string[] = []): Promise<string> {
  return new Promise((resolve, reject) => {
    const scriptPath = `scripts/${scriptName}`;
    const childProcess = spawn('python3', [scriptPath, ...args], {
      stdio: 'pipe',
      cwd: process.cwd(),
    });

    let output = '';
    let errorOutput = '';

    childProcess.stdout?.on('data', (data: Buffer) => {
      output += data.toString();
    });

    childProcess.stderr?.on('data', (data: Buffer) => {
      errorOutput += data.toString();
    });

    childProcess.on('close', (code: number | null) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Script failed with code ${code}: ${errorOutput}`));
      }
    });

    childProcess.on('error', (error: Error) => {
      reject(new Error(`Failed to execute script: ${error.message}`));
    });
  });
}

export function createWorkflowCommand(): Command {
  const command = new Command('workflow');

  command.description('Manage agentic workflows and automation');

  // liaison workflow list
  command
    .command('list')
    .description('List all available workflows')
    .option('--json', 'Output as JSON')
    .action(async options => {
      try {
        // Get workflows from Python script
        const output = await executeWorkflowScript(
          'list-workflows.py',
          options.json ? ['--json'] : []
        );

        if (options.json) {
          console.log(output);
        } else {
          // Show agentic workflow manager stats
          const agenticWorkflowManager = getAgenticWorkflowManager();
          const stats = agenticWorkflowManager.getTriggerStats();
          console.log(chalk.blue('\n🤖 Agentic Workflow Manager Status:'));
          console.log(`  Total Triggers: ${stats.totalTriggers}`);
          console.log(`  Recent Events: ${stats.recentEvents.length}`);
          console.log();

          console.log(output);
        }
        
        // Explicit exit to prevent hanging
        process.exit(0);
      } catch (error) {
        console.error(chalk.red(`Failed to list workflows: ${error}`));
        process.exit(1);
      }
    });

  // liaison workflow create
  command
    .command('create <name>')
    .description('Create a new workflow')
    .option('--trigger <condition>', 'Trigger condition for the workflow')
    .option('--actions <actions>', 'Comma-separated list of actions')
    .option('--description <text>', 'Workflow description')
    .action(async (name: string, options) => {
      const spinner = ora(`Creating workflow ${name}...`).start();

      try {
        const args = [name];
        if (options.trigger) args.push('--trigger', options.trigger);
        if (options.actions) args.push('--actions', options.actions);
        if (options.description) args.push('--description', options.description);

        const output = await executeWorkflowScript('create-workflow.py', args);

        spinner.succeed(chalk.green('Workflow created'));
        console.log(output);
        process.exit(0);
      } catch (error) {
        spinner.fail(chalk.red(`Failed to create workflow: ${error}`));
        process.exit(1);
      }
    });

  // liaison workflow run
  command
    .command('run <name>')
    .description('Execute a workflow')
    .option('--dry-run', 'Show what would be executed without running')
    .option('--task-id <id>', 'Associate with specific task')
    .action(async (name: string, options) => {
      const spinner = ora(`Running workflow ${name}...`).start();

      try {
        const args = [name];
        if (options.dryRun) args.push('--dry-run');
        if (options.taskId) args.push('--task-id', options.taskId);

        const output = await executeWorkflowScript('run-workflow.py', args);

        spinner.succeed(chalk.green('Workflow executed'));
        console.log(output);

        // Emit workflow execution event for agentic manager
        const agenticWorkflowManager = getAgenticWorkflowManager();
        agenticWorkflowManager.emit('workflow.executed', {
          workflowId: name,
          taskId: options.taskId,
          timestamp: new Date(),
          dryRun: options.dryRun || false
        });

        // If workflow completed successfully and has associated task, create subtasks
        if (options.taskId && !options.dryRun) {
          console.log(chalk.blue(`🔄 Creating subtasks for task ${options.taskId} from workflow ${name}`));
          
          // Define subtasks based on workflow type
          const subtaskDefinitions = getSubtaskDefinitions(name);
          
          if (subtaskDefinitions.length > 0) {
            try {
              await agenticWorkflowManager.createSubtasks(options.taskId, subtaskDefinitions);
            } catch (error) {
              console.warn(chalk.yellow(`⚠️  Failed to create subtasks: ${error}`));
            }
          }
        }
        
        process.exit(0);
      } catch (error) {
        spinner.fail(chalk.red(`Failed to run workflow: ${error}`));
        process.exit(1);
      }
    });

  // liaison workflow schedule
  command
    .command('schedule <name> <time>')
    .description('Schedule workflow execution')
    .option('--recurring', 'Make this a recurring schedule')
    .action(async (name: string, time: string, options) => {
      const spinner = ora(`Scheduling workflow ${name}...`).start();

      try {
        const args = [name, time];
        if (options.recurring) args.push('--recurring');

        const output = await executeWorkflowScript('schedule-workflow.py', args);

        spinner.succeed(chalk.green('Workflow scheduled'));
        console.log(output);
        process.exit(0);
      } catch (error) {
        spinner.fail(chalk.red(`Failed to schedule workflow: ${error}`));
        process.exit(1);
      }
    });

  // liaison workflow logs
  command
    .command('logs <name>')
    .description('Show workflow execution logs')
    .option('--limit <number>', 'Number of log entries to show', '10')
    .option('--json', 'Output as JSON')
    .action(async (name: string, options) => {
      const spinner = ora(`Fetching logs for ${name}...`).start();

      try {
        const args = [name, '--limit', options.limit];
        if (options.json) args.push('--json');

        const output = await executeWorkflowScript('show-workflow-logs.py', args);

        spinner.stop();
        console.log(output);
        process.exit(0);
      } catch (error) {
        spinner.fail(chalk.red(`Failed to fetch logs: ${error}`));
        process.exit(1);
      }
    });

  // liaison workflow triggers
  command
    .command('triggers')
    .description('Show workflow trigger configuration')
    .action(async () => {
      console.log(chalk.blue('🎯 Workflow Trigger Configuration:\n'));
      
      const agenticWorkflowManager = getAgenticWorkflowManager();
      const stats = agenticWorkflowManager.getTriggerStats();

      console.log(chalk.bold('Trigger Statistics:'));
      console.log(`  Total Triggers: ${stats.totalTriggers}`);
      console.log(`  Triggers by Type:`);

      Object.entries(stats.triggersByType).forEach(([type, count]) => {
        console.log(`    ${type}: ${count}`);
      });

      console.log(chalk.bold('\nRecent Events:'));
      stats.recentEvents.forEach((event: any, index: number) => {
        console.log(
          `  ${index + 1}. ${event.type.toUpperCase()} - ${event.taskId} (${event.timestamp.toISOString()})`
        );
      });

      // Show file system watcher stats
      const fsStats = agenticWorkflowManager.getFileSystemWatcherStats();
      if (fsStats) {
        console.log(chalk.bold('\n📁 File System Watcher:'));
        console.log(`  Active Watchers: ${fsStats.activeWatchers}`);
        console.log(`  Watched Paths: ${fsStats.watchedPaths.join(', ')}`);
        console.log(`  Last Git Commit: ${fsStats.lastGitCommit || 'None'}`);
        console.log(`  File System Triggers: ${fsStats.totalTriggers}`);
      }

      // Show API monitor stats
      const apiStats = agenticWorkflowManager.getAPIMonitorStats();
      if (apiStats) {
        console.log(chalk.bold('\n🔍 API Response Monitor:'));
        console.log(`  Total Endpoints: ${apiStats.totalEndpoints}`);
        console.log(`  Active Endpoints: ${apiStats.activeEndpoints}`);
        console.log(`  Failed Endpoints: ${apiStats.failedEndpoints}`);
        console.log(`  Uptime: ${Math.round(apiStats.uptime)}s`);
      }
      
      // Explicit exit to prevent hanging
      process.exit(0);
    });

  // liaison workflow watch
  command
    .command('watch <path>')
    .description('Start watching file system path for changes')
    .option('--stop', 'Stop watching the specified path')
    .action(async (path: string, options) => {
      if (options.stop) {
        const spinner = ora(`Stopping file system watcher for ${path}...`).start();
        try {
          const agenticWorkflowManager = getAgenticWorkflowManager();
          agenticWorkflowManager.stopFileSystemWatching([path]);
          spinner.succeed(chalk.green(`Stopped watching ${path}`));
        } catch (error) {
          spinner.fail(chalk.red(`Failed to stop watching: ${error}`));
          process.exit(1);
        }
      } else {
        const spinner = ora(`Starting file system watcher for ${path}...`).start();
        try {
          const agenticWorkflowManager = getAgenticWorkflowManager();
          agenticWorkflowManager.startFileSystemWatching([path]);
          spinner.succeed(chalk.green(`Now watching ${path} for changes`));
          console.log(chalk.blue('📁 File system triggers are now active'));
          console.log(chalk.yellow('Press Ctrl+C to stop watching'));

          // Keep process alive to continue watching
          process.on('SIGINT', () => {
            console.log(chalk.blue('\n📁 Stopping file system watchers...'));
            const agenticWorkflowManager = getAgenticWorkflowManager();
            agenticWorkflowManager.stopFileSystemWatching();
            process.exit(0);
          });

          // Prevent process from exiting
          setInterval(() => {}, 1000);
        } catch (error) {
          spinner.fail(chalk.red(`Failed to start watching: ${error}`));
          process.exit(1);
        }
      }
    });

  // liaison workflow watch-status
  command
    .command('watch-status')
    .description('Show file system watcher status')
    .action(async () => {
      console.log(chalk.blue('📁 File System Watcher Status:\n'));

      const agenticWorkflowManager = getAgenticWorkflowManager();
      const stats = agenticWorkflowManager.getFileSystemWatcherStats();

      if (!stats) {
        console.log(chalk.yellow('File system watcher not initialized'));
        process.exit(0);
      }

      console.log(chalk.bold('Watcher Statistics:'));
      console.log(`  Total Triggers: ${stats.totalTriggers}`);
      console.log(`  Active Watchers: ${stats.activeWatchers}`);
      console.log(`  Watched Paths: ${stats.watchedPaths.join(', ') || 'None'}`);
      console.log(`  Last Git Commit: ${stats.lastGitCommit || 'None'}`);

      console.log(chalk.bold('\nTriggers by Type:'));
      Object.entries(stats.triggersByType).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });

      console.log(chalk.bold('\nRecent File System Events:'));
      stats.recentEvents.forEach((event: any, index: number) => {
        console.log(
          `  ${index + 1}. ${event.type.toUpperCase()} - ${event.path} (${event.timestamp.toISOString()})`
        );
      });
      
      process.exit(0);
    });

  // liaison api commands
  const apiCommand = new Command('api').description('Manage API monitoring endpoints');

  // liaison api list
  apiCommand
    .command('list')
    .description('List all API endpoints')
    .option('--json', 'Output as JSON')
    .action(async options => {
      const spinner = ora('Fetching API endpoints...').start();

      try {
        const agenticWorkflowManager = getAgenticWorkflowManager();
        const endpoints = agenticWorkflowManager.getAPIEndpoints();

        spinner.stop();

        if (options.json) {
          console.log(JSON.stringify(endpoints, null, 2));
        } else {
          console.log(chalk.blue('🔍 API Endpoints:\n'));

          endpoints.forEach((endpoint: APIEndpoint) => {
            const status = endpoint.enabled ? chalk.green('✅ Enabled') : chalk.red('❌ Disabled');
            const lastCheck = endpoint.lastChecked
              ? new Date(endpoint.lastChecked).toLocaleString()
              : 'Never';
            const failures =
              endpoint.consecutiveFailures > 0
                ? chalk.red(`(${endpoint.consecutiveFailures} failures)`)
                : '';

            console.log(chalk.bold(`  ${endpoint.name} (${endpoint.id})`));
            console.log(`    URL: ${endpoint.url}`);
            console.log(`    Method: ${endpoint.method}`);
            console.log(`    Interval: ${endpoint.interval}s`);
            console.log(`    Status: ${status} ${failures}`);
            console.log(`    Last Check: ${lastCheck}`);
            console.log('');
          });
          
          process.exit(0);
        }
      } catch (error) {
        spinner.fail(chalk.red(`Failed to list endpoints: ${error}`));
        process.exit(1);
      }
    });

  // liaison api add
  apiCommand
    .command('add <id> <name> <url>')
    .description('Add a new API endpoint to monitor')
    .option('--method <method>', 'HTTP method (GET, POST, PUT, DELETE)', 'GET')
    .option('--timeout <ms>', 'Request timeout in milliseconds', '5000')
    .option('--interval <seconds>', 'Check interval in seconds', '60')
    .option('--enabled', 'Enable endpoint immediately', false)
    .action(async (id: string, name: string, url: string, options) => {
      const spinner = ora(`Adding API endpoint ${name}...`).start();

      try {
        const endpoint: APIEndpoint = {
          id,
          name,
          url,
          method: options.method as any,
          timeout: parseInt(options.timeout),
          interval: parseInt(options.interval),
          enabled: options.enabled,
          consecutiveFailures: 0,
        };

        const agenticWorkflowManager = getAgenticWorkflowManager();
        agenticWorkflowManager.addAPIEndpoint(endpoint);

        spinner.succeed(chalk.green(`Added API endpoint: ${name}`));
        console.log(chalk.blue(`Endpoint ID: ${id}`));
        console.log(chalk.blue(`URL: ${url}`));
        console.log(chalk.blue(`Status: ${options.enabled ? 'Enabled' : 'Disabled'}`));
      } catch (error) {
        spinner.fail(chalk.red(`Failed to add endpoint: ${error}`));
        process.exit(1);
      }
    });

  // liaison api remove
  apiCommand
    .command('remove <id>')
    .description('Remove an API endpoint')
    .action(async (id: string) => {
      const spinner = ora(`Removing API endpoint ${id}...`).start();

      try {
        const agenticWorkflowManager = getAgenticWorkflowManager();
        agenticWorkflowManager.removeAPIEndpoint(id);
        spinner.succeed(chalk.green(`Removed API endpoint: ${id}`));
      } catch (error) {
        spinner.fail(chalk.red(`Failed to remove endpoint: ${error}`));
        process.exit(1);
      }
    });

  // liaison api enable/disable
  apiCommand
    .command('enable <id>')
    .description('Enable an API endpoint')
    .action(async (id: string) => {
      const spinner = ora(`Enabling API endpoint ${id}...`).start();

      try {
        const agenticWorkflowManager = getAgenticWorkflowManager();
        agenticWorkflowManager.updateAPIEndpoint(id, { enabled: true });
        spinner.succeed(chalk.green(`Enabled API endpoint: ${id}`));
      } catch (error) {
        spinner.fail(chalk.red(`Failed to enable endpoint: ${error}`));
        process.exit(1);
      }
    });

  apiCommand
    .command('disable <id>')
    .description('Disable an API endpoint')
    .action(async (id: string) => {
      const spinner = ora(`Disabling API endpoint ${id}...`).start();

      try {
        const agenticWorkflowManager = getAgenticWorkflowManager();
        agenticWorkflowManager.updateAPIEndpoint(id, { enabled: false });
        spinner.succeed(chalk.green(`Disabled API endpoint: ${id}`));
      } catch (error) {
        spinner.fail(chalk.red(`Failed to disable endpoint: ${error}`));
        process.exit(1);
      }
    });

  // liaison api check
  apiCommand
    .command('check <id>')
    .description('Manually check an API endpoint')
    .action(async (id: string) => {
      const spinner = ora(`Checking API endpoint ${id}...`).start();

      try {
        const agenticWorkflowManager = getAgenticWorkflowManager();
        await agenticWorkflowManager.checkAPIEndpoint(id);
        spinner.succeed(chalk.green(`Checked API endpoint: ${id}`));
      } catch (error) {
        spinner.fail(chalk.red(`Failed to check endpoint: ${error}`));
        process.exit(1);
      }
    });

  // liaison api start/stop
  apiCommand
    .command('start')
    .description('Start API monitoring')
    .action(async () => {
      const spinner = ora('Starting API monitoring...').start();

      try {
        const agenticWorkflowManager = getAgenticWorkflowManager();
        await agenticWorkflowManager.startAPIMonitoring();
        spinner.succeed(chalk.green('API monitoring started'));
      } catch (error) {
        spinner.fail(chalk.red(`Failed to start API monitoring: ${error}`));
        process.exit(1);
      }
    });

  apiCommand
    .command('stop')
    .description('Stop API monitoring')
    .action(async () => {
      const spinner = ora('Stopping API monitoring...').start();

      try {
        const agenticWorkflowManager = getAgenticWorkflowManager();
        await agenticWorkflowManager.stopAPIMonitoring();
        spinner.succeed(chalk.green('API monitoring stopped'));
      } catch (error) {
        spinner.fail(chalk.red(`Failed to stop API monitoring: ${error}`));
        process.exit(1);
      }
    });

  // liaison workflow remove
  command
    .command('remove <name>')
    .description('Remove a workflow with backup')
    .action(async (name) => {
      const spinner = ora('Removing workflow...').start();

      try {
        const workflowsDir = 'config/workflows';
        const workflowPath = join(workflowsDir, `${name}.json`);

        // Check if workflow exists
        try {
          await fs.access(workflowPath);
        } catch {
          spinner.fail(chalk.red(`Workflow '${name}' not found`));
          process.exit(1);
        }

        // Create backup
        const backupDir = join(process.cwd(), '.liaison-backup', 'workflows', new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5));
        await fs.mkdir(backupDir, { recursive: true });
        await fs.cp(workflowPath, join(backupDir, `${name}.json`));

        // Remove workflow
        await fs.unlink(workflowPath);
        spinner.succeed(chalk.green(`✅ Workflow '${name}' removed (backed up to ${backupDir})`));
      } catch (error) {
        spinner.fail(
          chalk.red(
            `Failed to remove workflow: ${error instanceof Error ? error.message : String(error)}`,
          ),
        );
        process.exit(1);
      }
    });

  // Add API command to main workflow program
  command.addCommand(apiCommand);

  return command;
}

export const workflowCommand = createWorkflowCommand();
