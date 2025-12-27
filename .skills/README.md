# Agent Skills

This directory contains reusable skills that extend agent capabilities across multiple platforms using the open [Agent Skills standard](https://agentskills.io).

## What are Skills?

Skills are portable, version-controlled packages of instructions and resources that AI agents load on-demand. They enable agents to perform specialized tasks more accurately and efficiently without repeating context.

**Key characteristics:**
- **Portable** - Work across OpenCode, Claude Code, Cursor, VS Code, Letta, Goose, Amp, and other skills-compatible agents
- **Efficient** - Content loads on-demand using progressive disclosure (metadata always, full content when needed)
- **Versioned** - Tracked in Git alongside your code
- **Composable** - Combine multiple skills to build complex workflows

## Canonical Location

`.skills/` is the **canonical location** for all skills in this project. Compatibility symlinks automatically point from other agent tools to this directory:

```
.skills/                          ← You are here (canonical)
├── .opencode/skill    → .skills  (OpenCode)
├── .claude/skills     → .skills  (Claude Code, Cursor)
├── .github/skills     → .skills  (VS Code / GitHub Copilot)
├── .agents/skills     → .skills  (Amp, Goose portable)
└── .goose/skills      → .skills  (Goose-specific)
```

## Getting Started

### Initialize Skills in Your Project

If you haven't already, run:

```bash
liaison skill init
```

This command:
- Creates symlinks for all compatible agents
- Sets up the `.skills/` directory structure
- Updates `.gitignore` to prevent committing symlinks
- Displays available skills

### Create Your First Skill

```bash
liaison skill create code-review --description "Code review checklist and best practices"
```

This creates a new skill with:
- `SKILL.md` - Main instructions (required)
- `references/` - Optional detailed documentation
- `scripts/` - Optional executable code
- `assets/` - Optional static resources

### List Available Skills

```bash
liaison skill list
```

### Validate a Skill

```bash
liaison skill validate code-review
```

## Skill Structure

Each skill is a directory with a required `SKILL.md` file:

```
.skills/
└── my-skill/
    ├── SKILL.md                 # Required: instructions + metadata
    ├── references/              # Optional: detailed docs
    │   └── detailed-guide.md
    ├── scripts/                 # Optional: executable code
    │   └── setup.sh
    └── assets/                  # Optional: static resources
        └── template.json
```

### SKILL.md Format

Every skill must have a `SKILL.md` file with YAML frontmatter:

```markdown
---
name: my-skill
description: What this skill does and when to use it (1-1024 chars)
license: MIT
compatibility: Optional environment requirements
metadata:
  author: your-name
  version: "1.0"
---

# Skill Name

## When to use this skill

Clear description of when the agent should apply this skill.

## Instructions

Step-by-step guidance for the agent to follow...

## Examples

Concrete examples of usage...
```

**Frontmatter requirements:**

| Field | Required | Constraints |
|-------|----------|-------------|
| `name` | Yes | 1-64 chars, lowercase + hyphens only, no `--`, no leading/trailing `-`, must match directory name |
| `description` | Yes | 1-1024 chars, describe both what it does and when to use it |
| `license` | No | License name or file reference |
| `compatibility` | No | Max 500 chars, environment requirements |
| `metadata` | No | Key-value string pairs for custom data |
| `allowed-tools` | No | Space-delimited list of pre-approved tools (experimental) |

## Available Skills

Browse the directories in this folder to see all available skills. Run:

```bash
liaison skill list --format table
```

## Progressive Disclosure

Skills use three levels of loading to efficiently manage context:

1. **Metadata** (~100 tokens): `name` and `description` loaded at startup for all skills
2. **Instructions** (<5k tokens): Full `SKILL.md` content loaded when skill is activated
3. **Resources**: Supporting files (scripts, references) loaded only as needed

This means you can install many skills without consuming context upfront.

## Cross-Agent Compatibility

This project follows the [Agent Skills standard](https://agentskills.io) which specifies the format but not the location. We use `.skills/` as the canonical location for these reasons:

1. **Shortest path** - No vendor prefix, agent-agnostic
2. **Letta precedent** - Letta (major platform) uses it natively
3. **Future-proof** - Won't need renaming as ecosystem evolves
4. **Convention** - Simplest for users to remember

### Agent-Specific Locations

If you work with multiple agents, they may look in other locations by default:

- **OpenCode**: `.opencode/skill/`, `~/.opencode/skill/`
- **Claude Code**: `.claude/skills/`, `~/.claude/skills/`
- **VS Code / GitHub Copilot**: `.github/skills/`, `.claude/skills/` (legacy)
- **Cursor**: Agent auto-discovery (Claude compatible)
- **Letta**: `.skills/`, `~/.config/letta/skills/`
- **Goose**: `.goose/skills/`, `.agents/skills/`, `.claude/skills/`, `~/.config/agents/skills/`, `~/.config/goose/skills/`
- **Amp**: `.agents/skills/`, `.claude/skills/`, `~/.config/agents/skills/`

The symlinks in this project make `.skills/` visible to all of them automatically.

## Best Practices

### 1. Keep Skills Focused

One domain or workflow per skill. Split large skills into smaller ones.

```
❌ Bad: generic-development-skill (covers testing, deployment, reviews, etc.)
✅ Good: code-review-skill (just code review)
```

### 2. Write for Clarity

Use clear, direct language and numbered steps. Remember: an agent will be following these instructions.

```
❌ Bad: "Make sure the code is good"
✅ Good: "Review each function for these criteria: (1) Does it have a docstring? (2) Are error cases handled?"
```

### 3. Include Verification Steps

Help agents confirm the workflow completed successfully.

```markdown
## Verification

After following these steps:
- [ ] All tests pass: `npm test`
- [ ] No type errors: `npm run type-check`
- [ ] Linter passes: `npm run lint`
```

### 4. Reference Resources Clearly

Use relative paths from the skill root:

```markdown
See [detailed guide](./references/detailed-guide.md) for advanced topics.
Run [setup script](./scripts/setup.sh) to initialize the environment.
```

### 5. Document Dependencies

If your skill requires external tools or setup:

```markdown
## Requirements

- Node.js 18+
- Docker (for database tests)
- Git (for version control operations)
```

## Commands Reference

### Initialize Skills

```bash
liaison skill init              # Project-level setup
liaison skill init --global     # Global setup (future)
liaison skill init --symlinks-only  # Just create symlinks
```

### Create Skills

```bash
liaison skill create <name>
liaison skill create <name> --description <desc>
liaison skill create <name> --template workflow
liaison skill create <name> --template qa
```

### Manage Skills

```bash
liaison skill list              # List all skills
liaison skill list --location global
liaison skill validate <path>   # Check skill validity
liaison skill validate <path> --fix  # Auto-fix common issues
```

### Integration

```bash
liaison skill to-prompt         # Generate <available_skills> XML for agents
liaison skill migrate <source>  # Convert docs to skills
```

## Troubleshooting

### Skills not appearing in agent

1. Check the skill directory exists and contains `SKILL.md`
2. Validate the skill: `liaison skill validate my-skill`
3. Check symlinks exist: `ls -la .claude/skills/`
4. Run `liaison skill init` to recreate symlinks if needed

### Symlinks not working on Windows

Windows requires either:
- Developer Mode enabled (Windows 10+)
- Git configured with `core.symlinks=true`
- Running with administrator privileges

If symlinks won't work, copy skills manually or use:
```bash
liaison skill init --copy  # Copy instead of symlink
```

### Agent not loading skill

- Verify skill `name` matches directory name exactly
- Check `description` is 1-1024 characters
- Ensure YAML frontmatter is valid (no tabs, proper spacing)
- Test with: `liaison skill validate my-skill --fix`

## Related Resources

- [Agent Skills Specification](https://agentskills.io/specification)
- [Integration Guide](https://agentskills.io/integrate-skills)
- [Example Skills](https://github.com/anthropics/skills)
- [Liaison CLI Documentation](../docs/SKILLS.md)

## Contributing

When adding new skills to this project:

1. Create a new directory under `.skills/`
2. Write a clear `SKILL.md` with full frontmatter
3. Add supporting files (scripts, references) as needed
4. Run `liaison skill validate my-skill` to check validity
5. Test with agents before committing

Keep skills focused, well-documented, and portable across different agents.

---

**Last updated**: 2025-12-26
**Location**: Canonical skills location for liaison-toolkit
**Standard**: [Agent Skills (agentskills.io)](https://agentskills.io)
**Command**: `liaison skill --help` for CLI reference
