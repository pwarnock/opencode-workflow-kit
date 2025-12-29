# Agent System Guide

Complete guide to using the liaison agent system for AI-assisted development workflows.

## Overview

The liaison agent system provides **pre-configured AI agent templates** that external AI coding assistants (OpenCode, Claude Code, Cursor, VS Code, etc.) can use to perform specialized development tasks. Agents are configured with specific tools, permissions, behaviors, and domain knowledge.

**Key Benefits:**
- **Specialized Expertise**: Each agent has domain-specific capabilities and skills
- **Consistent Behavior**: Standardized tool permissions and behavioral settings
- **Skill Integration**: Automatic loading of relevant skills from the `.skills/` directory
- **Multi-Agent Coordination**: Agents can delegate tasks to other specialized agents

## Agent Configuration Structure

Every agent config contains these core sections:

### Core Properties
```json
{
  "$schema": "../schemas/subagent-config.json",
  "description": "Specialized CLI development agent",
  "mode": "subagent"
}
```

### Tools & Permissions
Agents are granted specific tools based on their domain:
```json
{
  "tools": {
    "read": true,      // File reading
    "write": true,     // File writing
    "edit": true,      // Code editing
    "bash": true,      // Terminal commands
    "grep": true,      // Text search
    "glob": true,      // File pattern matching
    "webfetch": true,  // Web requests
    "todowrite": true, // Task management
    "todoread": true   // Task reading
  },
  "permissions": {
    "read": true,
    "write": false,    // No direct file system write
    "execute": false,  // No command execution
    "admin": false     // No admin privileges
  }
}
```

### Environment & Context
Agents receive contextual environment variables:
```json
{
  "environment": {
    "CODY_MODE": "subagent",
    "OPENCODE_CONTEXT": "cli-development",
    "CLI_FRAMEWORK": "commander.js"
  }
}
```

### Behavior Settings
Agent behavior is configured for appropriate caution levels:
```json
{
  "behavior": {
    "conservative": false,        // Allow code changes
    "confirmation_required": false, // Don't require confirmation
    "context_preservation": true,   // Maintain context
    "rollback_enabled": false,     // No rollback capability
    "system_aware": true,          // Understand system context
    "version_aware": true          // Track version changes
  }
}
```

### Specialization
Each agent specializes in a specific domain with defined capabilities:
```json
{
  "specialization": {
    "domain": "cli-development",
    "framework": "commander.js",
    "capabilities": [
      "command-patterns",
      "argument-validation",
      "cli-ux",
      "help-text-formatting",
      "error-handling"
    ],
    "required_skills": ["cli-development", "bun-development"]
  }
}
```

## Creating Agents

### Using the CLI

**List available templates:**
```bash
liaison opencode --list-agents
```

**Create an agent:**
```bash
liaison opencode agent create my-agent --template cli-specialist
```

**List created agents:**
```bash
liaison opencode agent list
```

### Available Templates

| Template | Domain | Framework | Use Case |
|----------|--------|-----------|----------|
| `cli-specialist` | cli-development | commander.js | CLI commands, argument parsing, UX |
| `ci-cd-specialist` | devops | github-actions | CI/CD pipelines, testing automation |
| `release-engineer` | release-management | changesets | Version management, publishing |
| `security-validator` | security-assurance | owasp-cwe-snyk | Security audits, vulnerability scanning |
| `workflow-architect` | workflow-automation | liaison | Multi-agent coordination |
| `code-reviewer` | code-review | quality | Code review, best practices |
| `library-researcher` | library-research | research | API research, documentation |
| `docs-writer` | documentation | technical-writing | README, API docs |
| `liaison-specialist` | liaison-architecture | workflow-automation | Workflow design |
| `qa-subagent` | quality-assurance | testing | Test strategy, QA |
| `security-subagent` | security-assurance | security | Security compliance |
| `custom-agent` | general | general | General purpose tasks |

## Agent Directory Structure

```
.opencode/
├── agent/
│   ├── my-cli-agent.json      # Created agent configs
│   └── my-security-agent.json
└── schemas/
    └── subagent-config.json   # Validation schema
```

## Skill Integration

### Required Skills

Agent configs declare `required_skills` that must exist in `.skills/` directory:
```json
"required_skills": ["cli-development", "bun-development"]
```

### Skill Discovery

When an AI agent loads a config:
1. Reads `required_skills` array
2. Loads each skill from `.skills/` directory
3. Parses skill frontmatter and instructions
4. Makes skill content available to the agent

### Managing Skills

**List available skills:**
```bash
liaison skill list
```

**Generate skill prompts for agents:**
```bash
liaison skill to-prompt
```

**Create new skills:**
```bash
liaison skill create my-skill --template workflow
```

## Agent Capabilities by Domain

### CLI Development (cli-specialist)
**Capabilities:**
- Command pattern implementation
- Argument validation and parsing
- CLI user experience design
- Help text formatting
- Error handling strategies
- Subcommand architecture

**Tools:** Full access (read, write, edit, bash, grep, glob, todowrite, todoread)

**Skills:** cli-development, bun-development

### CI/CD Automation (ci-cd-specialist)
**Capabilities:**
- CI/CD pipeline setup
- Automated testing workflows
- Coverage threshold enforcement
- Quality gate configuration
- Workflow automation

**Tools:** Full access except webfetch

**Skills:** testing-automation, bun-development

### Security Assurance (security-validator)
**Capabilities:**
- Dependency vulnerability scanning
- Secret detection in code
- Security audit execution
- Compliance validation
- Threat modeling

**Tools:** Limited access (read, write, edit, bash, grep, list, webfetch)

**Skills:** security-scanning, git-automation

### Release Management (release-engineer)
**Capabilities:**
- Version number management
- Changelog generation
- Automated publishing
- Release coordination

**Tools:** Full access except webfetch

**Skills:** release-publishing, git-automation, bun-development

## Multi-Agent Workflows

### Agent Delegation

Agents can delegate tasks to other specialized agents through `delegation_patterns`:

```json
"delegation_patterns": {
  "cli_implementation": {
    "description": "All CLI tasks delegated to cli-specialist",
    "allowed_callers": ["cody-builder", "cody-admin"],
    "operations": [
      "create_cli_commands",
      "implement_command_patterns",
      "add_command_options"
    ]
  }
}
```

### Workflow Example: CLI Development

1. **Primary Agent** receives task: "Create a CLI tool for user management"
2. **Primary Agent** analyzes task and delegates to `cli-specialist`
3. **CLI Specialist** loads `cli-development` and `bun-development` skills
4. **CLI Specialist** implements command structure, argument parsing, help text
5. **CLI Specialist** returns completed CLI implementation
6. **Primary Agent** integrates CLI tool into larger project

### Workflow Example: Security Release

1. **Security Validator** performs vulnerability scan
2. **Security Validator** delegates fixes to appropriate specialists
3. **CLI Specialist** updates dependencies
4. **Release Engineer** creates security patch release
5. **CI/CD Specialist** ensures security tests pass
6. **Workflow Architect** coordinates the entire security response

## Customizing Agents

### Editing Agent Configs

After creating an agent, customize its behavior:

```bash
# Edit agent configuration
vim .opencode/agent/my-agent.json

# Modify tools, permissions, or behavior
# Changes take effect immediately
```

### Common Customizations

**Increase caution for production:**
```json
{
  "behavior": {
    "conservative": true,
    "confirmation_required": true
  }
}
```

**Add web access for API research:**
```json
{
  "tools": {
    "webfetch": true
  }
}
```

**Enable admin permissions:**
```json
{
  "permissions": {
    "admin": true
  }
}
```

## Integration with AI Tools

### OpenCode Integration

Agents work with OpenCode through the `.opencode/agent/` directory:
- Agent configs are automatically discovered
- Skills are loaded from `.opencode/skill/` symlinks
- Context variables provide agent awareness

### Claude Code / Cursor Integration

Similar integration through `.claude/skills/` and `.cursor/` directories.

### VS Code Integration

Uses `.github/skills/` and `.vscode/` directories for skill loading.

## Troubleshooting

### Agent Not Found

**Symptoms:** AI tool can't find your agents

**Solutions:**
1. Verify agent file exists: `ls .opencode/agent/`
2. Check JSON validity: `cat .opencode/agent/name.json | jq .`
3. Ensure correct file permissions
4. Restart AI tool to refresh agent discovery

### Skills Not Loading

**Symptoms:** Agent lacks expected knowledge or capabilities

**Solutions:**
1. Verify skill exists: `liaison skill list | grep skill-name`
2. Check skill file: `cat .skills/skill-name/SKILL.md`
3. Validate symlinks: `ls -la .opencode/skill/`
4. Regenerate skill prompt: `liaison skill to-prompt`

### Configuration Errors

**Symptoms:** Agent fails to load or behaves unexpectedly

**Solutions:**
1. Validate against schema: Schema is at `.opencode/schemas/subagent-config.json`
2. Check required fields: All configs need `$schema`, `mode`, `tools`, `permissions`, `environment`, `behavior`, `specialization`
3. Verify domain consistency: Environment `OPENCODE_CONTEXT` should match specialization `domain`
4. Recreate from template: `liaison opencode agent create name --template template --overwrite`

### Permission Issues

**Symptoms:** Agent can't perform expected actions

**Solutions:**
1. Check tool permissions in config
2. Verify file system permissions
3. Ensure agent has necessary tools enabled
4. For security domains, some tools are intentionally restricted

## Best Practices

### Agent Selection
- Choose most specific template for your task
- Use `custom-agent` only when no specialized template fits
- Consider required skills when selecting agents

### Workflow Design
- Design workflows that leverage agent specializations
- Use delegation patterns for complex multi-step tasks
- Document agent responsibilities and handoffs

### Skill Management
- Keep skills updated with current best practices
- Create new skills for domain-specific knowledge
- Use skill validation regularly: `liaison skill validate`

### Configuration Management
- Version control agent configs in project repository
- Document custom agent configurations
- Regularly review and update agent permissions

## Advanced Usage

### Creating Custom Templates

To create a new agent template:

1. Add template to `packages/opencode_config/src/utils/template-engine.ts`
2. Define domain, framework, capabilities, required_skills
3. Set appropriate tool permissions and behavior
4. Test template creation and functionality

### Skill Development

Create new skills for specialized knowledge:

```bash
liaison skill create my-domain-skill --template workflow
# Edit .skills/my-domain-skill/SKILL.md with domain knowledge
```

### Agent Orchestration

For complex workflows, consider:
- Primary agent for task analysis and delegation
- Specialized agents for domain-specific work
- Workflow architect for coordination logic
- Clear handoff protocols between agents

## Related Documentation

- [Agent Templates Reference](./AGENT_TEMPLATES.md) - Detailed template specifications
- [Workflow Examples](./examples/agent-workflows.md) - Practical usage examples
- [Skill Integration](./SKILLS.md) - Complete skills documentation
- [CLI Commands](../CLI.md) - Command reference

---

*Last updated: December 2025*