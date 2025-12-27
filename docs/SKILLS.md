# Agent Skills Documentation

Complete guide to Agent Skills support in liaison-toolkit, based on the [Agent Skills open standard](https://agentskills.io/specification).

## What are Agent Skills?

Skills are portable, version-controlled packages of instructions and resources that AI agents load on-demand to perform specialized tasks. They enable agents to be more accurate and efficient without repeating context across multiple sessions.

**Key characteristics:**
- **Portable**: Work across OpenCode, Claude Code, Cursor, VS Code, Letta, Goose, Amp, and other skills-compatible agents
- **Efficient**: Content loads on-demand using progressive disclosure (metadata always, full content when needed)
- **Versioned**: Tracked in Git alongside your code
- **Composable**: Combine multiple skills to build complex workflows
- **Standardized**: Follows open [Agent Skills specification](https://agentskills.io/specification)

## Canonical Location

`.skills/` is the **canonical location** for all skills in this project. All compatibility symlinks point to this directory:

```
.skills/                              ← YOU ARE HERE (canonical)
├── README.md                      ← This file
├── library-research/
│   └── SKILL.md
├── git-automation/
│   └── SKILL.md
├── liaison-workflows/
│   └── SKILL.md
├── bun-development/
│   └── SKILL.md
└── ...

# Symlink targets for cross-agent compatibility:
.opencode/skill     → .skills/     # OpenCode
.claude/skills      → .skills/     # Claude Code, Cursor
.github/skills      → .skills/     # VS Code / GitHub Copilot
.agents/skills      → .skills/     # Amp, Goose portable
.goose/skills       → .skills/     # Goose-specific
```

This architecture ensures:
- ✅ Skills are maintained in one place
- ✅ Compatible with all major agent tools
- ✅ Easy to version control and manage
- ✅ No duplication across agent-specific directories

## Getting Started

### Initialize Skills

After cloning this repository, run:

```bash
liaison skill init
```

This command:
- Creates all compatibility symlinks from agent locations to `.skills/`
- Updates `.gitignore` to prevent committing symlinks
- Displays all available skills

### Create Your First Skill

```bash
liaison skill create code-review --description "Code review checklist and best practices"
```

This creates a skill directory with:
- `SKILL.md` - Main instructions
- `references/` - Optional detailed docs
- `scripts/` - Optional executable code
- `assets/` - Optional static resources

### List Available Skills

```bash
liaison skill list
```

Shows all discovered skills with their descriptions.

### Validate a Skill

```bash
liaison skill validate code-review
```

Checks a skill's SKILL.md file for:
- Valid YAML frontmatter
- Proper naming conventions
- Required fields present
- Conformance to Agent Skills specification

## Skill Structure

### SKILL.md Format

Every skill requires a `SKILL.md` file with YAML frontmatter:

```markdown
---
name: skill-name
description: What this skill does and when to use it (1-1024 characters)
license: MIT
compatibility: Optional environment requirements
metadata:
  key: value
---

# Skill Name

## When to use this skill

Describe when this skill should be applied.

## Instructions

Provide step-by-step instructions for completing this workflow:

1. First step
2. Second step
3. Third step

## Verification

After completing these steps:
- [ ] Step 1 verification
- [ ] Step 2 verification
- [ ] Step 3 verification

## Examples

Provide concrete examples of applying this skill.
```

### Frontmatter Requirements

| Field | Required | Constraints |
|--------|----------|-------------|
| `name` | Yes | 1-64 chars, lowercase alphanumeric + hyphens only, no `--`, no leading/trailing `-` |
| `description` | Yes | 1-1024 chars, must describe both what it does AND when to use it |
| `license` | No | License name or file reference, max 256 chars |
| `compatibility` | No | Max 500 chars, environment requirements |
| `metadata` | No | Key-value string pairs for custom data |
| `allowed-tools` | No | Space-delimited tool list (experimental) |

### Validation Rules

**Name validation:**
- Must match directory name exactly
- Pattern: `^[a-z0-9]+(-[a-z0-9]+)*$`
- Examples: ✅ `code-review`, `library-research` | ❌ `Code_Review`, `Library-Research`

**Description requirements:**
- Must be non-empty
- Maximum 1024 characters
- Should include "what" AND "when to use" guidance

### Progressive Disclosure

Skills use three levels of loading to efficiently manage context:

1. **Metadata** (~100 tokens): `name` and `description` loaded at startup for all skills
2. **Instructions** (<5k tokens): Full `SKILL.md` body loaded when skill is activated
3. **Resources**: Supporting files (scripts, references) loaded only as needed

This means you can install many skills without consuming context upfront.

## Available Skills

### Library Research (`.skills/library-research/`)

Research library documentation and API references using Context7 integration.

**Capabilities:**
- library-research
- documentation-analysis
- context7-integration

**When to use:**
- User asks about a library or framework
- Need to research an API or package documentation
- User asks "How do I use..." for a third-party library

### Git Automation (`.skills/git-automation/`)

Automate Git workflows with atomic commits, Beads integration, and real-time sync.

**Capabilities:**
- atomic-commit-validation
- realtime-beads-sync
- commit-message-generation
- branch-management
- workflow-hooks
- dependency-validation
- version-tagging
- auto-sync-recovery

**When to use:**
- Creating commits with proper message formatting
- Managing feature branches and releases
- Implementing Git hooks
- Syncing with Beads task tracking
- Validating changes before committing

### Liaison Workflows (`.skills/liaison-workflows/`)

Task management and workflow automation using Liaison CLI.

**Capabilities:**
- workflow-design
- task-automation
- integration-management
- agent-workflow-integration

**When to use:**
- Creating tasks with `liaison task create`
- Managing task status and lifecycle
- Setting up automatic workflow triggers
- Working with task-driven automation

### Bun Development (`.skills/bun-development/`)

Bun build system, development workflow, and TypeScript patterns.

**Capabilities:**
- bun-build-system
- development-mode
- type-checking
- package-management

**When to use:**
- Setting up a new Bun project
- Configuring TypeScript with tsconfig.json
- Managing dependencies with bun install
- Using dev mode for hot reloading
- Creating production builds with bun run build

## Commands Reference

### Initialize Skills

```bash
# Initialize project-level skills
liaison skill init

# Initialize globally (~/.skills/)
liaison skill init --global
```

### Create Skills

```bash
# Create with template
liaison skill create my-skill --template workflow

# With description
liaison skill create my-skill --description "Code review checklist for pull requests"

# Create at custom location
liaison skill create my-skill --location /path/to/skills
```

### List Skills

```bash
# Table format
liaison skill list

# JSON format
liaison skill list --format json

# Search specific location
liaison skill list --location /path/to/skills

# Show all locations
liaison skill list --location all
```

### Validate Skills

```bash
# Validate a specific skill
liaison skill validate my-skill

# Validate with auto-fix (attempts to fix common issues)
liaison skill validate my-skill --fix

# Validate all skills in project
liaison skill validate .skills/
```

### Generate Agent Prompts

```bash
# Generate XML format for agent systems
liaison skill to-prompt

# Generate JSON format for programmatic access
liaison skill to-prompt --format json

# Generate for specific location
liaison skill to-prompt --location /path/to/skills
```

### Migrate to Skills

```bash
# Migrate markdown file to skill format
liaison skill migrate docs/guide.md --type markdown

# Migrate subagent config
liaison skill migrate agents/library-researcher.md --type subagent
```

## Cross-Agent Compatibility

The `.skills/` directory is designed to work with multiple AI agent tools:

### Supported Agents

| Agent | Skills Location | Canonical Location | Notes |
|--------|----------------|------------------|-------|
| **OpenCode** | `.opencode/skill/` or `~/.opencode/skill/` | `.skills/` | Symlink created automatically |
| **Claude Code** | `.claude/skills/` or `~/.claude/skills/` | `.skills/` | Symlink created automatically |
| **Cursor** | Agent auto-discovery (Claude-compatible) | `.skills/` | Uses `.claude/skills/` symlink |
| **VS Code / GitHub Copilot** | `.github/skills/` (primary) or `.claude/skills/` (legacy) | `.skills/` | Both symlinks created |
| **Letta** | `.skills/` (native) | `.skills/` | Native support, no symlink needed |
| **Goose** | `.goose/skills/` or `.agents/skills/` (portable) | `.skills/` | Both symlinks created |
| **Amp** | `.agents/skills/` (primary) | `.skills/` | Symlink created automatically |

### Symlink Strategy

- **Canonical**: All skills live in `.skills/`
- **Compatibility**: Agent-specific directories contain symlinks to `.skills/`
- **Git Tracking**: Symlinks are added to `.gitignore` (not committed)
- **Portable**: Users run `liaison skill init` after cloning

### Windows Compatibility

On Windows systems, symlinks require either:
- Developer Mode enabled (Windows 10+)
- Git configured with `core.symlinks=true`
- Administrator privileges for symlink creation

**Alternative for Windows:**
- Copy mode (not yet implemented): `liaison skill init --copy`

## Best Practices

### 1. Keep Skills Focused

One domain or workflow per skill. Split large skills:

❌ **Bad**: `generic-development-skill` (too broad)
✅ **Good**: `code-review-skill`, `git-automation-skill`, `library-research-skill`

### 2. Write for Clarity

Use clear, direct language and numbered steps:

❌ **Bad**: "Make sure code is good"
✅ **Good**: "Run `npm test` before committing"

### 3. Include Verification Steps

Help agents confirm workflow completion:

```markdown
## Verification

After following these steps:
- [ ] All tests pass
- [ ] Code is formatted
- [ ] Documentation updated
```

### 4. Document Dependencies

If your skill requires external tools:

```markdown
## Requirements

- Node.js 18+
- Docker (for database tests)
- Git (for version control operations)
```

### 5. Use Relative Paths

Reference files within skill using relative paths from skill root:

❌ **Bad**: `/home/user/projects/other-skill/REFERENCE.md`
✅ **Good**: `./references/detailed-guide.md`

### 6. Add Keywords in Metadata

Include relevant keywords in `description` field to help agents discover your skill:

```markdown
---
name: code-review
description: Code review checklist and best practices. Use when reviewing pull requests or merge requests.
keywords: code-review, pull-request, pr, merge, quality-assurance
---
```

## Troubleshooting

### Skills Not Appearing in Agents

1. **Check symlinks exist:**
   ```bash
   ls -la .opencode/skill .claude/skills
   ```

2. **Recreate symlinks:**
   ```bash
   liaison skill init --symlinks-only
   ```

3. **Validate skill:**
   ```bash
   liaison skill validate my-skill
   ```

4. **Check agent supports skills:**
   Review agent documentation for skills support

### Symlinks Not Working on Windows

1. **Enable Developer Mode:** Search for "Developer Mode" in Windows settings
2. **Git Configuration:** Run `git config --global core.symlinks true`
3. **Use Copy Mode:** `liaison skill init --copy` (when implemented)

## Advanced Topics

### Skill Interoperability

Skills can reference and work together:

```markdown
## Example Combining Skills

User: "Add new user authentication"

Process:
1. [Git Automation skill] Creates feature branch
2. [Bun Development skill] Implements auth system
3. [Library Research skill] Researches OAuth libraries
4. [Code Review skill] Reviews authentication code
```

### Progressive Disclosure in Action

When an agent activates a skill:

1. **Agent scans available skills metadata** (~100 tokens each)
2. **Agent matches request to skill description** (pattern matching)
3. **Agent loads skill SKILL.md** (~5k tokens)
4. **Agent reads referenced files** (as needed, unlimited tokens)
5. **Agent executes scripts** (output only, no code load)

This ensures efficient context usage across complex workflows.

## Skills vs Subagents

| Aspect | Skills | Subagents |
|--------|--------|-------------|
| **Purpose** | Knowledge and workflows | Task execution and delegation |
| **Loading** | On-demand by agent | Session-based activation |
| **Scope** | Domain-specific, portable | Agent-specific, stateful |
| **Use Case** | "When this task..." | "Use this subagent for..." |
| **Integration** | Agents can use skills directly | Subagents can require specific skills |
| **Example** | Code review skill provides knowledge | QA subagent executes testing |

**Relationship**: Skills and subagents complement each other. Skills provide expertise that subagents use during task execution.

## Integration with Liaison Workflows

Skills can integrate with task-driven automation:

1. **Skill-based workflows**: Create workflows that reference skills by keyword
2. **Task creation**: Skills can be referenced when creating tasks
3. **Auto-triggers**: Tasks with specific keywords auto-trigger workflows that use certain skills

Example:

```bash
# Create workflow that uses library-research skill
liaison workflow create api-research --trigger "task-created:keywords=library,research"
```

## Migration Guide

### Migrating from Other Systems

**From Subagent Configs:**

Use `liaison skill migrate` to convert subagent markdown to skill format:

```bash
# Migrate a subagent config
liaison skill migrate agents/library-researcher.md
```

This extracts:
- `name` and `description` from subagent metadata
- `capabilities` become keywords in skill description
- Detailed instructions from subagent body

**From Existing Documentation:**

Convert markdown guides to skill format:

1. Extract key procedures and patterns
2. Create SKILL.md with appropriate frontmatter
3. Add to `.skills/` directory
4. Validate: `liaison skill validate my-new-skill`

### Skill Creation Templates

Liaison provides templates for common skill types:

#### Workflow Template (`--template workflow`)

Use for multi-step procedures and processes.

#### Library Template (`--template library`)

Use for API/package research and integration.

#### QA Template (`--template qa`)

Use for testing strategies, quality gates, and validation.

#### Deployment Template (`--template deployment`)

Use for release procedures, CI/CD workflows, and production operations.

## Specification References

- **[Agent Skills Specification](https://agentskills.io/specification)** - Complete format specification
- **[Agent Skills Integration Guide](https://agentskills.io/integrate-skills)** - Implementation guidance for agent developers
- **[skills-ref Library](https://github.com/agentskills/agentskills/tree/main/skills-ref)** - Validation tools and examples

## Liaison-Enhanced Skills

Liaison extends the Agent Skills standard with:

1. **Integration with Liaison workflows**: Tasks can reference skills
2. **Skill-based workflow triggers**: Create workflows that activate on skill keywords
3. **Required skills for subagents**: Subagents can declare skills they need
4. **Skill validation in subagent loader**: Validate skill dependencies when activating subagents

## Creating Custom Skills

### 1. Define Purpose

What problem does this skill solve? Be specific.

### 2. Write Clear Description

Include:
- When to use the skill (contexts where it's helpful)
- What the skill does
- Step-by-step instructions

### 3. Add Keywords

Include keywords in metadata that help agents discover your skill.

### 4. Create Supporting Files (Optional)

- `references/` - Detailed documentation
- `scripts/` - Executable code
- `assets/` - Templates, configs, data

### 5. Test Your Skill

Validate with `liaison skill validate my-skill` before using it.

## Contributing

When adding new skills:

1. Create directory under `.skills/`
2. Write SKILL.md with proper frontmatter
3. Test skill validation: `liaison skill validate my-skill`
4. Add references or scripts as needed
5. Commit changes

See also: [Available Skills](#available-skills), [Creating Custom Skills](#creating-custom-skills)

## Quick Reference

### Essential Commands

```bash
# Initialize skills
liaison skill init

# Create a new skill
liaison skill create my-skill --description "What it does"

# List all skills
liaison skill list

# Validate a skill
liaison skill validate my-skill

# Generate agent prompt
liaison skill to-prompt
```

### Skill File Template

```markdown
---
name: my-skill
description: Brief description of what this skill does and when to use it.
license: MIT
---

# My Skill Name

## When to use this skill

Describe when agents should apply this skill.

## Instructions

1. First step
2. Second step
3. Third step

## Examples

Provide concrete examples.
```

---

**Last updated**: 2025-12-26
**Standard**: [Agent Skills v1.0](https://agentskills.io/specification)
**Related**: [AGENTS.md](../AGENTS.md), [Workflow Commands](../packages/liaison/src/commands/workflow.ts), [Task Commands](../packages/liaison/src/commands/task.ts)
