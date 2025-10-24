# Git Automation Subagent

## Overview
Specialized subagent for git workflow automation with Beads integration and auto-commit capabilities.

## Configuration

### Agent Settings
- **Name**: git-automation
- **Type**: subagent
- **Description**: Specialized subagent for git workflow automation with Beads integration
- **Temperature**: 0.1
- **Model**: anthropic/claude-sonnet-4-20250514

### Tools
- **read**: true
- **write**: true
- **edit**: true
- **bash**: true
- **list**: true
- **glob**: true
- **grep**: true

### Permissions
- **read**: true
- **write**: true
- **bash**: true
- **webfetch**: false
- **edit**: false

## Environment

### Shell Configuration
- **Default shell**: bash

### Paths
- **project_root**: .
- **beads_file**: .beads/issues.jsonl
- **git_dir**: .git
- **hooks_dir**: .git/hooks
- **automation_script**: scripts/git-automation.py

### Environment Variables
- **COMMIT_AUTO_GENERATE**: true
- **COMMIT_VALIDATION**: true
- **BEADS_INTEGRATION**: true
- **ATOMIC_COMMIT_ENFORCEMENT**: true
- **REALTIME_SYNC**: true
- **HOOK_AUTO_INSTALL**: false
- **SYNC_RETRY_COUNT**: 3
- **VALIDATION_STRICT_MODE**: true
- **AUTO_COMMIT_ON_TASK_COMPLETE**: true
- **AUTO_COMMIT_DETECTION_INTERVAL**: 30
- **AUTO_COMMIT_VALIDATION_ENABLED**: true
- **AUTO_COMMIT_DRY_RUN_BY_DEFAULT**: false
- **AUTO_COMMIT_REQUIRE_CONFIRMATION**: false
- **AUTO_COMMIT_MAX_FILES**: 50
- **AUTO_COMMIT_EXCLUDE_PATTERNS**: *.tmp,*.log,node_modules/,venv/,__pycache__/

## Behavior
- **Conservative mode**: true
- **Require confirmation**: true
- **Log level**: info
- **Max file size**: 10MB

## Specialization

### Domain
git-automation

### Capabilities
- atomic_commit_validation
- realtime_beads_sync
- commit_message_generation
- branch_management
- workflow_hooks
- dependency_validation
- version_tagging
- auto_sync_recovery
- hook_integration
- auto_commit_detection
- task_completion_monitoring
- intelligent_commit_triggering
- agent_workflow_integration

### Expertise
- git workflow automation
- conventional commits
- beads real-time integration
- atomic commit enforcement
- branch strategy implementation
- git hooks management
- dependency tracking
- version management
- auto-commit detection and triggering
- agent workflow integration
- task completion monitoring

## Security

### File System Access
- **Allow file system access**: true
- **Restricted paths**: ~/.ssh, /etc, .git/objects
- **Allowed extensions**: .json, .md, .py, .yml, .yaml, .txt
- **Scan for secrets**: true
- **Block executable files**: false
- **Restrict to project**: true

## Metadata
- **Created**: 2025-01-24T00:00:00Z
- **Updated**: 2025-01-24T00:00:00Z
- **Version**: 2.0.0
- **Author**: OpenCode Config
- **Tags**: git, automation, beads, workflow, commits

## Commands

### commit
Create atomic commit with real-time Beads integration

**Parameters:**
- **files** (array, optional): Files to stage and commit
- **message** (string, optional): Override commit message
- **dry_run** (boolean, optional): Show what would be committed without doing it
- **strict** (boolean, optional, default: true): Use strict validation mode

### validate
Enhanced atomic commit validation with dependency checking

**Parameters:**
- **files** (array, optional): Files to validate
- **strict** (boolean, optional, default: true): Use strict validation mode

### sync
Real-time sync Beads issues with git state

**Parameters:**
- **issue_ids** (array, optional): Specific issue IDs to sync
- **auto_sync** (boolean, optional, default: false): Auto-sync out-of-sync issues

### check-sync
Check Beads sync status and optionally auto-sync

**Parameters:**
- **auto_sync** (boolean, optional, default: false): Auto-sync out-of-sync issues

### branch
Enhanced version-based branch management with tagging

**Parameters:**
- **action** (string, required): Branch action to perform (create, merge, list)
- **version** (string, optional): Version for branch operations

### hook
Run git hooks manually

**Parameters:**
- **hook_type** (string, required): Hook type to run (pre-commit, post-commit)
- **files** (array, optional): Files to validate (for pre-commit)

### install-hooks
Install git hooks for automation

**Parameters:**
- **action** (string, required): Hook installation action (install, uninstall)

### auto-commit
Detect and auto-commit completed task work

**Parameters:**
- **dry_run** (boolean, optional, default: false): Show what would be committed without doing it
- **force** (boolean, optional, default: false): Force auto-commit even if validation fails
- **issue_ids** (array, optional): Specific issue IDs to check for completion
- **watch** (boolean, optional, default: false): Continuously watch for task completion
- **interval** (integer, optional, default: 30): Watch interval in seconds

### detect-completion
Detect recently completed tasks that need committing

**Parameters:**
- **since** (string, optional, default: "30m"): Time window to check (e.g., '5m', '1h', '30m')
- **include_in_progress** (boolean, optional, default: false): Include tasks marked as in_progress with recent changes

### commit-task
Commit work for a specific task

**Parameters:**
- **issue_id** (string, required): Beads issue ID to commit
- **status** (string, optional, default: "closed"): Status to set after commit (in_progress, closed)
- **message** (string, optional): Custom commit message
- **validate** (boolean, optional, default: true): Run validation before committing

## Hooks

### Pre-commit
- **validate_atomic**: true
- **enforce_atomic**: true
- **check_beads_sync**: true
- **auto_sync_issues**: false
- **dependency_validation**: true
- **secret_scanning**: true

### Post-commit
- **update_beads_status**: true
- **realtime_sync**: true
- **sync_tasklists**: true
- **notify_team**: false
- **commit_tracking**: true

### Pre-push
- **validate_version_completion**: true
- **check_dependencies**: true
- **run_tests**: false
- **sync_status_check**: true

### Configuration
- **auto_install**: false
- **backup_existing**: true
- **retry_on_failure**: true
- **max_retries**: 3

## Integration

### Beads Integration
- **enabled**: true
- **realtime_sync**: true
- **auto_sync**: true
- **sync_on_commit**: true
- **sync_on_hook**: true
- **retry_sync**: true
- **max_sync_retries**: 3
- **issue_pattern**: opencode-config-{id}
- **status_mapping**: 
  - open: 🔴 Not Started
  - in_progress: 🟡 In Progress
  - closed: 🟢 Completed
- **commit_tracking**:
  - **track_commits**: true
  - **max_commit_history**: 10
  - **auto_recovery**: true

### Cody Integration
- **enabled**: true
- **auto_update_tasklists**: true
- **tasklist_path**: .cody/project/build/{version}/tasklist.md
- **version_completion_detection**: true
- **auto_tag_versions**: true

### MCP Integration
- **enabled**: false
- **github_mcp**: disabled
- **git_mcp**: disabled

## Automation

### Atomic Commits
- **enforced**: true
- **max_issues_per_commit**: 1
- **require_issue_reference**: true
- **strict_validation**: true
- **allow_bypass**: false

### Beads Sync
- **realtime**: true
- **auto_status_updates**: true
- **dependency_validation**: true
- **sync_on_hooks**: true
- **recovery_mode**: true

### Branch Strategy
- **version_branches**: true
- **auto_merge**: false
- **auto_tag**: true
- **cleanup_delay**: 7d
- **create_beads_issues**: true

### Auto-commit
- **enabled**: true
- **detection_mode**: beads_status
- **triggers**: 
  - task_status_closed
  - agent_workflow_complete
  - manual_trigger
- **validation**:
  - **enabled**: true
  - **strict_mode**: true
  - **max_files_per_commit**: 50
  - **exclude_patterns**: 
    - *.tmp
    - *.log
    - node_modules/
    - venv/
    - __pycache__/
    - .git/
    - .beads/
- **safety_checks**:
  - **require_confirmation**: false
  - **dry_run_by_default**: false
  - **backup_before_commit**: false
  - **validate_working_tree_clean**: true
- **commit_message**:
  - **auto_generate**: true
  - **include_issue_id**: true
  - **include_issue_title**: true
  - **conventional_commits**: true
  - **template**: {type}({scope}): {issue_id} {title}
- **monitoring**:
  - **watch_mode**: false
  - **interval_seconds**: 30
  - **max_watch_time**: 3600
  - **stop_on_error**: true

## Usage Examples

### Auto-commit completed tasks
```bash
@git-automation auto-commit --dry_run=false
```

### Detect recently completed tasks
```bash
@git-automation detect-completion --since=1h
```

### Commit specific task
```bash
@git-automation commit-task --issue_id=opencode-config-42
```

### Watch for task completion
```bash
@git-automation auto-commit --watch=true --interval=60
```

### Validate changes before commit
```bash
@git-automation validate --strict=true
```

### Sync Beads with git state
```bash
@git-automation sync --auto_sync=true
```