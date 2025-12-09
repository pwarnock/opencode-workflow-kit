# Headless Changeset Workflow

This guide explains how to use Changesets in non-interactive environments (CI/CD, scripts, etc.).

## 🎯 Problem

Changesets CLI is interactive by default and requires TTY. In CI/CD environments, this causes errors:

```
Opening `/dev/tty` failed (6): Device not configured
resize: can't open terminal /dev/tty
```

## ✅ Solution

### 1. Use the Headless Script

We've created a script for non-interactive changeset creation:

```bash
# Basic usage
bun run changeset:add

# With parameters
bun run changeset:add <package> <version-type> <summary>

# Examples
bun run changeset:add "@pwarnock/liaison" patch "Fix critical bug"
bun run changeset:add "@pwarnock/liaison" minor "Add new feature"
bun run changeset:add "@pwarnock/liaison" major "Breaking API changes"
```

### 2. Manual Changeset Creation

Create changeset files manually:

```bash
# Create changeset file
cat > .changeset/changeset-$(date +%Y%m%d%H%M%S).md << EOF
---
"@pwarnock/liaison": patch
---

### Summary of changes

- Description of what changed
- Impact on users
- Migration notes if needed
EOF
```

### 3. Environment Variables

Set environment variables to disable interactive features:

```bash
# Disable interactive prompts
export CI=true
export DISABLE_INTERACTIVE=true

# Run changeset commands
bun run version-packages
```

## 🛠️ Script Details

### Location
`scripts/create-changeset.sh`

### Parameters
- `package`: Package name (default: "@pwarnock/liaison")
- `version-type`: patch|minor|major (default: "patch")
- `summary`: Changeset summary (default: "Automated changeset")

### Examples

```bash
# Create patch changeset
./scripts/create-changeset.sh "@pwarnock/liaison" patch "Fix login bug"

# Create minor changeset
./scripts/create-changeset.sh "@pwarnock/liaison" minor "Add dark mode"

# Create major changeset
./scripts/create-changeset.sh "@pwarnock/liaison" major "Rewrite authentication system"
```

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: Release
on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: bun install
        
      - name: Create changeset for automated updates
        run: |
          if [[ "${{ github.event.head_commit.message }}" == *"automated update"* ]]; then
            bun run changeset:add "@pwarnock/liaison" patch "Automated dependency update"
          fi
          
      - name: Version packages
        run: bun run version-packages
        
      - name: Build and publish
        run: bun run release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Custom Script Example

```bash
#!/bin/bash
# scripts/release.sh

set -e

echo "🚀 Starting release process..."

# 1. Check if there are changes
if [[ -z $(git status --porcelain) ]]; then
  echo "❌ No changes to release"
  exit 1
fi

# 2. Create changeset based on commit message
COMMIT_MSG=$(git log -1 --pretty=%B)
if [[ $COMMIT_MSG == *"feat:"* ]]; then
  bun run changeset:add "@pwarnock/liaison" minor "New feature: $COMMIT_MSG"
elif [[ $COMMIT_MSG == *"fix:"* ]]; then
  bun run changeset:add "@pwarnock/liaison" patch "Bug fix: $COMMIT_MSG"
elif [[ $COMMIT_MSG == *"BREAKING CHANGE:"* ]]; then
  bun run changeset:add "@pwarnock/liaison" major "Breaking change: $COMMIT_MSG"
else
  echo "ℹ️  No version bump needed"
  exit 0
fi

# 3. Apply changesets
bun run version-packages

# 4. Commit version updates
git add .
git commit -m "chore: apply changeset version updates"

# 5. Publish
bun run release

echo "✅ Release complete!"
```

## 🎛️ Advanced Usage

### Multiple Packages

```bash
# Create changeset for multiple packages
cat > .changeset/multi-package-$(date +%Y%m%d%H%M%S).md << EOF
---
"@pwarnock/liaison": minor
"@pwarnock/toolkit-core": patch
---

### Update multiple packages

- Liaison: Add new CLI command
- Toolkit-core: Fix utility function
```

### Custom Templates

```bash
# Create template for bug fixes
cat > scripts/bug-fix-changeset.sh << 'EOF'
#!/bin/bash
BUG_DESCRIPTION=$1
TIMESTAMP=$(date +%Y%m%d%H%M%S)

cat > .changeset/bug-fix-${TIMESTAMP}.md << INNER_EOF
---
"@pwarnock/liaison": patch
---

### Bug Fix

**Issue**: ${BUG_DESCRIPTION}

**Solution**: Fixed the reported issue

**Impact**: Resolves the bug without breaking changes
INNER_EOF

echo "Created bug fix changeset: .changeset/bug-fix-${TIMESTAMP}.md"
EOF

chmod +x scripts/bug-fix-changeset.sh
```

## 📋 Best Practices

### 1. Consistent Naming
- Use timestamps for unique filenames
- Include package name in filename for clarity
- Use descriptive summaries

### 2. Version Types
- **patch**: Bug fixes, documentation updates
- **minor**: New features, backward-compatible changes
- **major**: Breaking changes, API modifications

### 3. Commit Messages
- Link changesets to commits
- Use semantic commit messages
- Include issue numbers when applicable

### 4. CI/CD Integration
- Only create changesets for relevant changes
- Use environment variables for automation
- Test changeset creation in CI

## 🔧 Troubleshooting

### Issues with Script Permissions
```bash
# Make script executable
chmod +x scripts/create-changeset.sh

# Check permissions
ls -la scripts/create-changeset.sh
```

### Changeset Not Applied
```bash
# Check if changeset files exist
ls -la .changeset/

# Verify changeset format
cat .changeset/*.md

# Apply manually if needed
bun run version-packages
```

### Version Conflicts
```bash
# Clean state
rm -rf .changeset/*.md
git reset --hard HEAD~1

# Try again
bun run changeset:add "@pwarnock/liaison" patch "Fix version conflict"
```

## 📚 Additional Resources

- [Changesets Documentation](https://github.com/changesets/changesets)
- [Semantic Versioning](https://semver.org/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

This headless workflow enables reliable Changeset usage in automated environments! 🚀