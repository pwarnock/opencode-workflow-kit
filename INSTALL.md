# Installation and Usage Guide

## Installation

### Option 1: Install from source (recommended for development)

```bash
# Clone the repository
git clone https://github.com/your-username/opencode-config.git
cd opencode-config

# Install with uv (recommended)
uv sync

# Or with pip
pip install -e .
```

### Option 2: Install from PyPI (when published)

```bash
pip install opencode-config
```

## Setup

### 1. Configure OpenCode

Copy the opencode.json configuration to your OpenCode config directory:

```bash
# For global configuration
cp opencode.json ~/.config/opencode/config.json

# Or for project-specific configuration
cp opencode.json ./opencode.json
```

### 2. Install :cody (if not already installed)

Follow the :cody installation instructions from your project documentation.

### 3. Verify Installation

```bash
# Test the CLI tool
opencode-config --help

# Test custom tools are available
opencode-config validate
```

## Usage

### CLI Commands

#### Version Management

```bash
# Add a new version
opencode-config version add \
  --version-number "1.0.0" \
  --version-name "initial-release" \
  --features "Add basic version management and :cody integration"

# The tool will:
# 1. Create version folder structure
# 2. Execute :cody version add
# 3. Ask if you want to start building the version
```

#### Configuration Validation

```bash
# Validate all configurations
opencode-config validate config/

# Validate specific configuration
opencode-config validate config/global/agents/default.json
```

#### Testing

```bash
# Run compatibility tests
opencode-config test

# Setup environment
opencode-config setup
```

### OpenCode Custom Tools

Once configured, you can use these tools directly in OpenCode:

#### cody_version_add

```python
# In OpenCode, this tool is available as:
cody_version_add(
    version_number="1.0.0",
    version_name="initial-release", 
    features="Add basic version management and :cody integration"
)
```

#### cody_version_build

```python
# Build a specific version
cody_version_build(version="1.0.0-initial-release")
```

#### create_subagent

```python
# Create a specialized subagent
create_subagent(
    name="library-researcher",
    agent_type="research",
    tools=["read", "webfetch", "grep"],
    description="Agent for researching library documentation"
)
```

#### cody_refresh

```python
# Refresh :cody project state
cody_refresh()
```

### Version Manager Agent

Use the pre-configured version-manager agent for version-related tasks:

```bash
# In OpenCode, switch to the version-manager agent
# It has access to all :cody integration tools
```

## Examples

### Example 1: Adding a New Version

```bash
# Using CLI
opencode-config version add \
  --version-number "0.3.0" \
  --version-name "cody-integration" \
  --features "Add :cody integration and custom tools"

# Using OpenCode tools directly
# OpenCode will call: cody_version_add("0.3.0", "cody-integration", "Add :cody integration and custom tools")
```

### Example 2: Creating a Subagent

```bash
# This would be used within OpenCode
create_subagent(
    name="documentation-writer",
    agent_type="documentation",
    tools=["read", "write", "webfetch", "grep"],
    description="Specialized agent for writing documentation"
)
```

### Example 3: Version Workflow

```bash
# 1. Add version
opencode-config version add --version-number "1.0.0" --version-name "release" --features "Production ready features"

# 2. When prompted, say yes to start building

# 3. Or manually build later
# In OpenCode: cody_version_build("1.0.0-release")
```

## Configuration

### Environment Variables

The tools respect these environment variables:

- `OPENCODE_CONFIG_DIR`: Override default OpenCode config directory
- `CODY_CONFIG_DIR`: Override default :cody config directory

### Custom Tool Configuration

Edit `opencode.json` to customize tool permissions:

```json
{
  "tools": {
    "cody_version_add": true,
    "cody_version_build": true,
    "create_subagent": true,
    "cody_refresh": true
  },
  "agents": {
    "my-custom-agent": {
      "tools": {
        "cody_version_add": true,
        "create_subagent": false
      }
    }
  }
}
```

## Troubleshooting

### Common Issues

1. **":cody command not found"**
   - Ensure :cody is installed and in your PATH
   - Check that :cody is properly configured

2. **"Permission denied"**
   - Check file permissions for config directories
   - Ensure OpenCode has access to custom tools

3. **"Module not found"**
   - Ensure opencode-config is properly installed
   - Check Python path and virtual environment

### Debug Mode

Enable verbose output:

```bash
opencode-config --verbose validate config/
```

### Logs

Check OpenCode logs for custom tool errors:

```bash
# OpenCode logs location varies by platform
# macOS: ~/Library/Logs/opencode/
# Linux: ~/.local/share/opencode/logs/
# Windows: %APPDATA%/opencode/logs/
```

## Development

### Running Tests

```bash
# Run all tests
uv run pytest

# Run with coverage
uv run pytest --cov=opencode_config

# Run specific test file
uv run pytest tests/test_tools.py
```

### Code Quality

```bash
# Format code
uv run black opencode_config/

# Lint code
uv run ruff check opencode_config/

# Type checking
uv run mypy opencode_config/
```

### Building

```bash
# Build package
uv build

# Install locally in development mode
pip install -e .
```

## Support

- **Issues**: Report bugs and feature requests on GitHub
- **Documentation**: See the `docs/` directory for detailed documentation
- **Examples**: Check the `examples/` directory for sample configurations