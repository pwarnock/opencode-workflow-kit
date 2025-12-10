import chalk from "chalk";
import inquirer from "inquirer";
import path from "path";
import { ProjectDetector } from "./ProjectDetector.js";
import { FileSystemManager } from "./FileSystemManager.js";
import { ConfigFactory } from "./ConfigFactory.js";
import { BeadsClientImpl } from "../../utils/beads.js";
import {
  PACKAGE_METADATA,
  getInitMessage,
} from "../../config/package-metadata.js";

export class InitOrchestrator {
  private detector: ProjectDetector;
  private fsManager: FileSystemManager;
  private configFactory: ConfigFactory;

  constructor() {
    this.detector = new ProjectDetector();
    this.fsManager = new FileSystemManager();
    this.configFactory = new ConfigFactory();
  }

  async run(options: any) {
    // Graceful Exit Handler
    process.on("SIGINT", () => {
      console.log(chalk.yellow("\n🚫 Operation cancelled by user."));
      process.exit(0);
    });

    console.log(chalk.blue(`🚀 ${getInitMessage()}...`));

    try {
      await this.checkPrerequisites(options.installBeads);

      const { projectName, isInPlace } = await this.determineProjectContext(
        options.name,
      );
      const templateType = await this.determineTemplate(options.template);

      const projectDir = path.join(
        process.cwd(),
        projectName === "." ? "" : projectName,
      );

      await this.executeInitialization(
        projectName,
        projectDir,
        templateType,
        isInPlace,
      );

      this.printSuccess(projectName, projectDir);
    } catch (error) {
      if (error instanceof Error && error.message.includes("force closed")) {
        console.log(chalk.yellow("\n🚫 Operation cancelled."));
        return;
      }
      console.error(chalk.red("❌ Initialization failed:"), error);
      process.exit(1);
    }
  }

  private async checkPrerequisites(installBeads: boolean) {
    const beadsAvailable = await BeadsClientImpl.isAvailable();
    if (!beadsAvailable) {
      if (installBeads) {
        // Logic to install beads could go here, for now warn
        console.log(
          chalk.yellow("⚠️  @beads/bd is not available. Please install it."),
        );
      } else {
        console.log(
          chalk.yellow(
            "⚠️  @beads/bd is not available. Please run `bun install` in the monorepo root.",
          ),
        );
        process.exit(1);
      }
    }
  }

  private async determineProjectContext(
    nameOption?: string,
  ): Promise<{ projectName: string; isInPlace: boolean }> {
    let projectName = nameOption;
    let isInPlace = false;

    // Check for existing package.json
    const existingProject = await this.detector.detectCurrentProject();

    if (!projectName && existingProject) {
      const answers = await inquirer.prompt([
        {
          type: "confirm",
          name: "initInPlace",
          message: `Found project "${existingProject.name || "unnamed"}" in current directory. Initialize here?`,
          default: true,
        },
      ]);
      isInPlace = answers.initInPlace;
    }

    if (isInPlace) {
      projectName = ".";
    } else if (!projectName) {
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

    return { projectName: projectName!, isInPlace };
  }

  private async determineTemplate(templateOption?: string): Promise<string> {
    if (templateOption) return templateOption;

    const answers = await inquirer.prompt([
      {
        type: "list",
        name: "template",
        message: "Choose template:",
        choices: ["minimal", "web-development", "python-development"],
        default: "minimal",
      },
    ]);
    return answers.template;
  }

  private async executeInitialization(
    projectName: string,
    projectDir: string,
    templateType: string,
    isInPlace: boolean,
  ) {
    const realName =
      projectName === "." ? path.basename(process.cwd()) : projectName;

    // 1. Create Directory
    await this.fsManager.ensureProjectDirectory(projectDir, isInPlace);

    // 2. Create .cody Structure
    const codyDir = await this.fsManager.createStructure(projectDir);

    // 3. Write project.json
    const projectConfig = this.configFactory.createProjectConfig(realName);
    await this.fsManager.safeWriteConfig(
      path.join(codyDir, "config", "project.json"),
      projectConfig,
    );

    // 4. Write Documentation
    const docs = this.configFactory.createBeadsSyncDoc();
    await this.fsManager.safeWriteConfig(
      path.join(codyDir, "commands", "beads-sync.md"),
      docs,
      "text",
    );

    // 5. Detect Git & Write Main Config
    const gitMetadata = this.detector.getGitMetadata();
    const mainConfig = this.configFactory.createCodyBeadsConfig(
      projectName,
      templateType,
      gitMetadata,
    );
    await this.fsManager.safeWriteConfig(
      path.join(projectDir, "cody-beads.config.json"),
      mainConfig,
    );

    // 6. Update .gitignore
    await this.fsManager.updateGitignore(
      projectDir,
      this.configFactory.getRequiredGitignoreEntries(),
    );
  }

  private printSuccess(projectName: string, projectDir: string) {
    const displayDir = projectName === "." ? "Current Directory" : projectDir;

    console.log(chalk.green(`✅ Project initialized successfully!`));
    console.log(chalk.gray(`  Location: ${displayDir}`));
    console.log(chalk.gray("  Next steps:"));
    if (projectName !== ".") {
      console.log(chalk.gray(`    cd ${projectName}`));
    }
    console.log(chalk.gray(`    ${PACKAGE_METADATA.cliName} config setup`));
  }
}
