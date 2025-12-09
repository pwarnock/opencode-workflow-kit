/**
 * Cache Command
 * CLI interface for cache management and monitoring
 */

import { Command } from 'commander';
import { CacheManager } from '../core/cache/CacheManager.js';
import chalk from 'chalk';
// import { Table } from 'console-table-printer'; // Not used currently
import fs from 'fs/promises';

const cacheCommand = new Command('cache')
  .description('Manage and monitor application cache')
  .version('0.7.2');

// Cache status
cacheCommand
  .command('status')
  .description('Show cache statistics and health')
  .option('-j, --json', 'Output in JSON format')
  .option('--backend <type>', 'Cache backend type (memory|disk|hybrid)', 'hybrid')
  .action(async (options) => {
    const cache = new CacheManager({ backend: options.backend });
    const stats = await cache.getStats();
    const keys = await cache.keys();

    if (options.json) {
      console.log(JSON.stringify({ stats, keyCount: keys.length }, null, 2));
    } else {
      console.log(chalk.bold.blue('\n📊 Cache Status'));
      console.log('='.repeat(50));
      
      // Statistics table
      const statsTable = [
        { 'Metric': 'Hits', 'Value': stats.hits.toLocaleString() },
        { 'Metric': 'Misses', 'Value': stats.misses.toLocaleString() },
        { 'Metric': 'Hit Rate', 'Value': `${(stats.hits / (stats.hits + stats.misses) * 100 || 0).toFixed(1)}%` },
        { 'Metric': 'Evictions', 'Value': stats.evictions.toLocaleString() },
        { 'Metric': 'Total Size', 'Value': `${stats.totalSize.toLocaleString()} entries` },
        { 'Metric': 'Memory Size', 'Value': `${(stats.memorySize / 1024 / 1024).toFixed(2)} MB` },
        { 'Metric': 'Disk Size', 'Value': `${(stats.diskSize / 1024 / 1024).toFixed(2)} MB` }
      ];

      console.log('\n📈 Statistics:');
      console.table(statsTable);

      // Cache health indicator
      const hitRate = stats.hits / (stats.hits + stats.misses) * 100 || 0;
      let healthIcon = '❌';
      let healthMessage = 'Poor';
      
      if (hitRate >= 80) {
        healthIcon = '✅';
        healthMessage = 'Excellent';
      } else if (hitRate >= 60) {
        healthIcon = '⚠️';
        healthMessage = 'Good';
      } else if (hitRate >= 40) {
        healthIcon = '⚠️';
        healthMessage = 'Fair';
      }

      console.log(`\n${chalk.bold('Cache Health:')} ${healthIcon} ${healthMessage} (${hitRate.toFixed(1)}% hit rate)`);

      // Key distribution
      const keyStats = analyzeKeyDistribution(keys);
      console.log('\n🔑 Key Distribution:');
      console.table(keyStats);

      console.log('\n' + '='.repeat(50));
    }
  });

// Clear cache
cacheCommand
  .command('clear [pattern]')
  .description('Clear cache entries')
  .argument('[pattern]', 'Key pattern to clear (supports regex)')
  .option('--backend <type>', 'Cache backend type (memory|disk|hybrid)', 'hybrid')
  .option('--confirm', 'Skip confirmation prompt')
  .action(async (pattern, options) => {
    const cache = new CacheManager({ backend: options.backend });
    
    if (!options.confirm && !pattern) {
      console.log(chalk.yellow('⚠️ This will clear all cached data.'));
      console.log(chalk.yellow('Are you sure you want to continue? (y/N)'));
      
      const response = await askForConfirmation();
      if (!response) {
        console.log(chalk.blue('Cancelled.'));
        return;
      }
    }

    const startTime = performance.now();
    
    try {
      if (pattern) {
        const regex = new RegExp(pattern);
        const keys = await cache.keys();
        const matchingKeys = keys.filter(key => regex.test(key));
        
        if (matchingKeys.length === 0) {
          console.log(chalk.yellow('No cache entries match the pattern.'));
          return;
        }

        console.log(chalk.blue(`🗑️ Clearing ${matchingKeys.length} cache entries matching pattern: ${pattern}`));
        
        for (const key of matchingKeys) {
          await cache.delete(key);
        }
        
        const duration = performance.now() - startTime;
        console.log(chalk.green(`✅ Cleared ${matchingKeys.length} entries in ${duration.toFixed(2)}ms`));
        
      } else {
        console.log(chalk.blue('🗑️ Clearing all cache entries...'));
        await cache.clear();
        
        const duration = performance.now() - startTime;
        console.log(chalk.green(`✅ Cache cleared in ${duration.toFixed(2)}ms`));
      }
    } catch (error) {
      console.error(chalk.red(`❌ Error clearing cache: ${(error as Error).message}`));
      process.exit(1);
    }
  });

// Warm cache
cacheCommand
  .command('warm')
  .description('Pre-warm cache with important data')
  .option('--backend <type>', 'Cache backend type (memory|disk|hybrid)', 'hybrid')
  .option('--github', 'Warm GitHub API cache')
  .option('--beads', 'Warm Beads API cache')
  .option('--config', 'Warm configuration cache')
  .option('--all', 'Warm all available caches')
  .action(async (options) => {
    const cache = new CacheManager({ backend: options.backend });
    
    console.log(chalk.bold.blue('\n🔥 Warming Cache'));
    console.log('='.repeat(50));
    
    const startTime = performance.now();
    
    try {
      // Warm configuration cache
      if (options.config || options.all) {
        console.log(chalk.blue('📋 Warming configuration cache...'));
        
        // Cache project configuration
        await cache.getCachedConfig('project', async () => {
          return { name: 'opencode-workflow-kit', version: '0.7.2' };
        });
        
        // Cache user preferences
        await cache.getCachedConfig('user', async () => {
          return { theme: 'dark', notifications: true };
        });
        
        console.log(chalk.green('  ✅ Configuration cache warmed'));
      }

      // Warm GitHub cache (mock for demo)
      if (options.github || options.all) {
        console.log(chalk.blue('🌐 Warming GitHub API cache...'));
        
        await cache.getCachedGitHubData('repo:opencode-workflow-kit', async () => {
          return { id: 12345, name: 'opencode-workflow-kit', stars: 42 };
        });
        
        await cache.getCachedGitHubData('issues:open', async () => {
          return Array.from({ length: 10 }, (_, i) => ({
            id: i + 1,
            title: `Issue ${i + 1}`,
            state: 'open'
          }));
        });
        
        console.log(chalk.green('  ✅ GitHub cache warmed'));
      }

      // Warm Beads cache (mock for demo)
      if (options.beads || options.all) {
        console.log(chalk.blue('💎 Warming Beads API cache...'));
        
        await cache.getCachedBeadsData('issues:workspace', async () => {
          return Array.from({ length: 5 }, (_, i) => ({
            id: `beads-${i + 1}`,
            title: `Beads Issue ${i + 1}`,
            status: 'open'
          }));
        });
        
        await cache.getCachedBeadsData('sync:last', async () => {
          return { syncId: 'sync-123', status: 'completed', items: 25 };
        });
        
        console.log(chalk.green('  ✅ Beads cache warmed'));
      }

      const duration = performance.now() - startTime;
      const finalStats = await cache.getStats();
      
      console.log('\n📊 Cache Warming Complete');
      console.log(`Duration: ${duration.toFixed(2)}ms`);
      console.log(`Final hit rate: ${(finalStats.hits / (finalStats.hits + finalStats.misses) * 100 || 0).toFixed(1)}%`);
      console.log(`Total entries: ${finalStats.totalSize.toLocaleString()}`);
      
      console.log('\n' + chalk.green('✅ Cache warming completed successfully!'));
      
    } catch (error) {
      console.error(chalk.red(`❌ Error warming cache: ${(error as Error).message}`));
      process.exit(1);
    }
  });

// Export cache
cacheCommand
  .command('export <file>')
  .description('Export cache data to file')
  .option('--backend <type>', 'Cache backend type (memory|disk|hybrid)', 'hybrid')
  .option('--format <format>', 'Export format (json|binary)', 'json')
  .action(async (file, options) => {
    const cache = new CacheManager({ backend: options.backend });
    
    console.log(chalk.blue(`📤 Exporting cache to ${file}...`));
    
    try {
      const startTime = performance.now();
      
      await cache.exportCache(file);
      
      const duration = performance.now() - startTime;
      const stats = await fs.stat(file);
      
      console.log(chalk.green(`✅ Cache exported successfully`));
      console.log(`File: ${file}`);
      console.log(`Size: ${(stats.size / 1024).toFixed(2)} KB`);
      console.log(`Duration: ${duration.toFixed(2)}ms`);
      
    } catch (error) {
      console.error(chalk.red(`❌ Error exporting cache: ${(error as Error).message}`));
      process.exit(1);
    }
  });

// Import cache
cacheCommand
  .command('import <file>')
  .description('Import cache data from file')
  .option('--backend <type>', 'Cache backend type (memory|disk|hybrid)', 'hybrid')
  .option('--merge', 'Merge with existing cache instead of replacing')
  .action(async (file, options) => {
    const cache = new CacheManager({ backend: options.backend });
    
    try {
      const stats = await fs.stat(file);
      console.log(chalk.blue(`📥 Importing cache from ${file}...`));
      console.log(`File size: ${(stats.size / 1024).toFixed(2)} KB`);
      
      if (!options.merge) {
        console.log(chalk.yellow('⚠️ This will replace the current cache.'));
        const response = await askForConfirmation();
        if (!response) {
          console.log(chalk.blue('Cancelled.'));
          return;
        }
      }
      
      const startTime = performance.now();
      
      if (!options.merge) {
        await cache.clear();
      }
      
      await cache.importCache(file);
      
      const duration = performance.now() - startTime;
      const finalStats = await cache.getStats();
      
      console.log(chalk.green(`✅ Cache imported successfully`));
      console.log(`Duration: ${duration.toFixed(2)}ms`);
      console.log(`Total entries: ${finalStats.totalSize.toLocaleString()}`);
      console.log(`Hit rate: ${(finalStats.hits / (finalStats.hits + finalStats.misses) * 100 || 0).toFixed(1)}%`);
      
    } catch (error) {
      console.error(chalk.red(`❌ Error importing cache: ${(error as Error).message}`));
      process.exit(1);
    }
  });

// Performance test
cacheCommand
  .command('benchmark')
  .description('Run cache performance benchmarks')
  .option('--backend <type>', 'Cache backend type (memory|disk|hybrid)', 'hybrid')
  .option('--iterations <number>', 'Number of test iterations', '1000')
  .option('--data-size <number>', 'Size of test data in bytes', '100')
  .action(async (options) => {
    const cache = new CacheManager({ backend: options.backend });
    const iterations = parseInt(options.iterations);
    const dataSize = parseInt(options.dataSize);
    
    console.log(chalk.bold.blue('\n🚀 Cache Performance Benchmark'));
    console.log('='.repeat(50));
    console.log(`Backend: ${options.backend}`);
    console.log(`Iterations: ${iterations.toLocaleString()}`);
    console.log(`Data Size: ${dataSize} bytes`);
    console.log('');
    
    // Generate test data
    const testData = 'x'.repeat(dataSize);
    
    // Write benchmark
    console.log(chalk.blue('📝 Testing write performance...'));
    const writeStart = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      await cache.set(`benchmark:write:${i}`, testData);
    }
    
    const writeDuration = performance.now() - writeStart;
    const writeOpsPerSecond = (iterations / writeDuration) * 1000;
    
    console.log(chalk.green(`  ✅ Write: ${writeOpsPerSecond.toFixed(0)} ops/sec`));
    
    // Read benchmark
    console.log(chalk.blue('📖 Testing read performance...'));
    const readStart = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      await cache.get(`benchmark:write:${i}`);
    }
    
    const readDuration = performance.now() - readStart;
    const readOpsPerSecond = (iterations / readDuration) * 1000;
    
    console.log(chalk.green(`  ✅ Read: ${readOpsPerSecond.toFixed(0)} ops/sec`));
    
    // Mixed benchmark
    console.log(chalk.blue('🔄 Testing mixed operations...'));
    const mixedStart = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      const key = `benchmark:mixed:${i}`;
      const existing = await cache.get(key);
      
      if (existing === null) {
        await cache.set(key, testData);
      }
    }
    
    const mixedDuration = performance.now() - mixedStart;
    const mixedOpsPerSecond = (iterations / mixedDuration) * 1000;
    
    console.log(chalk.green(`  ✅ Mixed: ${mixedOpsPerSecond.toFixed(0)} ops/sec`));
    
    // Cleanup
    console.log(chalk.blue('🧹 Cleaning up benchmark data...'));
    for (let i = 0; i < iterations; i++) {
      await cache.delete(`benchmark:write:${i}`);
      await cache.delete(`benchmark:mixed:${i}`);
    }
    
    // Summary
    console.log('\n📊 Performance Summary:');
    console.log(`Write Performance: ${writeOpsPerSecond.toFixed(0)} ops/sec`);
    console.log(`Read Performance: ${readOpsPerSecond.toFixed(0)} ops/sec`);
    console.log(`Mixed Performance: ${mixedOpsPerSecond.toFixed(0)} ops/sec`);
    
    // Performance rating
    const avgPerformance = (writeOpsPerSecond + readOpsPerSecond + mixedOpsPerSecond) / 3;
    let rating = 'Poor';
    
    if (avgPerformance >= 50000) {
      rating = 'Excellent';
    } else if (avgPerformance >= 25000) {
      rating = 'Good';
    } else if (avgPerformance >= 10000) {
      rating = 'Fair';
    }
    
    console.log(`\n${chalk.bold('Performance Rating:')} ${rating} (${avgPerformance.toFixed(0)} avg ops/sec)`);
    
    console.log('\n' + '='.repeat(50));
  });

// Helper functions
function analyzeKeyDistribution(keys: string[]): Array<{ Type: string; Count: number; Percentage: string }> {
  const distribution: Record<string, number> = {};
  
  keys.forEach(key => {
    const type = key.split(':')[0] || 'unknown';
    distribution[type] = (distribution[type] || 0) + 1;
  });
  
  const total = keys.length;
  
  return Object.entries(distribution)
    .map(([type, count]) => ({
      Type: type,
      Count: count,
      Percentage: `${((count / total) * 100).toFixed(1)}%`
    }))
    .sort((a, b) => b.Count - a.Count)
    .slice(0, 10);
}

async function askForConfirmation(): Promise<boolean> {
  const readline = await import('node:readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question('', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

export default cacheCommand;
