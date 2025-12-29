# Beads MCP Server Setup Guide

This guide explains how to set up `beads-mcp` for use with Claude Code, Claude Desktop, and other MCP-compatible AI tools.

## Overview

The Beads MCP server (`beads-mcp`) enables AI coding assistants to interact directly with your Beads issue tracker. This provides:

- Native task management in AI conversations
- Ready-work detection (`bd ready`)
- Dependency-aware task queuing
- Multi-project support via per-request workspace routing

## Prerequisites

- **Beads CLI** (`bd`) v0.40+ installed
- **Python 3.11+** (for beads-mcp)
- A project with Beads initialized (`bd init`)

### Install Beads CLI

```bash
# Quick install (recommended)
curl -fsSL https://raw.githubusercontent.com/steveyegge/beads/main/scripts/install.sh | bash

# Or via Homebrew
brew tap steveyegge/beads
brew install bd

# Or via npm
npm install -g @beads/bd

# Verify installation
bd --version
```

### Initialize Beads in Your Project

```bash
cd your-project
bd init
```

## Install beads-mcp

```bash
pip install beads-mcp
```

Or with uv:

```bash
uv pip install beads-mcp
```

## Configuration

### Claude Desktop

Add to your Claude Desktop configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
**Linux:** `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "beads": {
      "command": "beads-mcp"
    }
  }
}
```

### Claude Code (Terminal)

Claude Code automatically discovers MCP servers. To use beads-mcp:

1. Ensure `beads-mcp` is in your PATH
2. Configure in your Claude Code settings:

```bash
# Add to ~/.claude/settings.json or project .claude/settings.json
{
  "mcpServers": {
    "beads": {
      "command": "beads-mcp"
    }
  }
}
```

### Cursor / Windsurf / Other MCP Clients

Most MCP clients follow a similar pattern. Add to your client's MCP configuration:

```json
{
  "beads": {
    "command": "beads-mcp"
  }
}
```

## Available MCP Tools

Once configured, the following tools are available to your AI assistant:

| Tool | Description |
|------|-------------|
| `init` | Initialize Beads in a project |
| `create` | Create a new issue |
| `list` | List issues with filters |
| `ready` | Get tasks ready to work on (no blockers) |
| `show` | Show issue details |
| `update` | Update an issue |
| `close` | Close an issue |
| `reopen` | Reopen a closed issue |
| `dep` | Manage dependencies between issues |
| `blocked` | Get blocked issues |
| `stats` | Get project statistics |

## Example Usage

Once configured, you can interact naturally with Beads through your AI assistant:

```
You: What tasks are ready to work on?
AI: [Uses bd ready] Here are the tasks with no blockers:
    1. bd-a1b2 - Implement login page (P1)
    2. bd-c3d4 - Add unit tests for auth (P2)

You: Create a task to fix the CSS bug I found
AI: [Uses bd create] Created issue bd-e5f6: "Fix CSS bug"

You: That task is blocked by the login page work
AI: [Uses bd dep add] Added dependency: bd-e5f6 blocks on bd-a1b2
```

## Environment Variables

Configure beads-mcp behavior with these environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `BEADS_USE_DAEMON` | Use daemon RPC for faster operations | `1` |
| `BEADS_PATH` | Path to `bd` executable | Auto-discover |
| `BEADS_DB` | Database path (auto-discovers from `.beads/`) | Auto |
| `BEADS_WORKING_DIR` | Override working directory | Current dir |
| `BEADS_ACTOR` | Actor name for audit trail | `mcp-agent` |
| `BEADS_NO_AUTO_FLUSH` | Disable automatic JSONL sync | `false` |
| `BEADS_NO_AUTO_IMPORT` | Disable automatic JSONL import | `false` |

## Multi-Project Support

beads-mcp automatically routes requests to the correct project based on the working directory. When working across multiple projects:

1. Each project should have its own `.beads/` directory
2. The MCP server detects the project from the `workspace_root` parameter
3. One MCP server instance handles all projects

## Troubleshooting

### "bd command not found"

Ensure Beads CLI is installed and in your PATH:

```bash
which bd
# Should output: /usr/local/bin/bd or similar
```

If not found, reinstall or add to PATH:

```bash
export PATH="$PATH:$HOME/.local/bin"
```

### MCP server not connecting

1. Verify beads-mcp is installed:
   ```bash
   which beads-mcp
   beads-mcp --help
   ```

2. Check your config file syntax (valid JSON)

3. Restart your AI client after config changes

### "No .beads directory found"

Initialize Beads in your project:

```bash
cd your-project
bd init
```

### Daemon not running

The daemon starts automatically on first `bd` command. To check status:

```bash
bd info --json
```

To manually start:

```bash
bd daemons list
```

## Integration with liaison-toolkit

The liaison-toolkit provides additional integration with Beads:

```bash
# Get ready tasks via liaison CLI
liaison task ready

# Dependency management
liaison task tree bd-123
liaison task add-dep bd-child bd-parent --type blocks

# Check for circular dependencies
liaison task cycles

# System info
liaison task info
```

## Resources

- [Beads GitHub Repository](https://github.com/steveyegge/beads)
- [beads-mcp Package](https://pypi.org/project/beads-mcp/)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [liaison-toolkit Documentation](../README.md)