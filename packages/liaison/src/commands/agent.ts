/**
 * Agent Command
 * CLI command: liaison agent
 * Multi-agent coordination via Beads Agent Mail
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { getAgentMailClient, AgentMailClient } from '../agent-mail-client';
import { BeadsAdapter } from '../reconciler/adapters/beads-adapter';
import { TaskStatus } from '../reconciler/types';

export function createAgentCommand(): Command {
  const command = new Command('agent');

  command.description('Multi-agent coordination via Beads Agent Mail');

  // liaison agent status
  command
    .command('status')
    .description('Show Agent Mail status and configuration')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const spinner = ora('Checking Agent Mail status...').start();

      try {
        const client = getAgentMailClient();
        const config = client.getConfig();
        const available = await client.isAvailable();

        if (options.json) {
          spinner.stop();
          console.log(JSON.stringify({
            available,
            config: {
              url: config.url || null,
              agentName: config.agentName,
              projectId: config.projectId,
              enabled: config.enabled,
            },
          }, null, 2));
        } else {
          spinner.stop();
          console.log(chalk.blue('\n📡 Agent Mail Status\n'));

          if (available) {
            console.log(`  Status:     ${chalk.green('Connected')}`);
          } else if (config.enabled) {
            console.log(`  Status:     ${chalk.yellow('Configured but not reachable')}`);
          } else {
            console.log(`  Status:     ${chalk.gray('Not configured')}`);
          }

          console.log(`  URL:        ${config.url ? chalk.cyan(config.url) : chalk.gray('(not set)')}`);
          console.log(`  Agent Name: ${chalk.cyan(config.agentName)}`);
          console.log(`  Project ID: ${chalk.cyan(config.projectId)}`);
          console.log(`  Enabled:    ${config.enabled ? chalk.green('Yes') : chalk.gray('No')}`);

          if (!config.enabled) {
            console.log(chalk.gray('\n  To enable Agent Mail, set environment variables:'));
            console.log(chalk.gray('    export BEADS_AGENT_MAIL_URL=http://127.0.0.1:8765'));
            console.log(chalk.gray('    export BEADS_AGENT_NAME=my-agent'));
            console.log(chalk.gray('    export BEADS_PROJECT_ID=my-project'));
          }

          console.log();
        }
        process.exit(0);
      } catch (error) {
        spinner.fail(chalk.red(`Failed to get status: ${error}`));
        process.exit(1);
      }
    });

  // liaison agent reservations
  command
    .command('reservations')
    .description('List active task reservations')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const spinner = ora('Fetching reservations...').start();

      try {
        const client = getAgentMailClient();
        const available = await client.isAvailable();

        if (!available) {
          spinner.warn(chalk.yellow('Agent Mail not available'));
          if (options.json) {
            console.log(JSON.stringify({ reservations: [], error: 'Agent Mail not available' }, null, 2));
          } else {
            console.log(chalk.gray('\nTo enable Agent Mail, configure BEADS_AGENT_MAIL_URL\n'));
          }
          process.exit(0);
        }

        const reservations = await client.listReservations();

        if (options.json) {
          spinner.stop();
          console.log(JSON.stringify({ reservations }, null, 2));
        } else {
          spinner.stop();
          if (reservations.length === 0) {
            console.log(chalk.green('\n✅ No active reservations\n'));
            process.exit(0);
          }

          console.log(chalk.blue(`\n🔒 Active Reservations (${reservations.length})\n`));
          console.log(
            chalk.bold(
              'Task ID'.padEnd(15) + ' | Agent'.padEnd(25) + ' | Reserved At'
            )
          );
          console.log(chalk.gray('-'.repeat(60)));

          reservations.forEach((r) => {
            const timeAgo = formatTimeAgo(r.reservedAt);
            console.log(
              r.taskId.padEnd(15) +
              ' | ' +
              r.agentName.padEnd(25) +
              ' | ' +
              timeAgo
            );
          });
          console.log();
        }
        process.exit(0);
      } catch (error) {
        spinner.fail(chalk.red(`Failed to get reservations: ${error}`));
        process.exit(1);
      }
    });

  // liaison agent claim
  command
    .command('claim <taskId>')
    .description('Claim a task (reserve via Agent Mail + update status)')
    .option('--json', 'Output as JSON')
    .action(async (taskId: string, options) => {
      const spinner = ora(`Claiming task ${taskId}...`).start();

      try {
        const client = getAgentMailClient();
        const adapter = new BeadsAdapter(true);

        // Check Agent Mail availability
        const agentMailAvailable = await client.isAvailable();

        if (agentMailAvailable) {
          // Try to reserve via Agent Mail first (fast path)
          const reservation = await client.reserve(taskId);

          if (!reservation.success) {
            spinner.fail(chalk.red(`Task already claimed: ${reservation.error}`));
            if (options.json) {
              console.log(JSON.stringify(reservation, null, 2));
            }
            process.exit(1);
          }
        }

        // Update task status in Beads (use Open since there's no 'in_progress' in TaskStatus enum)
        const task = await adapter.updateTaskStatus(taskId, TaskStatus.Open);

        if (options.json) {
          spinner.stop();
          console.log(JSON.stringify({
            success: true,
            taskId,
            agentMailReserved: agentMailAvailable,
            task,
          }, null, 2));
        } else {
          spinner.succeed(chalk.green(`Task claimed: ${taskId}`));
          if (agentMailAvailable) {
            console.log(chalk.gray('  (Reserved via Agent Mail for collision prevention)'));
          } else {
            console.log(chalk.gray('  (Agent Mail not available - using git-based coordination)'));
          }
          console.log();
        }
        process.exit(0);
      } catch (error) {
        spinner.fail(chalk.red(`Failed to claim task: ${error}`));
        process.exit(1);
      }
    });

  // liaison agent release
  command
    .command('release <taskId>')
    .description('Release a task reservation')
    .option('--close', 'Also close the task')
    .option('--json', 'Output as JSON')
    .action(async (taskId: string, options) => {
      const spinner = ora(`Releasing task ${taskId}...`).start();

      try {
        const client = getAgentMailClient();
        const adapter = new BeadsAdapter(true);

        // Release Agent Mail reservation
        await client.release(taskId);

        // Optionally close the task
        if (options.close) {
          await adapter.updateTaskStatus(taskId, TaskStatus.Closed);
        }

        if (options.json) {
          spinner.stop();
          console.log(JSON.stringify({
            success: true,
            taskId,
            closed: options.close || false,
          }, null, 2));
        } else {
          if (options.close) {
            spinner.succeed(chalk.green(`Task released and closed: ${taskId}`));
          } else {
            spinner.succeed(chalk.green(`Task released: ${taskId}`));
          }
          console.log();
        }
        process.exit(0);
      } catch (error) {
        spinner.fail(chalk.red(`Failed to release task: ${error}`));
        process.exit(1);
      }
    });

  // liaison agent check
  command
    .command('check <taskId>')
    .description('Check if a task is reserved')
    .option('--json', 'Output as JSON')
    .action(async (taskId: string, options) => {
      const spinner = ora(`Checking reservation for ${taskId}...`).start();

      try {
        const client = getAgentMailClient();
        const reservation = await client.checkReservation(taskId);

        if (options.json) {
          spinner.stop();
          console.log(JSON.stringify({
            taskId,
            reserved: !!reservation,
            reservation,
          }, null, 2));
        } else {
          spinner.stop();
          if (reservation) {
            const timeAgo = formatTimeAgo(reservation.reservedAt);
            console.log(chalk.yellow(`\n🔒 Task ${taskId} is reserved\n`));
            console.log(`  Agent:       ${chalk.cyan(reservation.agentName)}`);
            console.log(`  Reserved:    ${timeAgo}`);
            if (reservation.expiresAt) {
              console.log(`  Expires:     ${reservation.expiresAt.toISOString()}`);
            }
          } else {
            console.log(chalk.green(`\n✅ Task ${taskId} is available\n`));
          }
          console.log();
        }
        process.exit(0);
      } catch (error) {
        spinner.fail(chalk.red(`Failed to check reservation: ${error}`));
        process.exit(1);
      }
    });

  return command;
}

/**
 * Format a date as relative time (e.g., "5 minutes ago")
 */
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

export const agentCommand = createAgentCommand();
