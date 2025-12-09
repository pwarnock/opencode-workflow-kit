---
"@pwarnock/liaison": minor
---

### Major Refactoring & Architecture Alignment (v0.6.0)

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