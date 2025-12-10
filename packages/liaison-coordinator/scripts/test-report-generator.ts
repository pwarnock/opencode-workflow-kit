#!/usr/bin/env bun

/**
 * Test Report Generator
 * Modern ES module implementation with TypeScript
 */

import fs from 'fs/promises';
import path from 'path';

interface TestFile {
  file: string;
  type: string;
}

interface CoverageAnalysis {
  total: {
    statements: { pct: number };
    branches: { pct: number };
    functions: { pct: number };
    lines: { pct: number };
  };
  [key: string]: any;
}

interface TestReport {
  generated: string;
  summary: {
    totalTestFiles: number;
    unitTests: number;
    integrationTests: number;
    e2eTests: number;
  };
  testFiles: TestFile[];
  coverageAnalysis: CoverageAnalysis | null;
}

async function generateTestReport(): Promise<void> {
  try {
    console.log('\n📊 Generating Test Report...');
    
    // Get test results
    const testResults: TestFile[] = [];
    const testDirs = ['tests/unit', 'tests/integration', 'tests/e2e'];
    
    for (const dir of testDirs) {
      const testDir = path.join(process.cwd(), dir);
      try {
        await fs.access(testDir);
        const files = await fs.readdir(testDir);
        const testFiles = files.filter(f => f.endsWith('.test.ts'));
        testResults.push(...testFiles.map(f => ({
          file: path.join(dir, f),
          type: dir.replace('tests/', '')
        })));
      } catch {
        // Directory doesn't exist, skip
      }
    }
    
    // Generate report
    const report: TestReport = {
      generated: new Date().toISOString(),
      summary: {
        totalTestFiles: testResults.length,
        unitTests: testResults.filter(r => r.type === 'unit').length,
        integrationTests: testResults.filter(r => r.type === 'integration').length,
        e2eTests: testResults.filter(r => r.type === 'e2e').length
      },
      testFiles: testResults,
      coverageAnalysis: await getCoverageAnalysis()
    };
    
    // Save report
    const reportDir = path.join(process.cwd(), 'test-reports');
    await fs.mkdir(reportDir, { recursive: true });
    
    const timestamp = Date.now();
    const reportFile = path.join(reportDir, `test-report-${timestamp}.json`);
    await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
    
    // Display summary
    console.log('\n📋 Test Report Summary:');
    console.log('='.repeat(40));
    console.log(`Total Test Files: ${report.summary.totalTestFiles}`);
    console.log(`Unit Tests: ${report.summary.unitTests}`);
    console.log(`Integration Tests: ${report.summary.integrationTests}`);
    console.log(`E2E Tests: ${report.summary.e2eTests}`);
    
    if (report.coverageAnalysis) {
      console.log(`\n📈 Coverage Analysis:`);
      console.log(`Current Coverage: ${report.coverageAnalysis.total.statements.pct}%`);
      console.log(`Target Coverage: 50%`);
      console.log(`Gap: ${(50 - report.coverageAnalysis.total.statements.pct).toFixed(2)}%`);
    }
    
    console.log(`\n💾 Report saved to: ${reportFile}`);
    console.log('='.repeat(40));
    
  } catch (error) {
    console.error('❌ Report generation failed:', (error as Error).message);
    process.exit(1);
  }
}

async function getCoverageAnalysis(): Promise<CoverageAnalysis | null> {
  try {
    const coverageFile = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
    await fs.access(coverageFile);
    const coverageContent = await fs.readFile(coverageFile, 'utf-8');
    return JSON.parse(coverageContent) as CoverageAnalysis;
  } catch {
    // Coverage not available
    return null;
  }
}

// Generate report
await generateTestReport();
