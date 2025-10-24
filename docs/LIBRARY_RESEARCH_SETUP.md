# Library Research Setup Guide

This guide covers the setup and usage of the library research functionality with Context7 integration.

## Overview

The library research system provides:
- **Library Researcher Agent**: Specialized agent for documentation research
- **Context7 Integration**: MCP server for library documentation access
- **Environment Management**: Secure API key handling and validation
- **Research Templates**: Pre-configured templates for common research scenarios

## Quick Start

### 1. Environment Setup

```bash
# Setup environment with Context7 API key
uv run python scripts/environment-manager.py setup --api-key your_api_key_here

# Validate environment configuration
uv run python scripts/environment-manager.py validate
```

### 2. Use Library Research Template

```bash
# Apply library research template to project
uv run python scripts/environment-templates.py apply library-research ./my-project

# Validate configuration
uv run python scripts/config-validator.py templates/agents/library-researcher.json
```

### 3. Test Integration

```bash
# Run compatibility tests
uv run python scripts/test-compatibility.py

# Test environment templates
uv run python scripts/template-validation-suite.py
```

## Configuration

### Library Researcher Agent

The library researcher agent (`templates/agents/library-researcher.json`) includes:

- **Read-only access** for safe research operations
- **Context7 tools** for library documentation retrieval
- **Web fetch** for additional documentation sources
- **Conservative behavior** with confirmation requirements

### Context7 MCP Server

Configuration in `opencode.json`:
```json
{
  "mcp_servers": {
    "context7": {
      "command": "npx",
      "args": ["@context7/mcp-server"],
      "env": {
        "CONTEXT7_API_KEY": "${CONTEXT7_API_KEY}"
      }
    }
  }
}
```

### Environment Variables

Required environment variables:
- `CONTEXT7_API_KEY`: Your Context7 API key
- `OPENCODE_CONTEXT`: Set to "library-research"
- `CODY_MODE`: Set to "researcher"

## Usage Patterns

### API Documentation Research

```bash
# Start library research session
export OPENCODE_CONTEXT=library-research
export CODY_MODE=researcher

# Research specific library
# (Context7 tools will be available in the agent)
```

### Integration Examples

The library researcher can:
- Resolve library IDs using `context7_resolve_library_id`
- Fetch documentation using `context7_get_library_docs`
- Search code examples with `grep` and `glob`
- Access web documentation with `webfetch`

### Template Customization

Create custom research templates by modifying `templates/library-research.json`:
```json
{
  "configurations": {
    "agents/library-researcher.json": { ... },
    "mcp/context7.json": { ... }
  },
  "research_patterns": {
    "api_documentation": { ... },
    "integration_examples": { ... },
    "version_compatibility": { ... }
  }
}
```

## Security

### API Key Management

- API keys are stored in `.env` file (not committed to git)
- Environment validation ensures proper key format
- Keys are masked in logs and status output
- Template uses `${CONTEXT7_API_KEY}` variable reference

### Agent Permissions

Library researcher agent has:
- **Read-only file system access**
- **No write permissions**
- **No execute permissions**
- **Restricted path access**
- **Secret scanning enabled**

## Troubleshooting

### Common Issues

1. **Missing Context7 API Key**
   ```bash
   uv run python scripts/environment-manager.py setup --api-key your_key
   ```

2. **Template Validation Failures**
   ```bash
   uv run python scripts/config-validator.py templates/agents/library-researcher.json
   ```

3. **MCP Server Connection Issues**
   - Verify Context7 API key is valid
   - Check network connectivity
   - Ensure `npx` is available

### Debug Commands

```bash
# Check environment status
uv run python scripts/environment-manager.py status

# Validate all configurations
uv run python scripts/config-validator.py config/

# Run full test suite
uv run python scripts/test-compatibility.py
```

## Integration with Cody

The library research system integrates with `:cody` commands:

- `:cody build`: Uses library researcher for documentation tasks
- `:cody plan`: Can include library research steps
- `:cody refresh`: Updates library documentation cache

## Examples

### Research React Library

```bash
# Set environment
export CONTEXT7_API_KEY=your_key
export OPENCODE_CONTEXT=library-research

# Start research session
# Agent will have Context7 tools available
# Use context7_resolve_library_id to find React
# Use context7_get_library_docs to fetch documentation
```

### Version Compatibility Research

The library researcher can:
- Compare documentation across versions
- Identify breaking changes
- Find migration guides
- Extract compatibility matrices

## Support

For issues with:
- **Environment setup**: Check `scripts/environment-manager.py`
- **Configuration validation**: Use `scripts/config-validator.py`
- **Template issues**: Run `scripts/template-validation-suite.py`
- **General problems**: Use `scripts/test-compatibility.py`