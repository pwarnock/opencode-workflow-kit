import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Command } from "commander";
import { versionCommand } from "../../../src/commands/version.js";
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
vi.mock("fs-extra", () => ({
  default: {
    pathExists: vi.fn(),
    readdir: vi.fn(),
    readJSON: vi.fn(),
    ensureDir: vi.fn(),
    writeJSON: vi.fn(),
    writeFile: vi.fn(),
  },
}));

describe("Version Command", () => {
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
      expect(versionCommand).toBeInstanceOf(Command);
      expect(versionCommand.name()).toBe("version");
    });

    it("should have correct description", () => {
      expect(versionCommand.description()).toBe(
        "Manage version releases and builds"
      );
    });

    it("should have required options", () => {
      const options = versionCommand.options;
      expect(options.length).toBeGreaterThanOrEqual(2);

      const hasFeaturesOption = options.some(
        (opt: any) =>
          opt.flags === "-f, --features <features>" &&
          opt.description.includes("Features")
      );
      expect(hasFeaturesOption).toBe(true);

      const hasTypeOption = options.some(
        (opt: any) =>
          opt.flags === "-t, --type <type>" &&
          opt.description.includes("Version type")
      );
      expect(hasTypeOption).toBe(true);
    });

    it("should have required arguments", () => {
      const args = versionCommand._args;
      expect(args.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Command Behavior", () => {
    it("should have an action function", () => {
      expect(typeof versionCommand._actionHandler).toBe("function");
    });

    it("should have help text available", () => {
      const help = versionCommand.helpInformation();
      expect(help).toContain("version");
      expect(help).toContain("Manage version");
    });

    it("should document available actions", () => {
      // The command should have arguments documented
      const args = versionCommand._args;
      expect(args.length).toBeGreaterThanOrEqual(1);
      expect(args[0].name()).toBe("action");
    });
  });

  describe("Error Handling", () => {
    it("should accept options for version operations", () => {
      const options = versionCommand.options;
      expect(options.length).toBeGreaterThan(0);
    });

    it("should have proper command help", () => {
      const help = versionCommand.helpInformation();
      expect(help).toContain("--features");
      expect(help).toContain("--type");
    });

    it("should parse all command arguments", () => {
      const args = versionCommand._args;
      // Should have action and identifier arguments
      expect(args.map((a) => a.name())).toContain("action");
    });
  });
});
