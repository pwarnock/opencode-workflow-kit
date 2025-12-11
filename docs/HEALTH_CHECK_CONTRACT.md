# Health Check System Contract

This document defines the contract between health check components and consumers in the Liaison Toolkit.

## Overview

The health check system provides comprehensive monitoring of:
- Core environment (Python, Node.js, Bun, UV)
- Dependencies (TypeScript, package.json, Python deps)
- Sync status (Beads-Cody integration)
- Configuration (justfile, Just availability)
- Coordinator integration (liaison-coordinator health)

## JSON Contract

### Health Result Structure

Each component must return a `HealthResult` object:

```typescript
interface HealthResult {
  component: string;                    // Component identifier
  status: "healthy" | "degraded" | "unhealthy";
  score: number;                        // 0-100, higher is better
  details: Record<string, any>;          // Component-specific data
  issues: string[];                     // Human-readable issues
}
```

### Overall Health Structure

The complete health check returns an `OverallHealth` object:

```typescript
interface OverallHealth {
  timestamp: string;                     // ISO 8601 timestamp
  git_commit: string;                    // Git commit hash or "no-git"
  overall: "healthy" | "degraded" | "unhealthy";
  score: number;                         // Average of component scores
  execution: {
    mode: "parallel" | "sequential";
    duration_ms: number;
    cache_hit: boolean;
  };
  components: Record<string, HealthResult>; // All component results
  issues: string[];                      // Aggregated issues
  recommendations: string[];               // Actionable recommendations
  metadata: {
    components_checked: number;
    failed_components: number;
    cache_dir: string;
  };
}
```

## Component Contracts

### Core Component

Must check availability and versions of:
- Python (`python3 --version`)
- UV (`uv --version`)
- Node.js (`node --version`)
- Bun (`bun --version`)

**Details structure:**
```json
{
  "python": {"status": "healthy|unhealthy", "version": "string"},
  "uv": {"status": "healthy|unhealthy", "version": "string"},
  "node": {"status": "healthy|unhealthy", "version": "string"},
  "bun": {"status": "healthy|unhealthy", "version": "string"}
}
```

**Scoring:**
- Each missing tool: -25 points
- Base score: 100

### Dependencies Component

Must check:
- TypeScript availability (`npx tsc --version`)
- Package dependencies (`bun install --dry-run`)
- Python dependencies (`uv pip check`)

**Details structure:**
```json
{
  "typescript": {"status": "healthy|unhealthy", "version": "string"},
  "package_deps": {"status": "healthy|unhealthy", "message": "string"},
  "python_deps": {"status": "healthy|unhealthy|unknown", "message": "string"}
}
```

**Scoring:**
- TypeScript unavailable: -20 points
- Package deps broken: -30 points
- Python deps broken: -30 points
- Missing package.json: -20 points

### Sync Component

Must check:
- Sync state file (`.beads-cody-sync-state.json`)
- Last sync success status
- Sync age (warn if > 2 hours)
- Beads availability (`bd --version` or `bun x bd --version`)

**Details structure:**
```json
{
  "last_sync": "string",
  "last_success": boolean,
  "sync_status": "healthy|unhealthy|unknown",
  "beads": {"status": "healthy|unhealthy", "message": "string"}
}
```

**Scoring:**
- No sync state file: -50 points
- Last sync failed: -40 points
- Sync > 2 hours old: -20 points
- Beads unavailable: -30 points

### Configuration Component

Must check:
- justfile existence
- Just availability (`just --version`)

**Details structure:**
```json
{
  "justfile": {"status": "healthy|degraded|unhealthy", "message": "string"}
}
```

**Scoring:**
- justfile not found: -30 points
- Just not installed: -20 points

### Coordinator Component

Must check:
- Coordinator binary existence (`packages/liaison-coordinator/bin/liaison.js`)
- Coordinator health endpoint (`node ... liaison.js health --format=json`)

**Details structure:**
```json
{
  "coordinator_health": "healthy|unhealthy",
  "coordinator_data": object, // Raw coordinator response
  "error": "string" // Only if unhealthy
}
```

**Scoring:**
- Binary not found: -100 points
- Health check failed: -50 points
- Coordinator reports unhealthy: -30 points

## Failure Thresholds

Overall status is calculated as:
- **healthy**: 0 failed components
- **degraded**: 1-2 failed components
- **unhealthy**: 3+ failed components

## Caching Strategy

- **Cache key**: `health-{git_hash}-{git_timestamp}`
- **Cache duration**: 5 minutes
- **Invalidation**: Git commit changes
- **Cache location**: `/tmp/liaison-health` (configurable)

## CLI Interface

### Commands

```bash
# Full health check
just health

# Sequential execution
just health-precise

# Component-specific
just health-sync
just health-coordinator
just health-deps
just health-config

# Direct Python script
python3 scripts/health-check.py --format=json --component=all
```

### Options

- `--format`: `json` (default) or `text`
- `--component`: `all`, `core`, `deps`, `sync`, `config`, `coordinator`
- `--parallel`: Run checks in parallel (default)
- `--sequential`: Run checks sequentially
- `--cache-dir`: Cache directory (default: `/tmp/liaison-health`)
- `--verbose`: Show detailed output

## Integration Points

### Coordinator Integration

The coordinator must provide a health endpoint:

```bash
node packages/liaison-coordinator/bin/liaison.js health --format=json
```

**Expected response:**
```json
{
  "overall": "healthy|degraded|unhealthy",
  "components": {}, // Component-specific health data
  "timestamp": "ISO 8601 string"
}
```

**Important:** Must output ONLY JSON when `--format=json` is specified. No prefix text.

### Path Resolution

All health checks must run from project root, not subdirectories:
- Use `process.cwd().replace(/\/packages\/liaison$/, '')` to get project root
- Check files relative to project root
- Run commands with `cwd: projectRoot`

## Error Handling

### Command Execution

- Timeout: 10 seconds per command
- Graceful degradation on missing tools
- Detailed error messages in `issues` array
- Never throw exceptions for expected failures

### JSON Parsing

- Handle mixed output (text + JSON)
- Extract JSON from multi-line output
- Provide raw output in debug information

## Testing

### Unit Tests

Each component should have tests for:
- Healthy scenarios
- Missing dependencies
- Invalid configurations
- Network failures

### Integration Tests

Test complete health check scenarios:
- All components healthy
- Partial failures
- Complete failures
- Cache behavior

## Future Enhancements

### Self-Healing (Roadmap)

- Automated dependency installation
- Service restart capabilities
- Configuration auto-repair
- Sync conflict resolution

### Monitoring

- Prometheus metrics export
- Health trend analysis
- Alerting integration
- Dashboard visualization

## Versioning

This contract is versioned:
- **v1.0**: Initial specification
- **v1.1**: Added coordinator integration
- **v1.2**: Enhanced error handling

Changes to contract must maintain backward compatibility or increment major version.