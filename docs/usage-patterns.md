# Usage Patterns

This document describes common usage patterns and best practices for OpenCode Config.

## Common Scenarios

### 1. Development Team Setup

**Scenario**: A development team wants consistent opencode configurations across all members.

**Solution**: 
1. Create a shared repository with team configurations
2. Each member clones and sets up global configurations
3. Project-specific configs override team defaults when needed

**Implementation**:
```bash
# Team setup
git clone https://github.com/company/opencode-config.git
cp -r config/global/* ~/.opencode/

# Project override
cp config/project/.opencode ./my-project/
```

### 2. Multi-Language Development

**Scenario**: Developer works with multiple programming languages requiring different tool configurations.

**Solution**: Create language-specific agent configurations.

**Example - Python Project**:
```json
{
  "name": "python-dev",
  "settings": {
    "tools": {
      "enabled": ["read", "write", "edit", "bash", "task"],
      "disabled": []
    },
    "permissions": {
      "execute": ["python *", "pip *", "pytest *", "python -m *"]
    }
  },
  "project": {
    "type": "python",
    "buildCommand": "python -m build",
    "testCommand": "pytest",
    "lintCommand": "flake8"
  }
}
```

**Example - Node.js Project**:
```json
{
  "name": "nodejs-dev",
  "settings": {
    "permissions": {
      "execute": ["npm *", "yarn *", "node *", "npx *"]
    }
  },
  "project": {
    "type": "node",
    "buildCommand": "npm run build",
    "testCommand": "npm test",
    "lintCommand": "npm run lint"
  }
}
```

### 3. Security-Focused Development

**Scenario**: Working with sensitive code requiring strict access controls.

**Solution**: Implement restrictive permission matrices.

**Example**:
```json
{
  "rules": [
    {
      "name": "strict-read-access",
      "tools": ["read"],
      "patterns": ["src/**", "tests/**", "docs/**"],
      "action": "allow"
    },
    {
      "name": "restricted-write-access",
      "tools": ["write", "edit"],
      "patterns": ["src/**", "tests/**"],
      "action": "allow"
    },
    {
      "name": "no-system-access",
      "tools": ["bash"],
      "patterns": ["/etc/**", "/usr/**", "/bin/**", "/sbin/**"],
      "action": "deny"
    }
  ],
  "defaultAction": "deny"
}
```

### 4. Cross-Platform Development

**Scenario**: Development team uses different operating systems.

**Solution**: Use platform-specific configurations.

**Example**:
```json
{
  "platform": {
    "windows": {
      "shell": "powershell",
      "pathSeparator": "\\",
      "commands": {
        "listFiles": "Get-ChildItem",
        "copyFile": "Copy-Item"
      }
    },
    "macos": {
      "shell": "zsh",
      "pathSeparator": "/",
      "commands": {
        "listFiles": "ls -la",
        "copyFile": "cp"
      }
    },
    "linux": {
      "shell": "bash",
      "pathSeparator": "/",
      "commands": {
        "listFiles": "ls -la",
        "copyFile": "cp"
      }
    }
  }
}
```

## Configuration Patterns

### 1. Base Configuration with Extensions

Create a base configuration and extend it for specific use cases:

**Base Configuration** (`base.json`):
```json
{
  "name": "base",
  "settings": {
    "maxTokens": 4000,
    "temperature": 0.7,
    "tools": {
      "enabled": ["read", "write", "edit"],
      "disabled": []
    }
  }
}
```

**Extended Configuration** (`extended.json`):
```json
{
  "extends": "base.json",
  "settings": {
    "maxTokens": 6000,
    "tools": {
      "enabled": ["read", "write", "edit", "bash", "task"]
    }
  }
}
```

### 2. Environment-Specific Configurations

Different configurations for development, staging, and production:

**Development** (`dev.json`):
```json
{
  "name": "development",
  "settings": {
    "temperature": 0.8,
    "timeout": 300000,
    "permissions": {
      "execute": ["npm run dev", "npm test", "npm run lint"]
    }
  }
}
```

**Production** (`prod.json`):
```json
{
  "name": "production",
  "settings": {
    "temperature": 0.3,
    "timeout": 60000,
    "permissions": {
      "execute": ["npm run build", "npm run deploy"]
    }
  }
}
```

### 3. Role-Based Configurations

Different configurations based on team roles:

**Developer** (`developer.json`):
```json
{
  "name": "developer",
  "settings": {
    "tools": {
      "enabled": ["read", "write", "edit", "bash", "task", "glob", "grep"]
    }
  }
}
```

**Reviewer** (`reviewer.json`):
```json
{
  "name": "reviewer",
  "settings": {
    "tools": {
      "enabled": ["read", "grep", "task"],
      "disabled": ["write", "edit", "bash"]
    }
  }
}
```

## Integration Patterns

### 1. CI/CD Integration

Integrate with continuous integration pipelines:

```bash
#!/bin/bash
# ci-setup.sh

# Load CI-specific configuration
python scripts/config-loader.py --type agents --name ci --project-root .

# Validate configuration
python scripts/config-loader.py --validate

# Run tests with CI configuration
npm test
```

### 2. IDE Integration

Configure IDE-specific settings:

**VS Code** (`.vscode/settings.json`):
```json
{
  "opencode.config": "project",
  "opencode.agent": "vscode-integrated",
  "opencode.autoLoad": true
}
```

### 3. Docker Integration

Use configurations in Docker environments:

```dockerfile
FROM node:18

# Copy configurations
COPY config/global/.opencode /root/.opencode
COPY config/project/.opencode /app/.opencode

# Set working directory
WORKDIR /app

# Install dependencies
RUN npm install

# Validate configuration
RUN python scripts/config-loader.py --validate
```

## Migration Patterns

### 1. Gradual Migration

Migrate from existing configurations gradually:

1. **Phase 1**: Set up global configurations
2. **Phase 2**: Create project-specific overrides
3. **Phase 3**: Implement advanced features (MCP servers, custom permissions)
4. **Phase 4**: Optimize and fine-tune

### 2. A/B Testing

Test new configurations alongside existing ones:

```bash
# Test new configuration
python scripts/config-loader.py --type agents --name experimental

# Compare with existing
python scripts/config-loader.py --type agents --name current
```

### 3. Rollback Strategy

Maintain ability to rollback configuration changes:

```bash
# Backup current configuration
cp -r ~/.opencode ~/.opencode.backup.$(date +%Y%m%d)

# Apply new configuration
cp config/global/* ~/.opencode/

# Test and validate
python scripts/config-loader.py --validate

# Rollback if needed
cp -r ~/.opencode.backup.$(date +%Y%m%d)/* ~/.opencode/
```

## Performance Patterns

### 1. Lazy Loading

Load configurations only when needed:

```python
class LazyConfigLoader:
    def __init__(self):
        self._config = None
    
    def get_config(self, config_type, name):
        if self._config is None:
            self._config = self.load_config(config_type, name)
        return self._config
```

### 2. Configuration Caching

Cache loaded configurations for performance:

```python
import functools

@functools.lru_cache(maxsize=128)
def load_config_cached(config_type, config_name, project_root):
    loader = ConfigLoader(project_root)
    return loader.load_config(config_type, config_name)
```

### 3. Incremental Updates

Update only changed configuration sections:

```python
def update_config_incremental(config_type, config_name, updates):
    config = load_config(config_type, config_name)
    merged = deep_merge(config, updates)
    save_config(config_type, config_name, merged)
```

## Troubleshooting Patterns

### 1. Configuration Validation

Always validate before applying:

```bash
# Validate structure
python scripts/config-loader.py --validate

# Validate specific config
python scripts/config-loader.py --type agents --name myconfig --validate-only
```

### 2. Debug Logging

Enable debug logging for configuration loading:

```python
import logging

logging.basicConfig(level=logging.DEBUG)
loader = ConfigLoader()
config = loader.load_config('agents', 'default')
```

### 3. Configuration Diff

Compare configurations to identify differences:

```python
def diff_configs(config1, config2):
    """Compare two configurations and return differences."""
    differences = []
    # Implementation here
    return differences
```

## Best Practices Summary

1. **Start Simple**: Begin with basic configurations, add complexity as needed
2. **Document Changes**: Keep documentation updated with configuration changes
3. **Test Thoroughly**: Validate configurations in different environments
4. **Version Control**: Track configuration changes in version control
5. **Security First**: Implement restrictive permissions by default
6. **Platform Awareness**: Consider cross-platform compatibility
7. **Performance**: Cache and optimize configuration loading
8. **Backup Strategy**: Maintain backups of working configurations