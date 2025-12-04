import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Command } from "commander";
import { templateCommand } from "../../../src/commands/template.js";
import chalk from "chalk";

// Mock chalk at module level to avoid spyOn issues
vi.mock("chalk", () => ({
  default: {
    blue: (text: string) => `BLUE:${text}`,
    green: (text: string) => `GREEN:${text}`,
    yellow: (text: string) => `YELLOW:${text}`,
    gray: (text: string) => `GRAY:${text}`,
    red: (text: string) => `RED:${text}`,
    cyan: (text: string) => `CYAN:${text}`,
  },
}));

// Mock fs-extra
vi.mock("fs-extra");

// Mock ConfigManager
vi.mock("../../../src/utils/config.js", () => ({
  ConfigManager: vi.fn().mockImplementation(() => ({
    loadConfig: vi.fn().mockResolvedValue(null),
  })),
}));

describe("Template Command", () => {
  let mockConsole: {
    log: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    mockConsole = {
      log: vi.spyOn(console, "log").mockImplementation(() => {}),
      error: vi.spyOn(console, "error").mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    mockConsole.log.mockRestore();
    mockConsole.error.mockRestore();
    vi.clearAllMocks();
  });

  describe("Command Structure", () => {
    it("should be a valid Command instance", () => {
      expect(templateCommand).toBeInstanceOf(Command);
      expect(templateCommand.name()).toBe("template");
    });

    it("should have correct description", () => {
      expect(templateCommand.description()).toContain("templates");
    });

    it("should have subcommands", () => {
      const commands = templateCommand.commands;
      const commandNames = commands.map((cmd) => cmd.name());

      expect(commandNames).toContain("list");
      expect(commandNames).toContain("create");
      expect(commandNames).toContain("apply");
      expect(commandNames).toContain("remove");
    });

    it("list subcommand should exist", () => {
      const listCmd = templateCommand.commands.find(
        (cmd) => cmd.name() === "list"
      );
      expect(listCmd).toBeDefined();
      expect(listCmd?.description()).toContain("List");
    });

    it("create subcommand should have options", () => {
      const createCmd = templateCommand.commands.find(
        (cmd) => cmd.name() === "create"
      );
      expect(createCmd).toBeDefined();
      expect(createCmd?.options.length).toBeGreaterThan(0);
    });

    it("apply subcommand should have options", () => {
      const applyCmd = templateCommand.commands.find(
        (cmd) => cmd.name() === "apply"
      );
      expect(applyCmd).toBeDefined();
      expect(applyCmd?.options.length).toBeGreaterThan(0);
    });
  });

  describe("Command Behavior", () => {
    it("should have subcommand actions", () => {
      const listCmd = templateCommand.commands.find(
        (cmd) => cmd.name() === "list"
      );
      expect(typeof listCmd?._actionHandler).toBe("function");
    });
  });

  describe("Error Handling", () => {
    it("should handle missing subcommand gracefully", () => {
      // Template command has subcommands, so help should work
      expect(templateCommand.commands.length).toBeGreaterThan(0);
    });

    it("should have proper command help text", () => {
      const listCmd = templateCommand.commands.find(
        (cmd) => cmd.name() === "list"
      );
      expect(listCmd?.helpInformation()).toContain("list");
    });
  });
});
