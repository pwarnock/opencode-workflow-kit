import fs from "fs-extra";
import path from "path";
import { execSync } from "child_process";
import chalk from "chalk";

export interface GitMetadata {
  owner: string;
  repo: string;
  url: string;
}

export interface ProjectContext {
  name: string;
  path: string;
  isCurrentDir: boolean;
  packageJson?: any;
  gitMetadata?: GitMetadata;
}

export class ProjectDetector {
  /**
   * Check for package.json in the current directory
   */
  async detectCurrentProject(): Promise<any | null> {
    const packageJsonPath = path.join(process.cwd(), "package.json");
    if (await fs.pathExists(packageJsonPath)) {
      try {
        return await fs.readJSON(packageJsonPath);
      } catch (error) {
        console.warn(
          chalk.yellow("⚠️  Found package.json but could not read it"),
        );
        return null;
      }
    }
    return null;
  }

  /**
   * Infer Git metadata from local git configuration
   */
  getGitMetadata(): GitMetadata | undefined {
    try {
      const gitUrl = execSync("git remote get-url origin", {
        encoding: "utf8",
        stdio: "pipe",
      }).trim();

      // Support SSH (git@github.com:user/repo.git) and HTTPS (https://github.com/user/repo.git)
      const match = gitUrl.match(/[:/]([^/]+)\/([^/.]+)(?:\.git)?$/);

      if (match) {
        return {
          owner: match[1],
          repo: match[2],
          url: gitUrl,
        };
      }
    } catch (e) {
      // Ignore git errors (not a git repo or no origin)
    }
    return undefined;
  }
}
