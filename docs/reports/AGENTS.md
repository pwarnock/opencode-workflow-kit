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

## Agent Configuration Rules

**Git Access Restrictions:**
- **Git operations are RESTRICTED globally** - Only the git-automation subagent can use git commands
- All other agents must use `@git-automation` for any git operations
- This ensures centralized, validated git workflow management
- Prevents conflicting git operations and maintains commit quality
- Global permissions deny `git *` commands for all agents except git-automation

**Context7 Access Restrictions:**
- **Context7 operations are RESTRICTED globally** - Only the library-researcher subagent can use Context7 tools
- All other agents must use `@library-researcher` for library documentation research
- This ensures specialized library research is handled by the dedicated subagent
- Global permissions deny `context7_*` commands for all agents except library-researcher

**Agent Delegation Pattern:**
- **Primary agents MUST delegate to specialized subagents** - Direct tool access is restricted
- Git operations: Use `@git-automation` for all git workflows
- Library research: Use `@library-researcher` for Context7 documentation lookup
- Cody workflows: Use `@cody-planner`, `@cody-builder`, `@cody-admin`, `@cody-version-manager` for specialized tasks
- This ensures specialized expertise and maintains clean separation of concerns
- Primary agents coordinate work while subagents handle domain-specific operations

**Subagent Format Requirement:**
- **All subagents MUST be in Markdown format (.md files)**
- JSON subagent configurations are not supported by the Task tool
- Use the frontmatter format with `---` delimiters for configuration
- Markdown format allows better documentation and maintainability

**When to Use @git-automation:**
- Committing completed work: `@git-automation commit-task --issue_id=bd-XX`
- Auto-committing completed tasks: `@git-automation auto-commit`
- Validating changes: `@git-automation validate`
- Syncing Beads with git: `@git-automation sync`
- Branch management: `@git-automation branch --action=create --version=v0.4.0`

**Git Workflow Integration:**
- Agents should mark tasks as completed in Beads when done
- The git-automation subagent will detect completion and auto-commit
- Use conventional commit messages with issue references
- All commits go through atomic validation and Beads integration

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
# Use the wrapper script (recommended)
./scripts/bd-wrapper.sh ready

# Or use direct command (requires setup)
bd ready --json
```

**Setup bd for new projects:**
```bash
# Initialize bd (runs automatically with setup.sh)
./scripts/setup-bd.sh

# Or run during main setup
./setup.sh
```

**Common commands:**
```bash
# Check ready work
./scripts/bd-wrapper.sh ready

# Create new issue
./scripts/bd-wrapper.sh create "Task title" -t task -p 2

# Update task status
./scripts/bd-wrapper.sh update bd-XX --status in_progress

# Close completed task
./scripts/bd-wrapper.sh close bd-XX
```

**Create new issues:**
```bash
# First check for duplicates
python3 scripts/duplicate-prevention.py "Issue Title" --interactive

# Then create if no duplicates found
bd create "Issue title" -t bug|feature|task -p 0-4 --json
bd create "Issue title" -p 1 --deps discovered-from:bd-123 --json
```

### Issue Creation Checklist

Before creating any issue:
1. [ ] **Search existing issues**: `bd search "keywords" --status open`
2. [ ] **Run duplicate check**: `python3 scripts/duplicate-prevention.py "Issue Title" --interactive`
3. [ ] **Review similar issues**: Consider updating existing issues instead of creating duplicates
4. [ ] **Use standardized title format**: `Implement [Feature] for [Purpose]`
5. [ ] **For batch operations**: Use `python3 scripts/duplicate-prevention.py --batch issues.txt --dry-run`

### Duplicate Prevention System

This project includes an automated duplicate prevention system:

**Features:**
- **80% similarity detection** using difflib SequenceMatcher
- **Keyword overlap analysis** for semantic duplicates
- **Interactive resolution** with duplicate details
- **Batch processing** with dry-run mode
- **Comprehensive checking** against all open issues

**Usage Examples:**
```bash
# Check single issue for duplicates
python3 scripts/duplicate-prevention.py "Implement feature X" --interactive

# Check all open issues for duplicates
python3 scripts/duplicate-prevention.py --check-all --fail-on-duplicates

# Process multiple issues from file
python3 scripts/duplicate-prevention.py --batch issues.txt --dry-run

# Clean up existing duplicates
python3 scripts/cleanup-duplicates.py
```

**Similarity Threshold:**
- **80% title similarity** catches exact and near-exact duplicates
- **60% keyword overlap** catches semantic duplicates
- **Combined analysis** prevents false positives

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
   - First: `python3 scripts/duplicate-prevention.py "Found bug" --interactive`
   - Then: `bd create "Found bug" -p 1 --deps discovered-from:<parent-id>`
5. **Complete**: `bd close <id> --reason "Done"`

### Agent Creation Guidelines

**Mandatory Pre-Creation Steps:**
1. **Always run duplicate check** before creating any issue
2. **Use interactive mode** to resolve potential duplicates
3. **Batch operations require dry-run** first
4. **Standardized title format**: `Implement [Feature] for [Purpose]`

**Prohibited Patterns:**
- ❌ Creating issues without duplicate checking
- ❌ Batch creation without dry-run verification
- ❌ Ignoring duplicate warnings
- ❌ Using vague titles like "Fix stuff" or "Add feature"

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

## Dual Tracking System Architecture

This project uses a sophisticated **dual tracking system** that combines strategic planning with tactical execution:

### **System Components**

**1. Cody PBT (Product Builder Toolkit) - Strategic Planning**
- **Location**: `.cody/project/plan/feature-backlog.md`
- **Purpose**: High-level strategic planning, feature roadmaps, version planning
- **Scope**: Multi-version release planning, architectural decisions, feature breakdown
- **Format**: Structured markdown with version phases and detailed feature specifications

**2. Beads (bd) - Tactical Execution**
- **Location**: `.beads/issues.jsonl` (git-synced)
- **Purpose**: Atomic task tracking, dependency management, day-to-day execution
- **Scope**: Individual tasks, bug fixes, specific implementation work
- **Format**: JSON-based issue tracking with dependency awareness

### **Complementary Roles**

| Aspect | Cody PBT | Beads (bd) |
|--------|------------|-------------|
| **Planning Level** | Strategic (months/quarters) | Tactical (days/weeks) |
| **Granularity** | Features & Epics | Tasks & Bugs |
| **Time Horizon** | Release planning (v0.5.0, v0.6.0) | Sprint/work execution |
| **Dependencies** | Feature dependencies | Task dependencies & blockers |
| **Status Tracking** | Version phases (🔴🟡🟢) | Task states (open/in_progress/closed) |
| **Integration** | Generates task backlogs | Executes and reports back |

### **Data Flow & Synchronization**

**1. Planning Flow (Cody → Beads)**
```
Cody Feature Backlog
    ↓ (Feature breakdown)
Beads Task Creation
    ↓ (Task assignment)
Development Work
    ↓ (Task completion)
Beads Status Updates
    ↓ (Progress aggregation)
Cody Version Progress
```

**2. Bidirectional Sync**
- **Cody generates tasks**: Feature backlog items are broken down into atomic Beads tasks
- **Beads reports progress**: Task completion updates Cody version status
- **Dependency awareness**: Beads task dependencies inform Cody feature sequencing
- **Conflict resolution**: Dual system prevents scope creep and maintains focus

### **Agent Workflow Integration**

**Primary Agents (Strategic)**
- Use Cody for: `/cody plan`, `/cody build`, version management
- Consult Cody backlog for: Feature planning, architectural decisions
- Generate Beads tasks from: Cody feature specifications

**All Agents (Tactical)**
- Use Beads for: `bd ready`, `bd create`, `bd update`, `bd close`
- Track daily work in: Beads task system
- Report progress to: Cody version completion status

**Subagents (Specialized)**
- **git-automation**: Syncs Beads completions to git commits
- **library-researcher**: Research tasks tracked in Beads, context in Cody
- **security-subagent**: Security tasks in Beads, strategic security in Cody

### **Best Practices for Dual Tracking**

**1. Strategic Planning (Cody)**
```bash
# Plan new features and versions
/cody plan
/cody build

# Review feature backlog
cat .cody/project/plan/feature-backlog.md

# Check version progress
/cody refresh
```

**2. Task Execution (Beads)**
```bash
# Check ready work
bd ready --json

# Create tasks from Cody features
bd create "Implement [Feature] for [Purpose]" -t task -p 1 --deps discovered-from:cody-feature

# Update task progress
bd update bd-XX --status in_progress --notes "Working on [specific detail]" --json

# Complete and sync
bd close bd-XX --reason "Completed implementation" --json
```

**3. Maintaining Consistency**
- **Feature → Task Mapping**: Each Cody feature should have corresponding Beads tasks
- **Progress Aggregation**: Beads task completion should update Cody version status
- **Dependency Alignment**: Beads task dependencies should reflect Cody feature dependencies
- **Status Synchronization**: Regular sync between Cody version phases and Beads task completion

### **Benefits of Dual Tracking**

**1. Clear Separation of Concerns**
- Strategic planning doesn't interfere with daily execution
- Tactical tasks don't dilute long-term vision
- Prevents scope creep between planning and execution

**2. Dependency Management**
- **Cody**: Feature-level dependencies (v0.5.0 depends on v0.4.0 completion)
- **Beads**: Task-level dependencies (task B blocked by task A completion)

**3. Progress Visibility**
- **Stakeholders**: See version progress in Cody feature backlog
- **Developers**: See specific tasks in Beads ready work queue
- **Managers**: See both strategic progress and tactical execution

**4. Git Integration**
- **Beads**: Auto-syncs to `.beads/issues.jsonl` for version control
- **Cody**: Strategic planning documents in git for historical reference
- **Combined**: Complete project history with both strategic and tactical changes

### **Common Workflow Patterns**

**1. Feature Development**
```bash
# 1. Strategic planning (Cody)
/cody plan  # Review feature backlog
/cody build  # Start version development

# 2. Task breakdown (Beads)
bd create "Implement core API endpoints" -t task -p 1 --deps discovered-from:cody-feature
bd create "Add authentication middleware" -t task -p 1 --deps discovered-from:cody-feature

# 3. Execution (Beads)
bd ready --json  # Check ready work
bd update bd-XX --status in_progress  # Claim task
# ... implement ...
bd close bd-XX --reason "Completed"  # Complete task

# 4. Progress update (Cody)
/cody refresh  # Update version progress based on Beads completion
```

**2. Bug Fixing**
```bash
# 1. Create bug task (Beads)
bd create "Fix authentication token leak" -t bug -p 0 --json

# 2. Fix and test (Beads)
bd update bd-XX --status in_progress
# ... fix implementation ...
bd close bd-XX --reason "Fixed token leak in auth middleware"

# 3. Update strategic plan if needed (Cody)
# Edit .cody/project/plan/feature-backlog.md if bug affects feature planning
```

**3. Release Planning**
```bash
# 1. Strategic review (Cody)
cat .cody/project/plan/feature-backlog.md
/cody plan  # Review upcoming versions

# 2. Task readiness check (Beads)
bd ready --json  # See what tasks are ready for next version

# 3. Dependency validation (Both)
# Ensure Beads task dependencies support Cody feature sequencing
# Verify no critical tasks are blocking version completion
```

### **Integration Commands**

**Sync Commands**
```bash
# Sync Beads to git (automatic via git-automation)
@git-automation sync

# Refresh Cody progress based on Beads completion
/cody refresh

# Generate task list from Liaison features
python3 scripts/liaison-sync.py --generate-tasks
```

**Status Commands**
```bash
# Strategic status (Cody)
/cody plan  # Review feature backlog
/cody build  # Check version progress

# Tactical status (Beads)
bd ready --json  # Check ready work
bd list --status in_progress  # See active work
```

### **Important Rules**

**✅ DO:**
- Use Cody for strategic planning and feature roadmapping
- Use Beads for all task execution and daily work tracking
- Create Beads tasks from Cody feature specifications
- Update Cody progress based on Beads task completion
- Maintain dependency alignment between systems

**❌ DON'T:**
- Mix strategic planning with tactical execution in same system
- Create tasks in Cody without Beads tracking
- Update Cody features without corresponding Beads tasks
- Ignore dependency relationships between systems
- Use only one system for complete project management

### **Troubleshooting Dual Tracking**

**Sync Issues:**
```bash
# Check Beads sync status
ls -la .beads/issues.jsonl

# Force sync Beads to git
@git-automation sync --force

# Refresh Cody from Beads
/cody refresh --force-sync
```

**Dependency Conflicts:**
```bash
# Check Beads task dependencies
bd show bd-XX --json | jq '.dependencies'

# Review Cody feature sequencing
cat .cody/project/plan/feature-backlog.md | grep -A 10 -B 10 "Dependencies"
```

This dual tracking system provides the strategic vision of Cody with the tactical precision of Beads, enabling comprehensive project management from high-level planning to daily execution.

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

## Test Suite Status and Fixes

**Current Test Infrastructure:**
- ✅ **132 tests passing** across 8 test suites using Vitest
- ✅ **Coverage working** - 15.86% statements, 65.61% branches, 40.94% functions
- ✅ **No hanging issues** - All test commands complete cleanly

**Hanging Issue Fix (Dec 2025):**
- **Problem**: `vitest --coverage` was entering watch mode instead of running once
- **Root Cause**: Missing `--run` flag in package.json test script
- **Solution**: Changed `"test:coverage": "vitest --coverage"` to `"test:coverage": "vitest run --coverage"`
- **Result**: ✅ Coverage command now runs cleanly without hanging

**Vitest vs Jest Assessment:**
- ✅ **Vitest is superior for this project** - Modern, TypeScript-native, fast, good Bun integration
- ❌ **Jest migration not needed** - Would be significant effort for minimal benefit
- ✅ **All test infrastructure working** - No framework changes required

**Test Commands:**
- `bun run test:unit` - Run unit tests (132 tests pass)
- `bun run test:coverage` - Run tests with coverage (no hanging)
- `bun run test:integration` - Integration tests (if needed)
- `bun run test:all` - Run all test suites
