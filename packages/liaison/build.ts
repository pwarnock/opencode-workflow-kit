/**
 * Build script for Liaison CLI with SolidJS support
 * Uses @opentui/solid Bun plugin for JSX transformation
 */
import solidTransformPlugin from "@opentui/solid/bun-plugin";
import { readFileSync, writeFileSync } from "fs";

const result = await Bun.build({
  entrypoints: ["./src/cli.ts"],
  outdir: "./dist",
  target: "bun",
  format: "esm",
  plugins: [solidTransformPlugin],
  external: [
    "@opentui/core",
    "@opentui/core-linux-x64",
    "@opentui/core-darwin-arm64",
    "@opentui/core-darwin-x64",
    "@opentui/core-win32-x64",
    "bun-ffi-structs",
  ],
});

if (!result.success) {
  console.error("Build failed:");
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

// Fix shebang to use bun instead of node
const outputPath = result.outputs[0].path;
const content = readFileSync(outputPath, "utf-8");
const fixedContent = content.replace(
  /^#!\/usr\/bin\/env node/,
  "#!/usr/bin/env bun"
);
writeFileSync(outputPath, fixedContent);

console.log("Build succeeded!");
console.log(`Output: ${result.outputs.map((o) => o.path).join(", ")}`);
