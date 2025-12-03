# Beads Issue Tracker Documentation

This directory contains the Beads issue tracking database for the OpenCode Workflow Kit project.

## Overview

Beads is a graph-based issue tracker designed for AI agents and long-horizon task planning. All issues are stored in Git for version control and distributed collaboration.

## Files

- **issues.jsonl** - Source of truth: All issues in JSON Lines format (committed to git)
- **beads.db** - Local SQLite cache for fast queries (gitignored, auto-synced)
- **deletions.jsonl** - Deletion manifest for cross-clone propagation (committed to git)
- **config.yaml** - Repository configuration template
- **.gitignore** - Excludes local cache files from git

## Key Concepts

### Issue Status Values
- `open` - New or unstarted work
- `in_progress` - Actively being worked on
- `closed` - Complete or resolved
- `blocked` - Cannot proceed (has blocking dependencies)

### Dependency Types
- `blocks` - Hard blocker (issue cannot start until blocker resolved)
- `related` - Soft relationship (issues are connected but not blocking)
- `parent-child` - Hierarchical relationship (child depends on parent)
- `discovered-from` - Issue discovered during work on another issue

### Priority Levels
- `0` - Critical (security, data loss, broken builds)
- `1` - High (major features, important bugs)
- `2` - Medium (default, nice-to-have features)
- `3` - Low (polish, optimization)
- `4` - Backlog (future ideas)

## Common Commands

### View Issues
```bash
bd list                          # List all issues
bd list --status open            # Filter by status
bd list --priority 1             # Filter by priority
bd ready                         # Show unblocked work
bd ready --json                  # JSON output for agents
```

### Create & Update Issues
```bash
bd create "Issue title" -t task -p 1 --json
bd update owk-123 --status in_progress --json
bd close owk-123 --reason "Completed" --json
```

### Dependencies
```bash
bd dep add owk-456 owk-123                      # owk-456 depends on owk-123
bd dep tree owk-456                            # Show dependency tree
bd dep remove owk-456 owk-123                  # Remove dependency
```

### Sync & Export
```bash
bd import -i issues.jsonl --orphan-handling allow
bd export -o issues.jsonl
bd sync                          # Manual sync with git
```

### Health Check
```bash
bd doctor                        # Validate database health
```

## Workflow Hygiene

### Best Practices
1. **Close completed issues** - Use `bd close` instead of leaving in `in_progress`
2. **Link discovered work** - Use `--deps discovered-from:parent-id` for new issues
3. **Keep notes updated** - Document progress in issue notes with `--notes`
4. **Use consistent types** - bug|feature|task|epic|chore
5. **Clean up duplicates** - Consolidate redundant issues

### Regular Maintenance
- Review stale in_progress issues monthly
- Close duplicate issues with explicit notes
- Archive backlogged items to prevent database bloat
- Verify all P0 issues are tracked and prioritized

## Git Sync

Beads automatically syncs with git:
- Changes auto-export to `issues.jsonl` (5-second debounce)
- JSONL is committed to git for version control
- Changes auto-import when JSONL is newer than database
- Git merge driver configured for intelligent JSONL merging

### Sync Workflow
```bash
bd create "New issue" -p 1              # Create issue
# ... make changes ...
git add .beads/issues.jsonl             # Auto-created by Beads
git commit -m "bd sync: update issues"  # Commit with bd sync prefix
git push                                # Push to sync with team
```

## Database Health

### Current Status (as of 2025-12-03)
- **Total Issues**: 111
- **Closed**: 85 (76.6%)
- **Open**: 23 (20.7%)
- **In Progress**: 6 (5.4%)
- **Ready (Unblocked)**: 10 tasks

### Recent Cleanup
- Consolidated duplicate testing tasks (owk-1z6 → owk-23)
- Closed duplicate integration test issue (owk-dvg → owk-fyt)
- Marked stale task as closed (owk-y7w)
- Updated integration test progress (owk-2vt)

## Backlogged Items

### TaskFlow System (owk-39 through owk-42)
These items are backlogged pending evaluation of existing open source workflow automation frameworks:
- n8n, Kestra, Windmill, Activepieces
- Decision: Build custom vs. integrate existing solution
- Will revisit after framework evaluation

### Scrapped Items
- owk-24: Create advanced environment templates (SCRAPPED)
  - Reason: Current template system has 80% duplication
  - Better to fix architecture than expand broken approach

## Integration with Agents

### For Claude/Amp Sessions
1. Start session: `bd ready --json` shows unblocked work
2. During work: Create issues for discovered problems with `bd create`
3. End session: `bd update [id] --status [status] --json` and commit

### Automated Sync
- Session start: Query `bd ready` for context
- Session end: Auto-commit changes via git-automation subagent
- Session continuity: Previous work is discoverable via issue dependencies

## Troubleshooting

### Import Validation Errors
If JSONL import fails with status validation:
```bash
bd import -i issues.jsonl --orphan-handling allow
```

### Stale Database
```bash
rm .beads/beads.db*                    # Remove old database
bd init --skip-merge-driver             # Reinitialize
bd import -i issues.jsonl --orphan-handling allow
```

### Daemon Issues
```bash
bd doctor                              # Check daemon health
rm -f .beads/.exclusive-lock .beads/bd.sock .beads/bd.pipe
bd init --skip-merge-driver             # Reset if needed
```

## References

- [Beads GitHub Repository](https://github.com/steveyegge/beads)
- [Beads Documentation](https://github.com/steveyegge/beads/tree/main/docs)
- [Agent Instructions](../AGENTS.md)
- [Cody-Beads Integration](../BEADS-CODY-SYNC-QUICKSTART.md)
