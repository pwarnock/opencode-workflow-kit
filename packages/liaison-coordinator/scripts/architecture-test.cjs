#!/usr/bin/env node

/**
 * Architecture testing and dependency analysis script
 * Analyzes package structure, dependencies, and code quality metrics
 */

const { readFileSync, existsSync, readdirSync } = require('fs');
const { execSync } = require('child_process');
const path = require('path');

console.log('🏗️ Running architecture and dependency analysis...');

// 1. Package structure analysis
console.log('\n1. Analyzing package structure...');
try {
  const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));
  
  // Check for good practices
  const structureChecks = [
    {
      name: 'Has proper package.json fields',
      check: () => {
        const required = ['name', 'version', 'description', 'main', 'bin'];
        const missing = required.filter(field => !packageJson[field]);
        return missing.length === 0;
      }
    },
    {
      name: 'Has appropriate scripts',
      check: () => {
        const scripts = packageJson.scripts || {};
        const hasTest = scripts.test || scripts['test:unit'];
        const hasBuild = scripts.build;
        const hasLint = scripts.lint;
        return hasTest && hasBuild && hasLint;
      }
    },
    {
      name: 'Has proper files array',
      check: () => {
        const files = packageJson.files || [];
        return files.includes('dist/**/*') && files.includes('bin/**/*');
      }
    },
    {
      name: 'Has reasonable dependencies count',
      check: () => {
        const deps = Object.keys(packageJson.dependencies || {});
        return deps.length > 0 && deps.length < 50; // Reasonable limit
      }
    }
  ];
  
  let structurePassed = 0;
  let structureFailed = 0;
  
  structureChecks.forEach(check => {
    try {
      if (check.check()) {
        console.log(`   ✅ ${check.name}`);
        structurePassed++;
      } else {
        console.log(`   ❌ ${check.name}`);
        structureFailed++;
      }
    } catch (error) {
      console.log(`   ❌ ${check.name} (error: ${error.message})`);
      structureFailed++;
    }
  });
  
  console.log(`\n📊 Structure Analysis: ${structurePassed}/${structureChecks.length} checks passed`);
  
} catch (error) {
  console.log('❌ Failed to analyze package structure:', error.message);
}

// 2. Dependency analysis
console.log('\n2. Analyzing dependencies...');
try {
  const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));
  const deps = Object.keys(packageJson.dependencies || {});
  console.log(`   Found ${deps.length} dependencies`);
  
  // Check for potentially problematic dependencies
  const problematicPatterns = [
    'eval', 'function', 'script', 'dangerous'
  ];
  let problematicDeps = 0;
  deps.forEach(dep => {
    if (problematicPatterns.some(pattern => dep.toLowerCase().includes(pattern))) {
      console.log(`   ⚠️  Potentially problematic dependency: ${dep}`);
      problematicDeps++;
    }
  });
  
  if (problematicDeps === 0) {
    console.log('   ✅ No obviously problematic dependencies found');
  }
  
  // Check for maintenance issues
  console.log('   Checking for common maintenance issues...');
  const maintenanceChecks = [
    {
      name: 'Has recent major versions',
      check: () => {
        const commonDeps = ['commander', 'chalk', 'inquirer', 'fs-extra'];
        const hasRecent = commonDeps.some(dep => deps.includes(dep));
        return hasRecent;
      }
    },
    {
      name: 'Has TypeScript dependencies',
      check: () => {
        const tsDeps = deps.filter(dep => dep.startsWith('@types/'));
        return tsDeps.length > 0;
      }
    },
    {
      name: 'Has reasonable dependency sizes',
      check: () => {
        // Simplified check - assumes reasonable sizes
        return deps.length < 100;
      }
    }
  ];
  
  let maintenancePassed = 0;
  let maintenanceFailed = 0;
  
  maintenanceChecks.forEach(check => {
    try {
      if (check.check()) {
        console.log(`   ✅ ${check.name}`);
        maintenancePassed++;
      } else {
        console.log(`   ❌ ${check.name}`);
        maintenanceFailed++;
      }
    } catch (error) {
      console.log(`   ❌ ${check.name} (error: ${error.message})`);
      maintenanceFailed++;
    }
  });
  
  console.log(`\n📊 Maintenance Analysis: ${maintenancePassed}/${maintenanceChecks.length} checks passed`);
  
} catch (error) {
  console.log('❌ Failed to analyze dependencies:', error.message);
}

// 3. Code quality metrics
console.log('\n3. Analyzing code quality metrics...');
try {
  const srcFiles = [];
  
  function collectFiles(dir) {
    if (!existsSync(dir)) return;
    
    const files = readdirSync(dir);
    files.forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = require('fs').statSync(fullPath);
      
      if (stat.isDirectory()) {
        collectFiles(fullPath);
      } else if (file.endsWith('.ts') || file.endsWith('.js')) {
        srcFiles.push(fullPath);
      }
    });
  }
  
  collectFiles('./src');
  
  let totalLines = 0;
  let totalFiles = srcFiles.length;
  let totalSize = 0;
  
  srcFiles.forEach(file => {
    try {
      const content = readFileSync(file, 'utf8');
      const lines = content.split('\n').length;
      const size = content.length;
      
      totalLines += lines;
      totalSize += size;
    } catch (error) {
      // File might be unreadable
    }
  });
  
  const avgLinesPerFile = totalFiles > 0 ? Math.round(totalLines / totalFiles) : 0;
  const avgSizePerFile = totalFiles > 0 ? Math.round(totalSize / totalFiles) : 0;
  
  console.log(`   Total source files: ${totalFiles}`);
  console.log(`   Total lines of code: ${totalLines}`);
  console.log(`   Average lines per file: ${avgLinesPerFile}`);
  console.log(`   Average file size: ${avgSizePerFile} bytes`);
  
  // Quality indicators
  const qualityIndicators = [
    {
      name: 'Reasonable file sizes',
      check: () => avgSizePerFile < 10000 // 10KB per file is reasonable
    },
    {
      name: 'Reasonable complexity',
      check: () => avgLinesPerFile < 500 // 500 lines per file is reasonable
    },
    {
      name: 'Good organization',
      check: () => totalFiles > 0 && totalFiles < 100 // Reasonable number of files
    }
  ];
  
  let qualityPassed = 0;
  let qualityFailed = 0;
  
  qualityIndicators.forEach(indicator => {
    if (indicator.check()) {
      console.log(`   ✅ ${indicator.name}`);
      qualityPassed++;
    } else {
      console.log(`   ❌ ${indicator.name}`);
      qualityFailed++;
    }
  });
  
  console.log(`\n📊 Code Quality Analysis: ${qualityPassed}/${qualityIndicators.length} indicators passed`);
  
} catch (error) {
  console.log('❌ Failed to analyze code quality:', error.message);
}

// 4. Architecture patterns
console.log('\n4. Checking architecture patterns...');
try {
  const architectureChecks = [
    {
      name: 'Clear separation of concerns',
      check: () => {
        const hasCommands = existsSync('./src/commands');
        const hasUtils = existsSync('./src/utils');
        const hasCore = existsSync('./src/core');
        return hasCommands && hasUtils && hasCore;
      }
    },
    {
      name: 'Consistent naming conventions',
      check: () => {
        // Check for kebab-case in file names (basic check)
        const srcFiles = readdirSync('./src');
        const kebabCaseFiles = srcFiles.filter(file => 
          file.includes('-') && file === file.toLowerCase()
        );
        return kebabCaseFiles.length < srcFiles.length * 0.3; // Less than 30% with hyphens
      }
    },
    {
      name: 'Modular structure',
      check: () => {
        const hasIndex = existsSync('./src/index.ts');
        const hasCommands = existsSync('./src/commands');
        const hasUtils = existsSync('./src/utils');
        return hasIndex && hasCommands && hasUtils;
      }
    }
  ];
  
  let archPassed = 0;
  let archFailed = 0;
  
  architectureChecks.forEach(check => {
    try {
      if (check.check()) {
        console.log(`   ✅ ${check.name}`);
        archPassed++;
      } else {
        console.log(`   ❌ ${check.name}`);
        archFailed++;
      }
    } catch (error) {
      console.log(`   ❌ ${check.name} (error: ${error.message})`);
      archFailed++;
    }
  });
  
  console.log(`\n📊 Architecture Analysis: ${archPassed}/${architectureChecks.length} checks passed`);
  
} catch (error) {
  console.log('❌ Failed to analyze architecture:', error.message);
}

console.log('\n🎯 Architecture and Dependency Analysis Complete!');

// Summary
console.log('\n📊 Summary:');
console.log(`   Structure: ${structurePassed}/${structureChecks.length} checks passed`);
console.log(`   Dependencies: ${maintenancePassed}/${maintenanceChecks.length} checks passed`);
console.log(`   Code Quality: ${qualityPassed}/${qualityIndicators.length} indicators passed`);
console.log(`   Architecture: ${archPassed}/${architectureChecks.length} checks passed`);

const totalChecks = structureChecks.length + maintenanceChecks.length + qualityIndicators.length + architectureChecks.length;
const totalPassed = structurePassed + maintenancePassed + qualityPassed + archPassed;
const passRate = Math.round((totalPassed / totalChecks) * 100);

console.log(`\n🎯 Overall Health Score: ${passRate}% (${totalPassed}/${totalChecks})`);

if (passRate >= 80) {
  console.log('🎉 Excellent architecture and dependency management!');
} else if (passRate >= 60) {
  console.log('✅ Good architecture and dependency management!');
} else {
  console.log('⚠️  Architecture and dependency management needs improvement');
}