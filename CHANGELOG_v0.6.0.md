# Changelog - v0.6.0 (December 9, 2025)

## 🎉 Major Update: Liaison Toolkit Restructuring

### Overview
Version 0.6.0 is a **breaking change release** that restructures the project to better reflect its evolved purpose. The project has been renamed from "OpenCode Workflow Kit" to "Liaison Toolkit" and packages have been reorganized to clarify roles.

### ⚠️ Breaking Changes

#### Project Rename
- **Old name**: OpenCode Workflow Kit
- **New name**: Liaison Toolkit
- **GitHub repo**: `github.com/pwarnock/liaison-toolkit`

#### Package Reorganization
1. **CLI Framework** (`@pwarnock/liaison` v1.0.0)
   - **Old**: `@pwarnock/toolkit-cli` v0.5.x in `packages/unified-cli/`
   - **New**: `@pwarnock/liaison` v1.0.0 in `packages/liaison/`
   - **CLI binary**: `liaison` (replaces `opencode`)
   - **Role**: Main user-facing CLI framework

2. **Sync Plugin** (`@pwarnock/liaison-coordinator` v0.7.2)
   - **Old**: `@pwarnock/liaison` v0.7.x in `packages/liaison/`
   - **New**: `@pwarnock/liaison-coordinator` v0.7.2 in `packages/liaison-coordinator/`
   - **Role**: Bidirectional Cody-Beads sync orchestration
   - **Change**: No longer exports CLI binary (plugin only)

3. **Config Management** (`@pwarnock/opencode-config` v0.2.0)
   - **Name**: Unchanged
   - **Role**: Configuration management + git automation (still manages OpenCode agent config)
   - **Change**: Updated description and repository URLs

#### Command Updates
All CLI commands change from `opencode` to `liaison`:

```bash
# Before
opencode init
opencode sync
opencode status
opencode config

# After
liaison init
liaison sync
liaison status
liaison config
```

#### Import Updates
All TypeScript/JavaScript imports must be updated:

```typescript
// Before
import { UnifiedPluginManager } from '@pwarnock/toolkit-cli';
import { coordinatorPlugin } from '@pwarnock/liaison';

// After
import { UnifiedPluginManager } from '@pwarnock/liaison';
import { coordinatorPlugin } from '@pwarnock/liaison-coordinator';
```

### ✨ What's New

#### Enhanced Architecture Clarity
- **Liaison** - Main CLI framework users interact with
- **Liaison Coordinator** - Active orchestration plugin for Cody-Beads sync
- **Core** - Shared type definitions and utilities
- **OpenCode Config** - Python configuration and git automation

#### Improved Package Descriptions
- CLI package now clearly identifies as "Liaison - CLI framework for Liaison Toolkit"
- Coordinator package clearly identifies as "Bidirectional sync plugin"
- Config package description updated to include git automation role

#### Comprehensive Migration Guide
- **New file**: `MIGRATION_v0.6.0.md`
- Detailed step-by-step migration instructions for:
  - npm users (install, imports, plugins)
  - CLI users (command updates, repository cloning)
  - Development users (setup, configuration, code updates)
- FAQ section addressing common concerns
- Rollback instructions for staying on v0.5.x

#### Documentation Updates
- **CLAUDE.md**: Comprehensive guidance for Claude/AI development
- **Package READMEs**: All updated with new package names and commands
- **cody-beads.config.json**: Updated with new project references

### 📦 Package Versions
- `@pwarnock/liaison` - 1.0.0 (upgraded from toolkit-cli)
- `@pwarnock/liaison-coordinator` - 0.7.2 (unchanged from liaison)
- `@pwarnock/opencode-config` - 0.2.0 (unchanged)
- `@pwarnock/toolkit-core` - 0.5.12 (internal, unchanged)

### 🔧 Implementation Details

#### Completed Tasks
- ✅ Phase 1: Planning & Documentation (11 Beads issues created)
- ✅ Phase 2: Package Renaming (3 tasks)
  - Renamed `unified-cli` → `liaison` (@pwarnock/liaison)
  - Renamed `liaison` → `liaison-coordinator` (@pwarnock/liaison-coordinator)
  - Updated opencode_config references
- ✅ Phase 3: Directory Reorganization (2 tasks)
  - Moved directories: `packages/unified-cli/` → `packages/liaison/`
  - Moved directories: `packages/liaison/` → `packages/liaison-coordinator/`
  - Updated workspace configuration
- ✅ Phase 4: Documentation & References (3 tasks)
  - Updated all README files with new package names and CLI commands
  - Updated CLAUDE.md with architecture guidance
  - Created MIGRATION_v0.6.0.md comprehensive migration guide
- ✅ Phase 5: Testing & Validation (2 tasks)
  - All TypeScript packages compile without errors
  - Type checking passes
  - Turbo build orchestration working correctly
- ✅ Phase 6: GitHub Repository (1 task)
  - Updated all repository URLs in package.json files
  - Updated configuration files with new project references
  - Updated README and documentation with new Git clone URLs

#### Build Status
- ✅ All 4 packages compile successfully
- ✅ TypeScript type checking passes
- ✅ Lockfile regenerated
- ✅ Turbo cache working correctly

### 🚀 Migration Path

**For existing users**: See `MIGRATION_v0.6.0.md` for detailed instructions.

**Quick start**:
```bash
# Remove old package
npm uninstall -g @pwarnock/toolkit-cli

# Install new package
npm install -g @pwarnock/liaison

# Update CLI commands
opencode init  →  liaison init
opencode sync  →  liaison sync
```

### 📝 Notes

- This is a **major breaking change** appropriate for v0.6.0
- **No data loss**: Configuration files and `.beads/` data unaffected
- **Backward compatibility**: None - must update to new package names
- **Architecture unchanged**: Plugin system, middleware, and command structure work the same
- **Python package stable**: `opencode_config` continues unchanged

### 🙏 Breaking Change Rationale

This restructuring clarifies the project's evolved purpose:
- Started as configuration management ("OpenCode Workflow Kit")
- Evolved into workflow automation platform ("Liaison Toolkit")
- Now explicitly separates concerns:
  - CLI framework (`liaison`)
  - Sync orchestration (`liaison-coordinator`)
  - Configuration management (`opencode_config`)

### 📚 Documentation
- **[MIGRATION_v0.6.0.md](./MIGRATION_v0.6.0.md)** - Complete migration guide
- **[RESTRUCTURING_PLAN.md](./RESTRUCTURING_PLAN.md)** - Full restructuring details
- **[CLAUDE.md](./CLAUDE.md)** - Development guidance
- **[README.md](./README.md)** - Updated project overview

### 🐛 Known Issues
None at this time. All tests pass and build is clean.

### 🔗 Related
- Architecture Evolution: [ARCHITECTURE_EVOLUTION.md](./ARCHITECTURE_EVOLUTION.md)
- Previous Release: v0.5.12

---

**Upgrade now**: `npm install -g @pwarnock/liaison@0.6.0`  
**Questions?** Check the [migration guide](./MIGRATION_v0.6.0.md) or [file an issue](https://github.com/pwarnock/liaison-toolkit/issues)
