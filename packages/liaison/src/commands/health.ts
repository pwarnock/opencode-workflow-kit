/**
 * Health Check Command for Liaison Core
 * Comprehensive system health monitoring with parallel execution and structured output
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { spawn } from 'child_process';
import { promisify } from 'util';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { exec as execCallback } from 'child_process';

const exec = promisify(execCallback);

interface HealthResult {
  component: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  score: number;
  details: Record<string, HealthDetail>;
  issues: string[];
}

type HealthDetail =
  | string
  | number
  | boolean
  | { status: string; version?: string; error?: string; message?: string }
  | Record<string, unknown>;

interface OverallHealth {
  timestamp: string;
  git_commit: string;
  overall: 'healthy' | 'degraded' | 'unhealthy';
  score: number;
  execution: {
    mode: 'parallel' | 'sequential';
    duration_ms: number;
    cache_hit: boolean;
  };
  components: Record<string, HealthResult>;
  issues: string[];
  recommendations: string[];
  metadata: {
    components_checked: number;
    failed_components: number;
    cache_dir: string;
  };
}

class HealthChecker {
  private cacheDir: string;
  private parallel: boolean;

  constructor(
    cacheDir: string = '/tmp/liaison-health',
    parallel: boolean = true
  ) {
    this.cacheDir = cacheDir;
    this.parallel = parallel;
  }

  async getCacheKey(): Promise<string> {
    try {
      const { stdout: gitHash } = await exec('git rev-parse HEAD');
      const { stdout: timestamp } = await exec('git log -1 --format=%ct');
      return `health-${gitHash.trim()}-${timestamp.trim()}`;
    } catch {
      return `health-no-git-${Date.now()}`;
    }
  }

  async isCacheValid(): Promise<boolean> {
    try {
      const cacheFile = join(this.cacheDir, `${await this.getCacheKey()}.json`);
      if (!existsSync(cacheFile)) return false;

      const stats = await import('fs').then((fs) =>
        fs.promises.stat(cacheFile)
      );
      const fileAge = (Date.now() - stats.mtime.getTime()) / 1000;
      return fileAge < 300; // 5 minutes
    } catch {
      return false;
    }
  }

  async getCachedResult(): Promise<OverallHealth | null> {
    try {
      const cacheFile = join(this.cacheDir, `${await this.getCacheKey()}.json`);
      if (existsSync(cacheFile)) {
        const content = await readFile(cacheFile, 'utf-8');
        return JSON.parse(content);
      }
    } catch {
      // Ignore cache errors
    }
    return null;
  }

  async cacheResult(result: OverallHealth): Promise<void> {
    try {
      await mkdir(this.cacheDir, { recursive: true });
      const cacheFile = join(this.cacheDir, `${await this.getCacheKey()}.json`);
      await writeFile(cacheFile, JSON.stringify(result, null, 2));
    } catch {
      // Ignore cache errors
    }
  }

  async runCommand(
    cmd: string[]
  ): Promise<{ stdout: string; stderr: string; returnCode: number }> {
    return new Promise((resolve) => {
      const child = spawn(cmd[0], cmd.slice(1), {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 10000,
        cwd: process.cwd().replace(/\/packages\/liaison$/, ''), // Run from project root
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => (stdout += data));
      child.stderr?.on('data', (data) => (stderr += data));

      child.on('close', (code) => {
        resolve({ stdout, stderr, returnCode: code || 0 });
      });

      child.on('error', () => {
        resolve({ stdout: '', stderr: 'Command not found', returnCode: 1 });
      });
    });
  }

  async checkCore(): Promise<HealthResult> {
    const result: HealthResult = {
      component: 'core',
      status: 'healthy',
      score: 100,
      details: {},
      issues: [],
    };

    // Check Python
    const pythonResult = await this.runCommand(['python3', '--version']);
    if (pythonResult.returnCode === 0) {
      result.details.python = {
        status: 'healthy',
        version: pythonResult.stdout.trim(),
      };
    } else {
      result.details.python = {
        status: 'unhealthy',
        error: 'Python not found',
      };
      result.issues.push('Python not found');
      result.score -= 25;
    }

    // Check UV
    const uvResult = await this.runCommand(['uv', '--version']);
    if (uvResult.returnCode === 0) {
      result.details.uv = {
        status: 'healthy',
        version: uvResult.stdout.trim(),
      };
    } else {
      result.details.uv = {
        status: 'unhealthy',
        error: 'UV not found',
      };
      result.issues.push('UV not found');
      result.score -= 25;
    }

    // Check Node.js
    const nodeResult = await this.runCommand(['node', '--version']);
    if (nodeResult.returnCode === 0) {
      result.details.node = {
        status: 'healthy',
        version: nodeResult.stdout.trim(),
      };
    } else {
      result.details.node = {
        status: 'unhealthy',
        error: 'Node.js not found',
      };
      result.issues.push('Node.js not found');
      result.score -= 25;
    }

    // Check Bun
    const bunResult = await this.runCommand(['bun', '--version']);
    if (bunResult.returnCode === 0) {
      result.details.bun = {
        status: 'healthy',
        version: bunResult.stdout.trim(),
      };
    } else {
      result.details.bun = {
        status: 'unhealthy',
        error: 'Bun not found',
      };
      result.issues.push('Bun not found');
      result.score -= 25;
    }

    return result;
  }

  async checkDependencies(): Promise<HealthResult> {
    const result: HealthResult = {
      component: 'dependencies',
      status: 'healthy',
      score: 100,
      details: {},
      issues: [],
    };

    // Check TypeScript
    const tscResult = await this.runCommand(['npx', 'tsc', '--version']);
    if (tscResult.returnCode === 0) {
      result.details.typescript = {
        status: 'healthy',
        version: tscResult.stdout.trim(),
      };
    } else {
      result.details.typescript = {
        status: 'unhealthy',
        error: 'TypeScript not available',
      };
      result.issues.push('TypeScript not available');
      result.score -= 20;
    }

    // Check package.json dependencies
    if (existsSync('package.json')) {
      const installResult = await this.runCommand([
        'bun',
        'install',
        '--dry-run',
      ]);
      if (installResult.returnCode === 0) {
        result.details.package_deps = {
          status: 'healthy',
          message: 'Dependencies OK',
        };
      } else {
        result.details.package_deps = {
          status: 'unhealthy',
          error: 'Package dependencies may be broken',
        };
        result.issues.push('Package dependencies may be broken');
        result.score -= 30;
      }
    } else {
      result.details.package_deps = {
        status: 'unhealthy',
        error: 'package.json not found',
      };
      result.issues.push('package.json not found');
      result.score -= 20;
    }

    // Check Python dependencies
    if (existsSync('pyproject.toml')) {
      const checkResult = await this.runCommand(['uv', 'pip', 'check']);
      if (checkResult.returnCode === 0) {
        result.details.python_deps = {
          status: 'healthy',
          message: 'Python dependencies OK',
        };
      } else {
        result.details.python_deps = {
          status: 'unhealthy',
          error: 'Python dependencies may be broken',
        };
        result.issues.push('Python dependencies may be broken');
        result.score -= 30;
      }
    } else {
      result.details.python_deps = {
        status: 'unknown',
        message: 'No Python project',
      };
    }

    return result;
  }

  async checkSync(): Promise<HealthResult> {
    const result: HealthResult = {
      component: 'sync',
      status: 'healthy',
      score: 100,
      details: {},
      issues: [],
    };

    // Check sync state file
    const projectRoot = process.cwd().replace(/\/packages\/liaison$/, '');
    const syncFile = join(projectRoot, '.beads-cody-sync-state.json');
    if (existsSync(syncFile)) {
      try {
        const content = await readFile(syncFile, 'utf-8');
        const syncData = JSON.parse(content);

        const lastSync = syncData.last_sync || 'unknown';
        const lastSuccess = syncData.last_refresh_success || false;

        result.details.last_sync = lastSync;
        result.details.last_success = lastSuccess;

        if (lastSuccess) {
          result.details.sync_status = 'healthy';
        } else {
          result.details.sync_status = 'unhealthy';
          result.issues.push('Last sync failed');
          result.score -= 40;
        }

        // Check sync age (warn if > 2 hours)
        try {
          const syncTime = new Date(lastSync);
          const ageHours = (Date.now() - syncTime.getTime()) / (1000 * 60 * 60);
          if (ageHours > 2) {
            result.issues.push(`Sync is ${Math.floor(ageHours)} hours old`);
            result.score -= 20;
          }
        } catch {
          // Ignore date parsing errors
        }
      } catch {
        result.details.sync_status = 'unhealthy';
        result.details.error = 'Invalid sync state file';
        result.issues.push('Invalid sync state file');
        result.score -= 50;
      }
    } else {
      result.details.sync_status = 'unknown';
      result.details.error = 'No sync state file';
      result.issues.push('No sync state file found');
      result.score -= 50;
    }

    // Check Beads availability
    const beadsResult = await this.runCommand(['bd', '--version']);
    if (beadsResult.returnCode === 0) {
      result.details.beads = {
        status: 'healthy',
        message: 'Beads available',
      };
    } else {
      const bunBeadsResult = await this.runCommand([
        'bun',
        'x',
        'bd',
        '--version',
      ]);
      if (bunBeadsResult.returnCode === 0) {
        result.details.beads = {
          status: 'healthy',
          message: 'Beads available via bun x',
        };
      } else {
        result.details.beads = {
          status: 'unhealthy',
          error: 'Beads not available',
        };
        result.issues.push('Beads not available');
        result.score -= 30;
      }
    }

    return result;
  }

  async checkConfig(): Promise<HealthResult> {
    const result: HealthResult = {
      component: 'config',
      status: 'healthy',
      score: 100,
      details: {},
      issues: [],
    };

    // Check justfile
    const projectRoot = process.cwd().replace(/\/packages\/liaison$/, '');
    if (existsSync(join(projectRoot, 'justfile'))) {
      const justResult = await this.runCommand(['just', '--version']);
      if (justResult.returnCode === 0) {
        result.details.justfile = {
          status: 'healthy',
          message: 'justfile found',
        };
      } else {
        result.details.justfile = {
          status: 'degraded',
          error: 'Just not installed',
        };
        result.issues.push('Just not installed');
        result.score -= 20;
      }
    } else {
      result.details.justfile = {
        status: 'unhealthy',
        error: 'justfile not found',
      };
      result.issues.push('justfile not found');
      result.score -= 30;
    }

    return result;
  }

  async checkCoordinator(): Promise<HealthResult> {
    const result: HealthResult = {
      component: 'coordinator',
      status: 'healthy',
      score: 100,
      details: {},
      issues: [],
    };

    // Check if coordinator binary exists
    const projectRoot = process.cwd().replace(/\/packages\/liaison$/, '');
    const coordinatorPath = join(
      projectRoot,
      'packages/liaison-coordinator/bin/liaison.js'
    );
    if (existsSync(coordinatorPath)) {
      const healthResult = await this.runCommand([
        'node',
        coordinatorPath,
        'health',
        '--format=json',
      ]);

      if (healthResult.returnCode === 0) {
        try {
          const outputLines = healthResult.stdout.trim().split('\n');
          let jsonLine = '';
          for (const line of outputLines) {
            if (line.trim().startsWith('{')) {
              jsonLine = line.trim();
              break;
            }
          }

          if (jsonLine) {
            const coordinatorData = JSON.parse(jsonLine);
            const coordinatorStatus = coordinatorData.overall || 'healthy';
            result.details.coordinator_health = coordinatorStatus;
            result.details.coordinator_data = coordinatorData;

            if (coordinatorStatus !== 'healthy') {
              result.issues.push(`Coordinator reports ${coordinatorStatus}`);
              result.score -= 30;
            }
          } else {
            result.details.coordinator_health = 'unhealthy';
            result.details.error = 'No JSON found in coordinator response';
            result.issues.push('No JSON found in coordinator response');
            result.score -= 50;
          }
        } catch (error) {
          result.details.coordinator_health = 'unhealthy';
          result.details.error = `JSON decode error: ${error}`;
          result.details.raw_output = healthResult.stdout;
          result.issues.push('Invalid coordinator response');
          result.score -= 50;
        }
      } else {
        result.details.coordinator_health = 'unhealthy';
        result.details.error = 'Health check failed';
        result.details.stderr = healthResult.stderr;
        result.issues.push('Coordinator health check failed');
        result.score -= 50;
      }
    } else {
      result.details.coordinator_health = 'unhealthy';
      result.details.error = 'Coordinator binary not found';
      result.issues.push('Coordinator binary not found');
      result.score -= 100;
    }

    return result;
  }

  async calculateOverallStatus(
    components: HealthResult[]
  ): Promise<OverallHealth> {
    const failedComponents = components.filter(
      (c) => c.status === 'unhealthy'
    ).length;
    const totalComponents = components.length;
    const totalScore = components.reduce((sum, c) => sum + c.score, 0);
    const avgScore = Math.floor(totalScore / totalComponents);

    // Apply failure thresholds
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (failedComponents === 0) {
      overallStatus = 'healthy';
    } else if (failedComponents <= 2) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'unhealthy';
    }

    // Collect all issues and recommendations
    const allIssues: string[] = [];
    components.forEach((c) => allIssues.push(...c.issues));

    const recommendations: string[] = [];
    if (failedComponents > 0) {
      recommendations.push('Check failed components for resolution steps');
    }
    if (avgScore < 80) {
      recommendations.push(
        'Consider running setup commands to improve system health'
      );
    }

    let gitCommit = 'no-git';
    if (existsSync('.git')) {
      try {
        const { stdout } = await exec('git rev-parse HEAD');
        gitCommit = stdout.trim();
      } catch {
        gitCommit = 'no-git';
      }
    }

    return {
      timestamp: new Date().toISOString(),
      git_commit: gitCommit,
      overall: overallStatus,
      score: avgScore,
      execution: {
        mode: this.parallel ? 'parallel' : 'sequential',
        duration_ms: 0, // Will be set by caller
        cache_hit: false,
      },
      components: components.reduce(
        (acc, c) => ({ ...acc, [c.component]: c }),
        {}
      ),
      issues: allIssues,
      recommendations,
      metadata: {
        components_checked: totalComponents,
        failed_components: failedComponents,
        cache_dir: this.cacheDir,
      },
    };
  }

  async runHealthCheck(component: string = 'all'): Promise<OverallHealth> {
    // Check cache first
    if (component === 'all' && (await this.isCacheValid())) {
      const cached = await this.getCachedResult();
      if (cached) {
        cached.execution.cache_hit = true;
        return cached;
      }
    }

    // Determine which checks to run
    const checks: Promise<HealthResult>[] = [];

    if (component === 'all') {
      checks.push(
        this.checkCore(),
        this.checkDependencies(),
        this.checkSync(),
        this.checkConfig(),
        this.checkCoordinator()
      );
    } else if (component === 'core') {
      checks.push(this.checkCore());
    } else if (component === 'deps') {
      checks.push(this.checkDependencies());
    } else if (component === 'sync') {
      checks.push(this.checkSync());
    } else if (component === 'config') {
      checks.push(this.checkConfig());
    } else if (component === 'coordinator') {
      checks.push(this.checkCoordinator());
    } else {
      throw new Error(`Unknown component: ${component}`);
    }

    // Run checks
    const components =
      this.parallel && checks.length > 1
        ? await Promise.all(checks)
        : await checks.reduce(
            async (acc, check) => [...(await acc), await check],
            Promise.resolve<HealthResult[]>([])
          );

    // Calculate overall status
    const result = await this.calculateOverallStatus(components);

    // Cache result
    if (component === 'all') {
      await this.cacheResult(result);
    }

    return result;
  }
}

/**
 * Create health check command
 */
export function createHealthCommand(): Command {
  const command = new Command('health');

  command
    .description('Check system health and component status')
    .option('--format <format>', 'Output format', 'json')
    .option('--component <component>', 'Check specific component', 'all')
    .option('--parallel', 'Run checks in parallel', true)
    .option('--sequential', 'Run checks sequentially', false)
    .option('--cache-dir <dir>', 'Cache directory', '/tmp/liaison-health')
    .option('--verbose', 'Show detailed output', false)
    .action(async (options) => {
      const spinner = ora('🏥 Running health checks...').start();

      try {
        const checker = new HealthChecker(
          options.cacheDir,
          options.sequential ? false : options.parallel
        );

        const startTime = Date.now();
        const result = await checker.runHealthCheck(options.component);
        const duration = Date.now() - startTime;

        // Update duration
        result.execution.duration_ms = duration;

        spinner.succeed('Health checks completed');

        // Format output
        if (options.format === 'json') {
          console.log(JSON.stringify(result, null, 2));
        } else {
          // Human-readable format
          console.log(chalk.blue('🏥 Health Check Results'));
          console.log(`Overall Status: ${result.overall}`);
          console.log(`Health Score: ${result.score}/100`);
          console.log(`Duration: ${duration}ms`);

          if (options.verbose) {
            console.log(chalk.blue('\nComponent Details:'));
            Object.entries(result.components).forEach(([name, component]) => {
              console.log(
                `  ${name}: ${component.status} (${component.score}/100)`
              );
            });
          }

          if (result.issues.length > 0) {
            console.log(chalk.yellow('\nIssues:'));
            result.issues.forEach((issue) => console.log(`  • ${issue}`));
          }

          if (result.recommendations.length > 0) {
            console.log(chalk.cyan('\nRecommendations:'));
            result.recommendations.forEach((rec) => console.log(`  • ${rec}`));
          }
        }

        // Exit with appropriate code
        process.exit(result.overall === 'healthy' ? 0 : 1);
      } catch (error) {
        spinner.fail('Health check failed');
        console.error(chalk.red('❌ Health check failed:'), error);
        process.exit(1);
      }
    });

  return command;
}

export const healthCommand = createHealthCommand();
