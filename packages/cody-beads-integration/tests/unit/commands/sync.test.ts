import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Command } from "commander";
import chalk from "chalk";

// Mock modules at top level
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

vi.mock("ora", () => ({
  default: vi.fn(() => ({
    text: "",
    succeed: vi.fn(),
    fail: vi.fn(),
    start: vi.fn(),
  })),
}));

// Mock utils
vi.mock("../../../src/utils/config.js", () => ({
  ConfigManager: vi.fn().mockImplementation(() => ({
    loadConfig: vi.fn().mockResolvedValue(null),
    testConfig: vi.fn().mockResolvedValue({}),
  })),
}));

vi.mock("../../../src/utils/github.js", () => ({
  GitHubClientImpl: vi.fn(),
}));

vi.mock("../../../src/utils/beads.js", () => ({
  BeadsClientImpl: {
    isAvailable: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock("../../../src/core/sync-engine.js", () => ({
  SyncEngine: vi.fn(),
}));

import { syncCommand } from "../../../src/commands/sync.js";
import ora from "ora";

describe("Sync Command", () => {
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
      expect(syncCommand).toBeInstanceOf(Command);
      expect(syncCommand.name()).toBe("sync");
    });

    it("should have correct description", () => {
      expect(syncCommand.description()).toContain("Synchronize");
    });

    it("should have required options", () => {
      const options = syncCommand.options;
      expect(options.length).toBeGreaterThanOrEqual(4);

      const hasDirectionOption = options.some(
        (opt: any) =>
          opt.flags === "-d, --direction <direction>" &&
          opt.description.includes("Sync")
      );
      expect(hasDirectionOption).toBe(true);

      const hasDryRunOption = options.some(
        (opt: any) =>
          opt.flags === "-n, --dry-run" &&
          opt.description.includes("Show")
      );
      expect(hasDryRunOption).toBe(true);

      const hasForceOption = options.some(
        (opt: any) =>
          opt.flags === "-f, --force" &&
          opt.description.includes("Force")
      );
      expect(hasForceOption).toBe(true);

      const hasSinceOption = options.some(
        (opt: any) =>
          opt.flags === "--since <date>" &&
          opt.description.includes("Only sync")
      );
      expect(hasSinceOption).toBe(true);
    });
  });

  describe("Command Behavior", () => {
    it("should have an action function", () => {
      expect(typeof syncCommand._actionHandler).toBe("function");
    });

    it("should accept all defined options", () => {
      const options = syncCommand.options;
      expect(options).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ flags: "-d, --direction <direction>" }),
          expect.objectContaining({ flags: "-n, --dry-run" }),
          expect.objectContaining({ flags: "-f, --force" }),
          expect.objectContaining({ flags: "--since <date>" }),
        ])
      );
    });
  });

  describe("Error Handling", () => {
    it("should have proper command structure", () => {
      // Sync command is properly structured as a Commander instance
      expect(syncCommand).toBeInstanceOf(Command);
      expect(syncCommand.options.length).toBeGreaterThanOrEqual(4);
    });

    it("should have help text available", () => {
      const help = syncCommand.helpInformation();
      expect(help).toContain("sync");
      expect(help).toContain("Synchronize");
    });

    it("should describe all options in help", () => {
      const help = syncCommand.helpInformation();
      expect(help).toContain("--direction");
      expect(help).toContain("--dry-run");
      expect(help).toContain("--force");
      expect(help).toContain("--since");
    });
  });
});
