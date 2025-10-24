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

## Issue Tracking

This project uses **bd (beads)** for task/issue tracking and **:cody** for project management. See documentation below for complete workflow.

## Issue Tracking with bd (beads)

**IMPORTANT**: This project uses **bd (beads)** for task/issue tracking, complementary to **:cody** for project management.

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

### Important Rules

- ✅ Use bd for task/issue tracking
- ✅ Use :cody for project management and planning
- ✅ Always use `--json` flag for programmatic bd use
- ✅ Link discovered work with `discovered-from` dependencies
- ✅ Check `bd ready` before asking "what should I work on?"
- ❌ Do NOT create markdown TODO lists
- ❌ Do NOT use external issue trackers
- ❌ Do NOT duplicate tracking systems

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
BEFORE ANYTHING ELSE: run 'bd onboard' and follow the instructions
