---
name: git-automation
description: Automate Git workflows with atomic commits, Beads integration, and real-time sync. Use when managing Git commits, branches, task tracking, or handling complex multi-file changes with proper validation.
license: MIT
metadata:
  author: liaison-toolkit
  version: "2.0"
  keywords: "git, commits, workflow, automation, beads, atomic-commits"
---

# Git Automation

Automate complex Git workflows with atomic commit enforcement, Beads integration, and real-time synchronization.

## When to use this skill

Use this skill when:
- Creating commits with proper message formatting
- Managing feature branches and releases
- Syncing Git state with task tracking systems
- Implementing atomic commits across multiple files
- Detecting and auto-committing completed work
- Validating changes before committing

## Core Concepts

### Atomic Commits

An atomic commit is a single, self-contained change that:
- Fixes ONE issue or implements ONE feature
- Can be reverted without breaking other changes
- Passes all tests and validation
- Has a clear, descriptive commit message

**Benefits:**
- Easy to understand changes
- Simpler debugging and rollbacks
- Better code history
- Easier to cherry-pick changes

**Enforcement Rules:**
- Maximum ONE issue/task per commit
- Strict validation before commit
- Dependency checking
- No bypassing atomic commit requirement

### Conventional Commits

Format: `{type}({scope}): {issue_id} {title}`

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactor
- `docs`: Documentation
- `test`: Test additions/updates
- `chore`: Build, dependencies, tooling

**Examples:**
```
feat(auth): TASK-42 Add JWT token validation
fix(api): ISSUE-123 Handle null responses correctly
docs(readme): Update installation instructions
test(utils): Add tests for date formatting
```

### Beads Integration

Real-time synchronization with Beads task tracking:
- Sync Git commits with task status
- Auto-update task status on commit
- Track issue references in commits
- Validate task completion before merge

## Step-by-Step Workflow

### 1. Create a Feature Branch

```bash
# Create branch from main
git checkout main && git pull
git checkout -b feat/TASK-42-description

# Branch naming: {type}/{issue-id}-{short-description}
```

### 2. Make Changes

Edit files for a single feature/fix:
```bash
# Edit files
vim src/feature.ts

# Stage changes
git add src/feature.ts

# Check status
git status
```

### 3. Validate Before Committing

Ensure quality before commit:
```bash
# Run tests
npm test

# Check linting
npm run lint

# Type check
npm run type-check

# Validate changes meet atomic commit rules
# (Max files, single issue, proper formatting)
```

### 4. Create Atomic Commit

```bash
# Commit with proper format
git commit -m "feat(module): TASK-42 Add new feature"

# The commit will:
# 1. Validate message format
# 2. Check file count (< 50 files)
# 3. Verify single issue reference
# 4. Update Beads task status
# 5. Run pre-commit hooks
```

### 5. Sync with Beads (if using task tracking)

```bash
# Auto-sync happens on commit, but manual sync available:
git beads-sync TASK-42
# Updates: task status, linked commits, dependencies
```

### 6. Create Pull Request & Merge

```bash
# Push to remote
git push -u origin feat/TASK-42-description

# Create PR (on GitHub/GitLab)
# Reference task: "Closes TASK-42"
# Wait for reviews and CI

# Merge when approved
git merge feat/TASK-42-description
```

## Common Scenarios

### Scenario 1: Single File Bug Fix

```
Task: BUGFIX-89 "Fix null pointer in auth service"

git checkout main && git pull
git checkout -b fix/BUGFIX-89-null-pointer
vim src/auth/service.ts
npm test  # Verify fix works
git add src/auth/service.ts
git commit -m "fix(auth): BUGFIX-89 Handle null user object"
```

**Commit validates:**
- ✅ Single file (< 50 limit)
- ✅ Proper message format
- ✅ Single issue reference
- ✅ Tests passing

### Scenario 2: Feature with Multiple Files

```
Task: FEAT-156 "Add user preferences UI"

git checkout -b feat/FEAT-156-user-prefs
vim src/components/Preferences.tsx
vim src/api/preferences.ts
vim src/styles/preferences.css
npm test
git add src/components/Preferences.tsx src/api/preferences.ts src/styles/preferences.css
git commit -m "feat(ui): FEAT-156 Add user preferences panel"
```

**Commit validates:**
- ✅ Multiple related files (same feature)
- ✅ All files for single feature
- ✅ Single issue reference
- ✅ Tests passing

### Scenario 3: Refactor with Tests

```
Task: TECH-203 "Refactor date utilities"

git checkout -b refactor/TECH-203-date-utils
vim src/utils/date.ts
vim src/utils/__tests__/date.test.ts
npm test  # Validate refactor doesn't break anything
git add src/utils/date.ts src/utils/__tests__/date.test.ts
git commit -m "refactor(utils): TECH-203 Simplify date formatting"
```

**Commit validates:**
- ✅ Logic and tests together
- ✅ No functionality change
- ✅ All tests pass
- ✅ Proper message format

## Safety Features

### Pre-Commit Validation

Before every commit:
- **Syntax check**: No syntax errors in code
- **Lint check**: Code follows style rules
- **Type check**: TypeScript types are valid
- **Secret scan**: No credentials committed
- **Size check**: No huge files
- **Atomic check**: Single issue per commit

### Auto-Commit Detection

Automatically commit when:
- Beads task marked as completed
- Agent workflow finishes successfully
- Manual trigger requested

**Safety checks:**
- Dry-run mode by default
- Requires confirmation for first auto-commit
- Validates working tree is clean
- Backs up before committing
- Logs all auto-commits

### Dependency Validation

Ensures commits don't break dependencies:
- Check package.json changes
- Verify lock file consistency
- Validate version constraints
- Test dependency installations

## Advanced Workflows

### Watch Mode (Continuous Auto-commit)

```
Watch for completed tasks every 30 seconds
Auto-commit when task status → closed
Validate each commit before pushing
Stop on errors or after 1 hour
```

**Use for:**
- Long-running agent workflows
- Multiple concurrent tasks
- Automated CI/CD pipelines

### Beads Real-Time Sync

Keeps Git and task tracking in sync:
- Commit detection → Update task status
- Task completion → Suggest auto-commit
- Branch creation → Link to task
- Pull request merge → Mark as done

**Sync on:**
- Commit (post-commit hook)
- Branch creation/deletion
- Tag creation
- PR open/close/merge

### Version-Based Branching

Organize branches by release version:
```
main              → Production
v1.2.x            → Stable releases
develop           → Development
feat/...          → Features (merge to develop)
bugfix/...        → Bug fixes (merge to v-branch)
release/v1.2.0    → Release candidates
```

**Tagging:**
- Automatic tags on releases
- Version-based branch cleanup
- Release note generation

## Troubleshooting

### Commit Validation Fails

**Problem:** "Atomic commit validation failed"

**Solution:**
1. Check commit has only one issue reference: `git log -1`
2. Verify file count < 50: `git diff --cached --name-only | wc -l`
3. Check message format: `{type}({scope}): {issue} {title}`
4. Run validation: `git validate --strict`

### Beads Sync Not Working

**Problem:** "Beads sync failed"

**Solution:**
1. Check Beads is running: `beads status`
2. Verify issue exists: `beads issues list TASK-42`
3. Check credentials: `echo $BEADS_API_KEY`
4. Retry manually: `git beads-sync TASK-42`

### Auto-commit Not Triggering

**Problem:** "Auto-commit didn't run"

**Solution:**
1. Check task actually completed: `beads issues get TASK-42`
2. Verify changes exist: `git status`
3. Run manually: `git auto-commit --dry-run=false`
4. Check logs: `cat .git/auto-commit.log`

## Best Practices

1. **One Issue Per Commit**: Never mix multiple issues in one commit
2. **Clear Messages**: Include issue ID and descriptive title
3. **Test Before Commit**: Always run tests before committing
4. **Small Changes**: Smaller atomic commits are easier to review
5. **Linked Tasks**: Always reference task/issue ID in commits
6. **Clean History**: Use atomic commits to keep history clean
7. **Validate Always**: Don't bypass validation checks
8. **Backup Before Auto-commit**: Enable backup before auto-commit

## Related Skills

- **Bun Development**: Build system and development workflow
- **Liaison Workflows**: Task creation and workflow management
- **Code Review**: Quality assurance and peer review process

## Keywords

git, commits, automation, workflow, atomic-commits, beads, sync, branches, validation, conventional-commits
