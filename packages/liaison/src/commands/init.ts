import chalk from "chalk";
import inquirer from "inquirer";
import path from "path";
import fs from "fs-extra";

import { BeadsClientImpl } from "../utils/beads.js";

/**
 * Init Command - Initialize new cody-beads integration project
 */
import { Command } from "commander";

export const initCommand = new Command("init")
  .description("Initialize new cody-beads integration project")
  .option("-t, --template <type>", "Template type", "minimal")
  .option("-n, --name <name>", "Project name")
  .option("--install-beads", "Install @beads/bd if not available")

  .action(async (options) => {
    console.log(
      chalk.blue("🚀 Initializing cody-beads integration project..."),
    );

    try {
      let projectName = options.name;
      let templateType = options.template;

      // Check if @beads/bd is available
      const beadsAvailable = await BeadsClientImpl.isAvailable();
      if (!beadsAvailable) {
        console.log(
          chalk.yellow("⚠️  @beads/bd is not available. Please run `bun install` in the monorepo root."),
        );
        process.exit(1);
      }

      if (!projectName) {
        const answers = await inquirer.prompt([
          {
            type: "input",
            name: "name",
            message: "Project name:",
            validate: (input: string) =>
              input.trim() !== "" || "Project name is required",
          },
        ]);
        projectName = answers.name;
      }

      if (!templateType) {
        const answers = await inquirer.prompt([
          {
            type: "list",
            name: "template",
            message: "Choose template:",
            choices: ["minimal", "web-development", "python-development"],
            default: "minimal",
          },
        ]);
        templateType = answers.template;
      }

      const projectDir = path.join(process.cwd(), projectName);

      if (await fs.pathExists(projectDir)) {
        console.error(chalk.red(`❌ Directory ${projectName} already exists`));
        process.exit(1);
      }

      await fs.ensureDir(projectDir);

      // Create .cody directory structure
      const codyDir = path.join(projectDir, ".cody");
      await fs.ensureDir(codyDir);
      await fs.ensureDir(path.join(codyDir, "commands"));
      await fs.ensureDir(path.join(codyDir, "config"));
      await fs.ensureDir(path.join(codyDir, "hooks"));

      // Create basic .cody structure
      await fs.writeJSON(
        path.join(codyDir, "config", "project.json"),
        {
          name: projectName,
          version: "1.0.0",
          description: `${projectName} - Cody PBT project`,
          integrations: {
            beads: {
              enabled: true,
              autoSync: false,
              syncInterval: 60,
            },
          },
        },
        { spaces: 2 },
      );

      // Create Cody command for Beads sync
      await fs.writeFile(
        path.join(codyDir, "commands", "beads-sync.md"),
        `# Beads Sync Command

Syncs Cody PBT issues with Beads for unified task management.

## Usage
\`\`\`bash
cody beads-sync [options]
\`\`\`

## Options
- \`--dry-run\` - Show what would be synced without executing
- \`--direction <cody-to-beads|beads-to-cody|bidirectional>\` - Sync direction
- \`--force\` - Force sync and skip conflict resolution

## Integration
This command integrates with the cody-beads CLI tool to provide seamless synchronization between Cody PBT and Beads issue tracking.
`,
      );

      // Create basic structure
      const config = {
        version: "1.0.0",
        github: {
          owner: "${GITHUB_OWNER}",
          repo: projectName,
        },
        cody: {
          projectId: "${CODY_PROJECT_ID}",
          apiUrl: "https://api.cody.ai",
        },
        beads: {
          projectPath: `./${projectName}`,
          autoSync: false,
          syncInterval: 60,
        },
        sync: {
          defaultDirection: "bidirectional" as const,
          conflictResolution: "manual" as const,
          preserveComments: true,
          preserveLabels: true,
          syncMilestones: false,
        },
        templates: {
          defaultTemplate: templateType,
        },
      };

      await fs.writeJSON(
        path.join(projectDir, "cody-beads.config.json"),
        config,
        { spaces: 2 },
      );
      await fs.writeFile(
        path.join(projectDir, ".gitignore"),
        `
# Dependencies
node_modules/
.venv/
__pycache__/
*.pyc

# Configuration
cody-beads.config.json
.env

# Logs
*.log
logs/

# OS
.DS_Store
Thumbs.db
      `.trim(),
      );

      console.log(
        chalk.green(`✅ Project ${projectName} initialized successfully!`),
      );
      console.log(chalk.gray(`  Directory: ${projectDir}`));
      console.log(chalk.gray("  Next steps:"));
      console.log(chalk.gray(`    cd ${projectName}`));
      console.log(chalk.gray("    liaison config setup"));

    } catch (error) {
      console.error(chalk.red("❌ Initialization failed:"), error);
      process.exit(1);
    }
  });
