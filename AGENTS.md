# Agent Guidelines for opencode-config

## Build/Test Commands

**Environment setup:**
```bash
uv sync                    # Create .venv and install dependencies
source .venv/bin/activate  # Activate virtual environment
```

**Test configuration compatibility:**
```bash
uv run python scripts/test-compatibility.py
```

**Validate specific configuration:**
```bash
uv run python scripts/config-validator.py config/global/agents/default.json
```

**Validate all configurations:**
```bash
uv run python scripts/config-validator.py config/
```

**Use environment templates:**
```bash
uv run python scripts/environment-templates.py list
uv run python scripts/environment-templates.py apply web-development ./my-project
```

**Test inheritance:**
```bash
uv run python scripts/test-inheritance.py
```

**Use CLI tool:**
```bash
uv run opencode-config validate config/
uv run opencode-config test
uv run opencode-config setup
```

## Code Style Guidelines

**Python:**
- Use 4-space indentation
- Follow PEP 8 naming conventions (snake_case for functions/variables, PascalCase for classes)
- Type hints required for all function signatures
- Docstrings in triple quotes for all modules and public functions
- Import order: standard library, third-party, local modules
- Use `uv` for package management and `.venv` for virtual environments

**JSON Configuration:**
- Use 2-space indentation
- Include `$schema` reference pointing to `../../schemas/`
- Follow semantic versioning for `version` field
- Use `platform_overrides` for platform-specific settings
- Paths should use Unix-style forward slashes, expanduser (~) for home directories

**Environment Management:**
- Always use `uv sync` to create and manage virtual environments
- Use `uv run` for one-off commands without activating venv
- Include `.venv/` in `.gitignore`
- Use `pyproject.toml` for project metadata and dependencies

**Error Handling:**
- Use try/except blocks with specific exception types
- Log errors with appropriate context
- Return structured error responses with `valid`, `errors`, `warnings` fields
- Gracefully handle missing dependencies (jsonschema, etc.)

**File Organization:**
- Scripts in `scripts/` directory should be executable
- Configuration files follow `config/{global|project}/` structure
- Schema definitions in `schemas/` directory
- Use Path objects from pathlib for cross-platform compatibility

## Cody Spec Driven Development Framework

This project uses the **Cody Spec Driven Development Framework** for project management and workflow automation. The framework was installed from:

**Source Repository:** https://github.com/icodewith-ai/cody-framework

The Cody Spec Driven Development Framework provides:
- Specialized subagents (cody-planner, cody-builder, cody-admin, cody-version-manager)
- Workflow commands (`/cody plan`, `/cody build`, `/cody refresh`, `/cody version-add`, `/cody version-build`)
- Version management and feature backlog tracking
- Integration with OpenCode's agent system

**Enhanced Build Behavior:** This project has configured the cody-builder subagent to automatically advance to the first incomplete version when `/cody build` is called and `feature-backlog.md` already exists. Instead of just reporting that the build phase has started, it will:

1. Scan the feature-backlog.md for the first "🔴 Not Started" version
2. Automatically execute `:cody version build [version]` for that version
3. Begin development work immediately

This eliminates manual version selection and provides a smoother workflow. If all versions are completed, it will report that no incomplete versions are available.

## Issue Tracking

This project uses **bd (beads)** for task/issue tracking and **:cody** for project management. See documentation below for complete workflow.

## Issue Tracking with bd (beads)

**IMPORTANT**: This project uses **bd (beads)** for ALL issue tracking. Do NOT use markdown TODOs, task lists, or other tracking methods.

### Why bd?

- Dependency-aware: Track blockers and relationships between issues
- Git-friendly: Auto-syncs to JSONL for version control
- Agent-optimized: JSON output, ready work detection, discovered-from links
- Prevents duplicate tracking systems and confusion

### Quick Start

**Check for ready work:**
```bash
bd ready --json
```

**Create new issues:**
```bash
bd create "Issue title" -t bug|feature|task -p 0-4 --json
bd create "Issue title" -p 1 --deps discovered-from:bd-123 --json
```

**Claim and update:**
```bash
bd update bd-42 --status in_progress --json
bd update bd-42 --priority 1 --json
```

**Complete work:**
```bash
bd close bd-42 --reason "Completed" --json
```

### Issue Types

- `bug` - Something broken
- `feature` - New functionality
- `task` - Work item (tests, docs, refactoring)
- `epic` - Large feature with subtasks
- `chore` - Maintenance (dependencies, tooling)

### Priorities

- `0` - Critical (security, data loss, broken builds)
- `1` - High (major features, important bugs)
- `2` - Medium (default, nice-to-have)
- `3` - Low (polish, optimization)
- `4` - Backlog (future ideas)

### Workflow for AI Agents

1. **Check ready work**: `bd ready` shows unblocked issues
2. **Claim your task**: `bd update <id> --status in_progress`
3. **Work on it**: Implement, test, document
4. **Discover new work?** Create linked issue:
   - `bd create "Found bug" -p 1 --deps discovered-from:<parent-id>`
5. **Complete**: `bd close <id> --reason "Done"`

### Auto-Sync

bd automatically syncs with git:
- Exports to `.beads/issues.jsonl` after changes (5s debounce)
- Imports from JSONL when newer (e.g., after `git pull`)
- No manual export/import needed!

### MCP Server (Recommended)

If using Claude or MCP-compatible clients, install the beads MCP server:

```bash
pip install beads-mcp
```

Add to MCP config (e.g., `~/.config/claude/config.json`):
```json
{
  "beads": {
    "command": "beads-mcp",
    "args": []
  }
}
```

Then use `mcp__beads__*` functions instead of CLI commands.

### Important Rules

- ✅ Use bd for ALL task tracking
- ✅ Always use `--json` flag for programmatic use
- ✅ Link discovered work with `discovered-from` dependencies
- ✅ Check `bd ready` before asking "what should I work on?"
- ❌ Do NOT create markdown TODO lists
- ❌ Do NOT use external issue trackers
- ❌ Do NOT duplicate tracking systems

For more details, see README.md and QUICKSTART.md.

## Workflow Standardization

**When starting work on a task:**
```bash
bd update bd-XX --status in_progress --notes "Starting work on [specific description]" --json
```

**When actively working on multiple tasks:**
- Only ONE task should be `in_progress` at a time
- Other active work should remain `open` with priority levels
- Update task notes with specific progress details

**When completing work:**
```bash
bd update bd-XX --status closed --notes "Completed - [brief summary of what was done]" --json
```

**When discovering new work:**
```bash
bd create "New task title" -t task -p 1 -d "Description" --json
bd update bd-XX --notes "Discovered new work: bd-YY" --json
```

**Standard Status Flow:**
1. `open` → `in_progress` → `closed`
2. Use `notes` field to track specific progress and blockers
3. Always include context about what's currently being worked on

**Prompt for Workflow Updates:**
When you want me to standardize workflow or update task statuses, use:
- "Update the tasklist to reflect current work"
- "Mark tasks as in_progress for active work" 
- "Standardize the workflow status"
- "Sync beads with actual project state"
