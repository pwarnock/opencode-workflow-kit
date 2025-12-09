# Changelog

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

- 📖 [Documentation](https://github.com/pwarnock/opencode-workflow-kit/tree/main/packages/liaison)
- 🐛 [Issue Tracker](https://github.com/pwarnock/opencode-workflow-kit/issues)
- 💬 [Discussions](https://github.com/pwarnock/opencode-workflow-kit/discussions)
- 📧 [Email Support](mailto:support@peterwarnock.com)
