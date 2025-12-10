# Liaison Toolkit - Architecture Evolution Plan

**Current Phase: Coordinator**

## Current Architecture (v0.5.x)

```
@pwarnock/liaison (CLI Framework)
├── @pwarnock/liaison-coordinator (Active Sync Plugin)
│   └── Manages bidirectional Beads-Cody synchronization
│       - Resolves conflicts
│       - Orchestrates workflows
│       - Manages state
└── @pwarnock/opencode_config (Configuration Management)
    └── Validates and manages agent configurations
```

**Key Pattern:** Active orchestration - the coordinator controls and manages the workflow.

---

## Future Phase: Facilitator (Post-v1.0)

As the platform evolves, the role will shift from **Coordinator** (active management) to **Facilitator** (enabling seamless interaction).

### Vision:
- Systems coordinate themselves automatically
- Liaison enables smooth interaction without active intervention
- Self-healing workflows
- Event-driven architecture (vs imperative sync)
- Loose coupling becomes the default
- Users compose their own workflows without central orchestration

### What Changes:
- **Coordinator** → Makes decisions, manages state, orchestrates
- **Facilitator** → Provides tools, removes friction, enables discovery

### Why Later:
1. First, we need coordinator to establish reliability and baseline workflows
2. Once patterns stabilize, we can abstract to facilitator patterns
3. Requires more sophisticated event infrastructure
4. Better serves power users once we have solid foundation

---

## Design Notes

**Do NOT:**
- Remove active orchestration until patterns are proven
- Over-abstract before coordinator is battle-tested
- Assume facilitator patterns without real-world usage data

**DO:**
- Build with facilitator patterns in mind (loose coupling, events)
- Document coordinator assumptions for future refactoring
- Keep interfaces stable for plugin ecosystem
- Test event-driven patterns in parallel

---

## Timeline Estimate

- **v0.5.x - v1.0**: Coordinator (current)
- **v1.1 - v2.0**: Facilitator transition planning
- **v2.0+**: Full facilitator patterns

---

*Last Updated: 2025-12-09*
