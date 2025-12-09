#!/usr/bin/env node

/**
 * Simple Mutation Testing Script
 * 
 * A lightweight mutation testing approach using existing tools
 * without the complexity of full mutation testing frameworks.
 */

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { glob } from 'glob';

// Simple mutation patterns
const MUTATIONS = [
  { type: 'binary', pattern: /===/g, replacement: '!==' },
  { type: 'binary', pattern: /!==/g, replacement: '===' },
  { type: 'binary', pattern: />/g, replacement: '<=' },
  { type: 'binary', pattern: /</g, replacement: '>=' },
  { type: 'logical', pattern: /&&/g, replacement: '||' },
  { type: 'logical', pattern: /\|\|/g, replacement: '&&' },
  { type: 'arithmetic', pattern: /\+/g, replacement: '-' },
  { type: 'arithmetic', pattern: /-/g, replacement: '+' },
  { type: 'return', pattern: /return true/g, replacement: 'return false' },
  { type: 'return', pattern: /return false/g, replacement: 'return true' }
];

class SimpleMutationTester {
  results = {
    total: 0,
    killed: 0,
    survived: 0,
    errors: 0,
    mutations: [] as Array<{
      file: string;
      type: string;
      pattern: string;
      status: string;
      message: string;
    }>
  };

  async run() {
    console.log('🧬 Starting Simple Mutation Testing...\n');

    // Find source files (exclude tests)
    const sourceFiles = await glob('src/**/*.ts', {
      ignore: ['**/*.test.ts', '**/*.spec.ts', '**/test/**']
    });

    console.log(`📁 Found ${sourceFiles.length} source files`);

    for (const file of sourceFiles) {
      await this.testFile(file);
    }

    this.printReport();
  }

  async testFile(filePath: string) {
    try {
      const originalContent = readFileSync(filePath, 'utf-8');
      
      // Apply mutations one by one
      for (const mutation of MUTATIONS) {
        if (!mutation.pattern.test(originalContent)) continue;

        const mutatedContent = originalContent.replace(mutation.pattern, mutation.replacement);
        
        // Skip if mutation didn't change anything
        if (mutatedContent === originalContent) continue;

        this.results.total++;
        
        // Apply mutation
        writeFileSync(filePath, mutatedContent);
        
        try {
          // Run tests
          execSync('bun run test:unit', { 
            stdio: 'pipe',
            timeout: 30000 
          });
          
          // Tests passed - mutation survived
          this.results.survived++;
          this.results.mutations.push({
            file: filePath,
            type: mutation.type,
            pattern: mutation.pattern.source,
            status: 'SURVIVED',
            message: 'Tests passed - mutation survived'
          });
          
        } catch (error) {
          // Tests failed - mutation killed
          this.results.killed++;
          this.results.mutations.push({
            file: filePath,
            type: mutation.type,
            pattern: mutation.pattern.source,
            status: 'KILLED',
            message: 'Tests failed - mutation killed'
          });
        }
        
        // Restore original content
        writeFileSync(filePath, originalContent);
      }
    } catch (error) {
      this.results.errors++;
      console.error(`❌ Error processing ${filePath}:`, error.message);
    }
  }

  printReport() {
    console.log('\n🧬 Mutation Testing Report');
    console.log('='.repeat(50));
    
    const score = this.results.total > 0 ? 
      Math.round((this.results.killed / this.results.total) * 100) : 0;
    
    console.log(`\n📊 Summary:`);
    console.log(`   Total Mutations: ${this.results.total}`);
    console.log(`   Killed: ${this.results.killed} 🎯`);
    console.log(`   Survived: ${this.results.survived} 🧟`);
    console.log(`   Errors: ${this.results.errors} ❌`);
    console.log(`   Mutation Score: ${score}%`);
    
    if (this.results.survived > 0) {
      console.log(`\n🧟 Survived Mutations (need better tests):`);
      this.results.mutations
        .filter(m => m.status === 'SURVIVED')
        .forEach((m: any) => {
          console.log(`   ${m.file}:${m.type} - ${m.pattern}`);
        });
    }
    
    console.log(`\n🎯 Quality Assessment:`);
    if (score >= 80) {
      console.log(`   ✅ Excellent test quality (${score}%)`);
    } else if (score >= 60) {
      console.log(`   ⚠️  Good test quality (${score}%) - some improvements needed`);
    } else {
      console.log(`   ❌ Poor test quality (${score}%) - significant improvements needed`);
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new SimpleMutationTester();
  tester.run().catch(console.error);
}

export { SimpleMutationTester };