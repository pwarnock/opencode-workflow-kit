---
name: cli-development
description: CLI development patterns with Commander.js, argument parsing, and user experience best practices. Use when creating commands, handling options, formatting output, or building CLI tools.
license: MIT
metadata:
  author: liaison-toolkit
  version: "1.0"
  keywords: "cli, commander.js, argument-parsing, user-experience, terminal"
---

# CLI Development

Patterns and best practices for building command-line interfaces using Commander.js, with focus on argument parsing, user experience, and output formatting.

## When to use this skill

Use this skill when:
- Creating new CLI commands or subcommands
- Adding options, arguments, or flags to commands
- Parsing and validating user input
- Formatting CLI output (spinners, colors, tables)
- Handling errors and exit codes
- Writing help text and usage documentation

## Commander.js Command Patterns

### Basic Command Structure

```typescript
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';

export function createMyCommand(): Command {
  const command = new Command('mycommand');
  
  command
    .description('Brief description of what this command does')
    .option('-f, --force', 'Force operation without confirmation')
    .option('-o, --output <path>', 'Output file path')
    .action(handleMyCommand);
    
  return command;
}

async function handleMyCommand(options: any): Promise<void> {
  const spinner = ora('Processing...').start();
  
  try {
    // Command logic here
    spinner.succeed(chalk.green('✅ Operation completed'));
  } catch (error) {
    spinner.fail(chalk.red(`❌ Failed: ${error instanceof Error ? error.message : String(error)}`));
    process.exit(1);
  }
}
```

### Subcommands Pattern

From `packages/liaison/src/commands/skill.ts`:

```typescript
export function createSkillCommand(): Command {
  const command = new Command('skill');
  command.description('Manage Agent Skills');
  
  // Subcommand: liaison skill init
  command
    .command('init')
    .description('Initialize Agent Skills in this project')
    .option('--global', 'Initialize globally (~/.skills/)')
    .option('--copy', 'Copy instead of symlink (Windows compatibility)')
    .option('--location <path>', 'Custom skills location')
    .action(initSkills);
  
  // Subcommand: liaison skill create <name>
  command
    .command('create <name>')
    .description('Create a new skill')
    .option('--description <text>', 'Skill description')
    .option('--template <type>', 'Skill template (workflow, library, qa, deployment)', 'workflow')
    .option('--location <path>', 'Create skill at custom location')
    .action(createSkill);
    
  return command;
}
```

## Argument and Option Patterns

### Required Arguments

```typescript
command
  .command('create <name>')  // Required argument
  .action((name: string, options: any) => {
    console.log(`Creating: ${name}`);
  });
```

### Optional Arguments

```typescript
command
  .command('validate [path]')  // Optional argument (square brackets)
  .action((path?: string) => {
    const targetPath = path || '.skills';
  });
```

### Options with Values

```typescript
command
  .option('-o, --output <path>', 'Output file path')        // Required value
  .option('-t, --template <type>', 'Template type', 'workflow')  // With default
  .option('--format [fmt]', 'Output format', 'table')        // Optional value
```

### Boolean Flags

```typescript
command
  .option('-f, --force', 'Force operation')
  .option('--no-cache', 'Disable caching')  // Boolean negation
```

## Input Validation

### Validate Arguments

```typescript
async function createSkill(name: string, options: any): Promise<void> {
  const spinner = ora('Creating skill...').start();
  
  // Validate skill name format
  if (!name.match(/^[a-z0-9]+(-[a-z0-9]+)*$/)) {
    spinner.fail(chalk.red('Invalid skill name. Use lowercase alphanumeric with hyphens only.'));
    process.exit(1);
  }
  
  // Check if already exists
  try {
    await fs.access(skillPath);
    spinner.fail(chalk.red(`Skill "${name}" already exists at ${skillPath}`));
    process.exit(1);
  } catch {
    // Good, doesn't exist yet
  }
  
  // Proceed with creation...
}
```

### Validate Options

```typescript
async function listSkills(options: any): Promise<void> {
  const validFormats = ['table', 'json', 'xml'];
  
  if (options.format && !validFormats.includes(options.format)) {
    console.error(chalk.red(`Invalid format: ${options.format}`));
    console.error(chalk.yellow(`Valid formats: ${validFormats.join(', ')}`));
    process.exit(1);
  }
  
  // Proceed...
}
```

## Output Formatting

### Using Spinners (ora)

```typescript
import ora from 'ora';

const spinner = ora('Loading...').start();

// Update spinner text
spinner.text = 'Processing items...';

// Success
spinner.succeed(chalk.green('✅ Operation completed'));

// Warning
spinner.warn(chalk.yellow('⚠️  Warning message'));

// Failure
spinner.fail(chalk.red('❌ Operation failed'));

// Stop without status
spinner.stop();
```

### Using Colors (chalk)

```typescript
import chalk from 'chalk';

console.log(chalk.green('Success message'));
console.log(chalk.yellow('Warning message'));
console.log(chalk.red('Error message'));
console.log(chalk.blue('Info message'));
console.log(chalk.cyan('Highlight text'));
console.log(chalk.bold('Bold text'));
```

### Table Output

From `packages/liaison/src/commands/skill.ts:252-260`:

```typescript
// Format list as table
console.log(chalk.bold('\nAvailable Skills:\n'));
const table = skills
  .map(skill =>
    `  ${chalk.cyan(skill.name.padEnd(30))} ${skill.description.substring(0, 60)}`
  )
  .join('\n');
console.log(table);
console.log(`\n  Total: ${chalk.green(skills.length)} skill(s)\n`);
```

### JSON Output

```typescript
if (options.format === 'json') {
  console.log(JSON.stringify(result, null, 2));
  return;
}
```

## Error Handling

### Graceful Error Messages

```typescript
try {
  await performOperation();
} catch (error) {
  console.error(chalk.red(`\n❌ Operation failed:\n`));
  console.error(chalk.red(`  ${error instanceof Error ? error.message : String(error)}`));
  
  if (options.verbose && error instanceof Error && error.stack) {
    console.error(chalk.dim('\nStack trace:'));
    console.error(chalk.dim(error.stack));
  }
  
  process.exit(1);
}
```

### Exit Codes

```typescript
// Success
process.exit(0);

// General error
process.exit(1);

// Invalid usage
process.exit(2);

// Validation error
process.exit(3);
```

## Help Text and Documentation

### Command Description

```typescript
command
  .description('Create a new skill')  // Brief one-liner
  .usage('[options] <name>')          // Usage pattern
  .addHelpText('after', `
Examples:
  $ liaison skill create my-skill
  $ liaison skill create my-skill --template library
  $ liaison skill create my-skill --description "My custom skill"
  `);
```

### Custom Help

```typescript
command.addHelpCommand(false);  // Disable default help command

command.on('--help', () => {
  console.log('');
  console.log('Additional Information:');
  console.log('  This command creates a new skill following the Agent Skills standard');
  console.log('  Learn more: https://agentskills.io');
});
```

## Common Patterns

### Confirmation Prompts

```typescript
import readline from 'readline';

async function confirmAction(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise(resolve => {
    rl.question(`${message} (y/N): `, answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

// Usage
if (!options.force && await confirmAction('Delete all data?')) {
  await deleteData();
}
```

### Progress Indicators

```typescript
for (let i = 0; i < items.length; i++) {
  spinner.text = `Processing item ${i + 1} of ${items.length}...`;
  await processItem(items[i]);
}
```

### Verbose Mode

```typescript
function log(message: string, verbose: boolean = false): void {
  if (verbose) {
    console.log(chalk.dim(`[DEBUG] ${message}`));
  }
}

// Usage
command.option('-v, --verbose', 'Enable verbose output');

async function myAction(options: any): Promise<void> {
  log('Starting operation...', options.verbose);
  // ...
}
```

## Verification

After implementing CLI features:
- [ ] Help text is clear and shows examples
- [ ] All options have descriptions
- [ ] Input validation provides helpful error messages
- [ ] Output is formatted consistently (colors, spinners)
- [ ] Exit codes are appropriate (0 for success, non-zero for errors)
- [ ] Error messages are user-friendly (no raw stack traces)
- [ ] Commands work with `--help` flag
- [ ] Progress feedback for long operations

## Examples from liaison-toolkit

### Example 1: Skill Create Command

```typescript
// packages/liaison/src/commands/skill.ts:168-226
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

    spinner.succeed(chalk.green(`✅ Skill "${name}" created successfully`));
    console.log(chalk.blue('\n📝 Next steps:'));
    console.log(`  1. Edit: ${chalk.cyan(`${skillPath}/SKILL.md`)}`);
    console.log(`  2. Add references: ${chalk.cyan(`${skillPath}/references/`)}`);
    console.log(`  3. Validate: ${chalk.cyan(`liaison skill validate ${skillPath}`)}`);
  } catch (error) {
    spinner.fail(
      chalk.red(
        `Failed to create skill: ${error instanceof Error ? error.message : String(error)}`,
      ),
    );
    process.exit(1);
  }
}
```

### Example 2: Skill List Command

```typescript
// packages/liaison/src/commands/skill.ts:232-269
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
```

## Related Resources

- [Commander.js Documentation](https://github.com/tj/commander.js)
- [chalk (Terminal colors)](https://github.com/chalk/chalk)
- [ora (Spinners)](https://github.com/sindresorhus/ora)
- [Node.js readline](https://nodejs.org/api/readline.html)
- CLI UX best practices: 12 Factor CLI Apps
