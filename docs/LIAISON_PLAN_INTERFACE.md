# Liaison Plan Interface

**Liaison is the hub. Cody PBT is the implementation. Tasks map to Beads.**

---

## Interface Overview

The Liaison Plan interface provides a structured, repeatable workflow for project planning and execution:

```
liaison plan      → Define project vision and scope
liaison build     → Create feature backlog from plan
liaison refresh   → Sync and report system status
liaison task create  → Convert backlog items to tasks
liaison workflow list → Available automation workflows
```

---

## Plan → Build → Refresh Workflow

### Phase 1: `liaison plan`

Starts the discovery/planning phase:

```bash
liaison plan
```

**Creates:**
- `.cody/project/plan/discovery.md` - Discovery document
- `.cody/project/plan/prd.md` - Product requirements (template)
- `.cody/project/plan/plan.md` - Implementation plan (template)

**User fills in:**
- Target Users
- Problem Being Solved
- Desired Outcome
- Success Criteria
- Primary Use Cases
- Must-Have Features
- Constraints & Risks

**Output:**
```
+-----------------+
PLAN PHASE : START
+-----------------+

📁 Liaison Plan: /path/to/project/.cody/project/plan

💡 Edit discovery.md to define your project

  liaison build → when ready to create feature backlog
```

---

### Phase 2: `liaison build`

Converts the completed plan into a feature backlog:

```bash
liaison build
```

**Requires:** Completed `.cody/project/plan/plan.md`

**Creates:**
- `.cody/project/build/feature-backlog.md` - Implementation backlog

**Output:**
```
+---------------+
BUILD PHASE START
+---------------+

📁 Feature backlog: /path/to/project/.cody/project/build/feature-backlog.md

💡 Next: liaison task create "<feature>" to create tasks
   Or: liaison workflow list to see available workflows
```

---

### Phase 3: `liaison refresh`

Synchronizes system state and reports status:

```bash
liaison refresh
```

**Reports:**
- Task count and pending items
- Available workflows
- Beads daemon health
- Last refresh timestamp

**Output:**
```
📊 Liaison System Status
========================================

Tasks: 5 total (2 pending)
Workflows: 15 available
Beads: healthy

Last refresh: 2026-01-12T00:54:17.108Z
Total refreshes: 47
```

---

## Task → Beads Mapping

Every `liaison task create` creates a Beads issue:

```bash
liaison task create "Implement user authentication" \
  --priority high \
  --auto-trigger development
```

**Flow:**
1. Task created via CLI
2. Synced to Beads backend (`~/.beads/beads.db`)
3. Workflow auto-triggered based on priority/content
4. Status updates sync back to Beads

---

## Workflow Triggers

Automatic workflow triggers based on task properties:

| Priority | Auto-Triggered Workflow |
|----------|------------------------|
| critical | security-response |
| high | bug-fix / development |
| medium | feature-development |
| low | documentation-update |

**Keywords also trigger workflows:**
- "security" → security-response
- "bug" → bug-fix
- "docs" / "documentation" → documentation-update

---

## Handoff to Worker Agent

When handing off to a worker agent:

1. **Planner (you):**
   - Define plan via `liaison plan`
   - Create backlog via `liaison build`
   - Create tasks via `liaison task create`
   - Provide task IDs to worker

2. **Worker (agent):**
   - Execute tasks one at a time
   - Update status via `liaison task update`
   - Report back with task IDs completed

**Standard handoff format:**
```
Summary: Completed X of Y tasks
Tasks: owk-abc123 (closed), owk-def456 (in-progress)
Blockers: None
Next: owk-ghi789
```

---

## Commands Reference

| Command | Description |
|---------|-------------|
| `liaison plan` | Start planning phase |
| `liaison build` | Generate feature backlog |
| `liaison refresh` | Sync and report status |
| `liaison task create <title>` | Create task |
| `liaison task list` | List tasks |
| `liaison workflow list` | List workflows |
| `liaison health` | System health check |

---

## Configuration

**Plan storage:** `.cody/project/plan/`
**Backlog storage:** `.cody/project/build/`
**State file:** `.cody/local/liaison-state.json`
**Beads backend:** `~/.beads/beads.db`

---

## Best Practices

1. **One task per issue** - Don't create subtasks manually
2. **Use descriptive titles** - Include keywords for auto-trigger
3. **Set appropriate priority** - Affects workflow selection
4. **Refresh before work** - Always run `liaison refresh` first
5. **Report back systematically** - Use standard handoff format
