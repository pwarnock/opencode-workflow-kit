#!/usr/bin/env bun
/**
 * Test script to validate ESLint configuration across all packages
 * Ensures consistent ESLint versions and proper configuration
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

const PACKAGES_DIR = 'packages';

function testEsLintConfiguration() {
    console.log('🧪 Testing ESLint configuration consistency...');

    // Get all packages
    const packages = readdirSync(PACKAGES_DIR).filter(dir => {
        const packageJsonPath = join(PACKAGES_DIR, dir, 'package.json');
        return existsSync(packageJsonPath);
    });

    let hasLintScripts = false;
    let eslintVersions = new Set();
    let missingEsLint = [];

    for (const pkg of packages) {
        const packageJsonPath = join(PACKAGES_DIR, pkg, 'package.json');
        let packageJson;

        try {
            packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
        } catch (error) {
            console.error(`❌ Failed to parse package.json for ${pkg}:`, error);
            return false;
        }

        // Check if package has lint script
        if (packageJson.scripts && packageJson.scripts.lint) {
            hasLintScripts = true;

            // Check if ESLint is in dependencies
            const hasEsLint = (
                (packageJson.dependencies && 'eslint' in packageJson.dependencies) ||
                (packageJson.devDependencies && 'eslint' in packageJson.devDependencies)
            );

            if (!hasEsLint) {
                missingEsLint.push(pkg);
            }

            // Track ESLint version
            if (packageJson.devDependencies && packageJson.devDependencies.eslint) {
                eslintVersions.add(packageJson.devDependencies.eslint);
            }
        }
    }

    // Validate results
    if (missingEsLint.length > 0) {
        console.error(`❌ Packages with lint scripts but missing ESLint: ${missingEsLint.join(', ')}`);
        return false;
    }

    if (eslintVersions.size > 1) {
        console.error(`❌ Inconsistent ESLint versions: ${Array.from(eslintVersions).join(', ')}`);
        return false;
    }

    if (eslintVersions.size === 1) {
        console.log(`✅ Consistent ESLint version: ${Array.from(eslintVersions)[0]}`);
    }

    console.log('✅ All ESLint configuration tests passed!');
    return true;
}

function main() {
    const success = testEsLintConfiguration();
    if (!success) {
        console.error('💥 ESLint configuration test failed!');
        process.exit(1);
    }
    console.log('🎉 ESLint configuration is valid!');
}

main();