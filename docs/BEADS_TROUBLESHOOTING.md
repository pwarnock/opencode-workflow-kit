# Beads Integration Troubleshooting Guide

This guide helps you diagnose and resolve common issues with Beads integration in Liaison.

## 🔍 Common Issues & Solutions

### 1. Beads Binary Not Found

#### Error Message
```
Error: bd binary not found at /path/to/node_modules/@beads/bd/bin/bd
This may indicate that the postinstall script failed to download the binary.
Platform: darwin, Architecture: arm64
```

#### Causes
- Postinstall script didn't run properly
- Network issues during installation
- Platform-specific binary not available
- Permission issues

#### Solutions

##### Solution 1: Reinstall Dependencies
```bash
# Clean install
rm -rf node_modules package-lock.json bun.lock
bun install

# Or with npm
rm -rf node_modules package-lock.json
npm install
```

##### Solution 2: Manual Postinstall
```bash
# Navigate to beads package
cd node_modules/@beads/bd

# Run postinstall manually
npm run postinstall

# Or if using bun
bun run postinstall
```

##### Solution 3: Clear npm/bun Cache
```bash
# Clear bun cache
bun pm cache rm

# Clear npm cache
npm cache clean --force

# Reinstall
bun install
```

##### Solution 4: Check Permissions
```bash
# Ensure node_modules has correct permissions
chmod -R 755 node_modules

# Check if binary is executable
ls -la node_modules/@beads/bd/bin/bd
```

### 2. Beads Command Fails

#### Error Message
```
Failed to create task: Error: bd command failed with code 1
```

#### Causes
- Beads daemon not running
- Invalid Beads project
- Configuration issues
- Permission problems

#### Solutions

##### Solution 1: Check Beads Daemon
```bash
# Check if daemon is running
bd daemons status

# Start daemon if needed
bd daemons start

# Check daemon health
bd daemons health
```

##### Solution 2: Initialize Beads Project
```bash
# Initialize beads in current directory
bd init

# Or specify project path
bd init --path ./my-project
```

##### Solution 3: Verify Beads Configuration
```bash
# Check beads configuration
bd config show

# Test beads connection
bd config test
```

### 3. Task Creation Fails

#### Error Message
```
liaison task create --title "Test" --description "Test task"
Failed to create task: Error: Beads project not found
```

#### Causes
- No Beads project in current directory
- Beads not initialized
- Wrong project path in configuration

#### Solutions

##### Solution 1: Initialize Beads Project
```bash
# In your project directory
bd init

# Verify initialization
ls -la .beads/
```

##### Solution 2: Update Configuration
```bash
# Update cody-beads.config.json
{
  "beads": {
    "projectPath": "./correct-path",
    "autoSync": false,
    "syncInterval": 60
  }
}
```

##### Solution 3: Check Project Path
```bash
# Verify beads project exists
ls -la ./path/to/beads/project/.beads/

# Test beads commands in project directory
cd ./path/to/beads/project
bd list
```

### 4. Sync Issues

#### Error Message
```
liaison sync
Error: Beads integration not available
```

#### Causes
- Beads not installed
- Configuration issues
- Network connectivity problems

#### Solutions

##### Solution 1: Verify Installation
```bash
# Check if beads is available
which bd
bd --version

# Test beads functionality
bd list
```

##### Solution 2: Test Configuration
```bash
# Test liaison configuration
liaison config test

# Check beads-specific config
liaison config test --component beads
```

##### Solution 3: Manual Sync Test
```bash
# Test beads manually
bd list
bd sync

# Test GitHub connection
gh repo list
```

## 🔧 Diagnostic Commands

### Basic Health Check
```bash
# 1. Check Liaison installation
liaison --version
liaison --help

# 2. Check Beads installation
which bd
bd --version

# 3. Check configuration
liaison config show
liaison config test

# 4. Check Beads daemon
bd daemons status
bd daemons health
```

### Detailed Diagnostics
```bash
# Enable debug logging
export DEBUG=liaison:*
export DEBUG=beads:*

# Run with verbose output
liaison --verbose task create --title "Test"
liaison --verbose sync --dry-run

# Check system info
liaison debug --report
```

### Network and Permissions
```bash
# Check network connectivity
curl -I https://api.github.com
curl -I https://api.cody.ai

# Check file permissions
ls -la node_modules/@beads/bd/bin/
ls -la .beads/

# Check daemon processes
ps aux | grep bd
pm2 status
```

## 🛠️ Platform-Specific Issues

### macOS (Darwin)

#### Issue: Binary Not Executable
```bash
# Fix permissions
chmod +x node_modules/@beads/bd/bin/bd

# Or reinstall with proper permissions
sudo bun install
```

#### Issue: Gatekeeper Blocking
```bash
# Allow binary to run
xattr -d com.apple.quarantine node_modules/@beads/bd/bin/bd

# Or allow in System Preferences
# Security & Privacy → General → Allow Anyway
```

### Linux

#### Issue: Missing Dependencies
```bash
# Install required system packages
sudo apt-get update
sudo apt-get install -y build-essential libssl-dev

# For RHEL/CentOS
sudo yum install -y gcc gcc-c++ make openssl-devel
```

#### Issue: Permission Denied
```bash
# Fix ownership
sudo chown -R $USER:$USER node_modules/

# Or use nvm for proper node setup
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
```

### Windows

#### Issue: Path Too Long
```bash
# Use Windows PowerShell with proper path handling
# Enable long path support in registry or group policy
# Or use shorter project paths
```

#### Issue: PowerShell Execution Policy
```powershell
# Set execution policy
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Or run with bypass
powershell -ExecutionPolicy Bypass -File script.ps1
```

## 📋 Troubleshooting Checklist

### Before Starting
- [ ] Node.js version >= 18.0.0
- [ ] Bun or npm installed
- [ ] Git configured
- [ ] Network connectivity

### Installation Issues
- [ ] Cleared package manager cache
- [ ] Removed node_modules completely
- [ ] Reinstalled dependencies
- [ ] Checked file permissions
- [ ] Verified binary exists

### Configuration Issues
- [ ] Run `liaison config test`
- [ ] Check environment variables
- [ ] Verify file paths exist
- [ ] Test individual components

### Runtime Issues
- [ ] Check daemon status
- [ ] Enable debug logging
- [ ] Test with verbose output
- [ ] Check system resources

### Network Issues
- [ ] Test internet connectivity
- [ ] Check firewall settings
- [ ] Verify API tokens
- [ ] Test with different network

## 🚨 Emergency Procedures

### Complete Reset
```bash
# 1. Backup configuration
cp cody-beads.config.json config.backup.json

# 2. Remove all node_modules
rm -rf node_modules
rm -rf package-lock.json bun.lock

# 3. Clear caches
bun pm cache rm
npm cache clean --force

# 4. Fresh install
bun install

# 5. Reconfigure
liaison config setup

# 6. Test
liaison config test
```

### Manual Beads Setup
```bash
# 1. Install beads globally
npm install -g @beads/bd

# 2. Initialize project
bd init

# 3. Configure liaison to use global beads
# Edit cody-beads.config.json:
{
  "beads": {
    "useGlobal": true,
    "autoSync": false,
    "syncInterval": 60
  }
}
```

### Fallback to Mock Mode
```bash
# If beads integration fails, use mock mode for testing
export LIAISON_MOCK_BEADS=true
liaison task create --title "Test" --description "Mock task"
```

## 📚 Additional Resources

### Documentation
- [Beads Official Documentation](https://docs.beads.dev)
- [Liaison README](../packages/liaison/README.md)
- [Migration Guide](./MIGRATION_GUIDE_v0.6.0.md)

### Community Support
- [GitHub Issues](https://github.com/pwarnock/opencode-workflow-kit/issues)
- [Discussions](https://github.com/pwarnock/opencode-workflow-kit/discussions)
- [Beads Community](https://community.beads.dev)

### Debug Tools
- [Node.js Debugging](https://nodejs.org/en/docs/guides/debugging-getting-started/)
- [Bun Debugging](https://bun.sh/docs/debug)
- [Chrome DevTools](https://developer.chrome.com/docs/devtools/)

## 🆘 Getting Help

If you're still stuck:

1. **Collect Debug Information**:
   ```bash
   liaison debug --report > debug-report.txt
   ```

2. **Create Issue with**:
   - Liaison version: `liaison --version`
   - Beads version: `bd --version`
   - Platform: `uname -a`
   - Error messages
   - Steps to reproduce
   - Debug report

3. **Join Community**:
   - GitHub Discussions for general questions
   - Issues for bug reports
   - Discord/Slack for real-time help

Remember: Beads integration is complex, and issues are normal. The community is here to help! 🤝