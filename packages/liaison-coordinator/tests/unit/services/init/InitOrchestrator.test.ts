import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { InitOrchestrator } from "../../../../src/services/init/InitOrchestrator.js";
import { ProjectDetector } from "../../../../src/services/init/ProjectDetector.js";
import { FileSystemManager } from "../../../../src/services/init/FileSystemManager.js";
import { ConfigFactory } from "../../../../src/services/init/ConfigFactory.js";
import { BeadsClientImpl } from "../../../../src/utils/beads.js";
import inquirer from "inquirer";
import chalk from "chalk";
import path from "path";

describe("InitOrchestrator", () => {
  let orchestrator: InitOrchestrator;
  let mockDetector: ProjectDetector;
  let mockFsManager: FileSystemManager;
  let mockConfigFactory: ConfigFactory;

  beforeEach(() => {
    orchestrator = new InitOrchestrator();
    mockDetector = orchestrator["detector"];
    mockFsManager = orchestrator["fsManager"];
    mockConfigFactory = orchestrator["configFactory"];

    // Mock console methods
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("run", () => {
    it("should handle SIGINT gracefully", async () => {
      // Mock process.on to capture the SIGINT handler
      const mockProcessOn = vi.fn();
      vi.spyOn(process, "on").mockImplementation(mockProcessOn);

      // Mock other dependencies
      vi.spyOn(BeadsClientImpl, "isAvailable").mockResolvedValue(true);
      vi.spyOn(mockDetector, "detectCurrentProject").mockResolvedValue(null);
      vi.spyOn(inquirer, "prompt").mockResolvedValue({ name: "test-project" });
      vi.spyOn(mockFsManager, "ensureProjectDirectory").mockResolvedValue(
        undefined,
      );
      vi.spyOn(mockFsManager, "createStructure").mockResolvedValue(
        "/tmp/test-project/.cody",
      );
      vi.spyOn(mockConfigFactory, "createProjectConfig").mockReturnValue({});
      vi.spyOn(mockConfigFactory, "createBeadsSyncDoc").mockReturnValue(
        "# Test",
      );
      vi.spyOn(mockConfigFactory, "createCodyBeadsConfig").mockReturnValue({});
      vi.spyOn(
        mockConfigFactory,
        "getRequiredGitignoreEntries",
      ).mockReturnValue([]);
      vi.spyOn(mockFsManager, "safeWriteConfig").mockResolvedValue(true);
      vi.spyOn(mockFsManager, "updateGitignore").mockResolvedValue(undefined);

      // Start the run method
      const runPromise = orchestrator.run({});

      // Simulate SIGINT
      const sigintHandler = mockProcessOn.mock.calls.find(
        (call) => call[0] === "SIGINT",
      )?.[1];
      if (sigintHandler) {
        sigintHandler();
      }

      // The process should exit gracefully
      await expect(runPromise).resolves.not.toThrow();
    });

    it("should handle errors gracefully and exit with code 1", async () => {
      const error = new Error("Test error");

      vi.spyOn(BeadsClientImpl, "isAvailable").mockRejectedValue(error);

      // Mock process.exit to prevent actual exit
      const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {});

      await orchestrator.run({});

      expect(mockExit).toHaveBeenCalledWith(1);
      expect(console.error).toHaveBeenCalledWith(
        chalk.red("❌ Initialization failed:"),
        error,
      );
    });

    it("should handle force closed errors gracefully", async () => {
      const error = new Error("force closed");

      vi.spyOn(BeadsClientImpl, "isAvailable").mockRejectedValue(error);

      await orchestrator.run({});

      expect(console.log).toHaveBeenCalledWith(
        chalk.yellow("\n🚫 Operation cancelled."),
      );
    });
  });

  describe("checkPrerequisites", () => {
    it("should exit when beads is not available and installBeads is false", async () => {
      vi.spyOn(BeadsClientImpl, "isAvailable").mockResolvedValue(false);
      const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {});

      await orchestrator["checkPrerequisites"](false);

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it("should warn when beads is not available and installBeads is true", async () => {
      vi.spyOn(BeadsClientImpl, "isAvailable").mockResolvedValue(false);

      await orchestrator["checkPrerequisites"](true);

      expect(console.log).toHaveBeenCalledWith(
        chalk.yellow("⚠️  @beads/bd is not available. Please install it."),
      );
    });

    it("should proceed when beads is available", async () => {
      vi.spyOn(BeadsClientImpl, "isAvailable").mockResolvedValue(true);

      await orchestrator["checkPrerequisites"](false);

      // Should not exit or warn
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining("@beads/bd is not available"),
      );
    });
  });

  describe("determineProjectContext", () => {
    it("should use provided name option", async () => {
      const result =
        await orchestrator["determineProjectContext"]("test-project");

      expect(result).toEqual({ projectName: "test-project", isInPlace: false });
    });

    it("should prompt for project name when no option and no existing project", async () => {
      vi.spyOn(mockDetector, "detectCurrentProject").mockResolvedValue(null);
      vi.spyOn(inquirer, "prompt").mockResolvedValue({
        name: "prompted-project",
      });

      const result = await orchestrator["determineProjectContext"]();

      expect(result).toEqual({
        projectName: "prompted-project",
        isInPlace: false,
      });
      expect(inquirer.prompt).toHaveBeenCalled();
    });

    it("should prompt for in-place initialization when existing project is detected", async () => {
      const existingProject = { name: "existing-project" };
      vi.spyOn(mockDetector, "detectCurrentProject").mockResolvedValue(
        existingProject,
      );
      vi.spyOn(inquirer, "prompt").mockResolvedValue({ initInPlace: true });

      const result = await orchestrator["determineProjectContext"]();

      expect(result).toEqual({ projectName: ".", isInPlace: true });
      expect(inquirer.prompt).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringContaining("existing-project"),
          }),
        ]),
      );
    });

    it("should prompt for project name when user declines in-place initialization", async () => {
      const existingProject = { name: "existing-project" };
      vi.spyOn(mockDetector, "detectCurrentProject").mockResolvedValue(
        existingProject,
      );
      vi.spyOn(inquirer, "prompt").mockResolvedValueOnce({
        initInPlace: false,
      });
      vi.spyOn(inquirer, "prompt").mockResolvedValueOnce({
        name: "new-project",
      });

      const result = await orchestrator["determineProjectContext"]();

      expect(result).toEqual({ projectName: "new-project", isInPlace: false });
    });

    it("should validate project name input", async () => {
      const existingProject = { name: "existing-project" };
      vi.spyOn(mockDetector, "detectCurrentProject").mockResolvedValue(
        existingProject,
      );
      vi.spyOn(inquirer, "prompt").mockResolvedValueOnce({
        initInPlace: false,
      });
      vi.spyOn(inquirer, "prompt").mockResolvedValueOnce({ name: "" });

      await expect(orchestrator["determineProjectContext"]()).rejects.toThrow(
        "Project name is required",
      );
    });
  });

  describe("determineTemplate", () => {
    it("should use provided template option", async () => {
      const result = await orchestrator["determineTemplate"]("web-development");

      expect(result).toBe("web-development");
    });

    it("should prompt for template when no option provided", async () => {
      vi.spyOn(inquirer, "prompt").mockResolvedValue({
        template: "python-development",
      });

      const result = await orchestrator["determineTemplate"]();

      expect(result).toBe("python-development");
      expect(inquirer.prompt).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            choices: ["minimal", "web-development", "python-development"],
          }),
        ]),
      );
    });

    it("should default to minimal template", async () => {
      vi.spyOn(inquirer, "prompt").mockResolvedValue({ template: "minimal" });

      const result = await orchestrator["determineTemplate"]();

      expect(result).toBe("minimal");
    });
  });

  describe("executeInitialization", () => {
    it("should execute all initialization steps successfully", async () => {
      const projectName = "test-project";
      const projectDir = "/tmp/test-project";
      const templateType = "minimal";
      const isInPlace = false;

      // Mock all the dependencies
      vi.spyOn(mockFsManager, "ensureProjectDirectory").mockResolvedValue(
        undefined,
      );
      vi.spyOn(mockFsManager, "createStructure").mockResolvedValue(
        "/tmp/test-project/.cody",
      );
      vi.spyOn(mockConfigFactory, "createProjectConfig").mockReturnValue({
        name: projectName,
      });
      vi.spyOn(mockConfigFactory, "createBeadsSyncDoc").mockReturnValue(
        "# Beads Sync",
      );
      vi.spyOn(mockConfigFactory, "createCodyBeadsConfig").mockReturnValue({
        version: "1.0.0",
      });
      vi.spyOn(
        mockConfigFactory,
        "getRequiredGitignoreEntries",
      ).mockReturnValue([".env"]);
      vi.spyOn(mockDetector, "getGitMetadata").mockReturnValue({
        owner: "test",
        repo: "test",
      });
      vi.spyOn(mockFsManager, "safeWriteConfig").mockResolvedValue(true);
      vi.spyOn(mockFsManager, "updateGitignore").mockResolvedValue(undefined);

      await orchestrator["executeInitialization"](
        projectName,
        projectDir,
        templateType,
        isInPlace,
      );

      // Verify all steps were called
      expect(mockFsManager.ensureProjectDirectory).toHaveBeenCalledWith(
        projectDir,
        isInPlace,
      );
      expect(mockFsManager.createStructure).toHaveBeenCalledWith(projectDir);
      expect(mockConfigFactory.createProjectConfig).toHaveBeenCalledWith(
        projectName,
      );
      expect(mockFsManager.safeWriteConfig).toHaveBeenCalledTimes(3);
      expect(mockFsManager.updateGitignore).toHaveBeenCalledWith(projectDir, [
        ".env",
      ]);
    });

    it("should handle current directory project name correctly", async () => {
      const projectName = ".";
      const projectDir = "/tmp";
      const templateType = "minimal";
      const isInPlace = true;

      vi.spyOn(mockFsManager, "ensureProjectDirectory").mockResolvedValue(
        undefined,
      );
      vi.spyOn(mockFsManager, "createStructure").mockResolvedValue(
        "/tmp/.cody",
      );
      vi.spyOn(mockConfigFactory, "createProjectConfig").mockReturnValue({
        name: "tmp",
      });
      vi.spyOn(mockConfigFactory, "createBeadsSyncDoc").mockReturnValue(
        "# Beads Sync",
      );
      vi.spyOn(mockConfigFactory, "createCodyBeadsConfig").mockReturnValue({
        version: "1.0.0",
      });
      vi.spyOn(
        mockConfigFactory,
        "getRequiredGitignoreEntries",
      ).mockReturnValue([]);
      vi.spyOn(mockDetector, "getGitMetadata").mockReturnValue(undefined);
      vi.spyOn(mockFsManager, "safeWriteConfig").mockResolvedValue(true);
      vi.spyOn(mockFsManager, "updateGitignore").mockResolvedValue(undefined);

      await orchestrator["executeInitialization"](
        projectName,
        projectDir,
        templateType,
        isInPlace,
      );

      expect(mockConfigFactory.createProjectConfig).toHaveBeenCalledWith("tmp");
    });
  });

  describe("printSuccess", () => {
    it("should print success message for regular project", () => {
      const projectName = "test-project";
      const projectDir = "/tmp/test-project";

      orchestrator["printSuccess"](projectName, projectDir);

      expect(console.log).toHaveBeenCalledWith(
        chalk.green("✅ Project initialized successfully!"),
      );
      expect(console.log).toHaveBeenCalledWith(
        chalk.gray(`  Location: ${projectDir}`),
      );
    });

    it("should print success message for current directory", () => {
      const projectName = ".";
      const projectDir = "/tmp";

      orchestrator["printSuccess"](projectName, projectDir);

      expect(console.log).toHaveBeenCalledWith(
        chalk.green("✅ Project initialized successfully!"),
      );
      expect(console.log).toHaveBeenCalledWith(
        chalk.gray("  Location: Current Directory"),
      );
    });

    it("should not include cd command for current directory", () => {
      const projectName = ".";
      const projectDir = "/tmp";

      orchestrator["printSuccess"](projectName, projectDir);

      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining("cd"),
      );
    });

    it("should include cd command for regular project", () => {
      const projectName = "test-project";
      const projectDir = "/tmp/test-project";

      orchestrator["printSuccess"](projectName, projectDir);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("cd test-project"),
      );
    });
  });
});
