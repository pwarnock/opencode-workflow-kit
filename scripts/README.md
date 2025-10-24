# Configuration Scripts

This directory contains utility scripts for managing opencode configurations.

## config-loader.py

A Python utility that handles the cascading configuration system (project → global → defaults).

### Usage

```bash
# Load agent configuration
python scripts/config-loader.py --type agents --name default

# Load project-specific configuration
python scripts/config-loader.py --type agents --name project --project-root /path/to/project

# Validate configuration structure
python scripts/config-loader.py --validate
```

### Features

- **Cascading Inheritance**: Merges configurations from multiple sources
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **Validation**: Checks configuration structure and reports issues
- **CLI Interface**: Command-line tool for easy integration

### Configuration Hierarchy

1. **Project-level** (`.opencode/`) - Highest priority
2. **Global** (`~/.opencode/`) - Medium priority  
3. **Defaults** - Built-in defaults - Lowest priority