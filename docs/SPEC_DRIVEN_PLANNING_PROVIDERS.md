# Spec-Driven Planning Providers

> **Status**: Planning Document  
> **Created**: 2024-12-27  
> **Purpose**: Evaluate and integrate spec-driven planning frameworks as provider abstractions

## Overview

This document captures the analysis and integration plan for spec-driven planning frameworks. The goal is to abstract multiple planning methodologies behind a unified provider interface, similar to how `IssueSourceProvider` abstracts GitHub/GitLab/Jira.

## The Three Frameworks

### 1. Cody PBT (Product Builder Toolkit)

**Source**: https://github.com/ibuildwith-ai/cody-pbt  
**Stars**: 46  
**License**: Custom (Red Pill Blue Pill Studios)

**Philosophy**: Helps domain experts and product builders who use "vibe coding" techniques turn loose ideas into production-ready products through structured discovery and planning.

**Target Users**: Domain experts, non-developers, product builders

**Two-Phase Development Cycle**:

| Phase | Documents |
|-------|-----------|
| **Plan** | `discovery.md` → `prd.md` → `plan.md` |
| **Build** | `feature-backlog.md` → `versions/` → `release-notes.md` |

**Commands**:
```
:cody help          # Show all commands
:cody plan          # Start PLAN phase
:cody build         # Start BUILD phase
:cody version build # Build specific version
:cody version add   # Add new version
:cody refresh       # Refresh AI context
:cody upgrade       # Upgrade toolkit
```

**Artifact Structure**:
```
.cody/
├── config/
│   ├── activate.md
│   ├── agent.md
│   ├── settings.json
│   ├── commands/
│   ├── scripts/
│   └── templates/
│       ├── plan/      # discovery.md, prd.md, plan.md
│       └── build/     # feature-backlog.md, release-notes.md
│           └── version/  # design.md, tasklist.md, retrospective.md
└── project/
    ├── library/
    │   ├── assets/
    │   └── docs/
    ├── plan/          # discovery.md, prd.md, plan.md
    └── build/         # backlog, versions, release-notes
```

**Unique Strengths**:
- Version-based development: `v[major.minor.patch]-[name]`
- Feature backlog with status tracking (🔴🟡🟢)
- Built-in retrospectives for learning loops
- Focus on domain experts, not just developers

---

### 2. GitHub Spec-Kit

**Source**: https://github.com/github/spec-kit  
**Stars**: 58.1K (clear community leader)  
**License**: MIT

**Philosophy**: Spec-Driven Development (SDD) inverts traditional development—specifications become executable, directly generating implementations rather than just guiding them.

**Target Users**: Engineers, architects, development teams

**Core Concepts**:
- **Constitutional Constraints**: 9 Articles governing development
- **Phase Gates**: Pre-implementation validation
- **Executable Specifications**: Specs generate code, not just guide it

**Commands**:
```
/speckit.constitution  # Create governing principles
/speckit.specify       # Define feature requirements
/speckit.clarify       # Structured Q&A for gaps
/speckit.plan          # Technical implementation plan
/speckit.tasks         # Executable task breakdown
/speckit.implement     # Code generation
/speckit.analyze       # Cross-artifact consistency
```

**The Nine Articles of Constitution**:

| Article | Principle |
|---------|-----------|
| I | Library-First: Every feature begins as standalone library |
| II | CLI Interface Mandate: All libraries expose CLI |
| III | Test-First Imperative: No code before tests |
| IV-VI | (Various governance principles) |
| VII | Simplicity: Maximum 3 projects, no future-proofing |
| VIII | Anti-Abstraction: Use framework directly |
| IX | Integration-First Testing: Real environments, not mocks |

**Phase Gates** (Pre-Implementation):
```markdown
### Phase -1: Pre-Implementation Gates

#### Simplicity Gate (Article VII)
- [ ] Using ≤3 projects?
- [ ] No future-proofing?

#### Anti-Abstraction Gate (Article VIII)
- [ ] Using framework directly?
- [ ] Single model representation?

#### Integration-First Gate (Article IX)
- [ ] Contracts defined?
- [ ] Contract tests written?
```

**Artifact Structure**:
```
.specify/
├── memory/
│   └── constitution.md
├── specs/
│   └── 001-feature-name/
│       ├── spec.md
│       ├── plan.md
│       ├── tasks.md
│       ├── research.md
│       ├── data-model.md
│       ├── quickstart.md
│       └── contracts/
│           ├── api-spec.json
│           └── signalr-spec.md
└── templates/
    ├── spec-template.md
    ├── plan-template.md
    └── tasks-template.md
```

**Unique Strengths**:
- 58K stars - massive community validation
- Constitutional constraints enforce quality
- Auto-branching: `001-feature-name` branches
- 15+ agent support (Claude, Gemini, Copilot, Cursor, Windsurf, etc.)
- Research integration for rapidly-changing tech
- Python CLI (`specify`) for automation

---

### 3. Liatrio SDD (Spec-Driven Development Workflow)

**Source**: https://github.com/liatrio-labs/spec-driven-workflow  
**Stars**: 45  
**License**: Apache-2.0

**Philosophy**: Lightweight markdown-based workflow focused on proof artifacts and validation. Every task requires demonstrable evidence before commit.

**Target Users**: Development teams, junior-developer friendly

**Four-Step Workflow**:

| Step | Command | Output |
|------|---------|--------|
| 1 | `/SDD-1-generate-spec` | `[NN]-spec-[feature].md` |
| 2 | `/SDD-2-generate-task-list-from-spec` | `[NN]-tasks-[feature].md` |
| 3 | `/SDD-3-manage-tasks` | `[NN]-proofs/` artifacts |
| 4 | `/SDD-4-validate-spec-implementation` | Validation report |

**Context Markers** (Detect context rot):
```
SDD1️⃣ - Spec generation active
SDD2️⃣ - Task breakdown active
SDD3️⃣ - Task management active
SDD4️⃣ - Validation active
```

**Proof Artifacts** (Required for each task):
```markdown
### Proof Artifacts
- Screenshot: `/path` page showing X demonstrates end-to-end functionality
- CLI: `command --flag` returns expected output demonstrates feature works
- Test: `MyFeature.test.ts` passes demonstrates requirement implementation
- URL: https://... demonstrates feature is accessible
```

**Two-Phase Task Generation**:
1. **Phase 2**: Parent tasks (demoable units) → Wait for confirmation
2. **Phase 3**: Sub-tasks (actionable items) → Only after user says "Generate sub tasks"

**Artifact Structure**:
```
docs/specs/
└── 01-spec-feature-name/
    ├── 01-spec-feature-name.md
    ├── 01-tasks-feature-name.md
    ├── 01-questions-1-feature-name.md
    ├── 01-validation-feature-name.md
    └── 01-proofs/
        ├── 01-task-01-proofs.md
        ├── 01-task-02-proofs.md
        └── 01-task-03-proofs.md
```

**Unique Strengths**:
- Proof artifacts required before commits
- Context markers detect AI context degradation
- Two-phase task generation (strategic → tactical)
- Security-aware (credential sanitization reminders)
- Junior-developer friendly documentation
- Validation coverage matrix

---

## Comparison Matrix

### Workflow Phases

| Phase | Cody PBT | Spec-Kit | Liatrio SDD |
|-------|----------|----------|-------------|
| Discovery | `:cody plan` → `discovery.md` | `/speckit.constitution` | SDD-1: Scope assessment |
| Requirements | `prd.md` (what/why) | `/speckit.specify` | `[NN]-spec-*.md` |
| Clarification | Interactive Q&A | `/speckit.clarify` | Questions rounds |
| Technical Plan | `plan.md` (how/when) | `/speckit.plan` | (merged into spec) |
| Task Breakdown | `feature-backlog.md` | `/speckit.tasks` | SDD-2: Two-phase |
| Build | `:cody version build` | `/speckit.implement` | SDD-3: Single-threaded |
| Validate | `retrospective.md` | `/speckit.analyze` | SDD-4: Coverage matrix |

### Feature Comparison

| Feature | Cody PBT | Spec-Kit | Liatrio SDD |
|---------|----------|----------|-------------|
| Version management | ✅ Built-in | ❌ Manual | ❌ Manual |
| Constitutional constraints | ❌ | ✅ 9 Articles | ❌ |
| Phase gates | ❌ | ✅ Pre-implementation | ❌ |
| Proof artifacts | ❌ | ❌ | ✅ Required |
| Context rot detection | ❌ | ❌ | ✅ Emoji markers |
| Auto-branching | ❌ | ✅ `001-feature` | ❌ |
| Retrospectives | ✅ Built-in | ❌ | ❌ |
| Multi-agent support | ✅ Several | ✅ 15+ agents | ✅ 5+ agents |
| CLI automation | ❌ Commands only | ✅ Python CLI | ❌ Slash commands |

---

## Provider Abstraction Architecture

### Interface Design

```typescript
// packages/liaison-coordinator/src/providers/planning/types.ts

export type PlanningProviderType = 'cody-pbt' | 'spec-kit' | 'liatrio-sdd';

export interface FeatureSpec {
  id: string;
  name: string;
  description: string;
  userStories: UserStory[];
  requirements: Requirement[];
  technicalConsiderations?: string;
  nonGoals?: string[];
}

export interface Plan {
  specId: string;
  architecture?: string;
  components: Component[];
  milestones: Milestone[];
  risks?: Risk[];
}

export interface TaskList {
  specId: string;
  parentTasks: ParentTask[];
}

export interface ParentTask {
  id: string;
  title: string;
  purpose: string;
  proofArtifacts: ProofArtifact[];
  subTasks: SubTask[];
  status: 'pending' | 'in-progress' | 'completed';
}

export interface ProofArtifact {
  type: 'screenshot' | 'cli' | 'test' | 'url' | 'log' | 'diff';
  description: string;
  demonstrates: string;
  path?: string;
  command?: string;
}

export interface ValidationReport {
  specId: string;
  coverageMatrix: CoverageItem[];
  passed: boolean;
  gaps: string[];
}

export interface PlanningProvider {
  readonly type: PlanningProviderType;
  readonly name: string;
  
  // Initialization
  initialize(projectPath: string): Promise<void>;
  getArtifactPath(): string;
  
  // Phase 1: Discovery/Constitution
  createDiscovery?(input: string): Promise<DiscoveryDoc>;
  createConstitution?(principles: string[]): Promise<void>;
  
  // Phase 2: Specification
  createSpec(input: SpecInput): Promise<FeatureSpec>;
  clarifySpec(spec: FeatureSpec): Promise<Question[]>;
  updateSpec(specId: string, updates: Partial<FeatureSpec>): Promise<FeatureSpec>;
  
  // Phase 3: Planning
  createPlan(spec: FeatureSpec, techStack?: TechStack): Promise<Plan>;
  validatePhaseGates?(plan: Plan): Promise<GateResult[]>;
  
  // Phase 4: Task Breakdown
  createParentTasks(plan: Plan): Promise<ParentTask[]>;
  createSubTasks(parentTasks: ParentTask[]): Promise<TaskList>;
  
  // Phase 5: Execution
  updateTaskStatus(taskId: string, status: TaskStatus): Promise<void>;
  createProofArtifact(taskId: string, proof: ProofArtifact): Promise<void>;
  
  // Phase 6: Validation
  validate(spec: FeatureSpec, proofs: ProofArtifact[]): Promise<ValidationReport>;
  createRetrospective?(version: string): Promise<Retrospective>;
  
  // Integration with Issue Providers
  exportToIssueProvider(tasks: TaskList, provider: IssueSourceProvider): Promise<void>;
  syncFromIssueProvider(provider: IssueSourceProvider): Promise<TaskList>;
}
```

### Provider Factory

```typescript
// packages/liaison-coordinator/src/providers/planning/factory.ts

import type { PlanningProvider, PlanningProviderType } from './types';
import { CodyPbtProvider } from './cody-pbt';
import { SpecKitProvider } from './spec-kit';
import { LiatrioSddProvider } from './liatrio-sdd';

export interface PlanningProviderConfig {
  type: PlanningProviderType;
  projectPath: string;
  options?: Record<string, unknown>;
}

export function createPlanningProvider(
  config: PlanningProviderConfig
): PlanningProvider {
  switch (config.type) {
    case 'cody-pbt':
      return new CodyPbtProvider(config.projectPath, config.options);
    case 'spec-kit':
      return new SpecKitProvider(config.projectPath, config.options);
    case 'liatrio-sdd':
      return new LiatrioSddProvider(config.projectPath, config.options);
    default:
      throw new Error(`Unknown planning provider type: ${config.type}`);
  }
}
```

---

## CLI Integration Plan

### Proposed Commands

```bash
# Initialize planning with chosen provider
liaison plan init --provider cody-pbt
liaison plan init --provider spec-kit
liaison plan init --provider liatrio-sdd

# Discovery/Constitution phase
liaison plan discover "Build user authentication system"
liaison plan constitution --principles "test-first,library-first"

# Specification phase
liaison plan spec create "Add OAuth2 support"
liaison plan spec clarify
liaison plan spec show

# Planning phase
liaison plan tech-plan --stack "typescript,postgresql"
liaison plan gates  # Validate phase gates (spec-kit)

# Task breakdown
liaison plan tasks --parent-only  # Phase 1: demoable units
liaison plan tasks --full         # Phase 2: with sub-tasks

# Execution tracking
liaison plan status
liaison plan proof add --task 1.1 --type screenshot --path "./proof.png"

# Validation
liaison plan validate
liaison plan retro  # Create retrospective (cody-pbt)

# Integration with issue providers
liaison plan export --to github
liaison plan sync --from github
```

---

## Implementation Phases

### Phase 1: Interface Definition (Week 1)
- [ ] Define `PlanningProvider` interface
- [ ] Define shared types (FeatureSpec, Plan, TaskList, etc.)
- [ ] Create provider factory
- [ ] Add to existing coordinator package structure

### Phase 2: Cody PBT Adapter (Week 2)
- [ ] Implement `CodyPbtProvider`
- [ ] Map existing `.cody/` structure
- [ ] Support `:cody` commands via CLI
- [ ] Test with current liaison integration

### Phase 3: Liatrio SDD Adapter (Week 2)
- [ ] Implement `LiatrioSddProvider`
- [ ] Support proof artifact creation
- [ ] Implement two-phase task generation
- [ ] Add validation report generation

### Phase 4: Spec-Kit Adapter (Week 3)
- [ ] Implement `SpecKitProvider`
- [ ] Integrate constitutional constraints
- [ ] Add phase gate validation
- [ ] Support auto-branching

### Phase 5: CLI Integration (Week 4)
- [ ] Add `liaison plan` command group
- [ ] Implement all subcommands
- [ ] Add provider selection
- [ ] Integration tests

### Phase 6: Issue Provider Bridge (Week 4)
- [ ] Export tasks to GitHub Issues
- [ ] Sync status from issues back to tasks
- [ ] Bidirectional proof artifact links

---

## Decision Points

### 1. Default Provider
**Recommendation**: Start with Cody PBT (already integrated), add others incrementally.

### 2. Artifact Location
**Options**:
- Keep `.cody/` for Cody PBT compatibility
- Use provider-specific paths (`.specify/`, `docs/specs/`)
- Unified `.liaison/planning/` with provider subdirectories

**Recommendation**: Provider-specific paths for compatibility, with symlinks if needed.

### 3. Feature Cherry-Picking
**Best-of-breed features to consider**:
- **From Cody PBT**: Version management, retrospectives, feature backlog
- **From Spec-Kit**: Constitutional constraints, phase gates, auto-branching
- **From Liatrio SDD**: Proof artifacts, context markers, validation matrix

### 4. Agent Compatibility
All three support multiple AI agents. Liaison should maintain this flexibility:
- Claude Code (via `.claude/commands/`)
- GitHub Copilot (via `.github/prompts/`)
- Cursor, Windsurf, etc. (via provider-specific configs)

---

## References

- [Cody PBT Repository](https://github.com/ibuildwith-ai/cody-pbt)
- [GitHub Spec-Kit Repository](https://github.com/github/spec-kit)
- [Liatrio SDD Workflow Repository](https://github.com/liatrio-labs/spec-driven-workflow)
- [Spec-Kit Philosophy](https://github.com/github/spec-kit/blob/main/spec-driven.md)
- [Liatrio SDD Playbook](https://liatrio-labs.github.io/spec-driven-workflow/)
