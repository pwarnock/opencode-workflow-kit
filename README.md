# OpenCode Config

A shareable collection of opencode configurations designed to eliminate the pain of recreating setup across machines and projects.

## Overview

OpenCode Config provides a modular, cross-platform configuration system for opencode that supports both global and project-level settings. The configuration hierarchy allows for cascading settings from project-specific to global defaults.

## Features

- **Modular Structure**: Separate configurations for agents, MCP servers, and permissions
- **Cross-Platform Support**: Works seamlessly on macOS, Linux, and Windows
- **Cascading Configuration**: Project → Global → Defaults hierarchy
- **Shareable**: Easy to distribute and reuse configurations across teams
- **Validated**: JSON Schema validation ensures configuration integrity

## Installation

### Prerequisites

- **uv** (recommended): Fast Python package installer and environment manager
  ```bash
  # Install uv
  curl -LsSf https://astral.sh/uv/install.sh | sh
  ```

### Quick Start

1. Clone this repository:
   ```bash
   git clone https://github.com/your-username/opencode-config.git
   cd opencode-config
   ```

2. Set up the environment with uv:
   ```bash
   uv sync
   ```

3. Run the setup script:
   ```bash
   ./setup.sh
   ```

### Manual Setup

1. Create virtual environment:
   ```bash
   uv venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   uv pip install -e .
   ```

3. Copy global configurations to `~/.opencode/`:
   ```bash
   cp -r config/global/* ~/.opencode/
   ```

4. For project-specific usage, copy project configurations:
   ```bash
   cp -r config/project/.opencode ./your-project/
   ```

## Configuration Structure

```
opencode-config/
├── config/
│   ├── global/           # Global configurations (~/.opencode/)
│   │   ├── agents/       # Agent settings
│   │   ├── mcp/          # MCP server configurations
│   │   └── permissions/  # Permission matrices
│   └── project/          # Project-level configurations (.opencode/)
│       └── .opencode/
├── schemas/              # JSON Schema validation files
├── examples/             # Example configurations
└── docs/                # Documentation
```

## Usage

### Environment Setup

The project uses **uv** for fast Python environment management:

```bash
# Create and activate virtual environment
uv sync
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Or use uv run for one-off commands
uv run python scripts/test-compatibility.py
```

### Environment Templates

Use pre-built environment templates for different development scenarios:

```bash
# List available templates
uv run python scripts/environment-templates.py list

# Apply a web development template
uv run python scripts/environment-templates.py apply web-development ./my-web-project

# Apply a Python development template
uv run python scripts/environment-templates.py apply python-development ./my-python-project

# Create your own template
uv run python scripts/environment-templates.py create my-template "Description" ./config-source
```

### Global Configuration

Global configurations are stored in `~/.opencode/` and apply to all opencode sessions unless overridden by project-specific settings.

### Project Configuration

Project-specific configurations are stored in `.opencode/` directory in your project root and override global settings.

### Configuration Hierarchy

1. **Project-level** (`.opencode/`) - Highest priority
2. **Global** (`~/.opencode/`) - Medium priority  
3. **Defaults** - Built-in defaults - Lowest priority

### Testing and Validation

```bash
# Test compatibility across platforms
uv run python scripts/test-compatibility.py

# Validate specific configuration
uv run python scripts/config-validator.py config/global/agents/default.json

# Validate all configurations
uv run python scripts/config-validator.py config/

# Use the CLI tool
uv run opencode-config validate config/
uv run opencode-config test
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Current Status

✅ **v0.1.0 MVP Complete** - All core functionality implemented and tested.

### Features Implemented

- ✅ Cross-platform configuration structure
- ✅ Global and project-level configurations
- ✅ Configuration inheritance system
- ✅ JSON Schema validation
- ✅ Path normalization utilities
- ✅ Permission matrix system
- ✅ MCP server configurations
- ✅ Example configurations for web and Python development
- ✅ Comprehensive testing suite
- ✅ **uv and .venv support** for fast environment management
- ✅ **Environment template system** for quick project setup
- ✅ **Automated setup script** with cross-platform support

### Available Environment Templates

- **web-development**: React, Node.js, TypeScript projects
- **python-development**: Python, data science, web frameworks
- **minimal**: Basic configuration for general use

### Quick Start

1. **Environment Setup**: Run `uv sync` to create .venv and install dependencies
2. **Global Setup**: Copy `config/global/` to `~/.opencode/`
3. **Project Setup**: Use environment templates or copy `config/project/.opencode/` to your project root
4. **Validate**: Run `uv run python scripts/test-compatibility.py`
5. **Customize**: Modify configurations as needed

### Configuration Structure

```
opencode-config/
├── config/
│   ├── global/          # Global configurations
│   │   ├── agents/      # Agent settings
│   │   ├── mcp/         # MCP server configs
│   │   └── permissions/ # Permission matrices
│   └── project/         # Project-specific configs
│       └── .opencode/   # Project config template
├── schemas/             # JSON Schema definitions
├── examples/            # Example configurations
├── scripts/             # Utility scripts
└── docs/               # Documentation
```

## Troubleshooting

### Common Issues and Solutions

#### Setup Issues

**Issue**: `uv: command not found`
```bash
# Solution: Install uv
curl -LsSf https://astral.sh/uv/install.sh | sh
source ~/.bashrc  # or restart terminal
```

**Issue**: `./setup.sh: Permission denied`
```bash
# Solution: Make script executable
chmod +x setup.sh
./setup.sh
```

**Issue**: Python module import errors
```bash
# Solution: Ensure virtual environment is activated
source .venv/bin/activate  # Linux/macOS
# or
.venv\Scripts\activate     # Windows

# Or use uv run
uv run python scripts/test-compatibility.py
```

#### Configuration Issues

**Issue**: Schema validation failed
```bash
# Check specific configuration file
uv run python scripts/config-validator.py config/global/agents/default.json

# Common fixes:
# - Missing required fields (name, description, version)
# - Invalid file paths (use forward slashes)
# - Incorrect JSON syntax
```

**Issue**: Template application fails
```bash
# Validate template before applying
uv run python scripts/environment-templates.py list

# Check generated files
uv run python scripts/config-validator.py ./output-directory
```

**Issue**: Configuration not loading
```bash
# Check file locations and permissions
ls -la ~/.opencode/
ls -la ./.opencode/

# Ensure correct paths in configuration files
# Use ~ for home directory, not full paths
```

#### Platform-Specific Issues

**Windows**:
- Use PowerShell instead of bash for setup script
- Replace `~` with `%USERPROFILE%` in manual configuration
- Use `.venv\Scripts\activate` for virtual environment

**macOS**:
- If Homebrew Python conflicts, use `/usr/bin/python3`
- Gatekeeper may block scripts: `xattr -d com.apple.quarantine setup.sh`

**Linux**:
- Install system dependencies: `sudo apt install python3-venv` (Ubuntu/Debian)
- Check file permissions in `/home/user/.opencode/`

#### Validation Issues

**Issue**: Compatibility test failures
```bash
# Run detailed compatibility check
uv run python scripts/test-compatibility.py --verbose

# Common fixes:
# - Install missing dependencies: uv sync
# - Check Python version: python3 --version
# - Verify file permissions
```

**Issue**: Path resolution errors
```bash
# Test path utilities
uv run python scripts/test-path-utils.py

# Fix path issues:
# - Use forward slashes (/) in all configs
# - Use ~ for home directory expansion
# - Avoid relative paths in global configs
```

#### Performance Issues

**Issue**: Slow configuration loading
```bash
# Check for large files in config directories
find ~/.opencode/ -type f -size +1M

# Remove cache files if needed
rm -rf ~/.cache/opencode/
```

**Issue**: Memory errors with large projects
```bash
# Adjust configuration limits
# Edit agent config: max_file_size, max_concurrent_operations
# Use project-specific configs instead of global for large repos
```

### Getting Help

1. **Check logs**: Look for error messages in terminal output
2. **Validate configuration**: Use `uv run python scripts/config-validator.py`
3. **Test compatibility**: Run `uv run python scripts/test-compatibility.py`
4. **Review examples**: Check `examples/` for working configurations
5. **Open an issue**: Include error messages and system information

### Debug Mode

Enable verbose output for troubleshooting:
```bash
# Set environment variable
export OPENCODE_DEBUG=1

# Or use verbose flags
uv run python scripts/config-validator.py --verbose config/
uv run python scripts/test-compatibility.py --verbose
```

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
- Open an issue on GitHub
- Check the documentation in `docs/`
- Review example configurations in `examples/`