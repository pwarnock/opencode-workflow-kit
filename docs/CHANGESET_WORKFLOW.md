# Changeset Workflow Guide

This guide explains how to use Changesets for version management and publishing in the OpenCode Workflow Kit monorepo.

## 🎯 What are Changesets?

Changesets is a tool for managing versioning and publishing in monorepos. It helps you:
- Document changes across multiple packages
- Automatically determine semantic version bumps
- Generate comprehensive changelogs
- Coordinate releases across related packages

## 🔄 Workflow Overview

### 1. Development Phase
Make your changes as usual. When you complete a feature or fix:

```bash
# Make your changes
git add .
git commit -m "feat: add new feature"
```

### 2. Create Changeset
After completing changes that should be released:

```bash
# Create a new changeset
bun run changeset

# Or add manually
bun run changeset add
```

You'll be prompted to:
- Select which packages changed
- Choose version bump type (patch/minor/major)
- Add summary of changes

### 3. Version Packages
When ready to release:

```bash
# Apply all pending changesets
bun run version-packages
```

This will:
- Update package versions based on changeset types
- Generate CHANGELOG.md files
- Remove consumed changeset files

### 4. Release
Publish to registry:

```bash
# Build and publish all packages
bun run release

# Or just publish (if already built)
bun run publish
```

## 📝 Changeset Format

Each changeset is a markdown file in `.changeset/` with this structure:

```markdown
---
"@pwarnock/liaison": minor
"@pwarnock/toolkit-core": patch
---

### Summary of changes

- Added new feature to liaison
- Fixed bug in toolkit-core
- Updated dependencies
```

## 🎨 Version Bump Types

- **patch**: Backward-compatible bug fixes
- **minor**: New features, backward-compatible changes
- **major**: Breaking changes

## 📋 Common Commands

```bash
# Interactive changeset creation
bun run changeset

# Add changeset non-interactively
bun run changeset add

# Show status of changesets
bun run changeset status

# Version packages (apply changesets)
bun run version-packages

# Publish packages
bun run publish

# Full release workflow
bun run release
```

## 🚀 Release Workflow Example

### Step 1: Complete Development
```bash
# Make your changes
git add .
git commit -m "feat: add new CLI command"
```

### Step 2: Document Changes
```bash
bun run changeset
# Select: @pwarnock/liaison
# Choose: minor
# Summary: "Add new CLI command for template management"
```

### Step 3: Prepare Release
```bash
# This will update versions and generate changelogs
bun run version-packages

# Review the changes
git status
git add .
git commit -m "chore: apply changeset version updates"
```

### Step 4: Publish
```bash
# Build and publish
bun run release
```

## 🔧 Configuration

Changesets configuration is in `.changeset/config.json`:

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.1.2/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "restricted",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

### Key Settings

- **access**: "restricted" for private packages, "public" for public
- **baseBranch**: Main branch for releases
- **updateInternalDependencies**: How to handle internal dependency updates
- **fixed**: Packages that should always version together
- **linked**: Packages that should version together when any changes

## 📊 Changelog Generation

Changesets automatically generates changelogs in this format:

```markdown
# Changelog

## [1.2.3]

### Minor Changes

- feat: add new CLI command for template management

### Patch Changes

- fix: resolve issue with config validation

## [1.2.2]

### Patch Changes

- fix: update dependencies for security
```

## 🎯 Best Practices

### 1. Create Changesets Early
Create changesets as soon as you complete meaningful work:

```bash
# After each feature/fix
bun run changeset
git add .changeset/
git commit -m "feat: add changeset for new feature"
```

### 2. Be Specific with Summaries
Good changeset summary:
```markdown
---
"@pwarnock/liaison": minor
---

### Add template management system

- Add `liaison template list` command
- Add `liaison template apply` command  
- Support custom templates in user directory
- Update documentation with examples
```

Poor changeset summary:
```markdown
---
"@pwarnock/liaison": minor
---

- stuff
```

### 3. Group Related Changes
If multiple packages change for one feature, include them all:

```markdown
---
"@pwarnock/liaison": minor
"@pwarnock/toolkit-core": patch
---

### Add shared template system

- Liaison: Add template commands
- Toolkit-core: Add template utilities
- Update types across packages
```

### 4. Use Semantic Versioning Correctly

- **patch** for bug fixes that don't change API
- **minor** for new features that don't break existing API
- **major** for breaking changes

### 5. Review Before Publishing

Always review version updates before publishing:

```bash
bun run version-packages
git diff  # Review changes
git log --oneline -5  # Review commits
```

## 🚨 Troubleshooting

### Changeset Not Applied
If changeset isn't being applied:

```bash
# Check status
bun run changeset status

# Ensure changeset files exist
ls .changeset/

# Check if already consumed
git log --grep="apply changeset"
```

### Version Conflicts
If version conflicts occur:

```bash
# Clean state
git reset --hard HEAD~1
bun run clean
bun install

# Try again
bun run version-packages
```

### Publishing Issues
If publishing fails:

```bash
# Check authentication
npm whoami

# Check registry
npm config get registry

# Try manual publish
cd packages/liaison
npm publish --dry-run
```

## 📚 Additional Resources

- [Changesets Documentation](https://github.com/changesets/changesets)
- [Semantic Versioning](https://semver.org/)
- [Monorepo Best Practices](https://monorepo.tools/)

## 🔗 Integration with This Project

This project uses Changesets with:
- **Bun** as package manager
- **Turbo** for build orchestration
- **GitHub** for source control
- **GitHub Packages** for private registry

The release script `bun run release` handles:
1. Building all packages with Turbo
2. Publishing with Changesets
3. Skipping documentation packages

This ensures consistent, automated releases across the entire monorepo.