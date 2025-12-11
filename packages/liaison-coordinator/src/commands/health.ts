/**
 * Health Check Command for Liaison Coordinator
 */

import { Command } from 'commander';
import { healthCheck } from '../main.js';

/**
 * Create health check command
 */
export function createHealthCommand(): Command {
  const command = new Command('health');

  command
    .description('Check system health and component status')
    .option('--format <format>', 'Output format', 'json')
    .option('--component <component>', 'Check specific component', 'all')
    .action(async (options) => {
      try {
        // Perform health check
        const healthResult = await healthCheck();

        // Format output based on requested format
        if (options.format === 'json') {
          console.log(JSON.stringify(healthResult, null, 2));
        } else {
          console.log('🏥 Running liaison coordinator health check...');
          // Human-readable format
          console.log(`Overall Status: ${healthResult.overall}`);
          console.log(`Timestamp: ${healthResult.timestamp}`);
          console.log('\nComponent Status:');

          for (const [component, status] of Object.entries(
            healthResult.components
          )) {
            const componentStatus =
              typeof status === 'object' && status !== null
                ? (status as any).status || 'unknown'
                : 'unknown';
            console.log(`  ${component}: ${componentStatus}`);
          }
        }

        // Exit with appropriate code
        process.exit(healthResult.overall === 'healthy' ? 0 : 1);
      } catch (error) {
        console.error('❌ Health check failed:', error);
        process.exit(1);
      }
    });

  return command;
}

export const healthCommand = createHealthCommand();
