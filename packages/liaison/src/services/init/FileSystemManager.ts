import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import inquirer from "inquirer";

export class FileSystemManager {
  /**
   * Safely create the project directory
   */
  async ensureProjectDirectory(projectDir: string, isCurrentDir: boolean): Promise<void> {
    if (await fs.pathExists(projectDir) && !isCurrentDir) {
      const files = await fs.readdir(projectDir);
      if (files.length > 0) {
        throw new Error(`Directory ${path.basename(projectDir)} already exists and is not empty`);
      }
    }
    await fs.ensureDir(projectDir);
  }

  /**
   * Create the .cody directory structure
   */
  async createStructure(projectDir: string): Promise<string> {
    const codyDir = path.join(projectDir, ".cody");
    await fs.ensureDir(codyDir);
    await fs.ensureDir(path.join(codyDir, "commands"));
    await fs.ensureDir(path.join(codyDir, "config"));
    await fs.ensureDir(path.join(codyDir, "hooks"));
    return codyDir;
  }

  /**
   * Write a configuration file safely (prompting before overwrite)
   */
  async safeWriteConfig(
    filePath: string, 
    content: any, 
    type: 'json' | 'text' = 'json'
  ): Promise<boolean> {
    let shouldWrite = true;

    if (await fs.pathExists(filePath)) {
      const answers = await inquirer.prompt([
        {
          type: "confirm",
          name: "overwrite",
          message: `${path.basename(filePath)} already exists. Overwrite?`,
          default: false,
        },
      ]);
      shouldWrite = answers.overwrite;
    }

    if (shouldWrite) {
      if (await fs.pathExists(filePath)) {
        console.log(chalk.yellow(`⚠️  Overwriting ${path.basename(filePath)}...`));
      }
      
      if (type === 'json') {
        await fs.writeJSON(filePath, content, { spaces: 2 });
      } else {
        await fs.writeFile(filePath, content);
      }
      return true;
    }
    
    console.log(chalk.yellow(`⚠️  Skipping ${path.basename(filePath)} creation.`));
    return false;
  }

  /**
   * Update .gitignore by appending missing entries
   */
  async updateGitignore(projectDir: string, requiredEntries: string[]): Promise<void> {
    const gitignorePath = path.join(projectDir, ".gitignore");
    
    // Default content for new files
    const defaultContent = `
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
`.trim();

    if (await fs.pathExists(gitignorePath)) {
      const existingContent = await fs.readFile(gitignorePath, "utf-8");
      const lines = requiredEntries.join('\n').split('\n'); // handle multi-line entries
      const missingLines: string[] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && !existingContent.includes(trimmed)) {
          missingLines.push(trimmed);
        }
      }

      if (missingLines.length > 0) {
        console.log(chalk.blue("📝 Appending missing entries to .gitignore..."));
        await fs.appendFile(gitignorePath, "\n# OpenCode/Liaison\n" + missingLines.join('\n') + "\n");
      }
    } else {
      await fs.writeFile(gitignorePath, defaultContent);
    }
  }
}
