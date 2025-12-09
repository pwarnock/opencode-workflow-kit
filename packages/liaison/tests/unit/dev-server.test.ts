import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { DevServer, DevServerOptions } from "../../src/dev-server";
import { spawn } from "child_process";
import { watch } from "chokidar";

describe("DevServer", () => {
  let devServer: DevServer;
  let mockSpawn: any;
  let mockWatch: any;

  beforeEach(() => {
    // Mock child_process.spawn
    mockSpawn = vi.fn(() => ({
      on: vi.fn(),
      kill: vi.fn(),
    }));
    vi.mock("child_process", () => ({
      spawn: mockSpawn,
    }));

    // Mock chokidar.watch
    mockWatch = vi.fn(() => ({
      on: vi.fn(),
      close: vi.fn(),
    }));
    vi.mock("chokidar", () => ({
      watch: mockWatch,
    }));

    const options: DevServerOptions = {
      entryPoint: "./src/main.ts",
      watchPatterns: ["src/**/*.ts"],
      ignorePatterns: ["**/node_modules/**"],
      tscArgs: ["--watch"],
      runCommand: "node",
      runArgs: ["./dist/main.js"],
      debounceTime: 500,
    };

    devServer = new DevServer(options);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Constructor", () => {
    it("should initialize with default options", () => {
      const defaultServer = new DevServer();
      expect(defaultServer).toBeInstanceOf(DevServer);
    });

    it("should merge custom options with defaults", () => {
      const customOptions: DevServerOptions = {
        entryPoint: "./custom/main.ts",
        debounceTime: 2000,
      };
      const customServer = new DevServer(customOptions);

      // Access private options through any casting for testing
      const options = (customServer as any).options;
      expect(options.entryPoint).toBe("./custom/main.ts");
      expect(options.debounceTime).toBe(2000);
      expect(options.watchPatterns).toContain("src/**/*.ts");
    });
  });

  describe("start()", () => {
    it("should start file watcher and TypeScript compiler", () => {
      // Mock console.log to avoid output during tests
      const consoleLogSpy = vi
        .spyOn(console, "log")
        .mockImplementation(() => {});

      devServer.start();

      // Verify watcher was called
      expect(mockWatch).toHaveBeenCalledWith(
        ["src/**/*.ts"],
        expect.any(Object),
      );

      // Verify spawn was called for TypeScript compiler
      expect(mockSpawn).toHaveBeenCalledWith(
        "bun",
        ["tsc", "--watch"],
        expect.any(Object),
      );

      consoleLogSpy.mockRestore();
    });

    it("should setup signal handlers", () => {
      const processOnSpy = vi.spyOn(process, "on");

      devServer.start();

      expect(processOnSpy).toHaveBeenCalledWith("SIGINT", expect.any(Function));
      expect(processOnSpy).toHaveBeenCalledWith(
        "SIGTERM",
        expect.any(Function),
      );

      processOnSpy.mockRestore();
    });
  });

  describe("File Change Handling", () => {
    it("should handle file changes and restart run process", () => {
      // Mock console.log
      vi.spyOn(console, "log").mockImplementation(() => {});

      // Start the server
      devServer.start();

      // Get the watcher instance
      const watcher = mockWatch.mock.results[0].value;

      // Simulate a file change
      const changeHandler = watcher.on.mock.calls.find(
        (call: any) => call[0] === "change",
      )[1];
      changeHandler("./src/test.ts");

      // Verify restart was attempted
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("📝 File changed:"),
        expect.stringContaining("test.ts"),
      );

      vi.restoreAllMocks();
    });

    it("should debounce rapid file changes", () => {
      vi.spyOn(console, "log").mockImplementation(() => {});

      devServer.start();

      const watcher = mockWatch.mock.results[0].value;
      const changeHandler = watcher.on.mock.calls.find(
        (call: any) => call[0] === "change",
      )[1];

      // First change
      changeHandler("./src/test1.ts");

      // Second change immediately after (should be debounced)
      changeHandler("./src/test2.ts");

      // Only the first change should be processed due to debouncing
      expect(console.log).toHaveBeenCalledTimes(1);

      vi.restoreAllMocks();
    });
  });

  describe("Process Management", () => {
    it("should start TypeScript compiler process", () => {
      devServer.start();

      const spawnCall = mockSpawn.mock.calls.find((call) => call[0] === "bun");
      expect(spawnCall).toBeDefined();
      expect(spawnCall[1]).toContain("tsc");
      expect(spawnCall[1]).toContain("--watch");
    });

    it("should handle process exit events", () => {
      devServer.start();

      const tscProcess = mockSpawn.mock.results[0].value;
      const exitHandler = tscProcess.on.mock.calls.find(
        (call: any) => call[0] === "exit",
      )[1];

      // Simulate process exit
      exitHandler(0);
      exitHandler(1);

      // Should handle both success and failure cases
      expect(tscProcess.on).toHaveBeenCalledWith("exit", expect.any(Function));
    });
  });

  describe("Shutdown", () => {
    it("should cleanup processes and watcher on shutdown", () => {
      // Mock console.log
      const consoleLogSpy = vi
        .spyOn(console, "log")
        .mockImplementation(() => {});
      const processExitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(() => {
          throw new Error("Process exit called"); // Prevent actual process exit
        });

      devServer.start();

      // Get the process instances
      const tscProcess = mockSpawn.mock.results[0].value;
      const watcher = mockWatch.mock.results[0].value;

      // Trigger shutdown
      try {
        const sigintHandler = process.on.mock.calls.find(
          (call: any) => call[0] === "SIGINT",
        )[1];
        sigintHandler();
      } catch (error) {
        // Expected due to process.exit mock
      }

      // Verify cleanup was attempted
      expect(tscProcess.kill).toHaveBeenCalled();
      expect(watcher.close).toHaveBeenCalled();

      consoleLogSpy.mockRestore();
      processExitSpy.mockRestore();
    });
  });

  describe("Static Methods", () => {
    it("should create and start server via static method", () => {
      const consoleLogSpy = vi
        .spyOn(console, "log")
        .mockImplementation(() => {});

      const server = DevServer.start({
        entryPoint: "./test/main.ts",
      });

      expect(server).toBeInstanceOf(DevServer);

      consoleLogSpy.mockRestore();
    });
  });

  describe("Error Handling", () => {
    it("should handle watcher errors gracefully", () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      devServer.start();

      const watcher = mockWatch.mock.results[0].value;
      const errorHandler = watcher.on.mock.calls.find(
        (call: any) => call[0] === "error",
      )[1];

      // Simulate watcher error
      errorHandler(new Error("Test watcher error"));

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("🔴 Watcher error:"),
        expect.stringContaining("Test watcher error"),
      );

      consoleErrorSpy.mockRestore();
    });

    it("should handle process spawn errors gracefully", () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Mock spawn to throw error
      mockSpawn.mockImplementationOnce(() => {
        const mockProcess = {
          on: vi.fn((event: string, handler: Function) => {
            if (event === "error") {
              handler(new Error("Spawn failed"));
            }
          }),
          kill: vi.fn(),
        };
        return mockProcess;
      });

      devServer.start();

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("❌ Failed to start TypeScript compiler:"),
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
