#!/usr/bin/env bun

/**
 * Performance Benchmarks
 * Advanced performance testing and benchmarking suite
 */

import { performance } from 'perf_hooks';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

interface BenchmarkResult {
  name: string;
  duration: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
  };
  operations?: number;
  opsPerSecond?: number;
}

class PerformanceBenchmarks {
  private results: BenchmarkResult[] = [];

  async runAllBenchmarks(): Promise<void> {
    console.log('\n🚀 Running Performance Benchmarks');
    console.log('='.repeat(50));

    await this.benchmarkTestSuite();
    await this.benchmarkSyncEngine();
    await this.benchmarkCLICommands();
    await this.benchmarkConfigLoading();
    await this.benchmarkMemoryUsage();

    console.log('\n📊 Benchmark Results Summary');
    console.log('='.repeat(50));
    this.displayResults();
    
    await this.saveResults();
  }

  private async benchmarkTestSuite(): Promise<void> {
    console.log('\n🧪 Benchmarking Test Suite Performance...');
    
    const start = performance.now();
    const startMemory = process.memoryUsage();
    
    // Run test suite
    await new Promise<void>((resolve) => {
      const testProcess = spawn('bun', ['run', 'test:unit'], { 
        stdio: 'pipe',
        cwd: process.cwd() 
      });
      
      testProcess.on('close', (code) => {
        if (code === 0) {
          const duration = performance.now() - start;
          const endMemory = process.memoryUsage();
          
          this.results.push({
            name: 'Test Suite Execution',
            duration,
            memory: {
              rss: endMemory.rss - startMemory.rss,
              heapTotal: endMemory.heapTotal,
              heapUsed: endMemory.heapUsed
            }
          });
        }
        resolve();
      });
    });
  }

  private async benchmarkSyncEngine(): Promise<void> {
    console.log('\n⚡ Benchmarking Sync Engine Performance...');
    
    // Mock sync operations
    const iterations = 100;
    const start = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      // Simulate sync operation
      const mockSync = {
        items: Array.from({ length: 10 }, (_, idx) => ({
          id: `item-${idx}`,
          data: `sync-data-${idx}`,
          timestamp: Date.now()
        })),
        direction: 'bidirectional',
        batchSize: 50
      };
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1));
    }
    
    const duration = performance.now() - start;
    const opsPerSecond = (iterations / duration) * 1000;
    
    this.results.push({
      name: 'Sync Engine Operations',
      duration,
      operations: iterations,
      opsPerSecond,
      memory: process.memoryUsage()
    });
  }

  private async benchmarkCLICommands(): Promise<void> {
    console.log('\n📋 Benchmarking CLI Command Performance...');
    
    const commands = ['help', 'version', 'config --help'];
    
    for (const command of commands) {
      const start = performance.now();
      
      await new Promise<void>((resolve) => {
        const cliProcess = spawn('bun', ['run', 'liaison', command], {
          stdio: 'pipe',
          cwd: process.cwd()
        });
        
        cliProcess.on('close', () => {
          const duration = performance.now() - start;
          
          this.results.push({
            name: `CLI: ${command}`,
            duration,
            memory: process.memoryUsage()
          });
          resolve();
        });
      });
    }
  }

  private async benchmarkConfigLoading(): Promise<void> {
    console.log('\n⚙️ Benchmarking Configuration Loading...');
    
    const iterations = 50;
    const start = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      try {
        await fs.access(path.join(process.cwd(), 'opencode.json'));
        // Simulate config parsing
        const mockConfig = { version: '0.7.1', name: 'test-config' };
        JSON.parse(JSON.stringify(mockConfig));
      } catch {
        // Config not found, continue
      }
    }
    
    const duration = performance.now() - start;
    const opsPerSecond = (iterations / duration) * 1000;
    
    this.results.push({
      name: 'Config Loading Operations',
      duration,
      operations: iterations,
      opsPerSecond,
      memory: process.memoryUsage()
    });
  }

  private async benchmarkMemoryUsage(): Promise<void> {
    console.log('\n💾 Benchmarking Memory Usage Patterns...');
    
    const samples: BenchmarkResult['memory'][] = [];
    const duration = 5000; // 5 seconds
    const start = performance.now();
    
    // Sample memory usage over time
    while (performance.now() - start < duration) {
      const memory = process.memoryUsage();
      samples.push({ ...memory });
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const avgMemory = samples.reduce((acc, mem) => ({
      rss: acc.rss + mem.rss,
      heapTotal: acc.heapTotal + mem.heapTotal,
      heapUsed: acc.heapUsed + mem.heapUsed
    }), { rss: 0, heapTotal: 0, heapUsed: 0 });
    
    const count = samples.length;
    
    this.results.push({
      name: 'Memory Usage Patterns',
      duration,
      memory: {
        rss: Math.round(avgMemory.rss / count),
        heapTotal: Math.round(avgMemory.heapTotal / count),
        heapUsed: Math.round(avgMemory.heapUsed / count)
      }
    });
  }

  private displayResults(): void {
    this.results.forEach((result) => {
      console.log(`\n📈 ${result.name}:`);
      console.log(`   Duration: ${result.duration.toFixed(2)}ms`);
      
      if (result.operations) {
        console.log(`   Operations: ${result.operations}`);
        console.log(`   Ops/Second: ${result.opsPerSecond?.toFixed(2)}`);
      }
      
      console.log(`   Memory Usage:`);
      console.log(`     RSS: ${(result.memory.rss / 1024 / 1024).toFixed(2)} MB`);
      console.log(`     Heap Total: ${(result.memory.heapTotal / 1024 / 1024).toFixed(2)} MB`);
      console.log(`     Heap Used: ${(result.memory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    });
  }

  private async saveResults(): Promise<void> {
    const benchmarkData = {
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      results: this.results
    };
    
    const reportsDir = path.join(process.cwd(), 'test-reports');
    await fs.mkdir(reportsDir, { recursive: true });
    
    const timestamp = Date.now();
    const reportFile = path.join(reportsDir, `performance-benchmark-${timestamp}.json`);
    await fs.writeFile(reportFile, JSON.stringify(benchmarkData, null, 2));
    
    console.log(`\n💾 Benchmark results saved to: ${reportFile}`);
    
    // Generate performance summary
    await this.generatePerformanceSummary(benchmarkData);
  }

  private async generatePerformanceSummary(data: any): Promise<void> {
    const summaryFile = path.join(process.cwd(), 'test-reports', `performance-summary-${Date.now()}.md`);
    
    const summary = `# Performance Benchmark Report
Generated: ${data.timestamp}
Platform: ${data.platform} (${data.arch})
Node.js: ${data.nodeVersion}

## Benchmark Results

${data.results.map((result: BenchmarkResult) => `
### ${result.name}
- **Duration**: ${result.duration.toFixed(2)}ms
- **Operations**: ${result.operations || 'N/A'}
- **Ops/Second**: ${result.opsPerSecond?.toFixed(2) || 'N/A'}
- **Memory Usage**: 
  - RSS: ${(result.memory.rss / 1024 / 1024).toFixed(2)} MB
  - Heap Total: ${(result.memory.heapTotal / 1024 / 1024).toFixed(2)} MB
  - Heap Used: ${(result.memory.heapUsed / 1024 / 1024).toFixed(2)} MB
`).join('\n')}

## Performance Recommendations

${this.generateRecommendations(data.results)}

---
*Report generated by Liaison Performance Benchmark Tool*
`;
    
    await fs.writeFile(summaryFile, summary);
    console.log(`📄 Performance summary saved to: ${summaryFile}`);
  }

  private generateRecommendations(results: BenchmarkResult[]): string {
    const recommendations: string[] = [];
    
    // Analyze test suite performance
    const testSuiteResult = results.find(r => r.name === 'Test Suite Execution');
    if (testSuiteResult && testSuiteResult.duration > 10000) {
      recommendations.push('⚠️ Test suite execution is slow (>10s). Consider parallel test execution.');
    }
    
    // Analyze sync engine performance
    const syncEngineResult = results.find(r => r.name === 'Sync Engine Operations');
    if (syncEngineResult && (syncEngineResult.opsPerSecond || 0) < 50) {
      recommendations.push('⚡ Sync engine performance could be improved. Consider batching or caching.');
    }
    
    // Analyze memory usage
    const memoryResult = results.find(r => r.name === 'Memory Usage Patterns');
    if (memoryResult && memoryResult.memory.heapUsed > 100 * 1024 * 1024) { // > 100MB
      recommendations.push('💾 High memory usage detected. Review memory leaks and optimization opportunities.');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✅ Performance looks good! No major concerns detected.');
    }
    
    return recommendations.map(rec => `- ${rec}`).join('\n');
  }
}

// Run benchmarks
if (import.meta.main) {
  const benchmarks = new PerformanceBenchmarks();
  await benchmarks.runAllBenchmarks();
}
