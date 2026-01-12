# Liaison Strategic Execution Handoff

**Generated:** 2026-01-11
**Version:** 1.0.0

## Overview

This document provides a complete handoff package for executing the Liaison strategic plan. It includes the strategic vision, task execution graph, and all necessary context for coding agents to resume work.

## Architecture Model

```
                    ┌─────────────────────────┐
                    │   docs/strategy/        │  ← Strategic Layer (Tool-Agnostic)
                    │   - plan.md             │
                    │   - task-graph.md       │
                    │   - handoff.md          │
                    └───────────┬─────────────┘
                                │
                                ▼
┌──────────────┐     ┌──────────────────────┐     ┌──────────────────┐
│   Cody PBT   │────▶│      Liaison         │◀────│   Spec-Kit       │
│  (Spoke)     │     │        Hub           │     │   (Future Spoke) │
└──────────────┘     └──────────────────────┘     └──────────────────┘
                                │
                                ▼
                    ┌──────────────────────┐
                    │      Beads           │  ← Execution Layer
                    │   (Tasks + Graph)    │
                    └──────────────────────┘
```

## Strategic Pillars

1. **Shared Primitives** - Reusable agent skills, MCPs, schemas
2. **Claude Config Package** - Claude-specific configuration types and templates
3. **Liaison Config CLI** - `liaison config opencode` and `liaison config claude` commands
4. **Safety Infrastructure** - Backup, rollback, upgrade, error handling
5. **Claude Plugin Milestone** - Claude plugin integration

## Quick Start for Coding Agents

### 1. Read the Strategic Plan
```bash
cat docs/strategy/plan.md
```

### 2. View Task Graph
```bash
cat docs/strategy/task-graph.md
```

### 3. Find Ready Tasks
```bash
bun x bd ready
```

### 4. Start with Shared Primitives
```bash
# Find ready subtasks for agent_primitives
bun x bd list --filter "Subtask:*agent_primitives*" --desc-contains "package.json"
```

## Task Hierarchy

### Epic 1: Shared Primitives Foundation (owk-ny81)
**Parent Tasks:**
- owk-x9y: Create agent_primitives package structure
- owk-ity: Move schemas to agent_primitives
- owk-bi7: Create agent_primitives src/index.ts
- owk-vt2: Add unit tests for agent_primitives
- owk-f4mr: Update opencode_config to import from agent_primitives

**First Ready Subtasks:**
- owk-wib5: agent_primitives package.json + tsconfig
- owk-76ai: scaffold agent_primitives src layout

### Epic 2: Claude Config Package (owk-xf7b)
**Parent Tasks:**
- owk-ah0: Create claude_config package structure
- owk-wp0: Define Claude configuration types
- owk-urq: Create minimal template
- owk-6ytv: Create comprehensive test suite for claude_config
- owk-7b9n: Implement schema validation
- owk-eg9k: Implement semantic validation

### Epic 3: Liaison Config CLI (owk-4rah)
**Parent Tasks:**
- owk-d6n: Create packages/liaison/src/commands/claude-config.ts
- owk-z0r: Implement all CLI commands
- owk-e47: Build template engine
- owk-gsx: Implement setup command
- owk-3ah: Create merge-manager.ts
- owk-wxpl: Implement conflict detection
- owk-8djv: Create template update command
- owk-na9: Implement git-based sync
- owk-pjkz: Add tests for sync and merge logic

### Epic 4: Safety Infrastructure (owk-f4yv)
**Parent Tasks:**
- owk-21sa: Create backup-manager.ts
- owk-03ki: Implement rollback strategy
- owk-0uqd: Implement upgrade path
- owk-lqf3: Implement comprehensive error handling

### Milestone: Claude Plugin Integration (owk-627r)
**Parent Tasks:**
- owk-tzq7: Create Claude plugin structure
- owk-fba2: Test Claude plugin installation
- owk-y9cl: Create plugin documentation

## Dependencies Between Epics

```
Epic 1 (Primitives) ──┬──▶ Epic 2 (Claude Config)
                     │
                     └──▶ Epic 3 (Config CLI)

Epic 2 (Claude Config) ──▶ Epic 3 (Config CLI)

Epic 3 (Config CLI) ─────▶ Epic 4 (Safety)
                          └──▶ Epic 5 (Claude Plugin Milestone)
```

## Key Files Reference

| File | Purpose |
|------|---------|
| `docs/strategy/plan.md` | Strategic planning contract |
| `docs/strategy/task-graph.md` | Visual task dependency graph |
| `docs/strategy/beads-tasks-export.json` | Raw Beads task data |
| `docs/strategy/handoff.md` | This document |

## Common Commands

```bash
# List open tasks
bun x bd list

# List ready tasks (no blockers)
bun x bd ready

# Get task details
bun x bd show <task-id>

# View task tree
liaison task tree <task-id>

# Update task status
liaison task update <task-id> --status closed

# Export tasks
bun x bd export --json
```

## Coding Agent Tips

1. **Start with Epic 1 subtasks** - They unblock Epics 2 and 3
2. **Check dependencies before starting** - Use `liaison task tree <id>`
3. **Mark tasks as blocked if waiting** - Use dependency links
4. **Add subtasks for complex work** - Break down parent tasks
5. **Update task status regularly** - Keep the graph accurate

## Next Steps for Humans

1. Review this handoff document
2. Identify which epic/phase to prioritize
3. Assign tasks to agents or team members
4. Begin execution with Phase 1 subtasks
5. Track progress with `liaison task tree` and `bd ready`

## Questions?

- Strategic vision: See `docs/strategy/plan.md`
- Task details: See `docs/strategy/beads-tasks-export.json`
- Dependencies: See `docs/strategy/task-graph.md`
- Execution: Use `liaison task` and `bd` commands
