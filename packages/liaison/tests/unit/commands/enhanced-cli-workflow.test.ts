/**
 * Enhanced CLI Workflow Command Tests
 * Comprehensive testing of workflow management functionality
 */

import { Command } from "commander";
import { workflowCommand } from "../../../src/commands/enhanced-cli.js";
import { expect, describe, it, beforeEach, afterEach, vi } from "vitest";

// Mock dependencies
vi.mock("../../../src/core/plugin-system/config.js", () => ({
  ConfigManager: vi.fn().mockImplementation(() => ({
    load: vi.fn().mockResolvedValue({
      workflows: [],
      plugins: [],
    }),
  })),
}));

vi.mock("../../../src/core/plugin-system/loader.js", () => ({
  ConsoleLogger: vi.fn().mockImplementation(() => ({
    info: vi.fn(),
    error: vi.fn(),
  })),
  FileStorage: vi.fn().mockImplementation(() => ({
    list: vi.fn().mockResolvedValue(["test-workflow"]),
    get: vi.fn().mockResolvedValue({
      id: "test-id",
      name: "Test Workflow",
      trigger: "manual",
    }),
    set: vi.fn().mockResolvedValue(undefined),
  })),
  NodeEventEmitter: vi.fn().mockImplementation(() => ({
    emit: vi.fn(),
    on: vi.fn(),
  })),
}));

describe("Enhanced CLI - Workflow Command", () => {
  let mockConsole: {
    log: vi.Mock;
    error: vi.Mock;
  };

  beforeEach(() => {
    mockConsole = {
      log: vi.fn(),
      error: vi.fn(),
    };
    global.console = mockConsole as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Command Structure", () => {
    it("should be a valid Command instance", () => {
      expect(workflowCommand).toBeInstanceOf(Command);
    });

    it("should have correct command name", () => {
      expect(workflowCommand.name()).toBe("workflow");
    });

    it("should have correct description", () => {
      expect(workflowCommand.description()).toBe("Manage workflows and automation");
    });

    it("should have required action argument", () => {
      const actionArg = workflowCommand.args.find(arg => arg.name() === "action");
      expect(actionArg).toBeDefined();
      expect(actionArg.required).toBe(true);
    });

    it("should have proper options", () => {
      const nameOption = workflowCommand.options.find(opt => opt.flags === "-n, --name <name>");
      const triggerOption = workflowCommand.options.find(opt => opt.flags === "-t, --trigger <trigger>");
      const scheduleOption = workflowCommand.options.find(opt => opt.flags === "-s, --schedule <schedule>");
      const dryRunOption = workflowCommand.options.find(opt => opt.flags === "--dry-run");

      expect(nameOption).toBeDefined();
      expect(triggerOption).toBeDefined();
      expect(scheduleOption).toBeDefined();
      expect(dryRunOption).toBeDefined();
    });
  });

  describe("Command Actions", () => {
    it("should have an action function", () => {
      expect(workflowCommand.action).toBeDefined();
      expect(typeof workflowCommand.action).toBe("function");
    });
  });

  describe("Help Text", () => {
    it("should have help text available", () => {
      const helpText = workflowCommand.helpInformation();
      expect(helpText).toBeDefined();
      expect(helpText).toContain("Manage workflows and automation");
    });

    it("should describe all options in help", () => {
      const helpText = workflowCommand.helpInformation();
      expect(helpText).toContain("--name");
      expect(helpText).toContain("--trigger");
      expect(helpText).toContain("--schedule");
      expect(helpText).toContain("--dry-run");
    });
  });

  describe("Error Handling", () => {
    it("should handle missing workflow name gracefully", async () => {
      const mockProcess = vi.spyOn(process, "exit").mockImplementationOnce(() => {
        throw new Error("process.exit called");
      });

      try {
        await workflowCommand.action("run", { name: "" });
      } catch (error) {
        // Expected behavior
      }

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining("Workflow name is required")
      );
      mockProcess.mockRestore();
    });

    it("should have proper command structure for integration", () => {
      const commandStructure = {
        name: workflowCommand.name(),
        description: workflowCommand.description(),
        arguments: workflowCommand.args.map(arg => arg.name()),
        options: workflowCommand.options.map(opt => opt.flags),
        hasAction: typeof workflowCommand.action === "function",
      };

      expect(commandStructure).toEqual({
        name: "workflow",
        description: "Manage workflows and automation",
        arguments: ["action"],
        options: expect.arrayContaining([
          "-n, --name <name>",
          "-t, --trigger <trigger>",
          "-s, --schedule <schedule>",
          "--dry-run",
        ]),
        hasAction: true,
      });
    });
  });

  describe("Integration Points", () => {
    it("should integrate with commander.js correctly", () => {
      expect(workflowCommand).toBeInstanceOf(Command);
      expect(typeof workflowflowCommand.parseAsync).toBe("function");
    });

    it("should be exportable for CLI integration", async () => {
      const { workflowCommand: exportedCommand } = await import("../../../src/commands/enhanced-cli.js");
      expect(exportedCommand).toBeDefined();
      expect(exportedCommand.name()).toBe("workflow");
    });
  });
});
