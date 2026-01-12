# Liaison Claude Plugin Documentation

## Overview

The Liaison Claude Plugin integrates the Liaison toolkit's configuration management and setup capabilities directly into Claude Code. This enables seamless configuration of OpenCode and Claude environments from within your AI coding workflow.

## Installation

### Automatic Installation

```bash
liaison ext install claude
```

This copies the plugin to Claude's plugin directory (`~/.claude/plugins/liaison/`).

### Manual Installation

1. Copy the `packages/liaison/claude-plugin/` directory to `~/.claude/plugins/liaison/`
2. Restart Claude Code

### Verify Installation

```bash
liaison ext status
liaison setup plugin --reconfigure  # Reconfigure if needed
```

## Commands

### Configuration Management

#### `liaison config opencode`
Configure OpenCode environment with opinionated agent primitives.

```bash
liaison config opencode --agents "library-researcher,code-reviewer" --model big-pickle
```

**Options:**
- `--agents` - Comma-separated list of agents
- `--model` - Model to use
- `--directory` - Target directory
- `--overwrite` - Overwrite existing configuration
- `--merge` - Merge with existing configuration

#### `liaison config claude`
Configure Claude environment with opinionated templates.

```bash
liaison config claude --name research-agent --model claude-sonnet-4 --temperature 0.7
```

**Options:**
- `--name` - Agent name
- `--model` - Claude model
- `--temperature` - Temperature (0.0-1.0)
- `--max-tokens` - Maximum tokens
- `--system-prompt` - Custom system prompt
- `--overwrite` / `--merge` - Configuration strategies

#### `liaison config status`
Show current configuration status.

```bash
liaison config status              # Human-readable
liaison config status --json       # JSON output
liaison config status --plugin     # Plugin status
```

#### `liaison config validate`
Validate configuration files.

```bash
liaison config validate
```

#### `liaison config export/import`
Export or import configuration.

```bash
liaison config export --output config.json --format json
liaison config import config.json --overwrite
```

### Interactive Setup

#### `liaison setup opencode`
Interactive setup for OpenCode environment with guided prompts.

```bash
liaison setup opencode
```

#### `liaison setup claude`
Interactive setup for Claude environment.

```bash
liaison setup claude
```

#### `liaison setup plugin`
Setup and configure the Liaison Claude plugin.

```bash
liaison setup plugin               # Quick setup
liaison setup plugin --reconfigure # Reconfigure existing
```

#### `liaison setup all`
Run full setup for all integrations.

```bash
liaison setup all
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

### Git-Based Sync

#### `liaison config sync status`
Show sync status.

```bash
liaison config sync status
liaison config sync status --json
```

#### `liaison config sync commit/push/pull`
Git operations.

```bash
liaison config sync commit "Update configuration"
liaison config sync push
liaison config sync pull
```

### Plugin Management

#### `liaison ext status`
Show plugin installation status.

```bash
liaison ext status
liaison ext status --json
```

#### `liaison ext install claude`
Install Liaison plugin for Claude.

```bash
liaison ext install claude
liaison ext install claude --force  # Force reinstall
```

#### `liaison ext uninstall claude`
Uninstall Liaison plugin.

```bash
liaison ext uninstall claude
liaison ext uninstall claude --keep-config  # Keep config files
```

## Integration with Agent Primitives

The plugin uses `@pwarnock/agent_primitives` for:
- Shared skill schemas
- MCP server configurations
- Agent capability definitions
- Validation utilities

Example configuration using agent primitives:

```bash
liaison config opencode --agents "library-researcher,code-reviewer" --model big-pickle
```

## Integration with Claude Config

The plugin uses `@pwarnock/claude_config` for:
- Claude agent configuration types
- Templates (minimal, standard, research, development)
- Schema validation

Example configuration:

```bash
liaison config claude --name research-agent --model claude-sonnet-4 --temperature 0.7
```

## Safety Features

### Automatic Backups

Before any destructive operation, Liaison creates backups:

```bash
# List backups
liaison backup list

# Restore backup
liaison backup restore <backup-id>
```

### Rollback

To rollback the last operation:

```bash
liaison rollback
```

### Upgrade Path

Check and apply configuration upgrades:

```bash
liaison upgrade --check
liaison upgrade --apply
```

## Troubleshooting

### Plugin Not Recognized

1. Check plugin directory:
   ```bash
   ls ~/.claude/plugins/liaison/
   ```

2. Verify permissions:
   ```bash
   chmod -R 755 ~/.claude/plugins/liaison/
   ```

3. Restart Claude Code

### Configuration Conflicts

Use `--merge` to resolve conflicts:

```bash
liaison config opencode --merge
```

Or `--overwrite` to force:

```bash
liaison config opencode --overwrite
```

### Backup Recovery

```bash
# List available backups
liaison backup list

# Restore specific backup
liaison backup restore <backup-id>
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `LIAISON_HOME` | Liaison home directory | `~/.liaison` |
| `LIAISON_BACKUP_DIR` | Backup directory | `~/.liaison/backups` |
| `LIAISON_CONFIG_DIR` | Configuration directory | `~/.liaison/config` |

## File Structure

```
~/.liaison/
├── backups/          # Automatic backups
├── config/           # Configuration files
└── logs/            # Log files

~/.claude/plugins/liaison/
├── PLUGIN.md        # Plugin documentation
├── VERSION          # Plugin version
└── [plugin files]   # Plugin implementation
```

## Support

- **Documentation**: See `docs/` directory
- **Issues**: Report at GitHub issues
- **Updates**: Run `liaison upgrade --check` regularly

## Quick Reference

```bash
# Setup
liaison setup all                    # Full setup
liaison setup plugin                 # Plugin only

# Configuration
liaison config opencode              # OpenCode config
liaison config claude                # Claude config
liaison config status                # Show status

# Templates
liaison template list                # List templates
liaison template info <name>         # Template details

# Plugin
liaison ext install claude           # Install plugin
liaison ext status                   # Plugin status
liaison ext uninstall claude         # Uninstall

# Safety
liaison backup list                  # List backups
liaison rollback                     # Rollback last op
liaison upgrade --check              # Check updates
```
