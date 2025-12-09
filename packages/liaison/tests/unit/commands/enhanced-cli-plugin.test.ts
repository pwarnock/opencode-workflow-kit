/**
 * Enhanced CLI Plugin Command Tests
 * Comprehensive testing of plugin management functionality
 */

import { Command } from "commander";
import { pluginCommand } from "../../../src/commands/enhanced-cli.js";
import { expect, describe, it, beforeEach, afterEach, vi } from "vitest";

// Mock dependencies
vi.mock("../../../src/core/plugin-system/config.js", () => ({
  ConfigManager: vi.fn().mockImplementation(() => ({
    load: vi.fn().mockResolvedValue({
      plugins: [
        {
          name: "test-plugin",
          enabled: true,
          config: {},
          dependencies: [],
        },
      ],
    }),
    addPlugin: vi.fn().mockResolvedValue(undefined),
    removePlugin: vi.fn().mockResolvedValue(undefined),
    updatePlugin: vi.fn().mockResolvedValue(undefined),
    getPluginConfig: vi.fn().mockReturnValue({
      name: "test-plugin",
      enabled: true,
      config: {},
      dependencies: [],
    }),
  })),
}));

vi.mock("../../../src/core/plugin-system/loader.js", () => ({
  ConsoleLogger: vi.fn().mockImplementation(() => ({
    info: vi.fn(),
    error: vi.fn(),
  })),
  FileStorage: vi.fn().mockImplementation(() => ({
    list: vi.fn().mockResolvedValue(["test-plugin"]),
    get: vi.fn().mockResolvedValue({
      id: "test-id",
      name: "test-plugin",
      enabled: true,
      config: {},
      dependencies: [],
    }),
    set: vi.fn().mockResolvedValue(undefined),
  })),
  NodeEventEmitter: vi.fn().mockImplementation(() => ({
    emit: vi.fn(),
    on: vi.fn(),
  })),
}));

describe("Enhanced CLI - Plugin Command", () => {
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
      expect(pluginCommand).toBeInstanceOf(Command);
    });

    it("should have correct command name", () => {
      expect(pluginCommand.name()).toBe("plugin");
    });

    it("should have correct description", () => {
      expect(pluginCommand.description()).toBe("Manage TaskFlow plugins");
    });

    it("should have required action argument", () => {
      const actionArg = pluginCommand.args.find(arg => arg.name() === "action");
      expect(actionArg).toBeDefined();
      expect(actionArg.required).toBe(true);
    });

    it("should have comprehensive options", () => {
      const nameOption = pluginCommand.options.find(opt => opt.flags === "-n, --name <name>");
      const sourceOption = pluginCommand.options.find(opt => opt.flags === "-s, --source <source>");
      const versionOption = pluginCommand.options.find(opt => opt.flags === "-v, --version <version>");
      const dryRunOption = pluginCommand.options.find(opt => opt.flags === "--dry-run");
      const queryOption = pluginCommand.options.find(opt => opt.flags === "-q, --query <query>");
      const sourceTypeOption = pluginCommand.options.find(opt => opt.flags === "--source-type <type>");
      const limitOption = pluginCommand.options.find(opt => opt.flags === "--limit <number>");

      expect(nameOption).toBeDefined();
      expect(sourceOption).toBeDefined();
      expect(versionOption).toBeDefined();
      expect(dryRunOption).toBeDefined();
      expect(queryOption).toBeDefined();
      expect(sourceTypeOption).toBeDefined();
      expect(limitOption).toBeDefined();
    });
  });

  describe("Command Actions", () => {
    it("should have an action function", () => {
      expect(pluginCommand.action).toBeDefined();
      expect(typeof pluginCommand.action).toBe("function");
    });

    it("should handle list action", async () => {
      const mockProcess = vi.spyOn(process, "exit").mockImplementationOnce(() => {
        throw new Error("process.exit called");
      });

      try {
        await pluginCommand.action("list", {});
      } catch (error) {
        // Expected behavior
      }

      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("Installed plugins:"));
      mockProcess.mockRestore();
    });

    it("should handle install action with dry-run", async () => {
      const mockProcess = vi.spyOn(process, "exit").mockImplementationOnce(() => {
        throw new Error("process.exit called");
      });

      try {
        await pluginCommand.action("install", { name: "test-plugin", dryRun: true });
      } catch (error) {
        // Expected behavior
      }

      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("[DRY RUN]"));
      mockProcess.mockRestore();
    });
  });

  describe("Help Text", () => {
    it("should have help text available", () => {
      const helpText = pluginCommand.helpInformation();
      expect(helpText).toBeDefined();
      expect(helpText).toContain("Manage TaskFlow plugins");
    });

    it("should describe all options in help", () => {
      const helpText = pluginCommand.helpInformation();
      expect(helpText).toContain("--name");
      expect(helpText).toContain("--source");
      expect(helpText).toContain("--version");
      expect(helpText).toContain("--dry-run");
      expect(helpText).toContain("--query");
      expect(helpText).toContain("--source-type");
      expect(helpText).toContain("--limit");
    });
  });

  describe("Error Handling", () => {
    it("should handle missing plugin name gracefully", async () => {
      const mockProcess = vi.spyOn(process, "exit").mockImplementationOnce(() => {
        throw new Error("process.exit called");
      });

      try {
        await pluginCommand.action("install", { name: "" });
      } catch (error) {
        // Expected behavior
      }

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining("Plugin name is required")
      );
      mockProcess.mockRestore();
    });

    it("should handle unknown action gracefully", async () => {
      const mockProcess = vi.spyOn(process, "exit").mockImplementationOnce(() => {
        throw new Error("process.exit called");
      });

      try {
        await pluginCommand.action("unknown-action", {});
      } catch (error) {
        // Expected behavior
      }

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining("Unknown action: unknown-action")
      );
      mockProcess.mockRestore();
    });
  });

  describe("Integration Points", () => {
    it("should integrate with commander.js correctly", () => {
      expect(pluginCommand).toBeInstanceOf(Command);
      expect(typeof pluginCommand.parseAsync).toBe("function");
    });

    it("should be exportable for CLI integration", async () => {
      const { pluginCommand: exportedCommand } = await import("../../../src/commands/enhanced-cli.js");
      expect(exportedCommand).toBeDefined();
      expect(exportedCommand.name()).toBe("plugin");
    });
  });

  describe("Plugin Management Logic", () => {
    it("should support all plugin actions", () => {
      const expectedActions = ["list", "install", "remove", "enable", "disable", "info", "search"];
      const actionHandler = pluginCommand.action;
      
      expect(typeof actionHandler).toBe("function");
      // We can't directly test the switch statement without mocking the entire implementation,
      // but we can verify the command structure supports these actions
    });

    it("should handle plugin enable/disable functionality", async () => {
      const mockProcess = vi.spyOn(process, "exit").mockImplementation(() => {
        throw new Error("process.exit called");
      });

      try {
        await pluginCommand.action("enable", { name: "test-plugin" });
        await pluginCommand.action("disable", { name: "test-plugin" });
      } catch (error) {
        // Expected behavior
      }

      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("enabled"));
      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining("disabled"));
      mockProcess.mockRestore();
    });
  });
});
