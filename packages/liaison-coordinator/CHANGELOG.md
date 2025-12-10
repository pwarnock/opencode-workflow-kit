# Changelog

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

## 0.7.3

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

## 0.7.2

### Patch Changes

- 070aadd: ### Fix linting errors and improve code formatting
  - Fix emoji character encoding in help text
  - Remove unused backticks in error messages
  - Apply prettier formatting to all TypeScript files
  - Resolve ESLint configuration issues
  - Ensure consistent code formatting across codebase

## 0.7.1

### Patch Changes

- d5bf72f: ### Comprehensive Documentation Updates for v0.6.0

  #### New Documentation
  - **Changeset Workflow Guide**: Complete guide for version management and publishing with Changesets
  - **v0.6.0 Migration Guide**: Step-by-step migration from v0.5.x including breaking changes
  - **Beads Integration Troubleshooting**: Comprehensive troubleshooting for Beads binary and integration issues
  - **Task Management Guide**: Real Beads backend task operations with examples and workflows

  #### Updated Documentation
  - **Liaison README**: Updated init command workflow, fixed configuration references, corrected template examples
  - **CLAUDE.md**: Added Changeset workflow, updated project architecture and package management sections
  - **Documentation Index**: Updated navigation with new guides and recent updates summary

  #### Key Improvements
  - All references updated from `codybeads` to `liaison`
  - Configuration file examples match actual implementation
  - Template examples use new `liaison init` syntax
  - Real Beads integration examples throughout
  - Cross-references between all documentation guides

  #### Breaking Changes Documented
  - Binary rename impact and migration steps
  - Configuration file structure changes
  - Project initialization workflow updates
  - Environment variable usage patterns

## 0.7.0

### Minor Changes

- ad3d24c: ### Major Refactoring & Architecture Alignment (v0.6.0)

  #### Breaking Changes
  - **Binary Rename**: CLI binary renamed from `codybeads` to `liaison` for consistency with package name
  - **Version Bump**: Version increased from 0.5.12 to 0.6.0 to reflect architectural changes

  #### New Features
  - **Data-Driven Product Naming**: Added centralized package metadata system for dynamic product naming
  - **Modular Init Command**: Completely refactored `init` command with service-oriented architecture:
    - `ProjectDetector`: Handles package.json and Git metadata detection
    - `FileSystemManager`: Safe, non-destructive file operations
    - `ConfigFactory`: Isolated configuration generation
    - `InitOrchestrator`: Coordinates initialization flow with graceful exit handling
  - **In-Place Initialization**: Support for initializing existing projects without creating new directories
  - **Real Beads Integration**: `liaison task` command now integrates with actual `@beads/bd` backend

  #### Improvements
  - **Service Architecture**: Split monolithic init logic into focused, testable services
  - **Error Handling**: Enhanced error handling with graceful Ctrl+C support
  - **Configuration Management**: Improved config generation with Git metadata detection
  - **Template Support**: Better template handling for different project types

  #### Technical Details
  - All services located under `src/services/init/`
  - Maintained backward compatibility for existing workflows
  - Added comprehensive unit tests for new service architecture
  - Updated documentation and examples

  #### Migration Notes
  - Existing users should update scripts from `codybeads` to `liaison`
  - Configuration files remain compatible
  - No breaking changes to API interfaces

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Comprehensive CLI tool for Cody-Beads integration
- Template system with built-in templates (minimal, web-development, python-development)
- Bidirectional synchronization between Cody and Beads
- Configuration management with validation
- Version management and release automation
- Plugin system for extensibility
- Workflow automation capabilities

### Features

- **CLI Commands**: config, template, sync, init, version, plugin, task, workflow, migrate
- **Template Management**: Create, apply, list, remove custom templates
- **Synchronization**: Bidirectional sync with conflict resolution
- **Configuration**: Interactive setup with validation
- **Error Handling**: Graceful error recovery and user-friendly messages
- **Help System**: Comprehensive help and usage information

### Testing

- Unit tests with Vitest (41 tests passing)
- Integration tests with test containers (5 tests passing)
- End-to-end tests with Playwright (core commands working)
- Test reporting and coverage analysis
- Multi-layered testing architecture

### Documentation

- Comprehensive user documentation
- API reference with TypeScript types
- Contributing guidelines
- Troubleshooting guide

## [0.5.0] - 2025-12-01

### Added

- Initial release of Cody-Beads integration tool
- Core CLI functionality
- Template system implementation
- Basic synchronization features
- Configuration management
- Testing infrastructure setup

### Changed

- N/A (initial release)

### Deprecated

- N/A

### Removed

- N/A

### Fixed

- N/A

### Security

- No known vulnerabilities

---

## Version History

### 0.5.0 (Development)

- **Status**: Feature complete, testing in progress
- **Stability**: Ready for beta testing
- **Compatibility**: Node.js 18+, npm/yarn package managers
- **Platforms**: macOS, Linux, Windows (planned)

### Upcoming Releases

#### 0.6.0 (Planned)

- Enhanced conflict resolution algorithms
- Performance optimizations for large datasets
- Additional template types
- Web dashboard for configuration management

#### 1.0.0 (Planned)

- Full production release
- Complete BDD testing suite
- Comprehensive security scanning
- Accessibility compliance
- Performance benchmarks
- Full API documentation

---

## Migration Guide

### From 0.5.0 to 0.6.0 (Future)

No breaking changes expected. Configuration files will remain compatible.

### From 0.6.0 to 1.0.0 (Future)

Potential breaking changes for production stability. Migration guide will be provided.

---

## Support

For questions about these changes or upgrade assistance:

- 📖 [Documentation](https://github.com/pwarnock/liaison-toolkit/tree/main/packages/liaison)
- 🐛 [Issue Tracker](https://github.com/pwarnock/liaison-toolkit/issues)
- 💬 [Discussions](https://github.com/pwarnock/liaison-toolkit/discussions)
- 📧 [Email Support](mailto:support@peterwarnock.com)
