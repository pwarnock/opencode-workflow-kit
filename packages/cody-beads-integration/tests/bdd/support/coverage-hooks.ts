import { BeforeAll, AfterAll, After } from '@cucumber/cucumber';
import { CustomWorld } from './world';
import { execSync } from 'child_process';

/**
 * Coverage hooks for BDD testing
 */

// Store original coverage state
let originalCoverage: any;

BeforeAll(async function () {
  // Set up coverage collection if in coverage mode
  if (process.env.NODE_V8_COVERAGE || process.env.COVERAGE) {
    console.log('📊 Setting up BDD coverage collection...');
    
    // Store original coverage state
    originalCoverage = globalThis.__coverage__;
    
    // Initialize coverage collection
    globalThis.__coverage__ = {};
  }
});

After(async function (scenario) {
  // Collect coverage for each scenario
  if (process.env.NODE_V8_COVERAGE || process.env.COVERAGE) {
    console.log(`📈 Completed scenario: ${scenario.pickle.name}`);
  }
});

AfterAll(async function () {
  // Generate coverage report if in coverage mode
  if (process.env.NODE_V8_COVERAGE || process.env.COVERAGE) {
    console.log('📊 Generating BDD coverage report...');
    
    try {
      // Generate coverage report using c8 or nyc
      const coverageDir = './tests/bdd/coverage';
      
      // Create coverage directory
      execSync(`mkdir -p ${coverageDir}`, { stdio: 'inherit' });
      
      // Generate coverage report
      if (process.env.COVERAGE_TOOL === 'c8') {
        execSync(`c8 report --reporter=text --reporter=html --output=${coverageDir}`, { stdio: 'inherit' });
      } else {
        // Fallback to nyc
        execSync(`nyc report --reporter=text --reporter=html --report-dir=${coverageDir}`, { stdio: 'inherit' });
      }
      
      console.log(`✅ BDD coverage report generated in ${coverageDir}`);
    } catch (error) {
      console.warn('⚠️  Failed to generate BDD coverage report:', error);
    }
  }
});

// Export coverage utilities for step definitions
export const CoverageUtils = {
  /**
   * Mark a function as covered for testing
   */
  markCovered(functionName: string) {
    if (globalThis.__coverage__) {
      // This would need to be implemented based on the coverage tool being used
      console.log(`📈 Marking ${functionName} as covered`);
    }
  },

  /**
   * Get current coverage statistics
   */
  getCoverageStats() {
    if (globalThis.__coverage__) {
      const files = Object.keys(globalThis.__coverage__);
      return {
        filesCovered: files.length,
        totalFunctions: Object.values(globalThis.__coverage__).reduce((sum, file) => 
          sum + Object.keys(file).filter(key => key.startsWith('fn')).length, 0
        )
      };
    }
    return null;
  }
};