# Usage Examples for Enhanced System

## Quick Start Examples

### Basic Setup
```bash
# Initialize a new project with web development template
cody-beads init --template web-development my-project

# Configure GitHub integration
cody-beads config set github.token YOUR_GITHUB_TOKEN
cody-beads config set github.owner your-username
cody-beads config set github.repo your-repo

# Configure Beads integration
cody-beads config set beads.projectPath ./beads-project
cody-beads config set sync.defaultDirection bidirectional

# Validate configuration
cody-beads config test

# Perform initial sync
cody-beads sync --dry-run
```

### Workflow Automation
```bash
# Create a workflow with file trigger
cody-beads workflow create --name "auto-sync" --trigger file --config '{"path": "./src", "events": ["change"]}' --action '{"type": "sync", "direction": "cody-to-beads"}'

# Create a scheduled workflow
cody-beads workflow create --name "daily-backup" --trigger schedule --config '{"cron": "0 2 * *", "timezone": "UTC"}' --action '{"type": "backup", "target": "./backup"}'

# Execute workflow manually
cody-beads workflow execute auto-sync

# List all workflows
cody-beads workflow list

# Enable workflow
cody-beads workflow enable auto-sync

# Disable workflow
cody-beads workflow disable daily-backup
```

### Plugin Management
```bash
# List available plugins
cody-beads plugin list

# Install a plugin from local source
cody-beads plugin install --name my-plugin --source ./plugins/my-plugin

# Install a plugin from remote source
cody-beads plugin install --name remote-plugin --source https://github.com/user/plugin

# Validate plugin security
cody-beads plugin validate --name my-plugin --security-level strict

# Enable plugin
cody-beads plugin enable my-plugin

# Disable plugin
cody-beads plugin disable my-plugin

# Uninstall plugin
cody-beads plugin uninstall my-plugin

# Update plugin trust level
cody-beads plugin trust my-plugin --level verified

# Get security report
cody-beads plugin security-report
```

### Template Management
```bash
# List available templates
cody-beads template list

# Apply a template
cody-beads template apply react-native ./my-react-app

# Apply template with dry run
cody-beads template apply vue-project ./my-vue-app --dry-run

# Validate template compatibility
cody-beads template validate web-development

# Create custom template
cody-beads template create --name my-template --source ./template-source --description "My custom template"
```

### Advanced Sync Operations
```bash
# Bidirectional sync with conflict resolution
cody-beads sync --direction bidirectional --conflict-resolution newer-wins

# One-way sync from Cody to Beads
cody-beads sync --direction cody-to-beads --since 2024-01-01

# Sync with batch processing
cody-beads sync --batch-size 100 --max-retries 3

# Sync with performance monitoring
cody-beads sync --monitor-resources --throughput-threshold 100

# Sync with data integrity verification
cody-beads sync --verify-integrity --checksum sha256

# Force sync (skip conflict resolution)
cody-beads sync --force --direction cody-to-beads
```

### Error Recovery
```bash
# Sync with automatic error recovery
cody-beads sync --auto-recover --max-retries 5

# Sync with specific retry delay
cody-beads sync --retry-delay 2000 --max-retries 3

# Simulate network failures with recovery
cody-beads sync --simulate-errors --auto-recover
```

### Performance Monitoring
```bash
# Run performance benchmarks
cody-beads benchmark --operations 1000 --concurrency 10

# Monitor system performance
cody-beads monitor --performance --interval 60

# Generate performance report
cody-beads performance-report --format json --output ./performance-report.json

# Stress test sync engine
cody-beads stress-test sync --operations 10000 --duration 300
```

### Security Operations
```bash
# Run security validation on all plugins
cody-beads security validate --all-plugins

# Scan for vulnerabilities
cody-beads security scan --vulnerabilities

# Update security policy
cody-beads security policy --require-signature true --sandbox-level strict

# Generate security report
cody-beads security report --format html --output ./security-report.html

# Enable security monitoring
cody-beads security monitor --alert-level high
```

### Interactive Help
```bash
# Start interactive help wizard
cody-beads help --wizard

# Search for specific commands
cody-beads help --search "sync configuration"

# Get contextual suggestions
cody-beads help --suggest

# Get help for specific command
cody-beads help sync

# Browse available commands
cody-beads help browse
```

### Configuration Management
```bash
# Show current configuration
cody-beads config show

# Set configuration value
cody-beads config set sync.conflictResolution manual

# Validate configuration
cody-beads config validate

# Reset configuration to defaults
cody-beads config reset

# Backup configuration
cody-beads config backup --output ./config-backup.json

# Restore configuration
cody-beads config restore --input ./config-backup.json
```

### Real-world Scenarios
```bash
# Complete development workflow setup
cody-beads init --template web-development my-app
cody-beads config set github.token $GITHUB_TOKEN
cody-beads config set beads.projectPath ./beads-project
cody-beads config test
cody-beads sync --dry-run
cody-beads workflow create --name "dev-sync" --trigger file --config '{"path": "./src", "events": ["change"]}' --action '{"type": "sync", "direction": "cody-to-beads"}'
cody-beads workflow enable dev-sync

# Handle sync conflicts
cody-beads sync --direction bidirectional
# When prompted for conflict resolution:
# 1. View conflict details
# 2. Choose resolution strategy:
#    - manual: Manually resolve each conflict
#    - cody-wins: Always use Cody version
#    - beads-wins: Always use Beads version
#    - newer-wins: Use most recently updated version
#    - auto: Let system choose best resolution

# Plugin development and security testing
cody-beads plugin create --name test-plugin --source ./test-plugin
cody-beads plugin validate --name test-plugin --security-level maximum
cody-beads plugin install --name test-plugin --source ./test-plugin
cody-beads security scan --name test-plugin
cody-beads plugin uninstall test-plugin
```

### Troubleshooting
```bash
# Diagnose sync issues
cody-beads diagnose --sync --verbose

# Check system health
cody-beads health --all

# Run comprehensive diagnostic
cody-beads diagnose --comprehensive

# Clear performance cache
cody-beads cache clear --performance

# Reset circuit breaker
cody-beads circuit-breaker reset

# Validate all configurations
cody-beads validate --all
```

## Advanced Examples

### Custom Workflow with Multiple Triggers
```json
{
  "name": "comprehensive-automation",
  "description": "Advanced workflow with multiple triggers and conditions",
  "triggers": [
    {
      "id": "file-trigger",
      "type": "file",
      "config": {
        "path": "./src",
        "events": ["change", "create", "delete"],
        "patterns": ["*.ts", "*.js"]
      },
      "enabled": true
    },
    {
      "id": "api-trigger",
      "type": "api",
      "config": {
        "url": "https://api.example.com/webhook",
        "method": "POST",
        "headers": {
          "Authorization": "Bearer $API_TOKEN",
          "Content-Type": "application/json"
        },
        "events": ["response.status", "response.error"]
      },
      "enabled": true
    },
    {
      "id": "schedule-trigger",
      "type": "schedule",
      "config": {
        "cron": "0 */6 * * *",
        "timezone": "America/New_York"
      },
      "enabled": true
    }
  ],
  "conditions": [
    {
      "type": "time",
      "operator": "greater_than",
      "value": "09:00",
      "description": "Only run during business hours"
    },
    {
      "type": "file_exists",
      "path": "./config/production.json",
      "description": "Only run if production config exists"
    }
  ],
  "actions": [
    {
      "id": "sync-action",
      "type": "sync",
      "config": {
        "direction": "bidirectional",
        "dryRun": false,
        "conflictResolution": "auto"
      },
      "retryPolicy": {
        "maxRetries": 3,
        "backoffMs": 1000
      }
    },
    {
      "id": "notification-action",
      "type": "notification",
      "config": {
        "channels": ["email", "slack"],
        "template": "Workflow executed: {{workflow.name}}",
        "email": {
          "to": ["dev-team@example.com"],
          "subject": "Workflow Notification: {{workflow.name}}"
        },
        "slack": {
          "webhook": "https://hooks.slack.com/services/T00000000/B00000000/CH00000000"
        }
      }
    }
  ]
}
```

### Plugin with Advanced Security
```json
{
  "name": "enterprise-plugin",
  "version": "2.0.0",
  "description": "Enterprise plugin with advanced security features",
  "permissions": [
    "file_read",
    "file_write",
    "network_access",
    "config_read",
    "system_execute"
  ],
  "capabilities": [
    "sync",
    "validate",
    "monitor",
    "security_scan"
  ],
  "signature": "digital-signature-v2",
  "trustLevel": "verified",
  "security": {
    "sandboxLevel": "maximum",
    "resourceLimits": {
      "maxMemory": "256MB",
      "maxCpu": "25%",
      "maxFileSize": "10MB",
      "maxNetworkRequests": 50
    },
    "allowedDomains": ["api.example.com", "trusted-partner.com"],
    "vulnerabilityScan": true,
    "auditLogging": true
  }
}
```

### Performance-Optimized Configuration
```json
{
  "version": "0.5.0",
  "github": {
    "token": "$GITHUB_TOKEN",
    "owner": "your-org",
    "repo": "your-repo",
    "apiUrl": "https://api.github.com",
    "timeout": 30000
  },
  "beads": {
    "projectPath": "./beads-project",
    "autoSync": true,
    "syncInterval": 300000
  },
  "sync": {
    "defaultDirection": "bidirectional",
    "conflictResolution": "newer-wins",
    "batchSize": 500,
    "maxRetries": 5,
    "retryDelay": 2000,
    "enableCompression": true,
    "enableMetrics": true
  },
  "performance": {
    "monitorResources": true,
    "throughputThreshold": 100,
    "memoryLimit": "512MB"
  },
  "messageBus": {
    "enableBatching": true,
    "batchSize": 100,
    "batchTimeout": 1000,
    "enableCompression": true,
    "maxQueueSize": 10000,
    "enableMetrics": true
  }
  }
}
```

These examples demonstrate the enhanced capabilities of the owk-qyf version, including improved reliability, performance, security, and user experience features.