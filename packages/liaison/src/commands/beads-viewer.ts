import { Command } from "commander";
import { spawn } from "child_process";

/**
 * Beads viewer integration command
 */

// Simple chalk replacement
const colors = {
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
  gray: (text: string) => `\x1b[90m${text}\x1b[0m`,
};

export const beadsViewerCommand = new Command("beads-viewer")
  .description("Launch beads viewer for visual dependency management")
  .option("-p, --port <port>", "Port for beads viewer web interface", "3000")
  .option("-d, --data-dir <path>", "Path to beads data directory", "./.beads")
  .option("-r, --repo <path>", "Path to repository", ".")
  .option("-o, --open", "Open in browser after starting", false)
  .action(async (options) => {
    console.log(colors.blue("🔍 Launching Beads Viewer..."));

    // Check if beads-viewer is available
    try {
      const { execSync } = await import("child_process");

      // Try to find beads-viewer in PATH (check both beads-viewer and bv)
      let beadsViewerCommand = "bv";

      try {
        execSync("which bv", { stdio: "ignore" });
      } catch (error) {
        try {
          execSync("which beads-viewer", { stdio: "ignore" });
          beadsViewerCommand = "beads-viewer";
        } catch (error2) {
          console.log(colors.yellow("⚠️  beads-viewer (bv) not found in PATH"));
          console.log(colors.cyan("💡 Install beads-viewer:"));
          console.log(
            colors.gray(
              '   curl -fsSL "https://raw.githubusercontent.com/Dicklesworthstone/beads_viewer/main/install.sh" | bash',
            ),
          );
          console.log(
            colors.cyan(
              "💡 Or download from: https://github.com/Dicklesworthstone/beads_viewer/releases",
            ),
          );
          return;
        }
      }

      // Build command with options (map to bv options)
      const args: string[] = [];

      // Map --repo to --repo for bv (repository prefix filter)
      if (options.repo && options.repo !== ".") {
        args.push("--repo", options.repo);
      }

      // For --port and --open, bv doesn't support these directly
      // bv is a TUI application, not a web server
      if (options.port && options.port !== "3000") {
        console.log(
          colors.yellow(
            `⚠️  Note: bv is a TUI application, --port option not supported`,
          ),
        );
      }

      if (options.open) {
        console.log(
          colors.yellow(
            `⚠️  Note: bv is a TUI application, --open option not supported`,
          ),
        );
      }

      // For --data-dir, bv uses workspace config files instead
      if (options.dataDir && options.dataDir !== "./.beads") {
        console.log(
          colors.cyan(
            `💡 bv uses workspace config files. Set up .bv/workspace.yaml in your project`,
          ),
        );
      }

      const fullCommand = `${beadsViewerCommand} ${args.join(" ")}`;
      console.log(colors.green(`🚀 Running: ${fullCommand}`));

      // Launch beads-viewer
      const child = spawn(beadsViewerCommand, args, {
        stdio: "inherit",
        cwd: process.cwd(),
      });

      child.on("error", (error: Error) => {
        console.error(
          colors.red(`❌ Failed to launch beads-viewer: ${error.message}`),
        );
        process.exit(1);
      });

      child.on("close", (code) => {
        if (code !== 0) {
          console.error(colors.red(`❌ beads-viewer exited with code ${code}`));
          process.exit(code);
        }
      });
    } catch (error: any) {
      console.error(
        colors.red(`❌ Error launching beads-viewer: ${error.message}`),
      );
      process.exit(1);
    }
  });

export default beadsViewerCommand;
