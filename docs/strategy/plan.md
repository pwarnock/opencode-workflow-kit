# Liaison Strategic Plan (Hub-and-Spoke)

## Purpose
Liaison is the hub for strategic planning, task coordination, and opinionated agent configuration. Planning tools (Cody PBT today, Spec Kit or others later) are spokes that generate planning artifacts. Liaison consumes a stable planning contract so tools can be upgraded or replaced without disrupting execution.

## Planning Contract
The planning contract is a tool-agnostic artifact stored in this repository. Any planning framework must output the sections below to be compatible with Liaison.

## Vision
Describe the long-term outcome Liaison enables for users.

## Problem Statement
Describe the core problem Liaison solves and why it matters.

## Target Users
List primary user personas and the contexts in which they use Liaison.

## Strategic Pillars
Define the pillars that organize all product work. Example:
- Shared primitives (skills, MCPs, schemas)
- Claude configuration package
- Liaison config CLI
- Safety infrastructure
- Claude plugin milestone

## Milestones
Define milestone outcomes in terms of user-visible capability. Example:
- M1: Agent primitives are reusable across tools
- M2: Config CLI can setup opencode/claude environments
- M3: Safe merge/backup/rollback is available
- M4: Claude plugin can invoke liaison config flows

## Non-Goals
Explicitly list what is out of scope for this planning cycle.

## Success Metrics
Define measurable outcomes for each milestone.

## Risks and Constraints
List key risks, unknowns, or technical constraints.

## Execution Alignment
Map strategic pillars and milestones to Beads tasks. This is the execution bridge between planning and delivery.

| Pillar | Milestone | Beads Tasks | Epic ID |
| --- | --- | --- | --- |
| Shared primitives | M1 | owk-x9y, owk-ity, owk-bi7, owk-vt2, owk-f4mr | owk-ny81 |
| Claude config | M2 | owk-ah0, owk-wp0, owk-urq, owk-6ytv, owk-7b9n, owk-eg9k | owk-xf7b |
| Liaison config CLI | M2 | owk-d6n, owk-z0r, owk-e47, owk-gsx, owk-3ah, owk-wxpl, owk-8djv, owk-na9, owk-pjkz | owk-4rah |
| Safety infrastructure | M3 | owk-21sa, owk-03ki, owk-0uqd, owk-lqf3 | owk-f4yv |
| Claude plugin | M4 | owk-tzq7, owk-fba2, owk-y9cl | owk-627r |

## Task Graph Reference
- **Visual Graph:** `docs/strategy/task-graph.md`
- **Raw Data:** `docs/strategy/beads-tasks-export.json`
- **Handoff:** `docs/strategy/handoff.md`

## Planning Tool Notes
Record which planning tool generated this plan and any relevant configuration.

- Planning tool: Cody PBT
- Source artifacts:
  - .cody/project/plan/discovery.md
  - .cody/project/plan/prd.md
  - .cody/project/plan/plan.md

## Task Hierarchy
This plan is captured as epics and tasks in Beads with the following structure:

- **Epics** (strategic objectives):
  - owk-ny81: Epic: Shared Primitives Foundation
  - owk-xf7b: Epic: Claude Config Package
  - owk-4rah: Epic: Liaison Config CLI
  - owk-f4yv: Epic: Safety Infrastructure
  - owk-627r: Milestone: Claude Plugin Integration

- **Parent Tasks** (work packages):
  - Mapped from original owk-* tasks (owk-x9y, owk-ah0, etc.)

- **Subtasks** (actionable units):
  - Created under each parent task for parallel execution

## Update Protocol
- Update this file when pillars, milestones, or task mappings change.
- Keep Beads tasks aligned with the Execution Alignment table.
- Prefer adding new tasks under existing pillars instead of creating new pillars.
- Use `liaison task tree` to view the hierarchy.
- Use `bun x bd ready` to find work-in-progress tasks.
