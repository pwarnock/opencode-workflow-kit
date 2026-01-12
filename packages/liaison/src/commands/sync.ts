import { Command } from 'commander';
import chalk from 'chalk';
import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';

interface SyncStatus {
  gitClean: boolean;
  gitBranch: string;
  gitAhead: number;
  gitBehind: number;
  uncommittedFiles: string[];
  untrackedFiles: string[];
  configFiles: Array<{ path: string; status: string }>;
}

function runGitCommand(args: string): string {
  try {
    return execSync(`git ${args}`, { encoding: 'utf-8', cwd: process.cwd() }).trim();
  } catch {
    return '';
  }
}

async function getConfigFiles(): Promise<Array<{ path: string; status: string }>> {
  const configDir = process.cwd();
  const configs: Array<{ path: string; status: string }> = [];

  const paths = [
    '.claude/config.json',
    '.opencode/config.json',
    '.cursor/settings.json',
    '.windsurfrc'
  ];

  for (const path of paths) {
    const fullPath = join(configDir, path);
    try {
      await fs.access(fullPath);
      const status = runGitCommand(`ls-files --error-unmatch ${path} 2>/dev/null && echo 'tracked' || echo 'untracked'`);
      configs.push({ path, status: status || 'unknown' });
    } catch {
      // File doesn't exist
    }
  }

  return configs;
}

function getGitStatus(): SyncStatus {
  const branch = runGitCommand('rev-parse --abbrev-ref HEAD') || 'unknown';
  const gitStatus = runGitCommand('status --porcelain');
  const isClean = gitStatus.length === 0;

  const uncommitted = gitStatus ? gitStatus.split('\n').filter(l => l.trim()) : [];
  const untrackedFiles = uncommitted.filter(l => l.startsWith('??')).map(l => l.substring(3));
  const modifiedFiles = uncommitted.filter(l => l.startsWith(' M') || l.startsWith('M ')).map(l => l.substring(3));
  const stagedFiles = uncommitted.filter(l => l.startsWith('A ')).map(l => l.substring(3));

  let ahead = 0, behind = 0;
  try {
    const revList = execSync('git rev-list --left-right --count HEAD...@{upstream}', { encoding: 'utf-8' }).trim();
    const [a, b] = revList.split('\t');
    ahead = parseInt(a, 10) || 0;
    behind = parseInt(b, 10) || 0;
  } catch {
    // No upstream or not tracking
  }

  return {
    gitClean: isClean,
    gitBranch: branch,
    gitAhead: ahead,
    gitBehind: behind,
    uncommittedFiles: [...modifiedFiles, ...stagedFiles],
    untrackedFiles,
    configFiles: []
  };
}

export function createGitSyncSubcommands(): Command {
  const command = new Command('sync');

  command.description('Git-based sync workflow for configuration management');

  command
    .command('status')
    .description('Show current sync status')
    .option('-j, --json', 'Output as JSON')
    .action(async (options) => {
      try {
        const status = getGitStatus();
        status.configFiles = await getConfigFiles();

        if (options.json) {
          console.log(JSON.stringify(status, null, 2));
          process.exit(0);
        }

        console.log(chalk.bold('📊 Sync Status\n'));

        console.log(`${chalk.blue('Branch:')} ${status.gitBranch}`);
        console.log(`${chalk.blue('Status:')} ${status.gitClean ? chalk.green('Clean') : chalk.yellow('Uncommitted changes')}`);

        if (status.gitAhead > 0 || status.gitBehind > 0) {
          console.log();
          if (status.gitAhead > 0) {
            console.log(`${chalk.cyan('Ahead:')} ${status.gitAhead} commit${status.gitAhead > 1 ? 's' : ''}`);
          }
          if (status.gitBehind > 0) {
            console.log(`${chalk.cyan('Behind:')} ${status.gitBehind} commit${status.gitBehind > 1 ? 's' : ''}`);
          }
        }

        if (status.uncommittedFiles.length > 0) {
          console.log();
          console.log(chalk.cyan('Modified files:'));
          for (const file of status.uncommittedFiles) {
            console.log(`  ${chalk.yellow('M')} ${file}`);
          }
        }

        if (status.untrackedFiles.length > 0) {
          console.log();
          console.log(chalk.cyan('Untracked files:'));
          for (const file of status.untrackedFiles) {
            console.log(`  ${chalk.gray('?')} ${file}`);
          }
        }

        if (status.configFiles.length > 0) {
          console.log();
          console.log(chalk.cyan('Config files:'));
          for (const config of status.configFiles) {
            const statusIcon = config.status === 'tracked' ? chalk.green('✓') : chalk.gray('?');
            console.log(`  ${statusIcon} ${config.path}`);
          }
        }

        console.log();

        const hasChanges = !status.gitClean || status.untrackedFiles.length > 0;
        if (hasChanges) {
          console.log(chalk.gray('💡 Run "liaison config sync" to commit and sync changes'));
        }

        process.exit(0);

      } catch (error) {
        console.error(chalk.red(`❌ Failed to get sync status: ${error}`));
        process.exit(1);
      }
    });

  command
    .command('diff')
    .description('Show diff of uncommitted changes')
    .option('--cached', 'Show staged changes only')
    .action(async (options) => {
      try {
        const diffArgs = options.cached ? 'diff --cached' : 'diff';
        const diffOutput = runGitCommand(diffArgs);

        if (diffOutput.length === 0) {
          console.log(chalk.yellow('No changes to show'));
          process.exit(0);
        }

        console.log(diffOutput);
        process.exit(0);

      } catch (error) {
        console.error(chalk.red(`❌ Failed to show diff: ${error}`));
        process.exit(1);
      }
    });

  command
    .command('commit')
    .description('Commit uncommitted changes')
    .argument('[message]', 'Commit message', 'Update configurations')
    .action(async (message) => {
      try {
        const status = getGitStatus();

        if (status.uncommittedFiles.length === 0 && status.untrackedFiles.length === 0) {
          console.log(chalk.yellow('No changes to commit'));
          process.exit(0);
        }

        runGitCommand('add -A');
        runGitCommand(`commit -m "${message}"`);

        console.log(chalk.green('✅ Changes committed successfully'));
        process.exit(0);

      } catch (error) {
        console.error(chalk.red(`❌ Failed to commit: ${error}`));
        process.exit(1);
      }
    });

  command
    .command('push')
    .description('Push commits to remote')
    .action(async () => {
      try {
        runGitCommand('push');
        console.log(chalk.green('✅ Pushed successfully'));
        process.exit(0);

      } catch (error) {
        console.error(chalk.red(`❌ Failed to push: ${error}`));
        process.exit(1);
      }
    });

  command
    .command('pull')
    .description('Pull from remote')
    .action(async () => {
      try {
        const output = runGitCommand('pull');
        console.log(output || chalk.green('✅ Pulled successfully'));
        process.exit(0);

      } catch (error) {
        console.error(chalk.red(`❌ Failed to pull: ${error}`));
        process.exit(1);
      }
    });

  command
    .command('fetch')
    .description('Fetch from remote')
    .action(async () => {
      try {
        runGitCommand('fetch');
        console.log(chalk.green('✅ Fetched successfully'));
        process.exit(0);

      } catch (error) {
        console.error(chalk.red(`❌ Failed to fetch: ${error}`));
        process.exit(1);
      }
    });

  command
    .command('branch')
    .description('Show current branch and sync status')
    .action(async () => {
      try {
        const branch = runGitCommand('rev-parse --abbrev-ref HEAD') || 'unknown';
        const upstream = runGitCommand('rev-parse --abbrev-ref @{upstream}') || 'none';
        
        let ahead = 0, behind = 0;
        try {
          const revList = execSync('git rev-list --left-right --count HEAD...@{upstream}', { encoding: 'utf-8' }).trim();
          const [a, b] = revList.split('\t');
          ahead = parseInt(a, 10) || 0;
          behind = parseInt(b, 10) || 0;
        } catch {
          // Not tracking upstream
        }

        console.log(chalk.bold('🌿 Branch Status\n'));
        console.log(`${chalk.blue('Current:')} ${branch}`);
        console.log(`${chalk.blue('Upstream:')} ${upstream}`);

        if (upstream !== 'none') {
          console.log();
          if (ahead === 0 && behind === 0) {
            console.log(chalk.green('✓ Branch is up to date with upstream'));
          } else {
            if (ahead > 0) {
              console.log(`${chalk.cyan('Ahead:')} ${ahead} commit${ahead > 1 ? 's' : ''}`);
            }
            if (behind > 0) {
              console.log(`${chalk.red('Behind:')} ${behind} commit${behind > 1 ? 's' : ''}`);
            }
          }
        } else {
          console.log(chalk.yellow('⚠️  No upstream configured'));
        }

        console.log();
        process.exit(0);

      } catch (error) {
        console.error(chalk.red(`❌ Failed to show branch: ${error}`));
        process.exit(1);
      }
    });

  return command;
}

export function createConfigSyncSubcommand(): Command {
  const command = new Command('sync');

  command.description('Git-based sync workflow for configuration files');

  command
    .command('status')
    .description('Show current sync status')
    .option('-j, --json', 'Output as JSON')
    .action(async (options) => {
      try {
        const status = getGitStatus();
        status.configFiles = await getConfigFiles();

        if (options.json) {
          console.log(JSON.stringify(status, null, 2));
          process.exit(0);
        }

        console.log(chalk.bold('📊 Sync Status\n'));

        console.log(`${chalk.blue('Branch:')} ${status.gitBranch}`);
        console.log(`${chalk.blue('Status:')} ${status.gitClean ? chalk.green('Clean') : chalk.yellow('Uncommitted changes')}`);

        if (status.gitAhead > 0 || status.gitBehind > 0) {
          console.log();
          if (status.gitAhead > 0) {
            console.log(`${chalk.cyan('Ahead:')} ${status.gitAhead} commit${status.gitAhead > 1 ? 's' : ''}`);
          }
          if (status.gitBehind > 0) {
            console.log(`${chalk.cyan('Behind:')} ${status.gitBehind} commit${status.gitBehind > 1 ? 's' : ''}`);
          }
        }

        if (status.uncommittedFiles.length > 0) {
          console.log();
          console.log(chalk.cyan('Modified files:'));
          for (const file of status.uncommittedFiles) {
            console.log(`  ${chalk.yellow('M')} ${file}`);
          }
        }

        if (status.untrackedFiles.length > 0) {
          console.log();
          console.log(chalk.cyan('Untracked files:'));
          for (const file of status.untrackedFiles) {
            console.log(`  ${chalk.gray('?')} ${file}`);
          }
        }

        if (status.configFiles.length > 0) {
          console.log();
          console.log(chalk.cyan('Config files:'));
          for (const config of status.configFiles) {
            const statusIcon = config.status === 'tracked' ? chalk.green('✓') : chalk.gray('?');
            console.log(`  ${statusIcon} ${config.path}`);
          }
        }

        console.log();

        const hasChanges = !status.gitClean || status.untrackedFiles.length > 0;
        if (hasChanges) {
          console.log(chalk.gray('💡 Run "liaison config sync" to commit and sync changes'));
        }

        process.exit(0);

      } catch (error) {
        console.error(chalk.red(`❌ Failed to get sync status: ${error}`));
        process.exit(1);
      }
    });

  command
    .command('diff')
    .description('Show diff of uncommitted changes')
    .option('--cached', 'Show staged changes only')
    .action(async (options) => {
      try {
        const diffArgs = options.cached ? 'diff --cached' : 'diff';
        const diffOutput = runGitCommand(diffArgs);

        if (diffOutput.length === 0) {
          console.log(chalk.yellow('No changes to show'));
          process.exit(0);
        }

        console.log(diffOutput);
        process.exit(0);

      } catch (error) {
        console.error(chalk.red(`❌ Failed to show diff: ${error}`));
        process.exit(1);
      }
    });

  command
    .command('commit')
    .description('Commit uncommitted changes')
    .argument('[message]', 'Commit message', 'Update configurations')
    .action(async (message) => {
      try {
        const status = getGitStatus();

        if (status.uncommittedFiles.length === 0 && status.untrackedFiles.length === 0) {
          console.log(chalk.yellow('No changes to commit'));
          process.exit(0);
        }

        runGitCommand('add -A');
        runGitCommand(`commit -m "${message}"`);

        console.log(chalk.green('✅ Changes committed successfully'));
        process.exit(0);

      } catch (error) {
        console.error(chalk.red(`❌ Failed to commit: ${error}`));
        process.exit(1);
      }
    });

  command
    .command('push')
    .description('Push commits to remote')
    .action(async () => {
      try {
        runGitCommand('push');
        console.log(chalk.green('✅ Pushed successfully'));
        process.exit(0);

      } catch (error) {
        console.error(chalk.red(`❌ Failed to push: ${error}`));
        process.exit(1);
      }
    });

  command
    .command('pull')
    .description('Pull from remote')
    .action(async () => {
      try {
        const output = runGitCommand('pull');
        console.log(output || chalk.green('✅ Pulled successfully'));
        process.exit(0);

      } catch (error) {
        console.error(chalk.red(`❌ Failed to pull: ${error}`));
        process.exit(1);
      }
    });

  command
    .command('fetch')
    .description('Fetch from remote')
    .action(async () => {
      try {
        runGitCommand('fetch');
        console.log(chalk.green('✅ Fetched successfully'));
        process.exit(0);

      } catch (error) {
        console.error(chalk.red(`❌ Failed to fetch: ${error}`));
        process.exit(1);
      }
    });

  command
    .command('branch')
    .description('Show current branch and sync status')
    .action(async () => {
      try {
        const branch = runGitCommand('rev-parse --abbrev-ref HEAD') || 'unknown';
        const upstream = runGitCommand('rev-parse --abbrev-ref @{upstream}') || 'none';
        
        let ahead = 0, behind = 0;
        try {
          const revList = execSync('git rev-list --left-right --count HEAD...@{upstream}', { encoding: 'utf-8' }).trim();
          const [a, b] = revList.split('\t');
          ahead = parseInt(a, 10) || 0;
          behind = parseInt(b, 10) || 0;
        } catch {
          // Not tracking upstream
        }

        console.log(chalk.bold('🌿 Branch Status\n'));
        console.log(`${chalk.blue('Current:')} ${branch}`);
        console.log(`${chalk.blue('Upstream:')} ${upstream}`);

        if (upstream !== 'none') {
          console.log();
          if (ahead === 0 && behind === 0) {
            console.log(chalk.green('✓ Branch is up to date with upstream'));
          } else {
            if (ahead > 0) {
              console.log(`${chalk.cyan('Ahead:')} ${ahead} commit${ahead > 1 ? 's' : ''}`);
            }
            if (behind > 0) {
              console.log(`${chalk.red('Behind:')} ${behind} commit${behind > 1 ? 's' : ''}`);
            }
          }
        } else {
          console.log(chalk.yellow('⚠️  No upstream configured'));
        }

        console.log();
        process.exit(0);

      } catch (error) {
        console.error(chalk.red(`❌ Failed to show branch: ${error}`));
        process.exit(1);
      }
    });

  return command;
}

export const gitSyncSubcommands = createGitSyncSubcommands();
export const configSyncSubcommand = createConfigSyncSubcommand();
