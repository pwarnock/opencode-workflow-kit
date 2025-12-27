/**
 * Skill Command
 * CLI command: liaison skill
 * Manage Agent Skills (init, create, list, validate, to-prompt, migrate)
 * Implements Agent Skills standard: https://agentskills.io/specification
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import {
  validateSkill,
  discoverSkills,
  generateAvailableSkillsXml,
  createSymlink,
  supportsSymlinks,
  generateSkillTemplate,
  type SkillValidationResult,
} from '../utils/skill-utils';

/**
 * Create the skill command and all subcommands
 */
export function createSkillCommand(): Command {
  const command = new Command('skill');

  command.description('Manage Agent Skills');

  // liaison skill init
  command
    .command('init')
    .description('Initialize Agent Skills in this project')
    .option('--global', 'Initialize globally (~/.skills/)')
    .option('--copy', 'Copy instead of symlink (Windows compatibility)')
    .option('--location <path>', 'Custom skills location')
    .action(initSkills);

  // liaison skill create
  command
    .command('create <name>')
    .description('Create a new skill')
    .option('--description <text>', 'Skill description')
    .option('--template <type>', 'Skill template (workflow, library, qa, deployment)', 'workflow')
    .option('--location <path>', 'Create skill at custom location')
    .action(createSkill);

  // liaison skill list
  command
    .command('list')
    .description('List available skills')
    .option('--format <fmt>', 'Output format (table, json, xml)', 'table')
    .option('--location <path>', 'Search specific location')
    .action(listSkills);

  // liaison skill validate
  command
    .command('validate [path]')
    .description('Validate a skill')
    .option('--fix', 'Attempt to fix common issues')
    .action(validateSkillCmd);

  // liaison skill to-prompt
  command
    .command('to-prompt')
    .description('Generate <available_skills> XML for agent prompts')
    .option('--format <fmt>', 'Output format (xml, json)', 'xml')
    .option('--location <path>', 'Search specific location')
    .action(toPromptCmd);

  // liaison skill migrate
  command
    .command('migrate <source>')
    .description('Migrate agent knowledge to skill format')
    .option('--type <type>', 'Source type (markdown, subagent)', 'markdown')
    .option('--location <path>', 'Create skill at custom location')
    .action(migrateSkill);

  return command;
}

/**
 * Initialize skills in project or globally
 */
async function initSkills(options: any): Promise<void> {
  const spinner = ora('Initializing Agent Skills...').start();

  try {
    const isGlobal = options.global;
    const useCopy = options.copy;
    const skillsDir = options.location || (isGlobal ? resolve(process.env.HOME || '~', '.skills') : '.skills');

    // Ensure .skills directory exists
    spinner.text = `Creating ${skillsDir} directory...`;
    await fs.mkdir(skillsDir, { recursive: true });

    // Create README if not exists
    const readmePath = join(skillsDir, 'README.md');
    try {
      await fs.access(readmePath);
    } catch {
      spinner.text = 'Creating README.md...';
      await fs.writeFile(readmePath, '# Agent Skills\n\nThis directory contains reusable skills for AI agents.\n');
    }

    // Define symlink targets
    const symlinkTargets = [
      { source: skillsDir, target: isGlobal ? '~/.opencode/skill' : '.opencode/skill' },
      { source: skillsDir, target: isGlobal ? '~/.claude/skills' : '.claude/skills' },
      { source: skillsDir, target: isGlobal ? '~/.github/skills' : '.github/skills' },
      { source: skillsDir, target: isGlobal ? '~/.agents/skills' : '.agents/skills' },
      { source: skillsDir, target: isGlobal ? '~/.goose/skills' : '.goose/skills' },
    ];

    // Create symlinks
    if (useCopy || !supportsSymlinks()) {
      spinner.text = 'Copying skills directory for compatibility...';
      // TODO: Implement copy logic when needed
      spinner.warn('Copy mode not yet implemented, using symlinks');
    } else {
      spinner.text = 'Creating compatibility symlinks...';
      for (const { source, target } of symlinkTargets) {
        const resolvedTarget = target.replace('~', process.env.HOME || '~');
        try {
          await createSymlink(resolve(source), resolvedTarget);
        } catch (e) {
          spinner.warn(
            chalk.yellow(`Could not create symlink ${target}: ${e instanceof Error ? e.message : String(e)}`),
          );
        }
      }
    }

    // Update .gitignore if not global
    if (!isGlobal) {
      spinner.text = 'Updating .gitignore...';
      const gitignorePath = '.gitignore';
      try {
        let gitignore = await fs.readFile(gitignorePath, 'utf-8');
        if (!gitignore.includes('.opencode/skill')) {
          gitignore += '\n# Agent Skills symlink directories\n.opencode/skill\n.claude/skills\n.github/skills\n.agents/skills\n.goose/skills\n';
          await fs.writeFile(gitignorePath, gitignore);
        }
      } catch {
        spinner.warn('Could not update .gitignore');
      }
    }

    spinner.succeed(chalk.green('✅ Agent Skills initialized successfully'));
    console.log(chalk.blue('\n📚 Next steps:'));
    console.log(`  1. Create a skill: ${chalk.cyan('liaison skill create <name>')}`);
    console.log(`  2. List skills: ${chalk.cyan('liaison skill list')}`);
    console.log(`  3. Learn more: ${chalk.cyan('https://agentskills.io')}`);
  } catch (error) {
    spinner.fail(
      chalk.red(
        `Failed to initialize skills: ${error instanceof Error ? error.message : String(error)}`,
      ),
    );
    process.exit(1);
  }
}

/**
 * Create a new skill
 */
async function createSkill(name: string, options: any): Promise<void> {
  const spinner = ora('Creating skill...').start();

  try {
    // Validate skill name
    if (!name.match(/^[a-z0-9]+(-[a-z0-9]+)*$/)) {
      spinner.fail(chalk.red('Invalid skill name. Use lowercase alphanumeric with hyphens only.'));
      process.exit(1);
    }

    const skillsDir = options.location || '.skills';
    const skillPath = join(skillsDir, name);

    // Check if skill already exists
    try {
      await fs.access(skillPath);
      spinner.fail(chalk.red(`Skill "${name}" already exists at ${skillPath}`));
      process.exit(1);
    } catch {
      // Good, doesn't exist yet
    }

    // Create skill directory
    spinner.text = 'Creating skill directory...';
    await fs.mkdir(skillPath, { recursive: true });

    // Create subdirectories
    await fs.mkdir(join(skillPath, 'references'), { recursive: true });
    await fs.mkdir(join(skillPath, 'scripts'), { recursive: true });
    await fs.mkdir(join(skillPath, 'assets'), { recursive: true });

    // Generate and write SKILL.md
    spinner.text = 'Creating SKILL.md...';
    const skillContent = generateSkillTemplate(
      name,
      options.description || `Skill: ${name}`,
      options.template,
    );
    await fs.writeFile(join(skillPath, 'SKILL.md'), skillContent);

    // Create .gitkeep files for empty directories
    await fs.writeFile(join(skillPath, 'references', '.gitkeep'), '');
    await fs.writeFile(join(skillPath, 'scripts', '.gitkeep'), '');
    await fs.writeFile(join(skillPath, 'assets', '.gitkeep'), '');

    spinner.succeed(chalk.green(`✅ Skill "${name}" created successfully`));
    console.log(chalk.blue('\n📝 Next steps:'));
    console.log(`  1. Edit: ${chalk.cyan(`${skillPath}/SKILL.md`)}`);
    console.log(`  2. Add references: ${chalk.cyan(`${skillPath}/references/`)}`);
    console.log(`  3. Add scripts: ${chalk.cyan(`${skillPath}/scripts/`)}`);
    console.log(`  4. Validate: ${chalk.cyan(`liaison skill validate ${skillPath}`)}`);
  } catch (error) {
    spinner.fail(
      chalk.red(
        `Failed to create skill: ${error instanceof Error ? error.message : String(error)}`,
      ),
    );
    process.exit(1);
  }
}

/**
 * List available skills
 */
async function listSkills(options: any): Promise<void> {
  const spinner = ora('Discovering skills...').start();

  try {
    const locations = options.location ? [options.location] : ['.skills'];
    const skills = await discoverSkills({ locations });

    spinner.stop();

    if (skills.length === 0) {
      console.log(chalk.yellow('No skills found. Run: liaison skill create <name>'));
      return;
    }

    if (options.format === 'json') {
      console.log(JSON.stringify(skills, null, 2));
    } else if (options.format === 'xml') {
      console.log(generateAvailableSkillsXml(skills));
    } else {
      // Table format
      console.log(chalk.bold('\nAvailable Skills:\n'));
      const table = skills
        .map(
          (skill) =>
            `  ${chalk.cyan(skill.name.padEnd(30))} ${skill.description.substring(0, 60)}`,
        )
        .join('\n');
      console.log(table);
      console.log(`\n  Total: ${chalk.green(skills.length)} skill(s)\n`);
    }
  } catch (error) {
    spinner.fail(
      chalk.red(
        `Failed to list skills: ${error instanceof Error ? error.message : String(error)}`,
      ),
    );
    process.exit(1);
  }
}

/**
 * Validate a skill
 */
async function validateSkillCmd(path?: string): Promise<void> {
  const skillPath = path || '.skills';
  const spinner = ora('Validating skill...').start();

  try {
    const result: SkillValidationResult = await validateSkill(skillPath);

    spinner.stop();

    if (!result.valid) {
      console.log(chalk.red(`\n❌ Skill validation failed:\n`));
      for (const error of result.errors) {
        console.log(
          chalk.red(`  • ${error.message}${error.suggestion ? ` (${error.suggestion})` : ''}`),
        );
      }
    } else {
      console.log(chalk.green(`✅ Skill is valid\n`));
    }

    if (result.warnings.length > 0) {
      console.log(chalk.yellow('⚠️  Warnings:\n'));
      for (const warning of result.warnings) {
        console.log(chalk.yellow(`  • ${warning.message}`));
      }
    }

    if (!result.valid) {
      process.exit(1);
    }
  } catch (error) {
    spinner.fail(
      chalk.red(
        `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
      ),
    );
    process.exit(1);
  }
}

/**
 * Generate <available_skills> XML for agent prompts
 */
async function toPromptCmd(options: any): Promise<void> {
  const spinner = ora('Generating agent prompt...').start();

  try {
    const locations = options.location ? [options.location] : ['.skills'];
    const skills = await discoverSkills({ locations });

    spinner.stop();

    if (options.format === 'json') {
      console.log(JSON.stringify(skills, null, 2));
    } else {
      console.log(generateAvailableSkillsXml(skills));
    }
  } catch (error) {
    spinner.fail(
      chalk.red(
        `Failed to generate prompt: ${error instanceof Error ? error.message : String(error)}`,
      ),
    );
    process.exit(1);
  }
}

/**
 * Migrate agent knowledge to skill format
 */
async function migrateSkill(source: string, options: any): Promise<void> {
  const spinner = ora('Migrating to skill format...').start();

  try {
    const sourceContent = await fs.readFile(source, 'utf-8');
    const skillsDir = options.location || '.skills';

    // Extract filename without extension
    const skillName = source.split('/').pop()?.replace(/\.(md|json)$/, '').toLowerCase() || 'migrated-skill';

    spinner.text = `Creating skill from ${source}...`;

    const skillPath = join(skillsDir, skillName);
    await fs.mkdir(skillPath, { recursive: true });

    // Create basic SKILL.md from the content
    const skillMdContent = `---
name: ${skillName}
description: Migrated from ${source}
license: MIT
metadata:
  migrated_from: "${source}"
---

# ${skillName}

## Original Content

${sourceContent}
`;

    await fs.writeFile(join(skillPath, 'SKILL.md'), skillMdContent);

    spinner.succeed(chalk.green(`✅ Skill "${skillName}" created`));
    console.log(chalk.blue(`\nNext: Edit ${skillPath}/SKILL.md to complete the migration\n`));
  } catch (error) {
    spinner.fail(
      chalk.red(
        `Migration failed: ${error instanceof Error ? error.message : String(error)}`,
      ),
    );
    process.exit(1);
  }
}
