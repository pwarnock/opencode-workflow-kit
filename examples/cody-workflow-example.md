# Cody Workflow Example

This example demonstrates a complete :cody workflow using the OpenCode integration.

## Project Setup

First, set up a new project with cody integration:

```bash
# Create a new project directory
mkdir my-cody-project
cd my-cody-project

# Initialize with cody-enabled template
opencode-config apply web-development .

# Verify cody commands are available
ls .cody/command/
# Should show: build.md, cody.md, plan.md, refresh.md, version-add.md, version-build.md
```

## Complete Workflow Example

### 1. Planning Phase

Start by planning your project:

```bash
/cody plan
```

The cody-planner subagent will:
- Analyze your current project structure
- Run discovery phase to understand requirements
- Generate planning documents (PRD, roadmap, etc.)
- Create a project backlog

**Expected Output:**
```
🔍 Starting :cody planning workflow...
📊 Analyzing project state...
📋 Running discovery phase...
📄 Generated planning documents:
   - docs/PRD.md
   - docs/roadmap.md
   - docs/feature-backlog.md
✅ Planning complete. Ready for build phase.
```

### 2. Build Phase

Execute the build workflow:

```bash
/cody build
```

The cody-builder subagent will:
- Load the planning documents
- Execute implementation phase
- Generate code and documentation
- Run tests and validation

**Expected Output:**
```
🔨 Starting :cody build workflow...
📋 Loading plan from docs/PRD.md...
🏗️  Executing implementation phase...
📁 Created files:
   - src/main.js
   - src/components/
   - tests/
   - docs/api.md
✅ Build complete. All tests passing.
```

### 3. Version Management

Add a new version to your backlog:

```bash
/cody version-add
```

The cody-version-manager subagent will:
- Prompt for version details
- Add to feature backlog
- Set up version tracking

**Interactive Example:**
```
📦 Adding new version...
📝 Version name: v1.1.0
📋 Description: Add user authentication
🎯 Priority: 1 (High)
✅ Version v1.1.0 added to backlog.
```

Build the specific version:

```bash
/cody version-build
```

### 4. Refresh and Maintenance

Keep your project context updated:

```bash
/cody refresh
```

The cody-admin subagent will:
- Analyze current project state
- Update documentation with changes
- Synchronize version status
- Validate consistency

**Expected Output:**
```
🔄 Refreshing project context...
📊 Analyzing changes since last refresh...
📄 Updated 3 documentation files
🔄 Synchronized version status
✅ Project context refreshed successfully.
```

## Advanced Usage

### Custom Workflow Routing

Use the main `/cody` command for specific workflows:

```bash
# Direct workflow execution
/cody plan          # Same as /plan
/cody build         # Same as /build
/cody refresh       # Same as /refresh
/cody version-add   # Same as /version add
/cody version-build # Same as /version build
```

### Subagent Configuration

Each subagent can be customized by editing their configuration files:

```bash
# Customize the builder subagent
edit agents/cody-builder.json

# Add custom tools or permissions
{
  "tools": {
    "read": true,
    "write": true,
    "edit": true,
    "bash": true,
    "webfetch": true,
    "grep": true,
    "glob": true,
    "list": true,
    "patch": true,
    "todowrite": true,
    "todoread": true,
    "custom_tool": true  # Add your custom tool
  }
}
```

## Integration with Existing Tools

The cody integration works seamlessly with existing OpenCode tools:

### Git Integration

```bash
# Plan your changes
/cody plan

# Implement the changes
/cody build

# Commit the results
git add .
git commit -m "Implement planned features via /cody build"
```

### Testing Integration

```bash
# Build with tests
/cody build

# Run additional tests
npm test

# Refresh documentation with test results
/cody refresh
```

### MCP Server Integration

The cody subagents work with MCP servers for enhanced capabilities:

```json
{
  "servers": {
    "filesystem": {
      "enabled": true,
      "command": ["npx", "@modelcontextprotocol/server-filesystem", "."]
    },
    "git": {
      "enabled": true,
      "command": ["npx", "@modelcontextprotocol/server-git", "--repository", "."]
    }
  }
}
```

## Troubleshooting

### Common Issues and Solutions

1. **Command not found**
   ```bash
   # Check if commands exist
   ls .cody/command/
   
   # Reinstall template if needed
   opencode-config apply web-development .
   ```

2. **Subagent validation errors**
   ```bash
   # Validate subagent configurations
   uv run python scripts/config-validator.py agents/
   ```

3. **Context not preserved**
   ```bash
   # Refresh context manually
   /cody refresh
   ```

### Debug Mode

Enable verbose logging for troubleshooting:

```bash
# Set environment variable
export OPENCODE_DEBUG=1

# Run cody command with debug output
/cody plan
```

## Best Practices

1. **Always plan before building**: Use `/cody plan` to understand requirements
2. **Regular refreshes**: Run `/cody refresh` after major changes
3. **Version management**: Use `/cody version-add` for feature tracking
4. **Validation**: Regularly run configuration validation
5. **Documentation**: Keep documentation updated with `/cody refresh`

## Next Steps

- Explore the [Cody Integration Documentation](../docs/CODY_INTEGRATION.md)
- Check out [Template Examples](../templates/)
- Review [Schema Documentation](../schemas/README.md)
- Run [Integration Tests](../scripts/test-compatibility.py)