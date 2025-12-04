#!/usr/bin/env node

/**
 * Simple test report aggregator
 * Combines results from different test runners
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface TestResult {
  type: string;
  passed: number;
  failed: number;
  total: number;
  duration: number;
  coverage?: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
}

interface TestReport {
  timestamp: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    duration: number;
  };
  results: TestResult[];
  coverage?: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
}

function generateReport(): TestReport {
  const report: TestReport = {
    timestamp: new Date().toISOString(),
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      duration: 0
    },
    results: []
  };

  // Unit test results
  try {
    const unitResults = JSON.parse(readFileSync('test-results/unit.json', 'utf8'));
    report.results.push({
      type: 'unit',
      passed: unitResults.numPassedTests || 0,
      failed: unitResults.numFailedTests || 0,
      total: unitResults.numTotalTests || 0,
      duration: unitResults.testResults?.[0]?.duration || 0
    });
  } catch (error) {
    console.log('⚠️  Could not read unit test results');
  }

  // Integration test results
  try {
    const integrationResults = JSON.parse(readFileSync('test-results/integration.json', 'utf8'));
    report.results.push({
      type: 'integration',
      passed: integrationResults.numPassedTests || 0,
      failed: integrationResults.numFailedTests || 0,
      total: integrationResults.numTotalTests || 0,
      duration: integrationResults.testResults?.[0]?.duration || 0
    });
  } catch (error) {
    console.log('⚠️  Could not read integration test results');
  }

  // E2E test results
  try {
    const e2eResults = JSON.parse(readFileSync('test-results/e2e.json', 'utf8'));
    report.results.push({
      type: 'e2e',
      passed: e2eResults.suites?.[0]?.specs?.length || 0,
      failed: e2eResults.suites?.[0]?.specs?.filter((s: any) => s.ok === false)?.length || 0,
      total: e2eResults.suites?.[0]?.specs?.length || 0,
      duration: e2eResults.suites?.[0]?.specs?.reduce((total: number, spec: any) => total + (spec.tests?.[0]?.results?.[0]?.duration || 0), 0) || 0
    });
  } catch (error) {
    console.log('⚠️  Could not read E2E test results');
  }

  // Calculate summary
  report.summary.total = report.results.reduce((sum, result) => sum + result.total, 0);
  report.summary.passed = report.results.reduce((sum, result) => sum + result.passed, 0);
  report.summary.failed = report.results.reduce((sum, result) => sum + result.failed, 0);
  report.summary.duration = report.results.reduce((sum, result) => sum + result.duration, 0);

  // Coverage results
  try {
    const coverageData = JSON.parse(readFileSync('coverage/coverage-summary.json', 'utf8'));
    report.coverage = {
      lines: coverageData.total?.lines?.pct || 0,
      functions: coverageData.total?.functions?.pct || 0,
      branches: coverageData.total?.branches?.pct || 0,
      statements: coverageData.total?.statements?.pct || 0
    };
  } catch (error) {
    console.log('⚠️  Could not read coverage results');
  }

  return report;
}

function main() {
  console.log('📊 Generating test report...');
  
  const report = generateReport();
  
  // Write combined report
  writeFileSync('test-results/combined-report.json', JSON.stringify(report, null, 2));
  
  // Print summary
  console.log('\n🎯 Test Summary:');
  console.log(`   Total Tests: ${report.summary.total}`);
  console.log(`   ✅ Passed: ${report.summary.passed}`);
  console.log(`   ❌ Failed: ${report.summary.failed}`);
  console.log(`   ⏱️  Duration: ${report.summary.duration}ms`);
  
  if (report.coverage) {
    console.log('\n📈 Coverage Summary:');
    console.log(`   Lines: ${report.coverage.lines}%`);
    console.log(`   Functions: ${report.coverage.functions}%`);
    console.log(`   Branches: ${report.coverage.branches}%`);
    console.log(`   Statements: ${report.coverage.statements}%`);
  }
  
  console.log(`\n📄 Full report saved to: test-results/combined-report.json`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}