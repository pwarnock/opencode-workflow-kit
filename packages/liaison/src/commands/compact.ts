/**
 * Compact Command
 * CLI command: liaison compact
 * Memory decay / compaction for old closed issues
 *
 * Beads v0.40+ supports compacting old closed issues by replacing
 * their detailed content with AI-generated summaries. This reduces
 * context window usage while preserving the dependency structure.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { BeadsAdapter, spawnPromise } from '../reconciler/adapters/beads-adapter';

interface CompactCandidate {
  id: string;
  title: string;
  closedAt: string;
  daysOld: number;
  contentLength: number;
  description: string;
}

export function createCompactCommand(): Command {
  const command = new Command('compact');

  command.description('Memory decay / compaction for old closed issues');

  // liaison compact --analyze
  command
    .command('analyze')
    .description('Find issues eligible for compaction')
    .option('--days <n>', 'Minimum days since closed', '30')
    .option('--limit <n>', 'Maximum number of candidates', '20')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const spinner = ora('Analyzing issues for compaction...').start();

      try {
        const result = await spawnPromise('bun', [
          'x', 'bd', 'compact', '--analyze', '--json',
          `--days=${options.days}`,
          `--limit=${options.limit}`,
        ], { timeoutMs: 30000 });

        if (result.exitCode !== 0) {
          spinner.fail(chalk.red('Failed to analyze issues'));
          console.error(result.stderr);
          process.exit(1);
        }

        const candidates: CompactCandidate[] = JSON.parse(result.stdout);

        if (options.json) {
          spinner.stop();
          console.log(JSON.stringify(candidates, null, 2));
        } else {
          spinner.stop();
          if (candidates.length === 0) {
            console.log(chalk.green('\n✅ No issues eligible for compaction\n'));
            console.log(chalk.gray(`  (Issues must be closed for ${options.days}+ days)\n`));
            process.exit(0);
          }

          console.log(chalk.blue(`\n📦 Compaction Candidates (${candidates.length})\n`));
          console.log(chalk.gray(`  Issues closed more than ${options.days} days ago\n`));

          console.log(
            chalk.bold(
              'ID'.padEnd(12) + ' | Title'.padEnd(35) + ' | Age'.padEnd(10) + ' | Size'
            )
          );
          console.log(chalk.gray('-'.repeat(70)));

          let totalBytes = 0;
          candidates.forEach((c) => {
            totalBytes += c.contentLength;
            console.log(
              c.id.padEnd(12) +
              ' | ' +
              (c.title.length > 32 ? c.title.substring(0, 32) + '...' : c.title).padEnd(35) +
              ' | ' +
              `${c.daysOld}d`.padEnd(10) +
              ' | ' +
              formatBytes(c.contentLength)
            );
          });

          console.log(chalk.gray('-'.repeat(70)));
          console.log(chalk.bold(`  Total: ${candidates.length} issues, ${formatBytes(totalBytes)} of content`));
          console.log();
          console.log(chalk.gray('  Run `liaison compact apply` to compact these issues'));
          console.log();
        }
        process.exit(0);
      } catch (error) {
        spinner.fail(chalk.red(`Failed to analyze: ${error}`));
        process.exit(1);
      }
    });

  // liaison compact apply
  command
    .command('apply')
    .description('Compact an issue with a summary')
    .requiredOption('--id <id>', 'Issue ID to compact')
    .requiredOption('--summary <text>', 'Summary to replace content')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const spinner = ora(`Compacting issue ${options.id}...`).start();

      try {
        const result = await spawnPromise('bun', [
          'x', 'bd', 'compact', '--apply',
          `--id=${options.id}`,
          `--summary=${options.summary}`,
        ], { timeoutMs: 10000 });

        if (result.exitCode !== 0) {
          spinner.fail(chalk.red('Failed to compact issue'));
          console.error(result.stderr);
          process.exit(1);
        }

        if (options.json) {
          spinner.stop();
          console.log(JSON.stringify({
            success: true,
            id: options.id,
            summary: options.summary,
          }, null, 2));
        } else {
          spinner.succeed(chalk.green(`Issue compacted: ${options.id}`));
          console.log(chalk.gray(`  Summary: ${options.summary.substring(0, 60)}...`));
          console.log();
        }
        process.exit(0);
      } catch (error) {
        spinner.fail(chalk.red(`Failed to compact: ${error}`));
        process.exit(1);
      }
    });

  // liaison compact auto
  command
    .command('auto')
    .description('Automatically compact old issues (requires AI summarization)')
    .option('--days <n>', 'Minimum days since closed', '30')
    .option('--limit <n>', 'Maximum number to compact', '10')
    .option('--dry-run', 'Preview without applying')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const spinner = ora('Finding issues to compact...').start();

      try {
        // First, get candidates
        const analyzeResult = await spawnPromise('bun', [
          'x', 'bd', 'compact', '--analyze', '--json',
          `--days=${options.days}`,
          `--limit=${options.limit}`,
        ], { timeoutMs: 30000 });

        if (analyzeResult.exitCode !== 0) {
          spinner.fail(chalk.red('Failed to analyze issues'));
          process.exit(1);
        }

        const candidates: CompactCandidate[] = JSON.parse(analyzeResult.stdout);

        if (candidates.length === 0) {
          spinner.succeed(chalk.green('No issues to compact'));
          process.exit(0);
        }

        spinner.text = `Found ${candidates.length} candidates`;

        if (options.dryRun) {
          spinner.stop();
          console.log(chalk.yellow('\n🔍 Dry Run - No changes will be made\n'));

          candidates.forEach((c) => {
            console.log(chalk.cyan(`  ${c.id}: ${c.title}`));
            console.log(chalk.gray(`    Would summarize ${formatBytes(c.contentLength)} of content`));
          });

          console.log();
          console.log(chalk.gray('  Remove --dry-run to apply compaction'));
          console.log();

          if (options.json) {
            console.log(JSON.stringify({
              dryRun: true,
              candidates: candidates.length,
              issues: candidates.map((c) => c.id),
            }, null, 2));
          }
          process.exit(0);
        }

        // Compact each issue
        // Note: In a real implementation, this would use AI to generate summaries
        // For now, we generate a basic summary from the title and metadata
        const results: Array<{ id: string; success: boolean; error?: string }> = [];

        for (const candidate of candidates) {
          spinner.text = `Compacting ${candidate.id}...`;

          // Generate a basic summary (in production, use AI)
          const summary = `[Compacted] ${candidate.title} - Closed ${candidate.daysOld} days ago.`;

          try {
            const compactResult = await spawnPromise('bun', [
              'x', 'bd', 'compact', '--apply',
              `--id=${candidate.id}`,
              `--summary=${summary}`,
            ], { timeoutMs: 10000 });

            results.push({
              id: candidate.id,
              success: compactResult.exitCode === 0,
              error: compactResult.exitCode !== 0 ? compactResult.stderr : undefined,
            });
          } catch (error) {
            results.push({
              id: candidate.id,
              success: false,
              error: String(error),
            });
          }
        }

        const successCount = results.filter((r) => r.success).length;
        const failCount = results.filter((r) => !r.success).length;

        if (options.json) {
          spinner.stop();
          console.log(JSON.stringify({
            success: failCount === 0,
            compacted: successCount,
            failed: failCount,
            results,
          }, null, 2));
        } else {
          if (failCount === 0) {
            spinner.succeed(chalk.green(`Compacted ${successCount} issues`));
          } else {
            spinner.warn(chalk.yellow(`Compacted ${successCount} issues, ${failCount} failed`));
          }
          console.log();
        }
        process.exit(failCount > 0 ? 1 : 0);
      } catch (error) {
        spinner.fail(chalk.red(`Failed to compact: ${error}`));
        process.exit(1);
      }
    });

  // liaison compact stats
  command
    .command('stats')
    .description('Show compaction statistics')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const spinner = ora('Gathering compaction stats...').start();

      try {
        const adapter = new BeadsAdapter(true);

        // Get all tasks to calculate stats
        const allTasks = await adapter.listTasks();
        const closedTasks = allTasks.filter((t) => t.status === 'closed');

        // Estimate compaction potential
        const now = new Date();
        const oldClosed = closedTasks.filter((t) => {
          if (!t.closedAt) return false;
          const daysOld = (now.getTime() - t.closedAt.getTime()) / (1000 * 60 * 60 * 24);
          return daysOld > 30;
        });

        const stats = {
          totalIssues: allTasks.length,
          closedIssues: closedTasks.length,
          eligibleForCompaction: oldClosed.length,
          estimatedSavings: oldClosed.length * 500, // Rough estimate: 500 bytes per issue
        };

        if (options.json) {
          spinner.stop();
          console.log(JSON.stringify(stats, null, 2));
        } else {
          spinner.succeed(chalk.green('Compaction Statistics'));
          console.log();
          console.log(`  Total Issues:      ${chalk.cyan(stats.totalIssues)}`);
          console.log(`  Closed Issues:     ${chalk.cyan(stats.closedIssues)}`);
          console.log(`  Eligible (30d+):   ${chalk.yellow(stats.eligibleForCompaction)}`);
          console.log(`  Est. Savings:      ${chalk.green(formatBytes(stats.estimatedSavings))}`);
          console.log();

          if (stats.eligibleForCompaction > 0) {
            console.log(chalk.gray('  Run `liaison compact analyze` to see details'));
          }
          console.log();
        }
        process.exit(0);
      } catch (error) {
        spinner.fail(chalk.red(`Failed to get stats: ${error}`));
        process.exit(1);
      }
    });

  return command;
}

/**
 * Format bytes as human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const compactCommand = createCompactCommand();
