import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';

interface RefreshState {
  last_refresh: string | null;
  refresh_count: number;
  last_refresh_success: boolean;
  last_refresh_message: string;
}

export function createRefreshCommand(): Command {
  const command = new Command('refresh')
    .description('Refresh Liaison system state - sync tasks, workflows, and status')
    .action(async () => {
      const spinner = ora('Refreshing Liaison system...').start();

      try {
        const projectRoot = process.cwd();
        const stateFile = join(projectRoot, '.cody', 'local', 'liaison-state.json');

        const previousState = loadState(stateFile);

        spinner.text = 'Checking task sync status...';

        const taskStatus = await checkTaskStatus(projectRoot);
        const workflowStatus = await checkWorkflowStatus(projectRoot);
        const beadsStatus = await checkBeadsStatus(projectRoot);

        const newState: RefreshState = {
          last_refresh: new Date().toISOString(),
          refresh_count: (previousState.refresh_count || 0) + 1,
          last_refresh_success: true,
          last_refresh_message: `Tasks: ${taskStatus.count}, Workflows: ${workflowStatus.count}, Beads: ${beadsStatus.healthy ? 'healthy' : 'issues'}`
        };

        saveState(stateFile, newState);

        spinner.succeed(chalk.green('✅ Refresh complete'));

        console.log(chalk.bold('\n📊 Liaison System Status'));
        console.log(chalk.gray('='.repeat(40)));
        console.log();
        console.log(chalk.blue('Tasks: ') + chalk.cyan(`${taskStatus.count} total`) + (taskStatus.pending > 0 ? chalk.yellow(` (${taskStatus.pending} pending)`) : chalk.green(' (all complete)')));
        console.log(chalk.blue('Workflows: ') + chalk.cyan(`${workflowStatus.count} available`));
        console.log(chalk.blue('Beads: ') + (beadsStatus.healthy ? chalk.green('healthy') : chalk.red('issues detected')));
        console.log();
        console.log(chalk.gray('Last refresh: ') + chalk.cyan(newState.last_refresh || 'never'));
        console.log(chalk.gray('Total refreshes: ') + chalk.cyan(String(newState.refresh_count)));
        console.log();

        if (taskStatus.pending > 0) {
          console.log(chalk.blue('💡 Next: ') + chalk.cyan('liaison task list') + chalk.blue(' to see pending tasks'));
        }

      } catch (error) {
        console.error(chalk.red('Refresh failed:'), error);
        process.exit(1);
      }
    });

  return command;
}

function loadState(path: string): RefreshState {
  if (!existsSync(path)) {
    return { last_refresh: null, refresh_count: 0, last_refresh_success: false, last_refresh_message: 'No previous refresh' };
  }
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return { last_refresh: null, refresh_count: 0, last_refresh_success: false, last_refresh_message: 'Failed to load state' };
  }
}

function saveState(path: string, state: RefreshState): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(state, null, 2));
}

async function checkTaskStatus(projectRoot: string): Promise<{ count: number; pending: number }> {
  const beadsDb = join(projectRoot, '.beads', 'beads.db');
  if (!existsSync(beadsDb)) {
    return { count: 0, pending: 0 };
  }
  const { execSync } = await import('child_process');
  try {
    const output = execSync(`sqlite3 "${beadsDb}" "SELECT COUNT(*) FROM issues WHERE status != 'closed'"`, { encoding: 'utf-8' });
    const pending = parseInt(output.trim()) || 0;
    const total = parseInt(execSync(`sqlite3 "${beadsDb}" "SELECT COUNT(*) FROM issues"`, { encoding: 'utf-8' }).trim()) || 0;
    return { count: total, pending };
  } catch {
    return { count: 0, pending: 0 };
  }
}

async function checkWorkflowStatus(projectRoot: string): Promise<{ count: number }> {
  const workflowsDir = join(projectRoot, 'config', 'workflows');
  if (!existsSync(workflowsDir)) {
    return { count: 0 };
  }
  const { readdirSync } = await import('fs');
  const files = readdirSync(workflowsDir).filter(f => f.endsWith('.json'));
  return { count: files.length };
}

async function checkBeadsStatus(projectRoot: string): Promise<{ healthy: boolean; message: string }> {
  const daemonLock = join(projectRoot, '.beads', 'daemon.lock');
  if (!existsSync(daemonLock)) {
    return { healthy: false, message: 'Daemon not running' };
  }
  return { healthy: true, message: 'Daemon active' };
}
