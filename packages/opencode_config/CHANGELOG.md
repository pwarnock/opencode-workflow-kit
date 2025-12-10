# @pwarnock/opencode-config

## 1.0.0

### Major Changes

- Major restructuring release: Project rename from OpenCode Workflow Kit to Liaison Toolkit with comprehensive package reorganization.

  ## Breaking Changes

  ### Project Rename
  - Project renamed: `opencode-workflow-kit` → `liaison-toolkit`
  - Repository: `github.com/pwarnock/liaison-toolkit`

  ### Package Reorganization
  - **CLI Framework**: `@pwarnock/toolkit-cli` → `@pwarnock/liaison` (v1.0.0)
    - Binary: `opencode` → `liaison`
    - Role: Main user-facing CLI framework
    - Directory: `packages/unified-cli/` → `packages/liaison/`
  - **Sync Plugin**: `@pwarnock/liaison` → `@pwarnock/liaison-coordinator` (v0.7.2)
    - Role: Bidirectional Cody-Beads sync orchestration
    - Directory: `packages/liaison/` → `packages/liaison-coordinator/`
    - Status: Library only (no CLI binary)
  - **Config Management**: `@pwarnock/opencode-config` (v0.2.0, unchanged)
    - Role: Python-based configuration and git automation
    - Still manages OpenCode agent configuration
  - **Core Library**: `@pwarnock/toolkit-core` (v0.5.12, internal)
    - Role: Shared types and utilities
    - Status: Internal dependency

  ## Migration Guide

  See `MIGRATION_v0.6.0.md` for detailed step-by-step migration instructions.

  ### Quick Start

  ```bash
  # For npm users
  npm uninstall -g @pwarnock/toolkit-cli
  npm install -g @pwarnock/liaison

  # Update CLI commands
  opencode init  →  liaison init
  opencode sync  →  liaison sync
  ```

  ### For Developers

  ```bash
  # Clone new repository
  git clone https://github.com/pwarnock/liaison-toolkit.git
  cd liaison-toolkit

  # Setup and build
  just setup
  just build
  just test
  ```

  ## What's New
  - **Enhanced Architecture Clarity**: Clear separation of concerns between CLI, plugin, and configuration
  - **Improved Package Descriptions**: Each package clearly identifies its role
  - **Comprehensive Documentation**: Migration guide, updated README, architecture documentation
  - **Workflow Updates**: All GitHub Actions workflows updated for new structure
  - **Quality Assurance**: All tests pass, all builds succeed, no breaking imports

  ## What Stayed the Same
  - **Functionality**: All features work identically
  - **Architecture**: Plugin system, middleware, command structure unchanged
  - **Development Workflow**: `just`, `bun`, and `uv` commands unchanged
  - **Data**: Configuration files, `.beads/`, and other data unaffected
  - **Python Package**: `opencode_config` maintains same name and role

  ## Documentation
  - **MIGRATION_v0.6.0.md**: Complete migration guide with examples
  - **CHANGELOG_v0.6.0.md**: Detailed changelog with all changes
  - **RESTRUCTURING_COMPLETE_SUMMARY.md**: Restructuring completion summary
  - **RESTRUCTURING_PLAN.md**: Original plan with completion status

## 0.2.1

### Patch Changes

- ## Major Restructuring: Liaison Toolkit v0.6.0

  ### Breaking Changes ⚠️

  This is a breaking change release that restructures the entire project:

  **Project Rename:**
  - `opencode-workflow-kit` → `liaison-toolkit`
  - GitHub: `github.com/pwarnock/liaison-toolkit`

  **Package Reorganization:**
  1. **@pwarnock/liaison** (v1.0.0 - upgraded from toolkit-cli)
     - CLI framework for Liaison Toolkit
     - Binary: `liaison` (replaces `opencode`)
     - Location: `packages/liaison/`
     - Updated all CLI commands and examples
  2. **@pwarnock/liaison-coordinator** (v0.7.2 - renamed from liaison)
     - Bidirectional sync plugin for Cody-Beads integration
     - Library only (no CLI binary)
     - Location: `packages/liaison-coordinator/`
     - Clarified as active orchestration plugin
  3. **@pwarnock/opencode-config** (v0.2.0 - unchanged)
     - Configuration management and git automation
     - Still manages OpenCode agent configuration
     - Updated descriptions and repository references
  4. **@pwarnock/toolkit-core** (v0.5.12 - unchanged)
     - Shared core library (internal)
     - No public API changes

  ### What Users Must Do
  1. **Update Installation:**
     ```bash
     npm uninstall @pwarnock/toolkit-cli
     npm install @pwarnock/liaison
     ```
  2. **Update CLI Commands:**
     ```bash
     opencode init  →  liaison init
     opencode sync  →  liaison sync
     # All commands change from `opencode` to `liaison`
     ```
  3. **Update Imports:**

     ```typescript
     // Old
     import { UnifiedPluginManager } from "@pwarnock/toolkit-cli";
     import { coordinatorPlugin } from "@pwarnock/liaison";

     // New
     import { UnifiedPluginManager } from "@pwarnock/liaison";
     import { coordinatorPlugin } from "@pwarnock/liaison-coordinator";
     ```

  4. **Clone New Repository:**
     ```bash
     git clone https://github.com/pwarnock/liaison-toolkit.git
     ```

  ### What's Included
  - ✅ Complete package renaming and reorganization
  - ✅ Directory restructuring (unified-cli → liaison, liaison → liaison-coordinator)
  - ✅ All TypeScript packages compile without errors
  - ✅ Updated documentation (README, CLAUDE.md, package READMEs)
  - ✅ Comprehensive migration guide (MIGRATION_v0.6.0.md)
  - ✅ Detailed changelog (CHANGELOG_v0.6.0.md)
  - ✅ All repository URLs updated to liaison-toolkit

  ### Rationale

  This restructuring clarifies the project's evolved purpose and separates concerns:
  - **Liaison** - Main CLI framework
  - **Liaison Coordinator** - Active orchestration plugin
  - **OpenCode Config** - Configuration management
  - **Core** - Shared utilities

  The project evolved from configuration management ("OpenCode Workflow Kit") to workflow automation and Cody-Beads integration ("Liaison Toolkit").

  ### Migration

  See `MIGRATION_v0.6.0.md` for:
  - Step-by-step migration instructions
  - Package update guide
  - CLI command reference
  - Import path updates
  - FAQ and troubleshooting

  ### Backward Compatibility

  ⚠️ **None** - This is a breaking change.

  The old packages (`@pwarnock/toolkit-cli` and old `@pwarnock/liaison`) are not maintained. You must upgrade to the new package names and commands.

  ### Files Changed
  - Directories: `packages/unified-cli/` → `packages/liaison/`, `packages/liaison/` → `packages/liaison-coordinator/`
  - Package names: Updated in package.json files
  - CLI commands: All changed from `opencode` to `liaison`
  - Imports: All updated to new package names
  - Documentation: README, CLAUDE.md, package READMEs all updated
  - Configuration: package.json, cody-beads.config.json updated with new references
