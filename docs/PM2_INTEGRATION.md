# PM2 Integration for Beads Daemon

This document describes the PM2-based daemon management system implemented for opencode-workflow-kit.

## Overview

The project has been migrated from the default Beads background daemon to PM2-managed foreground daemon for better control, monitoring, and cross-platform compatibility.

## Architecture

### Components

1. **PM2 Process Manager** - Manages the Beads daemon lifecycle
2. **ecosystem.config.cjs** - PM2 configuration file
3. **Enhanced Scripts** - Python scripts for daemon management and health monitoring
4. **npm Scripts** - Convenient commands for daemon operations

### Benefits

- ✅ **Cross-platform compatibility** - Works on Windows, macOS, and Linux
- ✅ **Version consistency** - Eliminates CLI/daemon version mismatches
- ✅ **Process monitoring** - Memory limits, restart policies, health checks
- ✅ **Centralized logging** - Structured logs with rotation
- ✅ **Automation integration** - Seamless integration with existing automation

## Configuration

### ecosystem.config.cjs

```javascript
module.exports = {
  apps: [
    {
      name: 'beads-daemon',
      script: 'bd',
      args: 'daemon --start --foreground --interval 5s',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'development',
        BD_AUTO_START_DAEMON: 'true'
      },
      env_production: {
        NODE_ENV: 'production',
        BD_AUTO_START_DAEMON: 'true'
      },
      log_file: '.beads/pm2.log',
      out_file: '.beads/pm2-out.log',
      error_file: '.beads/pm2-error.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: false,
      kill_timeout: 5000,
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
```

## Usage

### NPM Scripts

```bash
# Start daemon
npm run daemon:start

# Stop daemon
npm run daemon:stop

# Restart daemon
npm run daemon:restart

# Check status
npm run daemon:status

# View logs
npm run daemon:logs

# Monitor with real-time dashboard
npm run daemon:monitor

# Health check
npm run daemon:health

# Cleanup (stop and remove)
npm run daemon:cleanup
```

### Python Scripts

#### pm2-beads-manager.py

Enhanced daemon management with comprehensive health checks:

```bash
# Start daemon
python3 scripts/pm2-beads-manager.py start

# Stop daemon
python3 scripts/pm2-beads-manager.py stop

# Restart daemon
python3 scripts/pm2-beads-manager.py restart

# Check status
python3 scripts/pm2-beads-manager.py status

# Comprehensive health check
python3 scripts/pm2-beads-manager.py health

# Get logs
python3 scripts/pm2-beads-manager.py logs 50
```

#### sync-monitor.py

Enhanced sync monitoring with PM2 integration:

```bash
# Basic health check
python3 scripts/sync-monitor.py

# Enhanced health check with daemon status
python3 scripts/sync-monitor.py --enhanced
```

#### pm2-migration.py

Migration script for transitioning from background daemon to PM2:

```bash
# Dry run analysis
python3 scripts/pm2-migration.py --dry-run

# Full migration
python3 scripts/pm2-migration.py

# Force migration (if old daemon won't stop)
python3 scripts/pm2-migration.py --force
```

## Migration Results

The migration from background daemon to PM2 was successful:

- ✅ Old daemon (v0.26.0) stopped
- ✅ Lock files cleaned up
- ✅ PM2 daemon (v0.28.0) started
- ✅ Version mismatch resolved
- ✅ Health monitoring operational
- ✅ Cross-platform compatibility achieved

## Health Monitoring

### Health Check Components

1. **PM2 Status** - Process status, PID, memory, CPU usage
2. **Beads Health** - Native Beads daemon health check
3. **Project Structure** - Configuration and file validation
4. **Version Info** - CLI and PM2 version tracking

### Health Report Format

```json
{
  "timestamp": "2025-12-02T13:55:40.185361",
  "overall_healthy": true,
  "pm2_status": {
    "running": true,
    "pid": 42744,
    "status": "online",
    "memory": "45.2mb",
    "cpu": "0.1%"
  },
  "beads_health": {
    "healthy": true,
    "output": "Health Check Summary: ..."
  },
  "project_structure": {
    "valid": true,
    "pm2_config_exists": true,
    "beads_dir_exists": true
  },
  "version_info": {
    "bd_version": "0.28.0",
    "pm2_version": "6.0.14"
  }
}
```

## Integration with Existing Automation

### Git Automation

The PM2-managed daemon integrates seamlessly with existing git automation:

- **Pre-commit hooks** - Continue to work with PM2 daemon
- **Event-driven sync** - Enhanced with better process reliability
- **Auto-commit workflows** - More reliable with process management

### Cody Integration

Cody PBT and Beads dual tracking system benefits from PM2:

- **Reliable sync** - Consistent daemon behavior
- **Better monitoring** - Health checks for system stability
- **Cross-platform development** - Consistent experience across platforms

## Troubleshooting

### Common Issues

1. **Daemon not starting**
   ```bash
   # Check PM2 configuration
   pm2 start ecosystem.config.cjs
   
   # Check logs
   pm2 logs beads-daemon
   ```

2. **Version mismatch**
   ```bash
   # Check versions
   bd --version
   pm2 --version
   
   # Restart daemon
   npm run daemon:restart
   ```

3. **Health check failures**
   ```bash
   # Comprehensive health check
   python3 scripts/pm2-beads-manager.py health
   
   # Check individual components
   bd daemons health
   pm2 status
   ```

### Recovery Procedures

1. **Daemon crash recovery**
   - PM2 auto-restarts (up to 10 times)
   - Manual restart: `npm run daemon:restart`

2. **Stale socket cleanup**
   - PM2 handles automatically
   - Manual cleanup: `pm2 delete beads-daemon`

3. **Complete reset**
   ```bash
   # Full cleanup and restart
   npm run daemon:cleanup
   npm run daemon:start
   ```

## Performance Considerations

### Memory Usage

- **PM2 overhead**: ~15-20MB base memory
- **Beads daemon**: ~5-10MB normal operation
- **Total**: ~25-30MB with PM2 management

### CPU Usage

- **Idle**: 0-0.1% CPU
- **Active sync**: 0.5-2% CPU during operations
- **Health checks**: Minimal impact

### Monitoring

PM2 provides built-in monitoring:

```bash
# Real-time monitoring
npm run daemon:monitor

# Log monitoring
npm run daemon:logs

# Status checking
npm run daemon:status
```

## Future Enhancements

### Potential Improvements

1. **Clustering** - Multiple daemon instances for high availability
2. **Load balancing** - Distribute work across instances
3. **Advanced monitoring** - Custom metrics and alerting
4. **Automated scaling** - Dynamic instance management

### Integration Opportunities

1. **Agent Mail** - Real-time multi-agent coordination
2. **Web UI** - beads-ui or bdui integration
3. **CI/CD** - Enhanced pipeline integration
4. **Multi-repo** - Support for complex project structures

## Security Considerations

### Process Isolation

- PM2 provides process isolation
- Separate log files prevent privilege escalation
- User permissions maintained

### Access Control

- Daemon runs as current user
- No elevated privileges required
- File permissions inherited from project

## Conclusion

The PM2 integration provides a robust, cross-platform solution for Beads daemon management with enhanced monitoring, reliability, and integration capabilities. This foundation supports the complex dual tracking system (Cody PBT + Beads) used by opencode-workflow-kit.