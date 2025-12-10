import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { FileSystemManager } from "../../../../src/services/init/FileSystemManager.js";
import fs from "fs-extra";
import path from "path";
import inquirer from "inquirer";

describe("FileSystemManager", () => {
  let fsManager: FileSystemManager;

  beforeEach(() => {
    fsManager = new FileSystemManager();
  });

  describe("ensureProjectDirectory", () => {
    it("should create directory when it does not exist", async () => {
      const testDir = "/tmp/test-project";
      vi.spyOn(fs, "pathExists").mockResolvedValue(false);
      vi.spyOn(fs, "ensureDir").mockResolvedValue(undefined);

      await expect(
        fsManager.ensureProjectDirectory(testDir, false),
      ).resolves.not.toThrow();
      expect(fs.ensureDir).toHaveBeenCalledWith(testDir);
    });

    it("should throw error when directory exists and is not empty", async () => {
      const testDir = "/tmp/existing-project";
      vi.spyOn(fs, "pathExists").mockResolvedValue(true);
      vi.spyOn(fs, "readdir").mockResolvedValue(["file1.txt", "file2.txt"]);

      await expect(
        fsManager.ensureProjectDirectory(testDir, false),
      ).rejects.toThrow(
        `Directory ${path.basename(testDir)} already exists and is not empty`,
      );
    });

    it("should not throw error when directory exists and is empty", async () => {
      const testDir = "/tmp/empty-project";
      vi.spyOn(fs, "pathExists").mockResolvedValue(true);
      vi.spyOn(fs, "readdir").mockResolvedValue([]);
      vi.spyOn(fs, "ensureDir").mockResolvedValue(undefined);

      await expect(
        fsManager.ensureProjectDirectory(testDir, false),
      ).resolves.not.toThrow();
    });

    it("should allow creation in current directory even if not empty", async () => {
      const testDir = ".";
      vi.spyOn(fs, "pathExists").mockResolvedValue(true);
      vi.spyOn(fs, "readdir").mockResolvedValue(["file1.txt", "file2.txt"]);
      vi.spyOn(fs, "ensureDir").mockResolvedValue(undefined);

      await expect(
        fsManager.ensureProjectDirectory(testDir, true),
      ).resolves.not.toThrow();
    });
  });

  describe("createStructure", () => {
    it("should create .cody directory structure", async () => {
      const projectDir = "/tmp/test-project";
      const expectedCodyDir = path.join(projectDir, ".cody");
      const expectedCommandsDir = path.join(expectedCodyDir, "commands");
      const expectedConfigDir = path.join(expectedCodyDir, "config");
      const expectedHooksDir = path.join(expectedCodyDir, "hooks");

      vi.spyOn(fs, "ensureDir").mockResolvedValue(undefined);

      const result = await fsManager.createStructure(projectDir);

      expect(result).toBe(expectedCodyDir);
      expect(fs.ensureDir).toHaveBeenCalledWith(expectedCodyDir);
      expect(fs.ensureDir).toHaveBeenCalledWith(expectedCommandsDir);
      expect(fs.ensureDir).toHaveBeenCalledWith(expectedConfigDir);
      expect(fs.ensureDir).toHaveBeenCalledWith(expectedHooksDir);
    });
  });

  describe("safeWriteConfig", () => {
    it("should write JSON config when file does not exist", async () => {
      const filePath = "/tmp/test-config.json";
      const content = { name: "test", version: "1.0.0" };

      vi.spyOn(fs, "pathExists").mockResolvedValue(false);
      vi.spyOn(fs, "writeJSON").mockResolvedValue(undefined);

      const result = await fsManager.safeWriteConfig(filePath, content, "json");

      expect(result).toBe(true);
      expect(fs.writeJSON).toHaveBeenCalledWith(filePath, content, {
        spaces: 2,
      });
    });

    it("should write text config when file does not exist", async () => {
      const filePath = "/tmp/test-doc.md";
      const content = "# Test Document";

      vi.spyOn(fs, "pathExists").mockResolvedValue(false);
      vi.spyOn(fs, "writeFile").mockResolvedValue(undefined);

      const result = await fsManager.safeWriteConfig(filePath, content, "text");

      expect(result).toBe(true);
      expect(fs.writeFile).toHaveBeenCalledWith(filePath, content);
    });

    it("should prompt user when file exists and get confirmation to overwrite", async () => {
      const filePath = "/tmp/existing-config.json";
      const content = { name: "test", version: "1.0.0" };

      vi.spyOn(fs, "pathExists").mockResolvedValue(true);
      vi.spyOn(inquirer, "prompt").mockResolvedValue({ overwrite: true });
      vi.spyOn(fs, "writeJSON").mockResolvedValue(undefined);

      const result = await fsManager.safeWriteConfig(filePath, content, "json");

      expect(result).toBe(true);
      expect(inquirer.prompt).toHaveBeenCalled();
      expect(fs.writeJSON).toHaveBeenCalled();
    });

    it("should not overwrite when user declines", async () => {
      const filePath = "/tmp/existing-config.json";
      const content = { name: "test", version: "1.0.0" };

      vi.spyOn(fs, "pathExists").mockResolvedValue(true);
      vi.spyOn(inquirer, "prompt").mockResolvedValue({ overwrite: false });

      const result = await fsManager.safeWriteConfig(filePath, content, "json");

      expect(result).toBe(false);
      expect(fs.writeJSON).not.toHaveBeenCalled();
    });

    it("should default to json type when not specified", async () => {
      const filePath = "/tmp/test-config.json";
      const content = { name: "test", version: "1.0.0" };

      vi.spyOn(fs, "pathExists").mockResolvedValue(false);
      vi.spyOn(fs, "writeJSON").mockResolvedValue(undefined);

      const result = await fsManager.safeWriteConfig(filePath, content);

      expect(result).toBe(true);
      expect(fs.writeJSON).toHaveBeenCalled();
    });
  });

  describe("updateGitignore", () => {
    it("should create .gitignore with default content when it does not exist", async () => {
      const projectDir = "/tmp/test-project";
      const gitignorePath = path.join(projectDir, ".gitignore");
      const requiredEntries = ["cody-beads.config.json", ".env"];

      vi.spyOn(fs, "pathExists").mockResolvedValue(false);
      vi.spyOn(fs, "writeFile").mockResolvedValue(undefined);

      await fsManager.updateGitignore(projectDir, requiredEntries);

      expect(fs.writeFile).toHaveBeenCalledWith(
        gitignorePath,
        expect.any(String),
      );
      const writtenContent = (fs.writeFile as any).mock.calls[0][1];
      expect(writtenContent).toContain("node_modules/");
      expect(writtenContent).toContain("cody-beads.config.json");
      expect(writtenContent).toContain(".env");
    });

    it("should append missing entries to existing .gitignore", async () => {
      const projectDir = "/tmp/test-project";
      const gitignorePath = path.join(projectDir, ".gitignore");
      const existingContent = "node_modules/\n.log\n";
      const requiredEntries = ["cody-beads.config.json", ".env", "logs/"];

      vi.spyOn(fs, "pathExists").mockResolvedValue(true);
      vi.spyOn(fs, "readFile").mockResolvedValue(existingContent);
      vi.spyOn(fs, "appendFile").mockResolvedValue(undefined);

      await fsManager.updateGitignore(projectDir, requiredEntries);

      expect(fs.appendFile).toHaveBeenCalledWith(
        gitignorePath,
        expect.stringContaining("cody-beads.config.json"),
      );
      expect(fs.appendFile).toHaveBeenCalledWith(
        gitignorePath,
        expect.stringContaining(".env"),
      );
    });

    it("should not append entries that already exist", async () => {
      const projectDir = "/tmp/test-project";
      const gitignorePath = path.join(projectDir, ".gitignore");
      const existingContent = "node_modules/\ncody-beads.config.json\n.env\n";
      const requiredEntries = ["cody-beads.config.json", ".env"];

      vi.spyOn(fs, "pathExists").mockResolvedValue(true);
      vi.spyOn(fs, "readFile").mockResolvedValue(existingContent);
      vi.spyOn(fs, "appendFile").mockResolvedValue(undefined);

      await fsManager.updateGitignore(projectDir, requiredEntries);

      expect(fs.appendFile).not.toHaveBeenCalled();
    });

    it("should ignore comment lines and empty lines in required entries", async () => {
      const projectDir = "/tmp/test-project";
      const gitignorePath = path.join(projectDir, ".gitignore");
      const existingContent = "node_modules/\n";
      const requiredEntries = [
        "cody-beads.config.json",
        "# This is a comment",
        "",
        ".env",
      ];

      vi.spyOn(fs, "pathExists").mockResolvedValue(true);
      vi.spyOn(fs, "readFile").mockResolvedValue(existingContent);
      vi.spyOn(fs, "appendFile").mockResolvedValue(undefined);

      await fsManager.updateGitignore(projectDir, requiredEntries);

      expect(fs.appendFile).toHaveBeenCalledWith(
        gitignorePath,
        expect.stringContaining("cody-beads.config.json"),
      );
      expect(fs.appendFile).toHaveBeenCalledWith(
        gitignorePath,
        expect.stringContaining(".env"),
      );
    });
  });
});
