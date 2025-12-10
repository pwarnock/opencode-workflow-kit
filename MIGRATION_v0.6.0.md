# Migration Guide: v0.6.0 - Liaison Toolkit Restructuring

> **Version**: 0.6.0  
> **Date**: December 9, 2025  
> **Breaking Changes**: Yes - Project rename and package reorganization

## Overview

Version 0.6.0 represents a significant restructuring of the OpenCode Workflow Kit project. The project has been renamed to **Liaison Toolkit** to better reflect its evolved purpose: workflow automation and Cody-Beads integration. Packages have been reorganized to clarify roles and responsibilities.

## What Changed

### Project Name
- **Old**: `opencode-workflow-kit`
- **New**: `liaison-toolkit`
- **GitHub**: `github.com/pwarnock/liaison-toolkit`

### Package Names

#### CLI Framework (Main Package)
- **Old**: `@pwarnock/toolkit-cli` (in `packages/unified-cli/`)
- **New**: `@pwarnock/liaison` (in `packages/liaison/`)
- **Role**: Main CLI framework users interact with
- **Binary**: `liaison` (replaces `opencode`)

#### Sync Plugin
- **Old**: `@pwarnock/liaison` (in `packages/liaison/`)
- **New**: `@pwarnock/liaison-coordinator` (in `packages/liaison-coordinator/`)
- **Role**: Bidirectional sync plugin for Cody-Beads integration
- **Status**: Library only (no CLI binary)

#### Configuration & Git Automation
- **Old**: `@pwarnock/opencode-config`
- **New**: `@pwarnock/opencode-config` (unchanged)
- **Role**: Python package for configuration management and git automation
- **Status**: Still manages OpenCode agent configuration

### Directory Structure

```
Old Structure:
opencode-workflow-kit/
├── packages/unified-cli/       → CLI framework
├── packages/liaison/           → Sync plugin
└── packages/opencode_config/   → Config management

New Structure:
liaison-toolkit/
├── packages/liaison/           → CLI framework
├── packages/liaison-coordinator/ → Sync plugin
└── packages/opencode_config/   → Config management
```

## Migration Steps

### For npm Users

#### 1. Update Package Installation

If you installed the CLI globally:

```bash
# Remove old package
npm uninstall -g @pwarnock/toolkit-cli

# Install new package
npm install -g @pwarnock/liaison
```

If you installed as a dependency:

```bash
# Remove old package
npm uninstall @pwarnock/toolkit-cli

# Install new package
npm install @pwarnock/liaison
```

#### 2. Update Import Statements

If you were importing from the CLI package:

```typescript
// Old
import { UnifiedPluginManager } from '@pwarnock/toolkit-cli';
import { liaisonPlugin } from '@pwarnock/toolkit-cli';

// New
import { UnifiedPluginManager } from '@pwarnock/liaison';
import { liaisonPlugin } from '@pwarnock/liaison';
```

#### 3. Update Coordinator Plugin Installation

If you were using the coordinator plugin:

```bash
# Old (was part of @pwarnock/liaison)
npm install @pwarnock/liaison

# New (explicit package)
npm install @pwarnock/liaison-coordinator
```

#### 4. Update Plugin Import Statements

```typescript
// Old
import { coordinatorPlugin } from '@pwarnock/liaison';

// New
import { coordinatorPlugin } from '@pwarnock/liaison-coordinator';
```

### For CLI Users

#### 1. Update Command Names

Replace `opencode` with `liaison`:

```bash
# Old
opencode init
opencode sync
opencode status
opencode config --show

# New
liaison init
liaison sync
liaison status
liaison config --show
```

#### 2. Clone from New Repository

```bash
# Old
git clone https://github.com/pwarnock/opencode-workflow-kit.git
cd opencode-workflow-kit

# New
git clone https://github.com/pwarnock/liaison-toolkit.git
cd liaison-toolkit
```

#### 3. Build and Install Locally

```bash
# Development setup (unchanged)
just setup
just build

# Install CLI globally
npm install -g ./packages/liaison
```

### For Development Users

#### 1. Update Project Setup

If you cloned the repository:

```bash
# If you have the old repo cloned
cd opencode-workflow-kit

# Create a fresh clone with new name
git clone https://github.com/pwarnock/liaison-toolkit.git
cd liaison-toolkit

# Setup as before
just setup
just build
just test
```

#### 2. Update Configuration Files

Update any configuration files that reference the old package names:

```json
{
  "dependencies": {
    "@pwarnock/liaison": "^1.0.0",
    "@pwarnock/liaison-coordinator": "^0.7.0"
  }
}
```

#### 3. Update Import Paths in Code

Search and replace throughout your codebase:

```bash
# Replace package imports
find . -name "*.ts" -o -name "*.js" | xargs sed -i '' \
  's|@pwarnock/toolkit-cli|@pwarnock/liaison|g'

find . -name "*.ts" -o -name "*.js" | xargs sed -i '' \
  's|@pwarnock/liaison-plugin|@pwarnock/liaison-coordinator|g'
```

## Backward Compatibility

**None**. This is a breaking change in v0.6.0:

- Package names have changed
- CLI command names have changed
- Repository URL has changed
- Import paths have changed

You **must** update your code to use the new names.

## Package Versions

Current versions in v0.6.0:

- `@pwarnock/liaison` - v1.0.0 (was `@pwarnock/toolkit-cli`)
- `@pwarnock/liaison-coordinator` - v0.7.2 (was `@pwarnock/liaison`)
- `@pwarnock/opencode-config` - v0.2.0 (unchanged)
- `@pwarnock/toolkit-core` - v0.5.12 (unchanged, internal)

## What Stayed the Same

- **Python package**: `@pwarnock/opencode-config` (name and role unchanged)
- **Core functionality**: All features work the same way
- **Architecture**: Plugin system, middleware, command structure all unchanged
- **Development workflow**: `just`, `bun`, and `uv` commands are the same

## FAQ

**Q: Will the old packages still work?**  
A: No. The old packages (`@pwarnock/toolkit-cli` and old `@pwarnock/liaison`) are not maintained in v0.6.0+. You must upgrade to the new package names.

**Q: Can I run both old and new packages?**  
A: Not recommended. They may conflict. Uninstall old packages and migrate to new ones.

**Q: What about `opencode` agent configuration?**  
A: The Python `opencode_config` package still manages OpenCode agent configuration. No changes needed there.

**Q: Where's my data?**  
A: Configuration and data files are not affected by this restructuring. Your `.beads/`, `.opencode/`, and other data directories will work with the new packages.

**Q: Do I need to update my Beads issues?**  
A: No. Project identifiers in `.beads/` and GitHub remain the same during the migration.

## Getting Help

- **Issues**: Report bugs at https://github.com/pwarnock/liaison-toolkit/issues
- **Documentation**: Read docs in the new repository
- **Examples**: Check `packages/liaison/README.md` for usage examples

## Rollback

If you need to stay on the old version:

```bash
# Install from npm registry (if available)
npm install @pwarnock/toolkit-cli@0.5.x
npm install @pwarnock/liaison@0.7.x

# Or clone the old repository
git clone https://github.com/pwarnock/opencode-workflow-kit.git
git checkout <last-v0.5.x-tag>
```

---

**Next Steps**:
1. Update your installation
2. Update your imports and CLI commands
3. Test your setup
4. Report any issues

Welcome to Liaison Toolkit! 🎉
