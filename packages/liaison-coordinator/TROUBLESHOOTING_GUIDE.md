# Cody-Beads Troubleshooting Guide

This guide provides solutions to common issues encountered when using the Cody-Beads integration package.

## Table of Contents
- [Installation Issues](#installation-issues)
- [Configuration Problems](#configuration-problems)
- [Authentication Errors](#authentication-errors)
- [Sync Failures](#sync-failures)
- [Conflict Resolution Issues](#conflict-resolution-issues)
- [Performance Problems](#performance-problems)
- [CLI Errors](#cli-errors)
- [Advanced Troubleshooting](#advanced-troubleshooting)

## Installation Issues

### Error: "Command not found" after installation
**Symptoms**: `liaison` command not recognized after installation

**Solutions**:
1. **Check global installation**:
   ```bash
   npm list -g @pwarnock/liaison
   ```

2. **Verify PATH environment variable**:
   ```bash
   echo $PATH
   ```

3. **Reinstall with proper permissions**:
   ```bash
   sudo npm install -g @pwarnock/liaison
   ```

4. **Check Node.js installation**:
   ```bash
   node -v
   npm -v
   ```

### Error: "Permission denied" during installation
**Symptoms**: Installation fails with permission errors

**Solutions**:
1. **Use sudo (Linux/macOS)**:
   ```bash
   sudo npm install -g @pwarnock/liaison
   ```

2. **Fix npm permissions**:
   ```bash
   sudo chown -R $USER /usr/local/lib/node_modules
   ```

3. **Use --prefix option**:
   ```bash
   npm install -g @pwarnock/liaison --prefix ~/.npm-global
   ```

4. **Use nvm for Node.js management**:
   ```bash
   nvm install --lts
   nvm use --lts
   ```

## Configuration Problems

### Error: "Invalid configuration schema"
**Symptoms**: Configuration validation fails

**Solutions**:
1. **Validate configuration manually**:
   ```bash
   liaison config validate
   ```

2. **Use interactive setup**:
   ```bash
   liaison config setup
   ```

3. **Check required fields**:
   ```json
   {
     "github": {
       "owner": "required",
       "repo": "required",
       "token": "required"
     },
     "beads": {
       "projectPath": "required"
     }
   }
   ```

4. **Reset to default configuration**:
   ```bash
   liaison config reset
   ```

### Error: "Configuration file not found"
**Symptoms**: System cannot locate configuration file

**Solutions**:
1. **Specify configuration file path**:
   ```bash
   liaison --config ./custom-config.json sync
   ```

2. **Create default configuration**:
   ```bash
   liaison config init
   ```

3. **Check current directory**:
   ```bash
   pwd
   ls -la
   ```

4. **Set environment variable**:
   ```bash
   export CODY_BEADS_CONFIG=./path/to/config.json
   ```

## Authentication Errors

### Error: "GitHub authentication failed"
**Symptoms**: GitHub API calls fail with authentication errors

**Solutions**:
1. **Test GitHub token**:
   ```bash
   liaison config test
   ```

2. **Verify token permissions**:
   - Token should have: `repo`, `read:org`, `write:org` scopes
   - Check token at: https://github.com/settings/tokens

3. **Regenerate token**:
   ```bash
   liaison config set github.token "new-token"
   ```

4. **Check rate limits**:
   ```bash
   liaison status
   ```

### Error: "Beads authentication failed"
**Symptoms**: Beads API calls fail with authentication errors

**Solutions**:
1. **Verify Beads project path**:
   ```bash
   liaison config show
   ```

2. **Check file permissions**:
   ```bash
   ls -la .beads/
   chmod -R 755 .beads/
   ```

3. **Reinitialize Beads project**:
   ```bash
   liaison beads init
   ```

4. **Check Beads configuration**:
   ```bash
   cat .beads/beads.json
   ```

## Sync Failures

### Error: "Sync operation timed out"
**Symptoms**: Sync operations fail due to timeout

**Solutions**:
1. **Increase timeout settings**:
   ```bash
   liaison config set github.timeout 60000
   liaison config set cody.timeout 60000
   ```

2. **Reduce sync scope**:
   ```bash
   liaison sync --since 2024-01-01
   ```

3. **Use smaller batches**:
   ```bash
   liaison config set performance.batchSize 25
   ```

4. **Check network connectivity**:
   ```bash
   ping api.github.com
   traceroute api.github.com
   ```

### Error: "Too many conflicts detected"
**Symptoms**: Sync fails due to excessive conflicts

**Solutions**:
1. **Preview conflicts first**:
   ```bash
   liaison sync --dry-run
   ```

2. **Change conflict resolution strategy**:
   ```bash
   liaison config set sync.conflictResolution auto-merge
   ```

3. **Force sync (use with caution)**:
   ```bash
   liaison sync --force
   ```

4. **Resolve conflicts manually**:
   ```bash
   liaison config set sync.conflictResolution manual
   liaison sync
   ```

## Conflict Resolution Issues

### Error: "Auto-merge failed"
**Symptoms**: Auto-merge conflict resolution fails

**Solutions**:
1. **Fallback to manual resolution**:
   ```bash
   liaison config set sync.conflictResolution manual
   ```

2. **Check conflict details**:
   ```bash
   liaison sync --dry-run --verbose
   ```

3. **Use priority-based resolution**:
   ```bash
   liaison config set sync.conflictResolution priority-based
   ```

4. **Review conflicting items**:
   ```bash
   liaison beads list --conflicts
   liaison github list --conflicts
   ```

### Error: "Priority-based resolution failed"
**Symptoms**: Priority-based conflict resolution fails

**Solutions**:
1. **Verify label configuration**:
   ```bash
   liaison config show
   ```

2. **Check label consistency**:
   ```bash
   liaison beads labels
   liaison github labels
   ```

3. **Fallback to timestamp resolution**:
   ```bash
   liaison config set sync.conflictResolution newer-wins
   ```

4. **Review priority labels**:
   ```bash
   liaison config set sync.includeLabels "priority:high,priority:critical,blocker"
   ```

## Performance Problems

### Error: "Sync operation too slow"
**Symptoms**: Sync operations take too long to complete

**Solutions**:
1. **Enable performance monitoring**:
   ```bash
   liaison config set monitoring.enabled true
   ```

2. **Optimize batch size**:
   ```bash
   liaison config set performance.batchSize 20
   liaison config set performance.concurrency 3
   ```

3. **Enable caching**:
   ```bash
   liaison config set performance.caching true
   ```

4. **Check system resources**:
   ```bash
   top
   free -m
   df -h
   ```

### Error: "Memory usage too high"
**Symptoms**: High memory consumption during sync

**Solutions**:
1. **Reduce cache size**:
   ```bash
   liaison config set performance.cacheSize 500
   ```

2. **Limit concurrent operations**:
   ```bash
   liaison config set performance.concurrency 2
   ```

3. **Enable garbage collection**:
   ```bash
   liaison config set performance.gcInterval 300
   ```

4. **Monitor memory usage**:
   ```bash
   liaison status --memory
   ```

## CLI Errors

### Error: "Unknown command"
**Symptoms**: CLI command not recognized

**Solutions**:
1. **Check available commands**:
   ```bash
   liaison --help
   ```

2. **Update to latest version**:
   ```bash
   npm update -g @pwarnock/liaison
   ```

3. **Check command spelling**:
   ```bash
   liaison help wizard
   ```

4. **Verify installation**:
   ```bash
   liaison --version
   ```

### Error: "Command arguments invalid"
**Symptoms**: Invalid arguments provided to command

**Solutions**:
1. **Check command help**:
   ```bash
   liaison help sync
   ```

2. **Use interactive mode**:
   ```bash
   liaison sync --interactive
   ```

3. **Validate arguments**:
   ```bash
   liaison config validate
   ```

4. **Check examples**:
   ```bash
   liaison examples
   ```

## Advanced Troubleshooting

### Debugging Sync Operations
```bash
# Enable verbose logging
liaison config set logging.level debug

# Run sync with verbose output
liaison sync --verbose

# Check detailed logs
liaison logs --tail 100

# Export logs for analysis
liaison logs --export debug-logs.txt
```

### Network Diagnostics
```bash
# Test GitHub connectivity
liaison network test github

# Test Beads connectivity
liaison network test beads

# Check API endpoints
liaison network endpoints

# Test proxy settings
liaison network proxy
```

### Performance Profiling
```bash
# Enable performance profiling
liaison config set profiling.enabled true

# Run profiled sync
liaison sync --profile

# Analyze performance data
liaison profile analyze

# Export performance report
liaison profile export
```

### Configuration Diagnostics
```bash
# Validate configuration
liaison config validate --strict

# Check configuration compatibility
liaison config compatibility

# Test configuration
liaison config test --thorough

# Export configuration for review
liaison config export
```

## Common Error Patterns and Solutions

### Pattern: Rate Limiting Errors
**Symptoms**: `429 Too Many Requests` errors

**Solutions**:
1. **Increase retry delay**:
   ```bash
   liaison config set github.retryDelay 5000
   ```

2. **Implement exponential backoff**:
   ```bash
   liaison config set performance.backoff true
   ```

3. **Check rate limit status**:
   ```bash
   liaison status --rate-limits
   ```

4. **Use multiple tokens**:
   ```bash
   liaison config set github.tokenRotation true
   ```

### Pattern: Data Consistency Issues
**Symptoms**: Inconsistent data between systems

**Solutions**:
1. **Force full resync**:
   ```bash
   liaison sync --force --full
   ```

2. **Validate data integrity**:
   ```bash
   liaison validate --integrity
   ```

3. **Check sync history**:
   ```bash
   liaison history --last 10
   ```

4. **Manual data reconciliation**:
   ```bash
   liaison reconcile --manual
   ```

### Pattern: Plugin Compatibility Issues
**Symptoms**: Plugin-related errors during operations

**Solutions**:
1. **Check plugin compatibility**:
   ```bash
   liaison plugin compatibility
   ```

2. **Update plugins**:
   ```bash
   liaison plugin update --all
   ```

3. **Disable problematic plugins**:
   ```bash
   liaison plugin disable problematic-plugin
   ```

4. **Check plugin logs**:
   ```bash
   liaison plugin logs
   ```

## Support and Resources

### Getting Help
```bash
# Interactive help wizard
liaison help wizard

# Search help topics
liaison help --search "sync issues"

# List all commands
liaison help --list

# Get specific command help
liaison help sync
```

### Community Resources
- **GitHub Issues**: https://github.com/pwarnock/liaison-toolkit/issues
- **Documentation**: https://github.com/pwarnock/liaison-toolkit/tree/main/packages/liaison/docs
- **Discussions**: https://github.com/pwarnock/liaison-toolkit/discussions
- **Slack Community**: #liaison on OpenCode Workspace

### Reporting Issues
```bash
# Create diagnostic report
liaison diagnostics create

# Export system information
liaison system export

# Generate support bundle
liaison support bundle

# Submit issue template
liaison issue template
```

This troubleshooting guide provides comprehensive solutions to common and advanced issues encountered when using the Cody-Beads integration package. For additional assistance, refer to the API documentation and community resources.