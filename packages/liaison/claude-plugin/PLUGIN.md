# Liaison Claude Plugin

A Claude plugin that integrates Liaison's configuration management and setup capabilities into Claude Code.

## Overview

This plugin provides seamless integration between Claude Code and the Liaison toolkit, enabling:
- Configuration management for OpenCode and Claude environments
- Project setup with opinionated agent configurations
- Template management and updates
- Git-based sync workflows
- Safety infrastructure (backup, rollback, upgrade)

## Commands

### Configuration

#### `liaison config opencode`
Configure OpenCode environment with opinionated agent primitives.

```bash
liaison config opencode --agents "library-researcher,code-reviewer" --model big-pickle
```

**Options:**
- `--agents` - Comma-separated list of agents to configure
- `--model` - Model to use for agents
- `--directory` - Target directory (default: current)
- `--overwrite` - Overwrite existing configuration
- `--merge` - Merge with existing configuration

#### `liaison config claude`
Configure Claude environment with opinionated templates.

```bash
liaison config claude --name research-agent --model claude-sonnet-4 --temperature 0.7
```

**Options:**
- `--name` - Agent name
- `--model` - Claude model (claude-sonnet-4, claude-opus-4, claude-haiku-3)
- `--temperature` - Temperature (0.0-1.0)
- `--max-tokens` - Maximum tokens
- `--system-prompt` - Custom system prompt
- `--overwrite` - Overwrite existing configuration
- `--merge` - Merge with existing configuration

#### `liaison config status`
Show current configuration status.

```bash
liaison config status
liaison config status --json
liaison config status --plugin  # Show Claude plugin status
```

#### `liaison config validate`
Validate configuration files.

```bash
liaison config validate
```

#### `liaison config export`
Export configuration to file.

```bash
liaison config export --output config.json --format json
```

#### `liaison config import`
Import configuration from file.

```bash
liaison config import config.json --overwrite
```

### Setup

#### `liaison setup opencode`
Interactive setup for OpenCode environment.

```bash
liaison setup opencode
```

**Features:**
- Agent template selection
- Model configuration
- Backup before changes
- Merge strategy for existing configs

#### `liaison setup claude`
Interactive setup for Claude environment.

```bash
liaison setup claude
```

**Features:**
- Agent name and model selection
- Temperature and token configuration
- System prompt customization
- Backup before changes

#### `liaison setup plugin`
Setup and configure the Liaison Claude plugin.

```bash
liaison setup plugin
liaison setup plugin --reconfigure
```

### Template Management

#### `liaison template list`
List available templates.

```bash
liaison template list
```

#### `liaison template info <name>`
Show template details.

```bash
liaison template info minimal
liaison template info research
```

#### `liaison template update <name>`
Update to latest template version.

```bash
liaison template update research --force
```

### Sync

#### `liaison config sync status`
Show git sync status.

```bash
liaison config sync status
liaison config sync status --json
```

#### `liaison config sync commit`
Commit configuration changes.

```bash
liaison config sync commit "Update agent configuration"
```

#### `liaison config sync push/pull`
Push or pull configuration changes.

```bash
liaison config sync push
liaison config sync pull
```

### Plugin Management

#### `liaison ext status`
Show Claude plugin installation status.

```bash
liaison ext status
```

#### `liaison ext install claude`
Install Liaison plugin for Claude.

```bash
liaison ext install claude
```

#### `liaison ext uninstall claude`
Uninstall Liaison plugin from Claude.

```bash
liaison ext uninstall claude
```

## Installation

### Automatic Installation

```bash
liaison ext install claude
```

### Manual Installation

1. Copy this plugin directory to `~/.claude/plugins/liaison/`
2. Configure Claude to recognize the plugin
3. Run `liaison setup plugin` to complete setup

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `LIAISON_HOME` | Liaison home directory | `~/.liaison` |
| `LIAISON_BACKUP_DIR` | Backup directory | `~/.liaison/backups` |
| `LIAISON_CONFIG_DIR` | Configuration directory | `~/.liaison/config` |

### Project Configuration

Liaison looks for configuration in:
- `.liaison/` directory in project root
- `~/.liaison/` for global configuration
- Environment variables for overrides

## Safety Features

### Automatic Backups

Before any destructive operation, Liaison automatically creates backups in:
```
~/.liaison/backups/{timestamp}/
```

### Rollback

To rollback the last operation:

```bash
liaison rollback
```

### Upgrade Path

Liaison automatically detects configuration versions and migrates:

```bash
liaison upgrade --check
liaison upgrade --apply
```

## Integration with Agent Primitives

This plugin uses `@pwarnock/agent_primitives` for:
- Shared skill schemas
- MCP server configurations
- Agent capability definitions
- Validation utilities

## Integration with Claude Config

This plugin uses `@pwarnock/claude_config` for:
- Claude agent configuration types
- Claude templates (minimal, standard, research, development)
- Schema validation

## Troubleshooting

### Plugin Not Recognized

1. Check plugin directory exists: `~/.claude/plugins/liaison/`
2. Verify permissions: `chmod -R 755 ~/.claude/plugins/liaison/`
3. Restart Claude Code

### Configuration Conflicts

Use `--merge` flag to resolve conflicts:

```bash
liaison config opencode --merge
```

Or use `--overwrite` to force overwrite:

```bash
liaison config opencode --overwrite
```

### Backup Recovery

List available backups:

```bash
liaison backup list
```

Restore from backup:

```bash
liaison backup restore <backup-id>
```

## Support

- Documentation: See `docs/` directory
- Issues: Report at GitHub issues
- Updates: Run `liaison upgrade --check` regularly
