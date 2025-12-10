# Release v0.6.0 - Liaison Toolkit Restructuring

**Date**: December 9, 2025  
**Status**: ✅ Released  
**Tag**: `v0.6.0`  
**Repository**: `github.com/pwarnock/liaison-toolkit`

---

## Release Summary

Version 0.6.0 is a **major breaking change release** that restructures the OpenCode Workflow Kit project into the Liaison Toolkit. This release represents the completion of a significant architectural redesign with comprehensive package reorganization and documentation.

### What's Included

✅ **Project Restructuring Complete**
- Project renamed: `opencode-workflow-kit` → `liaison-toolkit`
- All documentation updated with new names and URLs
- GitHub Actions workflows updated for new structure
- Repository URLs updated throughout

✅ **Package Reorganization Complete**
- CLI framework: `@pwarnock/liaison` v1.0.0 (was `@pwarnock/toolkit-cli` v0.5.x)
- Sync plugin: `@pwarnock/liaison-coordinator` v0.7.2 (was `@pwarnock/liaison` v0.7.x)
- Config management: `@pwarnock/opencode-config` v0.2.0 (unchanged)
- Core library: `@pwarnock/toolkit-core` v0.5.12 (internal)

✅ **Documentation Complete**
- `MIGRATION_v0.6.0.md`: Step-by-step migration guide for all user types
- `CHANGELOG_v0.6.0.md`: Detailed changelog with all breaking changes
- `RESTRUCTURING_COMPLETE_SUMMARY.md`: Implementation completion summary
- `ARCHITECTURE_EVOLUTION.md`: How the project evolved to this structure

✅ **Quality Assurance Complete**
- All 4 TypeScript packages compile without errors
- Type checking passes
- All tests pass
- Build pipeline working correctly
- No broken imports or dependencies
- Security audits completed

---

## Breaking Changes for Users

### Installation
```bash
# Old
npm install -g @pwarnock/toolkit-cli

# New
npm install -g @pwarnock/liaison
```

### CLI Commands
```bash
# Old
opencode init
opencode sync
opencode status
opencode config

# New
liaison init
liaison sync
liaison status
liaison config
```

### Package Imports
```typescript
// Old
import { UnifiedPluginManager } from '@pwarnock/toolkit-cli';
import { coordinatorPlugin } from '@pwarnock/liaison';

// New
import { UnifiedPluginManager } from '@pwarnock/liaison';
import { coordinatorPlugin } from '@pwarnock/liaison-coordinator';
```

### Repository
```bash
# Old
git clone https://github.com/pwarnock/opencode-workflow-kit.git

# New
git clone https://github.com/pwarnock/liaison-toolkit.git
```

---

## Key Changes

### Architecture Clarity
The restructuring clarifies the project's evolved purpose:
- **Liaison**: Main CLI framework users interact with
- **Liaison Coordinator**: Active orchestration plugin for Cody-Beads sync
- **Core**: Shared type definitions and utilities
- **OpenCode Config**: Python configuration and git automation

### Package Descriptions Updated
- Liaison: "CLI framework for Liaison Toolkit with plugin architecture"
- Liaison Coordinator: "Bidirectional sync plugin for Liaison Toolkit"
- OpenCode Config: "Configuration and git automation for Liaison Toolkit"

### Workflow Files Updated
- Fixed CI/CD pipeline indentation issues
- Updated all package references
- Updated GitHub repository URLs
- Configured publishing to GitHub Packages
- Added proper version detection logic

---

## Migration Path

### For npm Users
1. Uninstall old package: `npm uninstall -g @pwarnock/toolkit-cli`
2. Install new package: `npm install -g @pwarnock/liaison`
3. Update any import statements in code
4. Update CLI commands in scripts

### For Developers
1. Clone new repository: `git clone https://github.com/pwarnock/liaison-toolkit.git`
2. Setup environment: `just setup`
3. Update import paths in your code
4. Test thoroughly before deploying

### For Repository References
1. Update git clone URLs to new repository
2. Update workflow configurations if using this project
3. Update issue references if needed
4. Update CI/CD configuration files

See **MIGRATION_v0.6.0.md** for detailed instructions.

---

## What Stayed the Same

- ✅ All core functionality works identically
- ✅ Plugin system, middleware, and command structure unchanged
- ✅ Development workflow (`just`, `bun`, `uv` commands) unchanged
- ✅ Python package `opencode_config` name and role unchanged
- ✅ Configuration files and data (`.beads/`, etc.) unaffected
- ✅ No data loss or breaking in user configurations

---

## Version Information

| Package | Old | New | Type |
|---------|-----|-----|------|
| CLI Framework | `@pwarnock/toolkit-cli` v0.5.x | `@pwarnock/liaison` v1.0.0 | Major bump |
| Sync Plugin | `@pwarnock/liaison` v0.7.x | `@pwarnock/liaison-coordinator` v0.7.2 | Renamed |
| Config Management | `@pwarnock/opencode-config` v0.2.x | `@pwarnock/opencode-config` v0.2.0 | Unchanged |
| Core Library | `@pwarnock/toolkit-core` v0.5.x | `@pwarnock/toolkit-core` v0.5.12 | Internal |
| **Monorepo** | `opencode-workflow-kit` v0.5.x | `liaison-toolkit` v0.6.0 | Project rename |

---

## GitHub Actions Workflows

All workflows have been updated for v0.6.0:

- ✅ **ci.yml**: Fixed indentation, tests for liaison-coordinator
- ✅ **release.yml**: Updated package publishing, version detection
- ✅ **testing.yml**: Comprehensive test suite
- ✅ **security-testing.yml**: Enhanced security scanning
- ✅ **advanced-testing.yml**: Performance and accessibility tests
- ✅ **publish-staging.yml**: Staging deployment
- ✅ **publish-production.yml**: Production deployment
- ✅ **beads-cody-sync.yml**: Automated sync workflow

---

## Release Notes

### What's New in v0.6.0
- Complete project restructuring for clarity
- Major version bump for CLI framework (@pwarnock/liaison v1.0.0)
- Enhanced architecture documentation
- Comprehensive migration guide for users
- Updated GitHub Actions workflows
- Clearer package purposes and descriptions

### Known Issues
None. All tests pass, all builds succeed.

### Supported Platforms
- Node.js 24.11.1+
- Bun 1.1.0+
- Python 3.11+
- macOS, Linux, Windows

---

## How to Get v0.6.0

### Install via npm
```bash
npm install -g @pwarnock/liaison@0.6.0
```

### Clone from GitHub
```bash
git clone https://github.com/pwarnock/liaison-toolkit.git
cd liaison-toolkit
git checkout v0.6.0
just setup
```

---

## Documentation

All documentation is available in the repository:

- **MIGRATION_v0.6.0.md** - Complete migration guide
- **CHANGELOG_v0.6.0.md** - Detailed changelog
- **RESTRUCTURING_COMPLETE_SUMMARY.md** - Implementation summary
- **ARCHITECTURE_EVOLUTION.md** - Architecture evolution
- **README.md** - Updated project overview
- **CLAUDE.md** - Development guidance

---

## Upgrade Recommendation

**All users should upgrade to v0.6.0** as soon as possible. The restructuring provides:
- Clearer architecture and package separation
- Better naming that reflects project evolution
- Improved documentation and migration path
- Enhanced GitHub Actions workflows

Older versions (v0.5.x) are no longer maintained.

---

## Support

- **Issues**: Report bugs at https://github.com/pwarnock/liaison-toolkit/issues
- **Questions**: See MIGRATION_v0.6.0.md FAQ section
- **Documentation**: Read docs in the repository

---

## Changelog

See **CHANGELOG_v0.6.0.md** for complete list of changes.

---

**Release Date**: December 9, 2025  
**Status**: ✅ Complete and Deployed  
**Tag**: v0.6.0  
**Repository**: https://github.com/pwarnock/liaison-toolkit

*Welcome to Liaison Toolkit! 🎉*
