# Liaison Task Graph - Strategic Execution View

## Epics and Dependencies

```
owk-ny81 ┬─ Epic: Shared Primitives Foundation
         │
         ├── owk-x9y ─── owk-wib5, owk-76ai
         ├── owk-ity ─── owk-9xmy, owk-g4s0
         ├── owk-bi7 ─── owk-irju, owk-zl7i
         ├── owk-vt2 ─── owk-nkgn, owk-i1j6
         └── owk-f4mr ── owk-33wm, owk-nx5f

owk-xf7b ┬─ Epic: Claude Config Package
         │
         ├── owk-ah0 ─── owk-vyez, owk-azyf
         ├── owk-wp0 ─── owk-hfv0, owk-gpc6
         ├── owk-urq ─── owk-go1f, owk-0xr3
         ├── owk-6ytv ─── owk-s8bd, owk-2sbk
         ├── owk-7b9n ─── owk-v8ha, owk-2yer
         └── owk-eg9k ─── owk-r2a8, owk-y3v9

owk-4rah ┬─ Epic: Liaison Config CLI
         │
         ├── owk-d6n ─── owk-hikk, owk-8zj2
         ├── owk-z0r ─── owk-lsso, owk-y7hr
         ├── owk-e47 ─── owk-4cwe, owk-jcb1
         ├── owk-gsx ─── owk-45dy, owk-v7x1
         ├── owk-3ah ─── owk-i452, owk-vzg4
         ├── owk-wxpl ─── owk-7af3, owk-g7ch
         ├── owk-8djv ─── owk-47r9, owk-qcf5
         ├── owk-na9 ─── owk-hrtw, owk-bizg
         └── owk-pjkz ─── owk-91u2, owk-qlrl

owk-f4yv ┬─ Epic: Safety Infrastructure
         │
         ├── owk-21sa ─── owk-n3yj, owk-3csl
         ├── owk-03ki ─── owk-m015, owk-dhw1
         ├── owk-0uqd ─── owk-ijtd, owk-xcfk
         └── owk-lqf3 ─── owk-pcry, owk-3lln

owk-627r ┬─ Milestone: Claude Plugin Integration
         │
         ├── owk-tzq7 ─── owk-kjls, owk-j2i1
         ├── owk-fba2 ─── owk-7os1, owk-si4a
         └── owk-y9cl ─── owk-a00i, owk-gpb2
```

## Execution Order (Recommended)

### Phase 1: Shared Primitives (owk-ny81)
1. owk-wib5 - agent_primitives package.json + tsconfig
2. owk-76ai - scaffold agent_primitives src layout
3. owk-9xmy - move mcp-servers.json to agent_primitives
4. owk-g4s0 - move skill-config.json to agent_primitives
5. owk-x9y - Create agent_primitives package structure
6. owk-ity - Move schemas to agent_primitives
7. owk-irju - export schemas from agent_primitives index
8. owk-zl7i - export types/utilities from agent_primitives index
9. owk-bi7 - Create agent_primitives src/index.ts
10. owk-nkgn - schema validator unit tests
11. owk-i1j6 - schema fixture coverage
12. owk-vt2 - Add unit tests for agent_primitives
13. owk-33wm - update opencode_config imports
14. owk-nx5f - re-export skill types
15. owk-f4mr - Update opencode_config to import from agent_primitives

### Phase 2: Claude Config Package (owk-xf7b)
Phase 1 tasks can run in parallel with Phase 2:
- owk-vyez - claude_config package.json + tsconfig
- owk-azyf - scaffold claude_config src layout
- owk-ah0 - Create claude_config package structure
- owk-hfv0 - define Claude config interfaces
- owk-gpc6 - add default config schema typing
- owk-wp0 - Define Claude configuration types
- owk-go1f - minimal Claude settings template
- owk-0xr3 - wire minimal template export
- owk-urq - Create minimal template
- owk-s8bd - claude_config unit tests
- owk-2sbk - claude_config integration tests
- owk-6ytv - Create comprehensive test suite for claude_config
- owk-v8ha - config schema validator
- owk-2yer - validation error reporting
- owk-7b9n - Implement schema validation
- owk-r2a8 - integration availability checks
- owk-y3v9 - semantic validation rules
- owk-eg9k - Implement semantic validation

### Phase 3: Liaison Config CLI (owk-4rah)
After Phase 2 complete:
- owk-hikk - create config command shell
- owk-8zj2 - wire subcommand routing
- owk-d6n - Create packages/liaison/src/commands/claude-config.ts
- owk-lsso - implement validate/export/import
- owk-y7hr - implement template/status
- owk-z0r - Implement all CLI commands
- owk-4cwe - variable substitution engine
- owk-jcb1 - template loader and validation
- owk-e47 - Build template engine
- owk-45dy - setup flow for new projects
- owk-v7x1 - merge flow for existing configs
- owk-gsx - Implement setup command
- owk-i452 - merge strategy newer-wins
- owk-vzg4 - user prompt for conflicts
- owk-3ah - Create merge-manager.ts
- owk-7af3 - conflict detection heuristics
- owk-g7ch - prompt UX for resolution
- owk-wxpl - Implement conflict detection
- owk-47r9 - fetch latest template source
- owk-qcf5 - merge template updates
- owk-8djv - Create template update command
- owk-hrtw - define sync status output
- owk-bizg - implement sync command
- owk-na9 - Implement git-based sync
- owk-91u2 - sync conflict test cases
- owk-qlrl - merge logic test cases
- owk-pjkz - Add tests for sync and merge logic

### Phase 4: Safety Infrastructure (owk-f4yv)
Can run in parallel with Phase 3:
- owk-n3yj - backup manager API
- owk-3csl - integrate backups in config ops
- owk-21sa - Create backup-manager.ts
- owk-m015 - rollback strategy outline
- owk-dhw1 - implement rollback handlers
- owk-03ki - Implement rollback strategy
- owk-ijtd - version detection logic
- owk-xcfk - migration handler registry
- owk-0uqd - Implement upgrade path
- owk-pcry - error taxonomy and codes
- owk-3lln - user-facing error messaging
- owk-lqf3 - Implement comprehensive error handling

### Phase 5: Claude Plugin Milestone (owk-627r)
After Phase 3 complete:
- owk-kjls - plugin manifest structure
- owk-j2i1 - liaison-setup plugin command
- owk-tzq7 - Create Claude plugin structure
- owk-7os1 - E2E install flow test
- owk-si4a - validate plugin activation
- owk-fba2 - Test Claude plugin installation
- owk-a00i - plugin usage guide
- owk-gpb2 - plugin install instructions
- owk-y9cl - Create plugin documentation

## Parallel Execution Opportunities

The following task groups can run in parallel:

| Group A | Group B | Group C | Group D |
|---------|---------|---------|---------|
| Phase 1 | Phase 2 | Phase 4 | Phase 5 |
| (Sequential) | (Parallel to A) | (Parallel to A/B) | (After Phase 3) |

## Task Status Summary

Total Tasks Created: ~70
- Epics: 4
- Milestone: 1
- Parent Tasks: 25
- Subtasks: ~40

## File Locations

- Strategic Plan: `docs/strategy/plan.md`
- Task Export: `docs/strategy/beads-tasks-export.json`
- Task Graph: `docs/strategy/task-graph.md`
- Handoff Document: `docs/strategy/handoff.md`
