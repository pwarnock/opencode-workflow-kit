# Auto-Commit Workflow for Agent Integration

This document describes the enhanced auto-commit functionality that enables agents to automatically commit changes when tasks are completed.

## Overview

The auto-commit system integrates with Beads issue tracking to detect when tasks are completed and automatically commit the related changes. This provides a seamless workflow for agents working on tasks without manual git operations.

## Key Features

### 1. Task Completion Detection
- Monitors Beads issues for status changes to "closed"
- Detects recently completed tasks within configurable time windows
- Identifies files related to specific issues

### 2. Intelligent Commit Generation
- Generates conventional commit messages based on issue details
- Includes issue ID and title in commit messages
- Supports custom commit message templates

### 3. Safety and Validation
- Atomic commit validation before committing
- Configurable safety checks and exclusions
- Dry-run mode for testing

### 4. Agent Integration
- CLI commands for agents to trigger auto-commits
- Continuous monitoring mode for long-running workflows
- Integration with existing git-automation subagent

## Configuration

### Environment Variables

The auto-commit system respects these configuration variables in `git-automation.json`:

```json
{
  "environment": {
    "variables": {
      "AUTO_COMMIT_ON_TASK_COMPLETE": "true",
      "AUTO_COMMIT_DETECTION_INTERVAL": "30",
      "AUTO_COMMIT_VALIDATION_ENABLED": "true",
      "AUTO_COMMIT_DRY_RUN_BY_DEFAULT": "false",
      "AUTO_COMMIT_REQUIRE_CONFIRMATION": "false",
      "AUTO_COMMIT_MAX_FILES": "50",
      "AUTO_COMMIT_EXCLUDE_PATTERNS": "*.tmp,*.log,node_modules/,venv/,__pycache__/"
    }
  }
}
```

### Automation Settings

```json
{
  "automation": {
    "auto_commit": {
      "enabled": true,
      "detection_mode": "beads_status",
      "triggers": ["task_status_closed", "agent_workflow_complete", "manual_trigger"],
      "validation": {
        "enabled": true,
        "strict_mode": true,
        "max_files_per_commit": 50
      },
      "safety_checks": {
        "require_confirmation": false,
        "dry_run_by_default": false,
        "validate_working_tree_clean": true
      }
    }
  }
}
```

## CLI Commands

### 1. Detect Completed Tasks

```bash
# Detect tasks completed in the last hour
uv run python scripts/git-automation.py detect-completion --since 1h

# Detect tasks completed in the last 30 minutes
uv run python scripts/git-automation.py detect-completion --since 30m

# Detect tasks completed in the last day
uv run python scripts/git-automation.py detect-completion --since 24h
```

### 2. Auto-Commit Completed Tasks

```bash
# Auto-commit with dry run (safe testing)
uv run python scripts/git-automation.py auto-commit --dry-run

# Auto-commit for specific time window
uv run python scripts/git-automation.py auto-commit --since 2h

# Force auto-commit even if validation fails
uv run python scripts/git-automation.py auto-commit --force

# Skip validation for faster commits
uv run python scripts/git-automation.py auto-commit --no-validate
```

### 3. Commit Specific Task

```bash
# Commit specific task with dry run
uv run python scripts/git-automation.py commit-task --issue-id opencode-config-13 --dry-run

# Commit and close task
uv run python scripts/git-automation.py commit-task --issue-id opencode-config-13 --status closed

# Commit with custom message
uv run python scripts/git-automation.py commit-task --issue-id opencode-config-13 --message "Custom commit message"

# Commit without validation
uv run python scripts/git-automation.py commit-task --issue-id opencode-config-13 --no-validate
```

### 4. Monitor Mode (Advanced)

```bash
# Start continuous monitoring for task completion
uv run python scripts/git-automation.py watch --interval 30

# Monitor with custom interval
uv run python scripts/git-automation.py watch --interval 60
```

## Agent Workflow Integration

### When an Agent Completes a Task

1. **Mark Task as Completed**: Update the Beads issue status to "closed"
   ```bash
   bd update opencode-config-123 --status closed --notes "Task completed - implementing feature X"
   ```

2. **Trigger Auto-Commit**: Run the auto-commit command
   ```bash
   uv run python scripts/git-automation.py auto-commit --since 5m
   ```

3. **Verify Commit**: Check that changes were committed properly
   ```bash
   git log --oneline -n 5
   ```

### Automated Agent Workflow

For fully automated workflows, agents can use the monitoring mode:

```python
# In agent code
import subprocess
import threading

def start_auto_commit_monitor():
    """Start auto-commit monitoring in background"""
    cmd = [
        "uv", "run", "python", "scripts/git-automation.py", 
        "watch", "--interval", "30"
    ]
    
    def monitor():
        subprocess.run(cmd, check=True)
    
    thread = threading.Thread(target=monitor, daemon=True)
    thread.start()
    return thread

# When agent starts working
monitor_thread = start_auto_commit_monitor()

# When agent completes work
subprocess.run([
    "bd", "update", issue_id, 
    "--status", "closed", 
    "--notes", "Work completed by agent"
], check=True)

# Auto-commit will detect and commit the changes
```

## Commit Message Generation

The system generates intelligent commit messages based on:

### Issue Type Mapping
- `feature` → `feat`
- `bug` → `fix` 
- `task` → `chore`
- `epic` → `feat`

### File-based Scope Detection
- `tasklist.md` → `tasklist`
- `.cody/` → `cody`
- `agents/` → `agents`
- `schemas/` → `schemas`
- `scripts/` → `scripts`

### Example Generated Messages

```
feat(agents): opencode-config-123 add new cody-builder subagent
fix(schemas): opencode-config-456 resolve validation error in agent config
chore: opencode-config-789 update project documentation
```

## Safety and Validation

### Atomic Commit Rules

1. **Single Issue Per Commit**: Each commit should address one issue
2. **No Unrelated Changes**: Don't mix different types of changes
3. **No Version Mixing**: Don't span multiple versions in one commit
4. **Dependency Validation**: Check that issue dependencies are satisfied

### File Exclusions

The system automatically excludes:
- Temporary files (`*.tmp`, `*.log`)
- Build artifacts (`node_modules/`, `venv/`, `__pycache__/`)
- Git metadata (`.git/`)
- Beads data (`.beads/`)

### Validation Modes

- **Strict Mode**: Blocks commits that violate atomic rules
- **Non-Strict Mode**: Shows warnings but allows commits
- **Force Mode**: Bypasses all validation (use with caution)

## Troubleshooting

### Common Issues

1. **No Files Found for Issue**
   - Ensure files contain the issue ID in name or content
   - Check that files are tracked by git

2. **Validation Failures**
   - Review atomic commit rules
   - Consider splitting changes into multiple commits
   - Use `--no-validate` if appropriate

3. **Datetime Parsing Errors**
   - Check Beads issue timestamps
   - Ensure timezone information is correct

### Debug Commands

```bash
# Check git status
uv run python scripts/git-automation.py validate

# Check Beads sync status
uv run python scripts/git-automation.py check-sync

# Test specific issue
uv run python scripts/git-automation.py commit-task --issue-id [ID] --dry-run
```

## Best Practices

1. **Use Dry Run First**: Always test with `--dry-run` before actual commits
2. **Review Commit Messages**: Check generated messages for accuracy
3. **Monitor Validation**: Pay attention to validation warnings
4. **Regular Sync**: Keep Beads and git in sync with `check-sync`
5. **Test Workflows**: Validate auto-commit behavior in test environment

## Integration Examples

### Cody Integration

```bash
# After Cody build completes
uv run python scripts/git-automation.py auto-commit --since 10m
```

### Manual Agent Workflow

```bash
# Agent completes work
echo "Work done" >> progress.log
git add progress.log

# Mark task complete
bd update opencode-config-123 --status closed --notes "Implementation complete"

# Auto-commit changes
uv run python scripts/git-automation.py commit-task --issue-id opencode-config-123
```

### Continuous Integration

```yaml
# .github/workflows/auto-commit.yml
name: Auto-Commit Completed Tasks
on:
  schedule:
    - cron: '*/10 * * * *'  # Every 10 minutes

jobs:
  auto-commit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: pip install -r requirements.txt
      - name: Auto-commit completed tasks
        run: uv run python scripts/git-automation.py auto-commit --since 10m
```

This auto-commit system provides a robust foundation for agent-driven development workflows while maintaining code quality and traceability.