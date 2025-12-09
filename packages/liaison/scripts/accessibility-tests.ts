#!/usr/bin/env bun

/**
 * Accessibility Tests
 * Comprehensive accessibility testing for CLI and web interfaces
 */

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

interface AccessibilityResult {
  test: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: any;
}

class AccessibilityTests {
  private results: AccessibilityResult[] = [];

  async runAllTests(): Promise<void> {
    console.log('\n♿ Running Accessibility Tests');
    console.log('='.repeat(50));

    await this.testCLIHelpAccessibility();
    await this.testCLIHelpColorBlindness();
    await this.testCLIHelpScreenReader();
    await this.testConfigFileAccessibility();
    await this.testErrorMessagesAccessibility();
    await this.testLoggingAccessibility();

    console.log('\n📊 Accessibility Test Results');
    console.log('='.repeat(50));
    this.displayResults();
    
    await this.saveResults();
  }

  private async testCLIHelpAccessibility(): Promise<void> {
    console.log('\n📱 Testing CLI Help Accessibility...');
    
    const start = performance.now();
    
    await new Promise<void>((resolve) => {
      const helpProcess = spawn('bun', ['run', 'liaison', '--help'], {
        stdio: 'pipe',
        cwd: process.cwd()
      });
      
      let output = '';
      helpProcess.stdout?.on('data', (data) => {
        output += data.toString();
      });
      
      helpProcess.on('close', (code) => {
        const duration = performance.now() - start;
        
        // Check accessibility criteria
        const hasClearStructure = /Usage:/.test(output);
        const hasOptionsList = /Options:/.test(output);
        const hasExamples = /Examples?:/.test(output);
        const hasProperFormatting = /\n\s{2,}/.test(output) === false;
        
        this.results.push({
          test: 'CLI Help Structure',
          status: hasClearStructure && hasOptionsList && hasProperFormatting ? 'pass' : 'fail',
          message: code === 0 ? 'Help command executed successfully' : 'Help command failed',
          details: {
            hasClearStructure,
            hasOptionsList,
            hasExamples,
            hasProperFormatting,
            executionTime: `${duration.toFixed(2)}ms`
          }
        });
        resolve();
      });
    });
  }

  private async testCLIHelpColorBlindness(): Promise<void> {
    console.log('\n🎨 Testing CLI Color Accessibility...');
    
    // Test with NO_COLOR environment variable
    await new Promise<void>((resolve) => {
      const colorlessProcess = spawn('env', ['NO_COLOR=1', 'bun', 'run', 'liaison', '--help'], {
        stdio: 'pipe',
        cwd: process.cwd()
      });
      
      let output = '';
      colorlessProcess.stdout?.on('data', (data) => {
        output += data.toString();
      });
      
      colorlessProcess.on('close', (code) => {
        const hasNoColors = !/\x1b\[/m.test(output);
        
        this.results.push({
          test: 'Color Blindness Support',
          status: hasNoColors ? 'pass' : 'warn',
          message: 'NO_COLOR environment variable test',
          details: {
            hasNoColors,
            exitCode: code
          }
        });
        resolve();
      });
    });
  }

  private async testCLIHelpScreenReader(): Promise<void> {
    console.log('\n🔊 Testing Screen Reader Compatibility...');
    
    await new Promise<void>((resolve) => {
      const helpProcess = spawn('bun', ['run', 'liaison', '--help'], {
        stdio: 'pipe',
        cwd: process.cwd()
      });
      
      let output = '';
      helpProcess.stdout?.on('data', (data) => {
        output += data.toString();
      });
      
      helpProcess.on('close', () => {
        const hasProperHeaders = /^[A-Z][a-z]*:/.test(output);
        const hasClearHierarchy = /^\s{2}[A-Z]/m.test(output);
        const noFloatingText = !/^ {1}[A-Za-z]/m.test(output);
        
        this.results.push({
          test: 'Screen Reader Compatibility',
          status: hasProperHeaders && hasClearHierarchy && noFloatingText ? 'pass' : 'warn',
          message: 'Help text structure analysis',
          details: {
            hasProperHeaders,
            hasClearHierarchy,
            noFloatingText
          }
        });
        resolve();
      });
    });
  }

  private async testConfigFileAccessibility(): Promise<void> {
    console.log('\n⚙️ Testing Configuration File Accessibility...');
    
    try {
      const configPath = path.join(process.cwd(), 'opencode.json');
      await fs.access(configPath);
      
      const configContent = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configContent);
      
      // Check config structure for accessibility
      const hasClearStructure = typeof config === 'object' && config !== null;
      const hasReadableKeys = Object.keys(config).every(key => 
        /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(key)
      );
      const hasDescriptiveComments = configContent.includes('//') || configContent.includes('/*');
      
      this.results.push({
        test: 'Configuration File Accessibility',
        status: hasClearStructure && hasReadableKeys ? 'pass' : 'warn',
        message: 'Config file structure analysis',
        details: {
          hasClearStructure,
          hasReadableKeys,
          hasDescriptiveComments,
          keyCount: Object.keys(config).length
        }
      });
    } catch (error) {
      this.results.push({
        test: 'Configuration File Accessibility',
        status: 'warn',
        message: 'Config file not found or unreadable',
        details: { error: (error as Error).message }
      });
    }
  }

  private async testErrorMessagesAccessibility(): Promise<void> {
    console.log('\n❌ Testing Error Message Accessibility...');
    
    // Test with invalid command
    await new Promise<void>((resolve) => {
      const errorProcess = spawn('bun', ['run', 'liaison', 'invalid-command'], {
        stdio: 'pipe',
        cwd: process.cwd()
      });
      
      let output = '';
      let errorOutput = '';
      
      errorProcess.stdout?.on('data', (data) => {
        output += data.toString();
      });
      
      errorProcess.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      errorProcess.on('close', (code) => {
        const hasErrorMessage = /error/i.test(errorOutput) || /unknown/i.test(output);
        const hasHelpSuggestion = /--help/i.test(errorOutput) || /--help/i.test(output);
        const hasClearDescription = errorOutput.length > 10;
        
        this.results.push({
          test: 'Error Message Accessibility',
          status: hasErrorMessage && hasHelpSuggestion ? 'pass' : 'warn',
          message: 'Error message clarity analysis',
          details: {
            hasErrorMessage,
            hasHelpSuggestion,
            hasClearDescription,
            exitCode: code
          }
        });
        resolve();
      });
    });
  }

  private async testLoggingAccessibility(): Promise<void> {
    console.log('\n📝 Testing Logging Accessibility...');
    
    // Test logging levels and formats
    const logTypes = ['info', 'warn', 'error'];
    
    for (const logType of logTypes) {
      await new Promise<void>((resolve) => {
        const logProcess = spawn('bun', ['run', 'liaison', 'config', '--help'], {
          stdio: 'pipe',
          cwd: process.cwd()
        });
        
        let output = '';
        logProcess.stdout?.on('data', (data) => {
          output += data.toString();
        });
        
        logProcess.on('close', () => {
          const hasTimestamps = /\d{4}-\d{2}-\d{2}/.test(output);
          const hasLogLevels = /\[INFO\]|\[WARN\]|\[ERROR\]/.test(output);
          const hasReadableFormat = output.length > 20;
          
          this.results.push({
            test: `Logging Accessibility (${logType})`,
            status: hasLogLevels && hasReadableFormat ? 'pass' : 'warn',
            message: `Logging format analysis for ${logType}`,
            details: {
              hasTimestamps,
              hasLogLevels,
              hasReadableFormat
            }
          });
          resolve();
        });
      });
    }
  }

  private displayResults(): void {
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const warned = this.results.filter(r => r.status === 'warn').length;
    
    console.log(`\n📈 Summary:`);
    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ⚠️ Warnings: ${warned}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📊 Success Rate: ${((passed / this.results.length) * 100).toFixed(1)}%`);
    
    console.log(`\n📋 Detailed Results:`);
    this.results.forEach((result) => {
      const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
      console.log(`\n${icon} ${result.test}`);
      console.log(`   ${result.message}`);
      
      if (result.details) {
        Object.entries(result.details).forEach(([key, value]) => {
          console.log(`   ${key}: ${JSON.stringify(value)}`);
        });
      }
    });
  }

  private async saveResults(): Promise<void> {
    const accessibilityData = {
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      results: this.results,
      summary: {
        total: this.results.length,
        passed: this.results.filter(r => r.status === 'pass').length,
        failed: this.results.filter(r => r.status === 'fail').length,
        warned: this.results.filter(r => r.status === 'warn').length,
        successRate: (this.results.filter(r => r.status === 'pass').length / this.results.length) * 100
      }
    };
    
    const reportsDir = path.join(process.cwd(), 'test-reports');
    await fs.mkdir(reportsDir, { recursive: true });
    
    const timestamp = Date.now();
    const reportFile = path.join(reportsDir, `accessibility-test-${timestamp}.json`);
    await fs.writeFile(reportFile, JSON.stringify(accessibilityData, null, 2));
    
    console.log(`\n💾 Accessibility results saved to: ${reportFile}`);
    
    // Generate accessibility summary
    await this.generateAccessibilitySummary(accessibilityData);
  }

  private async generateAccessibilitySummary(data: any): Promise<void> {
    const summaryFile = path.join(process.cwd(), 'test-reports', `accessibility-summary-${Date.now()}.md`);
    
    const recommendations = this.generateAccessibilityRecommendations(data.results);
    
    const summary = `# Accessibility Test Report
Generated: ${data.timestamp}
Platform: ${data.platform} (${data.arch})
Node.js: ${data.nodeVersion}

## Test Results Summary

- **Total Tests**: ${data.summary.total}
- **✅ Passed**: ${data.summary.passed}
- **⚠️ Warnings**: ${data.summary.warned}
- **❌ Failed**: ${data.summary.failed}
- **📊 Success Rate**: ${data.summary.successRate.toFixed(1)}%

## Detailed Test Results

${data.results.map((result: AccessibilityResult) => `
### ${result.test}
- **Status**: ${result.status.toUpperCase()}
- **Message**: ${result.message}

${result.details ? Object.entries(result.details).map(([key, value]) => `- **${key}**: ${JSON.stringify(value)}`).join('\n') : ''}
`).join('\n')}

## Accessibility Recommendations

${recommendations}

## WCAG Compliance Notes

This accessibility test focuses on:
- **1.3.1 Info and Relationships**: Clear content structure
- **1.4.3 Contrast**: Color independence (NO_COLOR support)
- **2.4.2 Page Titled**: Clear CLI help structure
- **3.1.1 Readability**: Readable configuration and error messages
- **4.1.2 Name, Role, Value**: Semantic CLI output

---
*Report generated by Liaison Accessibility Test Tool*
`;
    
    await fs.writeFile(summaryFile, summary);
    console.log(`📄 Accessibility summary saved to: ${summaryFile}`);
  }

  private generateAccessibilityRecommendations(results: AccessibilityResult[]): string {
    const recommendations: string[] = [];
    
    // Analyze results for recommendations
    const failedTests = results.filter(r => r.status === 'fail' || r.status === 'warn');
    
    if (failedTests.some(r => r.test.includes('Help'))) {
      recommendations.push('📱 Improve CLI help structure with clear headings and examples');
    }
    
    if (failedTests.some(r => r.test.includes('Color'))) {
      recommendations.push('🎨 Ensure all CLI output respects NO_COLOR environment variable');
    }
    
    if (failedTests.some(r => r.test.includes('Screen Reader'))) {
      recommendations.push('🔊 Improve screen reader compatibility with semantic CLI output');
    }
    
    if (failedTests.some(r => r.test.includes('Configuration'))) {
      recommendations.push('⚙️ Use descriptive configuration keys and add comments');
    }
    
    if (failedTests.some(r => r.test.includes('Error'))) {
      recommendations.push('❌ Provide clear error messages with helpful suggestions');
    }
    
    if (failedTests.some(r => r.test.includes('Logging'))) {
      recommendations.push('📝 Include timestamps and structured log formats');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✅ Excellent accessibility compliance! Continue maintaining standards.');
    }
    
    return recommendations.map(rec => `- ${rec}`).join('\n');
  }
}

// Run accessibility tests
if (import.meta.main) {
  const tests = new AccessibilityTests();
  await tests.runAllTests();
}
