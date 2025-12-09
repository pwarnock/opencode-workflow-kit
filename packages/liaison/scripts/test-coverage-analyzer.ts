#!/usr/bin/env bun

/**
 * Test Coverage Analyzer
 * Modern ES module implementation with TypeScript support
 */

import fs from 'fs/promises';
import path from 'path';

interface CoverageData {
  total: {
    statements: { pct: number };
    branches: { pct: number };
    functions: { pct: number };
    lines: { pct: number };
  };
  [key: string]: any;
}

async function analyzeCoverage(): Promise<void> {
  try {
    // Get current coverage data
    const coverageFile = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
    
    try {
      await fs.access(coverageFile);
    } catch {
      console.log('📊 No coverage file found. Running coverage first...');
      const { spawn } = await import('child_process');
      const coverageProcess = spawn('bun', ['run', 'test:coverage'], { 
        stdio: 'inherit',
        cwd: process.cwd() 
      });
      
      return new Promise((resolve, reject) => {
        coverageProcess.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Coverage process exited with code ${code}`));
          }
        });
      });
    }

    const coverageContent = await fs.readFile(coverageFile, 'utf-8');
    const coverageData: CoverageData = JSON.parse(coverageContent);
    
    console.log('\n🔍 Test Coverage Analysis Report');
    console.log('='.repeat(50));
    
    // Overall coverage
    const overall = coverageData.total;
    console.log(`\n📈 Overall Coverage:`);
    console.log(`   Statements: ${overall.statements.pct.toFixed(2)}%`);
    console.log(`   Branches:   ${overall.branches.pct.toFixed(2)}%`);
    console.log(`   Functions:  ${overall.functions.pct.toFixed(2)}%`);
    console.log(`   Lines:      ${overall.lines.pct.toFixed(2)}%`);
    
    // Coverage gaps analysis
    console.log(`\n🎯 Coverage Progress:`);
    const targetPct = 50;
    const currentPct = overall.statements.pct;
    const gapPct = targetPct - currentPct;
    
    if (currentPct >= targetPct) {
      console.log(`   ✅ Target met: ${currentPct.toFixed(2)}% ≥ ${targetPct}%`);
    } else {
      console.log(`   📊 Current: ${currentPct.toFixed(2)}%`);
      console.log(`   🎯 Target: ${targetPct}%`);
      console.log(`   📈 Gap: ${gapPct.toFixed(2)}%`);
    }
    
    // File-level analysis
    console.log(`\n📁 Low Coverage Files (< 20%):`);
    const lowCoverageFiles = Object.entries(coverageData)
      .filter(([key]) => key !== 'total')
      .map(([key, data]) => ({ 
        file: key, 
        coverage: data.statements?.pct || 0 
      }))
      .filter(({ coverage }) => coverage < 20)
      .sort((a, b) => a.coverage - b.coverage);
    
    lowCoverageFiles.forEach(({ file, coverage }) => {
      console.log(`   ${coverage.toFixed(2)}% - ${file}`);
    });
    
    // Recommendations
    console.log(`\n💡 Recommendations:`);
    
    if (gapPct > 0) {
      console.log(`   1. Focus on CLI commands (currently very low coverage)`);
      console.log(`   2. Add integration tests for core features`);
      console.log(`   3. Target highest impact files first`);
    }
    
    // Priority files for improvement
    const priorityFiles = Object.entries(coverageData)
      .filter(([key]) => key !== 'total')
      .map(([key, data]) => ({ 
        file: key, 
        coverage: data.statements?.pct || 0,
        potential: (data.statements?.total || 0) - (data.statements?.covered || 0) 
      }))
      .filter(({ potential }) => potential > 50)
      .sort((a, b) => b.potential - a.potential)
      .slice(0, 5);
    
    if (priorityFiles.length > 0) {
      console.log(`   4. Priority files for improvement:`);
      priorityFiles.forEach(({ file, coverage, potential }) => {
        console.log(`      ${file} (${potential} lines to add)`);
      });
    }
    
    console.log('\n' + '='.repeat(50));
    
  } catch (error) {
    console.error('❌ Coverage analysis failed:', (error as Error).message);
    process.exit(1);
  }
}

// Run analysis
await analyzeCoverage();
