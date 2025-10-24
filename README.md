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

### Quick Start

1. Clone this repository:
   ```bash
   git clone https://github.com/your-username/opencode-config.git
   cd opencode-config
   ```

2. Run the setup script:
   ```bash
   ./setup.sh
   ```

### Manual Setup

1. Copy global configurations to `~/.opencode/`:
   ```bash
   cp -r config/global/* ~/.opencode/
   ```

2. For project-specific usage, copy project configurations:
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

### Global Configuration

Global configurations are stored in `~/.opencode/` and apply to all opencode sessions unless overridden by project-specific settings.

### Project Configuration

Project-specific configurations are stored in `.opencode/` directory in your project root and override global settings.

### Configuration Hierarchy

1. **Project-level** (`.opencode/`) - Highest priority
2. **Global** (`~/.opencode/`) - Medium priority  
3. **Defaults** - Built-in defaults - Lowest priority

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
- Open an issue on GitHub
- Check the documentation in `docs/`
- Review example configurations in `examples/`