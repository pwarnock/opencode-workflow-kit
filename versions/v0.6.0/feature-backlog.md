# Feature Backlog - v0.6.0 (Init Refactoring & Architecture Alignment)

## Overview
This version focuses on aligning the Liaison architecture with Cody PBT principles and refactoring the Init command for safety and modularity.

## Atomic Beads (Work Units)

### Tooling Upgrade
- [x] **[Bead-1] CLI: Integrate BeadsClient**
  - Refactor `packages/liaison/src/commands/enhanced-cli.ts`
  - Replace mock logic in `task` commands with `BeadsClient` integration.
  - Ensure Task IDs are sourced from the Beads backend.

### Init Refactoring (Service Infrastructure)
- [x] **[Bead-2] Init: Service Infrastructure**
  - Create `packages/liaison/src/services/init/` directory.
  - Create base service classes/interfaces.

- [x] **[Bead-3] Init: Project Detection**
  - Implement `ProjectDetector.ts` to handle `package.json` detection and Git metadata inference.

- [x] **[Bead-4] Init: Safe File Ops**
  - Implement `FileSystemManager.ts` for non-destructive config writing and `.gitignore` appending.

- [x] **[Bead-5] Init: Config Factory**
  - Implement `ConfigFactory.ts` to generate `project.json` and `cody-beads.config.json` objects.

- [x] **[Bead-6] Init: Orchestration**
  - Implement `InitOrchestrator` to coordinate the initialization flow.
  - Implement `GracefulExit` handler for `SIGINT` (Ctrl+C).
  - Update `packages/liaison/src/commands/init.ts` to use the orchestrator.

## Release Preparation
- [x] Verify `liaison init` in a fresh directory.
- [x] Verify `liaison init` in an existing project (In-Place).
- [x] Verify `liaison task create` creates a real Bead.
