/**
 * Development Server with Hot Reloading
 *
 * This script provides a development server with automatic reloading
 * when TypeScript files change. It's designed for CLI development
 * where you want to quickly test changes without manual restarts.
 */

import { spawn, ChildProcess } from "child_process";
import { watch } from "chokidar";
import path from "path";
import chalk from "chalk";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface DevServerOptions {
  entryPoint?: string;
  watchPatterns?: string[];
  ignorePatterns?: string[];
  tscArgs?: string[];
  runCommand?: string;
  runArgs?: string[];
  debounceTime?: number;
}

class DevServer {
  private tscProcess: ChildProcess | null = null;
  private runProcess: ChildProcess | null = null;
  private watcher: any;
  private options: DevServerOptions;
  private isRebuilding: boolean = false;
  private lastBuildTime: number = 0;

  constructor(options: DevServerOptions = {}) {
    this.options = {
      entryPoint: path.join(__dirname, "src", "main.ts"),
      watchPatterns: ["src/**/*.ts", "src/**/*.js", "src/**/*.json"],
      ignorePatterns: ["**/node_modules/**", "**/dist/**", "**/.git/**"],
      tscArgs: ["--watch", "--preserveWatchOutput"],
      runCommand: "node",
      runArgs: [path.join(__dirname, "dist", "main.js")],
      debounceTime: 1000,
      ...options,
    };
  }

  start(): void {
    console.log(
      chalk.blue("🚀 Starting Development Server with Hot Reloading"),
    );
    console.log(chalk.gray("  Entry:", this.options.entryPoint));
    console.log(chalk.gray("  Watch:", this.options.watchPatterns?.join(", ")));
    console.log(
      chalk.gray("  Ignore:", this.options.ignorePatterns?.join(", ")),
    );

    // Start file watcher
    this.setupWatcher();

    // Start TypeScript compiler in watch mode
    this.startTypeScriptCompiler();

    // Handle process termination
    this.setupSignalHandlers();
  }

  private setupWatcher(): void {
    this.watcher = watch(this.options.watchPatterns!, {
      ignored: this.options.ignorePatterns || [],
      ignoreInitial: true,
      persistent: true,
    });

    this.watcher
      .on("change", (filePath: string) => this.handleFileChange(filePath))
      .on("add", (filePath: string) => this.handleFileChange(filePath))
      .on("unlink", (filePath: string) => this.handleFileChange(filePath))
      .on("error", (error: Error) =>
        console.error(chalk.red("🔴 Watcher error:", error.message)),
      );

    console.log(chalk.green("✅ File watcher started"));
  }

  private handleFileChange(filePath: string): void {
    const now = Date.now();
    const timeSinceLastBuild = now - this.lastBuildTime;

    // Debounce rapid changes
    if (timeSinceLastBuild < (this.options.debounceTime || 1000)) {
      return;
    }

    this.lastBuildTime = now;

    console.log(
      chalk.yellow("📝 File changed:", path.relative(__dirname, filePath)),
    );

    // Restart the run process if it's running
    if (this.runProcess) {
      this.restartRunProcess();
    }
  }

  private startTypeScriptCompiler(): void {
    console.log(chalk.blue("🔧 Starting TypeScript compiler in watch mode..."));

    this.tscProcess = spawn("bun", ["tsc", ...this.options.tscArgs!], {
      cwd: __dirname,
      stdio: "inherit",
    });

    this.tscProcess.on("exit", (code) => {
      if (code !== 0) {
        console.error(
          chalk.red("❌ TypeScript compiler exited with code:", code),
        );
      }
    });

    this.tscProcess.on("error", (error) => {
      console.error(
        chalk.red("❌ Failed to start TypeScript compiler:", error.message),
      );
    });
  }

  private startRunProcess(): void {
    if (this.runProcess) {
      this.runProcess.kill();
      this.runProcess = null;
    }

    console.log(chalk.blue("🚀 Starting run process..."));

    this.runProcess = spawn(this.options.runCommand!, this.options.runArgs!, {
      cwd: __dirname,
      stdio: "inherit",
    });

    this.runProcess.on("exit", (code) => {
      if (code !== 0) {
        console.error(chalk.red("❌ Run process exited with code:", code));
      }
    });

    this.runProcess.on("error", (error) => {
      console.error(
        chalk.red("❌ Failed to start run process:", error.message),
      );
    });
  }

  private restartRunProcess(): void {
    if (this.isRebuilding) {
      return;
    }

    this.isRebuilding = true;

    console.log(chalk.blue("🔄 Restarting run process..."));

    // Kill existing process
    if (this.runProcess) {
      this.runProcess.kill();
      this.runProcess = null;
    }

    // Wait a moment for clean shutdown
    setTimeout(() => {
      this.startRunProcess();
      this.isRebuilding = false;
    }, 500);
  }

  private setupSignalHandlers(): void {
    process.on("SIGINT", () => this.shutdown());
    process.on("SIGTERM", () => this.shutdown());
  }

  private shutdown(): void {
    console.log(chalk.yellow("\n🛑 Shutting down development server..."));

    // Kill child processes
    if (this.tscProcess) {
      this.tscProcess.kill();
    }

    if (this.runProcess) {
      this.runProcess.kill();
    }

    // Close file watcher
    if (this.watcher) {
      this.watcher.close();
    }

    console.log(chalk.green("✅ Development server stopped"));
    process.exit(0);
  }

  // Static method to create and start server
  static start(options: DevServerOptions = {}): DevServer {
    const server = new DevServer(options);
    server.start();
    return server;
  }
}

// Export for programmatic use
export { DevServer, DevServerOptions };

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = DevServer.start();

  // Export server for potential external control
  if (process.env.NODE_ENV === "development") {
    (global as any).devServer = server;
  }
}
