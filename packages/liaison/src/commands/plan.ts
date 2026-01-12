import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import inquirer from 'inquirer';

export function createPlanCommand(): Command {
  const command = new Command('plan')
    .description('Start the Liaison Plan phase - define your project vision and scope')
    .option('--overwrite', 'Overwrite existing plan files')
    .option('--continue', 'Continue with existing plan files')
    .option('--quit', 'Exit without changes')
    .action(async (options) => {
      const isTTY = process.stdin.isTTY && process.stdout.isTTY;
      const spinner = ora('Starting Liaison Plan phase...').start();

      try {
        const projectRoot = process.cwd();
        const codyDir = join(projectRoot, '.cody');
        const planDir = join(codyDir, 'project', 'plan');

        const planFiles = ['discovery.md', 'prd.md', 'plan.md'];
        const existingFiles = planFiles.filter(f => existsSync(join(planDir, f)));

        spinner.text = 'Initializing plan structure...';

        mkdirSync(planDir, { recursive: true });
        mkdirSync(join(codyDir, 'project', 'build'), { recursive: true });
        mkdirSync(join(codyDir, 'library', 'assets'), { recursive: true });
        mkdirSync(join(codyDir, 'library', 'docs'), { recursive: true });

        const discoveryPath = join(planDir, 'discovery.md');
        const prdPath = join(planDir, 'prd.md');
        const planPath = join(planDir, 'plan.md');

        if (existingFiles.length > 0) {
          const hasOverwrite = options.overwrite === true;
          const hasContinue = options.continue === true;
          const hasQuit = options.quit === true;

          if (hasOverwrite) {
            spinner.stop();
            planFiles.forEach(f => {
              const path = join(planDir, f);
              if (existsSync(path)) {
                unlinkSync(path);
              }
            });
            writeFileSync(discoveryPath, getDefaultDiscoveryTemplate());
            writeFileSync(prdPath, getDefaultPrdTemplate());
            writeFileSync(planPath, getDefaultPlanTemplate());
            console.log(chalk.green('✅ Plan re-initialized with fresh templates'));
            return;
          }

          if (hasContinue) {
            spinner.stop();
            console.log(chalk.gray('\nTo continue, edit existing documents or run:'));
            console.log(chalk.cyan('  liaison build'));
            return;
          }

          if (hasQuit) {
            spinner.stop();
            console.log(chalk.gray('Exiting without changes'));
            return;
          }

          if (isTTY) {
            spinner.stop();
            console.log(chalk.yellow('⚠️  Plan phase already started'));
            console.log(chalk.gray('Existing documents:'));
            existingFiles.map(f => chalk.cyan(f)).forEach(f => console.log(`  - ${f}`));

            const { action } = await inquirer.prompt([{
              type: 'list',
              name: 'action',
              message: 'What would you like to do?',
              choices: [
                { name: 'Continue with existing documents', value: 'continue' },
                { name: 'Overwrite and start fresh', value: 'overwrite' },
                { name: 'Quit', value: 'quit' }
              ]
            }]);

            if (action === 'continue') {
              console.log(chalk.gray('\nTo continue, edit existing documents or run:'));
              console.log(chalk.cyan('  liaison build'));
              return;
            }

            if (action === 'overwrite') {
              spinner.start('Re-initializing plan...');
              planFiles.forEach(f => {
                const path = join(planDir, f);
                if (existsSync(path)) {
                  unlinkSync(path);
                }
              });
              writeFileSync(discoveryPath, getDefaultDiscoveryTemplate());
              writeFileSync(prdPath, getDefaultPrdTemplate());
              writeFileSync(planPath, getDefaultPlanTemplate());
              spinner.succeed(chalk.green('✅ Plan re-initialized with fresh templates'));
              return;
            }

            if (action === 'quit') {
              console.log(chalk.gray('Exiting without changes'));
              return;
            }
          } else {
            spinner.stop();
            console.log(chalk.gray('\nTo continue, edit existing documents or run:'));
            console.log(chalk.cyan('  liaison build'));
            return;
          }
        }

        if (!existsSync(discoveryPath)) {
          writeFileSync(discoveryPath, getDefaultDiscoveryTemplate());
        }
        if (!existsSync(prdPath)) {
          writeFileSync(prdPath, getDefaultPrdTemplate());
        }
        if (!existsSync(planPath)) {
          writeFileSync(planPath, getDefaultPlanTemplate());
        }

        spinner.succeed(chalk.green('✅ Liaison Plan initialized'));

        console.log(chalk.bold('\n+-----------------+'));
        console.log(chalk.bold('PLAN PHASE : START'));
        console.log(chalk.bold('+-----------------+'));
        console.log();
        console.log(chalk.gray('📁 Liaison Plan: ') + chalk.cyan(planDir));
        console.log();
        console.log(chalk.blue('💡 Edit ') + chalk.cyan(join(planDir, 'discovery.md')) + chalk.blue(' to define your project'));
        console.log();
        console.log(chalk.cyan('  liaison build') + chalk.gray(' → when ready to create feature backlog'));

      } catch (error) {
        spinner.fail(chalk.red('Plan initialization failed'));
        console.error(chalk.red(error));
        process.exit(1);
      }
    });

  return command;
}

function getDefaultDiscoveryTemplate(): string {
  return `# Discovery Document

**Created:** ${new Date().toISOString()}

## Target Users
-

## Problem Being Solved
-

## Desired Outcome
-

## Success Criteria
-

## Primary Use Cases
-

## Must-Have Features (v1.0)
-

## Constraints
-

## Risks & Assumptions
-
`;
}

function getDefaultPrdTemplate(): string {
  return `# Product Requirements Document

**Created:** ${new Date().toISOString()}

## Overview
-

## Goals
-

## Non-Goals
-

## User Stories
-

## Functional Requirements
-

## Non-Functional Requirements
-

## Risks & Dependencies
-
`;
}

function getDefaultPlanTemplate(): string {
  return `# Implementation Plan

**Created:** ${new Date().toISOString()}

## Objectives
-

## Milestones
-

## Workstreams
-

## Deliverables
-

## Dependencies
-

## Rollout Plan
-

## Success Metrics
-
`;
}
