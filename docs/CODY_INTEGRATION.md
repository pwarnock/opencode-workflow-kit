# :cody Integration for OpenCode

This package provides seamless integration between OpenCode and the :cody framework, allowing you to use :cody workflows through OpenCode commands and specialized subagents.

## Overview

The :cody integration includes:

- **5 OpenCode commands** that map to :cody workflows
- **5 specialized subagents** optimized for different :cody tasks
- **Installation scripts** for easy setup and management
- **Template validation** to ensure quality and consistency

## Quick Start

### Installation

```bash
# Install the integration
uv run python scripts/install-cody-integration.py

# Or with custom config directory
uv run python scripts/install-cody-integration.py --config-dir ~/.opencode

# Dry run to see what will be installed
uv run python scripts/install-cody-integration.py --dry-run
```

### Usage

Once installed, you'll have these commands available in OpenCode:

```bash
# Plan a new feature or project
/cody plan

# Build based on existing plans
/cody build

# Add a new version
/cody version add

# Build a specific version
/cody version build

# Refresh project state
/cody refresh
```

## Commands

### `/cody plan`

Executes the complete :cody planning workflow using the **cody-planner** subagent.

**What it does:**
- Runs discovery phase
- Generates planning documents
- Creates project roadmap
- Preserves context for subsequent commands

**Agent:** `cody-planner` (read-only analysis specialist)

### `/cody build`

Executes the :cody build workflow using the **cody-builder** subagent.

**What it does:**
- Implements planned features
- Generates code and documentation
- Runs tests and validation
- Creates build artifacts

**Agent:** `cody-builder` (full development specialist)

### `/cody version add`

Adds a new version using the **cody-version-manager** subagent.

**What it does:**
- Prompts for version details
- Creates version folder structure
- Adds to feature backlog
- Offers to start building

**Agent:** `cody-version-manager` (version lifecycle specialist)

### `/cody version build`

Builds a specific version using the **cody-version-manager** subagent.

**What it does:**
- Loads version context
- Implements version features
- Runs version-specific tests
- Prepares release artifacts

**Agent:** `cody-version-manager`

### `/cody refresh`

Refreshes project state using the **cody-admin** subagent.

**What it does:**
- Updates project configuration
- Synchronizes task tracking
- Validates system state
- Maintains consistency

**Agent:** `cody-admin` (system administration specialist)

## Subagents

### cody-planner

**Purpose:** Read-only analysis and discovery
**Tools:** `read`, `webfetch`, `grep`, `glob`, `list`, `bash`
**Specialization:** Discovery analysis, requirement gathering, roadmap creation

### cody-builder

**Purpose:** Full development and implementation
**Tools:** All development tools including `write`, `edit`, `bash`
**Specialization:** Code generation, build automation, testing

### cody-version-manager

**Purpose:** Version lifecycle management
**Tools:** Development tools with version awareness
**Specialization:** Version creation, feature tracking, release management

### cody-admin

**Purpose:** System administration and maintenance
**Tools:** Administrative tools with system awareness
**Specialization:** System refresh, configuration management, troubleshooting

### cody-general

**Purpose:** Information and guidance
**Tools:** Read-only tools for information retrieval
**Specialization:** Help provision, workflow guidance, best practices

## Installation Details

### What Gets Installed

**Commands:** `~/.config/opencode/commands/`
- `plan.md`
- `build.md`
- `version-add.md`
- `version-build.md`
- `refresh.md`

**Agents:** `~/.config/opencode/agents/`
- `cody-planner.json`
- `cody-builder.json`
- `cody-version-manager.json`
- `cody-admin.json`
- `cody-general.json`

**Configuration:** `~/.config/opencode/config.json`
- Updated with :cody agent definitions

### Directory Structure

```
~/.config/opencode/
├── commands/
│   ├── plan.md
│   ├── build.md
│   ├── version-add.md
│   ├── version-build.md
│   └── refresh.md
├── agents/
│   ├── cody-planner.json
│   ├── cody-builder.json
│   ├── cody-version-manager.json
│   ├── cody-admin.json
│   └── cody-general.json
└── config.json (updated)
```

## Management

### Validation

Validate your installation:

```bash
# Validate all templates
uv run python scripts/validate-cody-integration.py

# Validate only commands
uv run python scripts/validate-cody-integration.py --commands-only

# Validate only agents
uv run python scripts/validate-cody-integration.py --agents-only

# Verbose output
uv run python scripts/validate-cody-integration.py --verbose
```

### Uninstallation

Remove the integration completely:

```bash
# Uninstall the integration
uv run python scripts/uninstall-cody-integration.py

# Dry run to see what will be removed
uv run python scripts/uninstall-cody-integration.py --dry-run

# With custom config directory
uv run python scripts/uninstall-cody-integration.py --config-dir ~/.opencode
```

### Force Reinstallation

Overwrite existing installation:

```bash
# Force reinstall (overwrites existing files)
uv run python scripts/install-cody-integration.py --force
```

## Configuration

### Custom Agent Tools

You can customize agent tool permissions by editing the generated agent files:

```json
{
  "tools": {
    "read": true,
    "write": true,
    "bash": true,
    "webfetch": false
  }
}
```

### Environment Variables

The integration sets these environment variables for context:

- `CODY_MODE`: Indicates the current :cody mode (planner, builder, etc.)
- `OPENCODE_CONTEXT`: Provides OpenCode context awareness

### Command Customization

You can modify command templates in `~/.config/opencode/commands/` to customize workflows, but maintain the basic structure for compatibility.

## Troubleshooting

### Common Issues

**Commands not available:**
- Restart OpenCode after installation
- Check that commands are in `~/.config/opencode/commands/`
- Validate installation with the validation script

**Agents not working:**
- Verify agent files in `~/.config/opencode/agents/`
- Check `config.json` contains agent definitions
- Ensure :cody is properly installed and accessible

**Permission errors:**
- Check file permissions in OpenCode config directory
- Ensure scripts have execute permissions
- Run installation with appropriate user permissions

### Debug Mode

Enable verbose output for debugging:

```bash
# Validate with verbose output
uv run python scripts/validate-cody-integration.py --verbose

# Install with dry run to check paths
uv run python scripts/install-cody-integration.py --dry-run
```

### Logs

Check OpenCode logs for command execution issues:

- **macOS:** `~/Library/Logs/opencode/`
- **Linux:** `~/.local/share/opencode/logs/`
- **Windows:** `%APPDATA%/opencode/logs/`

## Development

### Template Structure

```
templates/
├── cody-commands/     # Command templates
│   ├── plan.md
│   ├── build.md
│   ├── version-add.md
│   ├── version-build.md
│   └── refresh.md
└── agents/           # Agent configurations
    ├── cody-planner.json
    ├── cody-builder.json
    ├── cody-version-manager.json
    ├── cody-admin.json
    └── cody-general.json
```

### Adding New Commands

1. Create command template in `templates/cody-commands/`
2. Follow the established structure with frontmatter
3. Include subagent delegation and workflow steps
4. Add agent configuration if needed
5. Update installation scripts
6. Validate with the validation script

### Adding New Agents

1. Create agent configuration in `templates/agents/`
2. Follow the JSON schema structure
3. Include specialization and behavior sections
4. Update installation scripts
5. Validate with the validation script

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add or modify templates
4. Test with validation script
5. Update documentation
6. Submit a pull request

## License

MIT License - see LICENSE file for details.