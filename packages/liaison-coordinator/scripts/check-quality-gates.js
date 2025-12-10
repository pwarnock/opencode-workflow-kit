#!/usr/bin/env node

/**
 * Quality Gates Checker
 * Validates that complexity and quality metrics meet thresholds
 */

import { readFileSync } from 'fs';
import { execSync } from 'child_process';

const THRESHOLDS = {
  complexity: {
    max: 10, // Plato complexity threshold
    maintainability: 'B' // Maintainability index
  },
  duplication: {
    max: 5 // JSCPD duplication percentage
  },
  mutation: {
    min: 80 // Stryker mutation score threshold
  },
  coverage: {
    min: 50 // Minimum coverage percentage
  }
};

function loadComplexityReport() {
  try {
    const report = JSON.parse(readFileSync('complexity-report/index.json', 'utf8'));
    return report.report;
  } catch (error) {
    console.warn('⚠️  Could not load complexity report');
    return null;
  }
}

function loadESLintReport() {
  try {
    return JSON.parse(readFileSync('eslint-report.json', 'utf8'));
  } catch (error) {
    console.warn('⚠️  Could not load ESLint report');
    return null;
  }
}

function loadDuplicationReport() {
  try {
    return JSON.parse(readFileSync('duplication-report.json', 'utf8'));
  } catch (error) {
    console.warn('⚠️  Could not load duplication report');
    return null;
  }
}

function loadCoverageReport() {
  try {
    const coverage = readFileSync('coverage/coverage-summary.json', 'utf8');
    const summary = JSON.parse(coverage);
    return summary.total;
  } catch (error) {
    console.warn('⚠️  Could not load coverage report');
    return null;
  }
}

function loadMutationReport() {
  try {
    const report = JSON.parse(readFileSync('reports/mutation/mutation.json', 'utf8'));
    return report.mutationScore;
  } catch (error) {
    console.warn('⚠️  Could not load mutation report');
    return null;
  }
}

function checkComplexity(report) {
  if (!report) return { passed: false, reason: 'No complexity report available' };
  
  const violations = report.files.filter(file => 
    file.complexity.cyclomatic > THRESHOLDS.complexity.max ||
    file.complexity.halstead.difficulty > THRESHOLDS.complexity.max
  );

  return {
    passed: violations.length === 0,
    violations: violations.map(v => ({
      file: v.file,
      complexity: v.complexity.cyclomatic,
      maintainability: v.complexity.maintainability
    })),
    threshold: THRESHOLDS.complexity.max
  };
}

function checkDuplication(report) {
  if (!report) return { passed: false, reason: 'No duplication report available' };
  
  const duplicationPercent = parseFloat(report.statistics.percentDuplication);
  
  return {
    passed: duplicationPercent <= THRESHOLDS.duplication.max,
    duplicationPercent,
    threshold: THRESHOLDS.duplication.max
  };
}

function checkCoverage(coverage) {
  if (!coverage) return { passed: false, reason: 'No coverage report available' };
  
  const linesPct = coverage.lines.pct;
  
  return {
    passed: linesPct >= THRESHOLDS.coverage.min,
    coveragePercent: linesPct,
    threshold: THRESHOLDS.coverage.min
  };
}

function checkMutation(score) {
  if (!score) return { passed: false, reason: 'No mutation report available' };
  
  return {
    passed: score >= THRESHOLDS.mutation.min,
    mutationScore: score,
    threshold: THRESHOLDS.mutation.min
  };
}

function main() {
  console.log('🔍 Running Quality Gates Check...\n');

  const complexityReport = loadComplexityReport();
  const eslintReport = loadESLintReport();
  const duplicationReport = loadDuplicationReport();
  const coverage = loadCoverageReport();
  const mutationScore = loadMutationReport();

  const results = {
    complexity: checkComplexity(complexityReport),
    duplication: checkDuplication(duplicationReport),
    coverage: checkCoverage(coverage),
    mutation: checkMutation(mutationScore)
  };

  // Print results
  console.log('📊 Quality Gates Results:');
  console.log('========================');
  
  console.log(`\n🧮 Complexity: ${results.complexity.passed ? '✅ PASS' : '❌ FAIL'}`);
  if (!results.complexity.passed) {
    console.log(`   Threshold: ${results.complexity.threshold}`);
    results.complexity.violations.forEach(v => {
      console.log(`   ${v.file}: ${v.complexity} (maintainability: ${v.maintainability})`);
    });
  }

  console.log(`\n🔄 Duplication: ${results.duplication.passed ? '✅ PASS' : '❌ FAIL'}`);
  if (!results.duplication.passed) {
    console.log(`   Current: ${results.duplication.duplicationPercent}%`);
    console.log(`   Threshold: ${results.duplication.threshold}%`);
  }

  console.log(`\n📈 Coverage: ${results.coverage.passed ? '✅ PASS' : '❌ FAIL'}`);
  if (!results.coverage.passed) {
    console.log(`   Current: ${results.coverage.coveragePercent}%`);
    console.log(`   Threshold: ${results.coverage.threshold}%`);
  }

  console.log(`\n🧬 Mutation: ${results.mutation.passed ? '✅ PASS' : '❌ FAIL'}`);
  if (!results.mutation.passed) {
    console.log(`   Current: ${results.mutation.mutationScore}%`);
    console.log(`   Threshold: ${results.mutation.threshold}%`);
  }

  // Overall result
  const allPassed = Object.values(results).every(r => r.passed);
  console.log(`\n🎯 Overall: ${allPassed ? '✅ ALL GATES PASSED' : '❌ SOME GATES FAILED'}`);

  process.exit(allPassed ? 0 : 1);
}

if (require.main === module) {
  main();
}