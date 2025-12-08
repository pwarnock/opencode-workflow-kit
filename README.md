# Liaison Toolkit

> Intelligent mediator system connecting AI agent builders with issue trackers

## 🚀 Quick Start - Dogfooding Workflow

### Install in Any Project (Recommended)

```bash
# Install the framework in any project
npm install @pwarnock/liaison

# Initialize liaison framework
npx liaison init

# Start planning your features (ALWAYS start here!)
/cody plan

# Build your planned features
/cody build

# Regularly refresh project state
/cody refresh
```

**💡 Pro Tip:** Always use the Cody framework commands to manage the project - this is "dogfooding" where we use our own tools to build our own tools!

### Traditional Development Setup

#### Option 1: Install from GitHub (Latest)
```bash
# Clone and install globally
git clone https://github.com/pwarnock/opencode-workflow-kit.git
cd opencode-workflow-kit
npm install
npm run build
npm install -g .

# Verify installation
liaison --version
liaison status

# Launch liaison service
liaison start
```

#### Option 2: Install Directly from GitHub
```bash
# Install specific release
npm install https://github.com/pwarnock/opencode-workflow-kit.git#v0.5.0

# Or install latest main branch
npm install https://github.com/pwarnock/opencode-workflow-kit.git
```

#### Option 3: Development Setup
```bash
# Clone for development
git clone https://github.com/pwarnock/opencode-workflow-kit.git
cd opencode-workflow-kit

# Setup development environment
just setup
just build
just test

# Use locally
node packages/liaison/bin/liaison.js --help
```

### Development Setup
#### Prerequisites
- **Just** - Modern task runner (recommended)
- **Bun** - Fast JavaScript runtime and package manager
- **uv** - Fast Python package manager
- **Node.js** 18+ and **Python** 3.11+

#### Development Commands
```bash
# Clone and setup
git clone https://github.com/pwarnock/opencode-workflow-kit.git
cd opencode-workflow-kit

# Setup environment (installs uv, bun, just)
just setup

# Build all packages
just build

# Run tests
just test
```

## 🛠️ Development Workflow

### Using Just Task Runner

Just provides a clean, cross-platform alternative to Make with better syntax and features.

```bash
# Core development commands
just setup          # Initialize development environment
just build          # Build all packages
just test            # Run all tests
just lint            # Lint all code
just format          # Format all code
just clean           # Clean build artifacts
just dev             # Start development mode

# Package-specific commands
just liaison-build     # Build liaison
just liaison-test      # Test liaison
just opencode-test   # Test opencode-config
```

### Traditional Setup

1. **Clone this repository**:
   ```bash
   git clone https://github.com/pwarnock/opencode-workflow-kit.git
   cd opencode-workflow-kit
   ```

2. **Set up the environment with uv**:
   ```bash
   uv sync
   ```

3. **Run the setup script**:
   ```bash
   ./setup.sh
   ```

## 🧪 Comprehensive Testing

### Test Categories

The project implements a comprehensive testing strategy:

1. **Unit Tests** - Fast, isolated component testing
2. **Integration Tests** - API and service interaction testing
3. **End-to-End Tests** - Full workflow testing
4. **BDD Tests** - Behavior-driven development testing
5. **Accessibility Tests** - WCAG compliance testing
6. **Security Tests** - Vulnerability scanning
7. **Performance Tests** - Load and performance testing
8. **Mutation Tests** - Code quality assurance

### Running Tests

```bash
# Run all tests
just test

# Test specific categories
just test:unit           # Unit tests only
just test:integration     # Integration tests only
just test:e2e           # End-to-end tests only
just test:bdd           # BDD tests only
just test:security       # Security tests only
just test:performance    # Performance tests only

# Package-specific tests
cd packages/liaison
just test:unit            # Unit tests for liaison
just test:integration      # Integration tests
just test:e2e             # E2E tests with Playwright
just test:bdd             # BDD tests with Cucumber
just test:a11y            # Accessibility tests
just test:mutation        # Mutation tests
```

## 🎯 Intuitive Workflow

### Dogfooding Made Simple

1. **Plan First**: Always start with planning
   ```bash
   /cody plan
   ```
   - Guided conversation to understand requirements
   - Automatic document generation
   - Proper task tracking integration

2. **Build Next**: Implement your planned features
   ```bash
   /cody build
   ```
   - Creates feature backlog
   - Sets up version structure
   - Generates task lists
   - Integrates with git automation

3. **Refresh Often**: Keep everything in sync
   ```bash
   /cody refresh
   ```
   - Updates project context
   - Syncs Beads issues
   - Validates configuration

### For New Projects - Quick Adoption

```bash
# Install in any project
npm install @pwarnock/cody-beads-integration

# Initialize
npx cody-beads init

# Follow the guided workflow
/cody plan
/cody build
/cody refresh
```

## 📦 Project Structure

```
liaison-toolkit/
├── packages/                    # Monorepo packages
│   ├── opencode_config/        # Python configuration package
│   └── liaison/                # TypeScript liaison package
├── config/                      # Configuration templates
├── schemas/                     # JSON schemas
├── templates/                   # Project templates
├── scripts/                     # Utility scripts
├── agents/                      # Agent configurations
├── .github/workflows/           # CI/CD pipelines
├── justfile                     # Root task runner
└── README.md                   # This file
```

## 🚀 Release Management

### Version Management

```bash
# Create releases (automatically handles version bumping, testing, publishing)
just release-patch       # v0.1.0 → v0.1.1
just release-minor       # v0.1.1 → v0.2.0
just release-major       # v0.2.0 → v1.0.0

# Manual version control
just version:add name features description  # Create new version
just version:build id                     # Build specific version
just version:remove id                   # Remove version
```

### Publishing

```bash
# Automated publishing
just publish             # Build, test, and publish all packages
just deploy               # Deploy to registries

# Manual publishing
just opencode-test       # Test Python package
just cody-test           # Test Node.js package
just deploy               # Deploy to PyPI and GitHub Packages
```

## 🌟 Features

- **🛠️ Modern Tooling**: Just task runner, Bun runtime, uv package manager
- **🏗️ Monorepo Architecture**: Multi-package project with Turborepo orchestration
- **🧪 Comprehensive Testing**: Unit, integration, E2E, BDD, security, accessibility testing
- **🔄 CI/CD Integration**: Automated testing, building, and deployment workflows
- **📋 Configuration Management**: Cascading config with validation and templates
- **🤖 AI-Driven Development**: Integration with Cody Product Builder Toolkit
- **🧱 Development Workflows**: Beads task management and synchronization
- **📊 Quality Assurance**: Code quality gates, mutation testing, performance analysis
- **🔒 Security First**: Vulnerability scanning, secret detection, security auditing
- **♿ Accessibility Compliant**: WCAG compliance and inclusive design
- **📈 Performance Optimized**: Fast builds, efficient testing, performance monitoring

## Overview

OpenCode Workflow Kit provides a modular, cross-platform system of specialized agents and automated workflows for AI-driven development. The framework supports both global and project-level settings with cascading configuration from project-specific to global defaults, enhanced with modern tooling and comprehensive testing.

## Features

- **Modular Structure**: Separate configurations for agents, MCP servers, and permissions
- **Cross-Platform Support**: Works seamlessly on macOS, Linux, and Windows
- **Cascading Configuration**: Project → Global → Defaults hierarchy
- **Shareable**: Easy to distribute and reuse configurations across teams
- **Validated**: JSON Schema validation ensures configuration integrity
- **:cody Integration**: Complete OpenCode commands and subagents for :cody workflows

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
   git clone https://github.com/pwarnock/opencode-workflow-kit.git
   cd opencode-workflow-kit
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
│   │   ├── agent/        # Agent settings
│   │   ├── mcp/          # MCP server configurations
│   │   └── permissions/  # Permission matrices
│   └── project/          # Project-level configurations (.opencode/)
│       └── .opencode/
├── schemas/              # JSON Schema validation files
├── examples/             # Example configurations
└── docs/                # Documentation
```

## :cody Integration

This package includes complete integration between OpenCode and :cody framework:

### Commands Available After Installation
- `/cody plan` - Execute :cody planning workflow
- `/cody build` - Execute :cody build workflow  
- `/cody version add` - Add new version
- `/cody version build` - Build specific version
- `/cody refresh` - Refresh project state

### Installation
```bash
# Install :cody integration
uv run python scripts/install-cody-integration.py

# Validate installation
uv run python scripts/validate-cody-integration.py
```

📖 **See [docs/CODY_INTEGRATION.md](docs/CODY_INTEGRATION.md) for complete documentation**

## Architecture

📊 **Agent Architecture Diagrams** - Visual representation of the enhanced agent system:

- **[Enhanced Agent Architecture](https://github.com/pwarnock/opencode-workflow-kit/blob/main/docs/ENHANCED_AGENT_ARCHITECTURE.md)** - Complete system overview with delegation patterns and governance
- **[Architecture Diagrams](https://github.com/pwarnock/opencode-workflow-kit/blob/main/docs/AGENT_ARCHITECTURE_DIAGRAM.md)** - Multiple diagram views including process flows and delegation matrices

These diagrams illustrate the specialized subagent system with proper separation of concerns, delegation patterns, and checks/balances governance model.

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
uv run python scripts/config-validator.py config/global/agent/default.json

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
│   │   ├── agent/       # Agent settings
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
uv run python scripts/config-validator.py config/global/agent/default.json

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

---

> **⚠️ ALPHA SOFTWARE - USE AT YOUR OWN RISK**
> 
> This is 100% vibe-coded alpha software. Expect breaking changes, bugs, and incomplete features. 
> Feedback and contributions welcome to help shape the development of this workflow kit.
> 
> **Status**: Early Development • **Stability**: Experimental • **Support**: Community-driven

## Support

For issues and questions:
- Open an issue on GitHub (feedback especially welcome!)
- Check documentation in `docs/`
- Review example configurations in `examples/`
- Report bugs and breaking issues to help improve alpha quality# Workflow trigger test
