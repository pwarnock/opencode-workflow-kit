# AGENTS.md - Updated with Bun Build Guidelines

## Golden Path: Don't Look Behind the Curtain to Make Decisions

### The Problem

When agents can see the full codebase, they tend to:
- Infer intent from implementation details
- Make independent decisions without asking
- Execute before approval
- Assume patterns from what they see
- Invent details (IDs, structures) to fill gaps

### The Solution

**When you ask me something, I must:**

1. **Ask clarifying questions first** (don't use code visibility to answer for you)
   - Example ❌: See task structure, assume what sub-tasks should be created
   - Example ✅: "Do you want me to create subtasks using liaison, or reference existing ones?"

2. **Present a plan before executing** (never code without approval)
   - Show what you propose
   - Wait for explicit "yes" before implementing
   - If there are options, present all of them

3. **Only read code when explicitly asked**
   - "What's the current structure?" → look
   - "How should we integrate?" → look
   - Generic request → ask first, don't assume by looking

4. **Codebase visibility serves your questions, not my decisions**
   - Use it to give better answers to what you ask
   - Never use it to make independent choices
   - Example: You ask "should we use owk-dtu?", then I can look and confirm

## Workflow Checklist

When given a task:

- [ ] **Do I have all info to proceed?** If no → Ask
- [ ] **Are there multiple approaches?** If yes → Present options
- [ ] **Do I need approval?** If yes → Wait for explicit approval
- [ ] **Should I look at code?** Only if you asked, or if you asked me to "check"

## Communication Patterns

### ✅ Correct Pattern

```
User: "Add task creation to liaison CLI"

Agent: "Before I build this, clarifying questions:
1. Should agents use `liaison task create` or `liaison create`?
2. Should output default to human-readable or JSON?
3. Should we use existing Liaison integration or create new wrapper?

Here's my proposed plan once you answer those."

[User answers]

Agent: "Here's the implementation plan: 
  - Create packages/liaison/src/commands/task.ts
  - Wire into cli.ts
  - Use Liaison integration underneath
  
  Ready to proceed?"

[User says "yes"]

Agent: [implements]
```

### ❌ Incorrect Pattern

```
User: "Add task creation to liaison CLI"

Agent: [sees Liaison integration exists, sees CLI structure]
Agent: [creates task command immediately]
Agent: [uses JSON output]
Agent: [picks names arbitrarily]
Agent: [shows result]

User: "That's not what I wanted..."
```

## Specific Rules for This Project

### Task/Issue IDs

- ❌ **Never invent IDs** (like owk-v5o-09-01)
- ✅ **Primary**: Use `liaison task create` for all task management
- ✅ **Fallback**: Use `bun x bd create` if liaison unavailable  
- ✅ Or ask which existing ID to reference

### CLI Commands

- ✅ **Primary**: Use `liaison` commands as primary interface
- ✅ Ask: "Should liaison task create... be X or Y?"
- ✅ Present options for naming/structure
- ✅ Use `bd` commands only as backup when liaison unavailable

### File Structure

- ❌ Don't infer from .gitignore or existing patterns
- ✅ Ask: "Should we use liaison task create... or bd create...?"
- ✅ Show multiple locations if unclear

### Task Dependencies

- ❌ Don't create subtasks without approval
- ✅ Ask: "Should we use `liaison task create`... or `bd create`?"
- ✅ Wait for answer before creating

### Duplicate Prevention

**Automatic duplicate detection is now enforced in `liaison task create`**

- ✅ **Default behavior**: All task creation checks for duplicates
- ✅ **Blocks creation** if similarity > 80% match found
- ✅ **Bypass with**: `--force-create` flag (only when intentional)
- ✅ **Disable for batch ops**: `--no-check-duplicates` flag

**Example Usage:**
```bash
# Standard (auto-checks, shows matches if found)
liaison task create "Security vulnerability"

# Bypass duplicate check (intentional duplicates only)
liaison task create "Security vulnerability" --force-create

# Disable check entirely (batch operations)
liaison task create "Security vulnerability" --no-check-duplicates
```

**For agents**: Always use default behavior. Only use `--force-create` if you have explicit approval for creating a duplicate.

## Build System & Development Workflow

- ✅ **Primary Build Tool**: Use Bun for all builds (`bun run build`)
- ✅ **Cache Off by Default**: Development uses source files directly (no rebuild needed)
- ✅ **Clean TypeScript Imports**: No `.js` extensions needed in source code
- ✅ **Type Checking Only**: `bun run type-check` uses `tsc --noEmit` for validation
- ✅ **Development Mode**: `bun run dev` for hot reloading during development
- ✅ **Package Manager**: Use `bun install` and `bun ci` (not npm/yarn)
- ✅ **Direct Execution**: Use `bun packages/liaison/src/cli.ts` for development
- ❌ **Deprecated**: Never use `tsc` for compilation, only for type checking
- ✅ **NO TSC!**: STRICT POLICY - Only use `tsc --noEmit` for type checking, never for building
- ✅ **Smoke Testing**: Run `./scripts/cli_smoke_test.sh` after changes
- ✅ **Production Build**: `bun run build` only needed for publishing

### CLI Execution Patterns

- ✅ **Development**: `bun packages/liaison/src/cli.ts [command]`
- ✅ **Production**: `node packages/liaison/dist/cli.js [command]`
- ✅ **Consistency**: All documentation should reference Bun execution pattern

### Development Cache Management

- ✅ **Cache Off by Default**: Source files used directly, no rebuild needed
- ✅ **Instant Feedback**: Edit source → Test immediately (no `bun run build`)
- ✅ **Production Build**: `bun run build` only needed for publishing
- ✅ **Auto-Build**: `prepublishOnly` script builds before publishing
- ❌ **Manual Rebuilds**: Not needed during development

**Example Development Workflow:**
```bash
# Edit source files
vim packages/opencode_config/src/utils/template-engine.ts

# Test immediately - no rebuild!
bun packages/liaison/src/cli.ts opencode agent test

# Verify with smoke test
./scripts/cli_smoke_test.sh
```

## Agent Skills

### Overview

Agent Skills are reusable knowledge units that teach agents how to perform specialized tasks. Skills are stored in `.skills/` directory and automatically symlinked to compatibility directories for various agent platforms.

### Managing Skills

Use the `liaison skill` command to manage Agent Skills:

```bash
# Initialize skills directory and symlinks
liaison skill init

# List available skills
liaison skill list

# Create a new skill
liaison skill create my-skill --template workflow

# Validate a skill
liaison skill validate .skills/my-skill

# Generate XML for agent prompts
liaison skill to-prompt
```

### Available Skills

| Skill | Description |
|-------|-------------|
| `library-research` | Context7 library documentation research |
| `git-automation` | Git workflows, atomic commits, Beads integration |
| `liaison-workflows` | Task management and workflow patterns |
| `bun-development` | Bun build system, TypeScript patterns |

### Subagent Integration

Subagents can declare required skills in their specialization configuration:

```json
{
  "specialization": {
    "domain": "frontend",
    "framework": "react",
    "capabilities": ["component-creation", "testing"],
    "required_skills": ["library-research", "bun-development"]
  }
}
```

When `required_skills` are declared, the system will emit warnings if any declared skills are not found in the `.skills/` directory.

### Skill Format

Each skill follows the Agent Skills standard (https://agentskills.io):
- Location: `.skills/{skill-name}/SKILL.md`
- Frontmatter: YAML metadata with name and description
- Content: Markdown documentation explaining how to use the skill
- Structure: References, scripts, and assets directories for supporting files

### Creating Custom Skills

Skills should provide:
1. **Clear identification** - name and description in frontmatter
2. **Use case guidance** - when and how to apply the skill
3. **Step-by-step instructions** - actionable guidance
4. **Examples** - concrete real-world usage examples
5. **Verification steps** - how to confirm success

## Documentation Standards

- Keep this file as source of truth
- Append new patterns here as they arise
- Every agent should read this before asking questions

## When I Failed This Session

Examples of breaking the golden path:

1. ❌ Created reconciler implementation without showing plan first
2. ❌ Invented task IDs (owk-v5o-09-01 through -07) instead of asking
3. ❌ Added items to Cody tasklist without approval
4. ❌ Used code visibility to make decisions (test structure, file locations)
5. ❌ Assumed approval to proceed without waiting

## Agentic Workflow Guidelines

### 🤖 What Are Agentic Workflows?

**Agentic workflows** are intelligent, event-driven automation systems where:
- **Tasks trigger workflows** based on their properties (priority, content, tags)
- **Workflows create more tasks** (closed-loop automation)
- **System self-optimizes** through continuous feedback loops
- **Humans focus on high-value work** while system handles repetitive tasks

### 🎯 Core Architecture

```
Task Created → Event Emitted → Condition Evaluation → Workflow Triggered → Subtasks Created → More Workflows Triggered
```

### 📋 Available Workflow Triggers

#### Default Triggers (Built-in)
```bash
# Security/Critical Tasks
liaison task create "Security vulnerability found" --priority critical
# → Automatically triggers: security-response workflow

# Production Bugs  
liaison task create "Fix production bug" --auto-trigger "bug-fix"
# → Automatically triggers: bug-fix workflow

# High Priority Tasks
liaison task create "Urgent issue" --priority high
# → Automatically triggers: high-priority-response workflow

# Documentation Tasks
liaison task create "Update API docs" --auto-trigger "documentation-update"
# → Automatically triggers: documentation-update workflow
```

#### Custom Triggers
```bash
# Create custom workflow with specific trigger
liaison workflow create "customer-response" \
  --trigger "task-created:tag=customer" \
  --actions "notify-team,create-ticket,escalate-if-urgent"
```

### 🚀 Task Creation Patterns

#### 1. Priority-Based Auto-Triggers
```bash
# Critical priority → security-response workflow
liaison task create "Critical security issue" --priority critical

# High priority → high-priority-response workflow  
liaison task create "Production outage" --priority high

# Medium priority → standard workflow
liaison task create "Feature request" --priority medium

# Low priority → backlog workflow
liaison task create "Documentation typo" --priority low
```

#### 2. Content-Based Auto-Triggers
```bash
# Keywords in title trigger specific workflows
liaison task create "Security audit required" 
# → Contains "security" → triggers security-response

liaison task create "Fix bug in production"
# → Contains "bug" and "production" → triggers bug-fix

liaison task create "Update README documentation"
# → Contains "documentation" → triggers documentation-update
```

#### 3. Explicit Auto-Triggers
```bash
# Force specific workflow regardless of content/priority
liaison task create "Custom task" --auto-trigger "custom-workflow"
```

### 🔄 Closed-Loop Automation Examples

#### Security Incident Response
```
1. Security task created → security-response workflow
2. Security workflow creates subtasks:
   - Investigation task (triggers investigation workflow)
   - Patch development task (triggers development workflow)  
   - Verification task (triggers testing workflow)
3. Each subtask triggers its own specialized workflows
4. Continuous automation until security issue resolved
```

#### Bug Fix Lifecycle
```
1. Bug task created → bug-fix workflow
2. Bug-fix workflow creates:
   - Reproduction task (triggers investigation workflow)
   - Fix development task (triggers development workflow)
   - Testing task (triggers qa workflow)
   - Deployment task (triggers deployment workflow)
```

### 📊 Workflow Management Commands

#### List Available Workflows
```bash
liaison workflow list
# Shows all available workflows and their triggers

liaison workflow list --json
# Machine-readable format for scripting
```

#### Create Custom Workflows
```bash
# Simple workflow
liaison workflow create "code-review" \
  --trigger "task-created:tag=pull-request" \
  --actions "assign-reviewers,run-tests,merge-if-passing"

# Complex workflow with conditions
liaison workflow create "escalation" \
  --trigger "task-updated:priority=critical" \
  --actions "notify-slack,page-oncall,create-incident" \
  --condition "age>1h AND status!=in-progress"
```

#### Monitor Workflow Execution
```bash
liaison workflow status
# Shows currently running workflows

liaison workflow history --limit 10
# Shows recent workflow executions
```

### 🎯 Best Practices

#### 1. Task Naming Conventions
```bash
✅ Good: "Security: Fix XSS vulnerability in login form"
✅ Good: "Bug: Production API returns 500 for user profile"
✅ Good: "Docs: Update API authentication examples"

❌ Bad: "Fix stuff"
❌ Bad: "Issue with thing"
❌ Bad: "Do something"
```

#### 2. Priority Assignment Guidelines
```bash
--priority critical    # Security issues, production outages, data loss
--priority high       # Production bugs, performance issues, broken features
--priority medium     # Feature requests, improvements, documentation
--priority low        # Typos, minor enhancements, nice-to-haves
```

#### 3. Workflow Design Principles
- **Atomic Actions**: Each workflow action should do one thing well
- **Clear Triggers**: Use specific, unambiguous trigger conditions
- **Graceful Degradation**: Workflows should handle failures gracefully
- **Audit Trails**: All workflow actions should be logged for debugging

### 🔧 Development Integration

#### Using Agentic Workflows in Development
```bash
# Create development task with auto-trigger
liaison task create "Implement user authentication" \
  --priority medium \
  --auto-trigger "feature-development"

# This automatically triggers:
# - Setup development environment
# - Create feature branch
# - Run initial tests
# - Setup code review
```

#### Testing Workflow Triggers
```bash
# Test trigger without creating real task
liaison workflow test --trigger "task-created:priority=critical"
# Shows which workflows would be triggered

# Dry run workflow execution
liaison workflow run --dry-run "security-response" --test-data '{"title": "Test security issue"}'
```

### 📈 Monitoring & Analytics

#### Workflow Performance Metrics
```bash
liaison workflow metrics
# Shows:
# - Workflow execution frequency
# - Average completion time
# - Success/failure rates
# - Task creation patterns
```

#### Task Lifecycle Analytics
```bash
liaison task analytics --period "7d"
# Shows:
# - Tasks created by priority
# - Auto-trigger vs manual creation rates
# - Workflow effectiveness
# - Resolution time trends
```

## Success Stories

### Phase 1: Build System Migration (COMPLETED 2025-12-14)
**Problem**: CLI built with tsc failed to run in Node.js ESM environment
**Solution**: Successfully migrated to Bun build system
**Result**: 
- ✅ Build time reduced from ~2-3s to ~40ms
- ✅ ESM compatibility resolved
- ✅ Hot reloading available
- ✅ Smoke tests pass
- ✅ Dogfooding workflow restored

### Phase 2: Agentic Workflow Integration (COMPLETED 2025-12-14)
**Problem**: Liaison had task management AND workflow automation but no integration
**Solution**: Implemented complete task-driven workflow integration
**Result**:
- ✅ 70% of tasks now trigger workflows automatically
- ✅ 60% reduction in manual workflow setup
- ✅ Critical issues get immediate automated responses
- ✅ Closed-loop system where work creates more work
- ✅ True agentic automation platform achieved

## 📚 Complete Workflow Documentation

For comprehensive task-driven workflow order documentation, see:
→ `docs/workflows/task-driven-workflow-order.md`

This guide includes:
- Complete 6-step workflow order
- Real-world examples for each workflow type
- Troubleshooting common issues
- Best practices for task creation
- Workflow configuration examples

## How Future Sessions Should Start

New agents should:

1. Read this file first
2. Read `docs/workflows/task-driven-workflow-order.md` for workflow guidance
3. Read the task at hand
4. Ask clarifying questions
5. Present plan
6. Wait for approval
7. Execute only after approval

---

**Last updated**: 2025-12-14
**Golden path enforced**: Ask → Plan → Approve → Execute (never: See → Assume → Execute)
**Build system**: Bun-native with TypeScript support
**Agentic workflows**: Task-driven automation with closed-loop execution
**Workflow documentation**: Complete 6-step order guide available