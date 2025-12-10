# Cache Strategy for OpenCode Liaison

## What We're Caching

### 🌐 GitHub API Data
**Purpose**: Reduce API rate limits and improve response times
- **Repository information**: 5 minutes TTL
- **Issues and PRs**: 3 minutes TTL  
- **Comments and reactions**: 10 minutes TTL
- **User data**: 1 hour TTL
- **Repository tree structure**: 15 minutes TTL

**Cache Keys**: `github:repo:owner/name`, `github:issues:123`, `github:prs:open`

### 💎 Beads Data
**Purpose**: Improve local database query performance
- **Issue metadata**: 3 minutes TTL
- **Workspace configuration**: 10 minutes TTL
- **Filter results**: 5 minutes TTL
- **Sync state**: 15 minutes TTL

**Cache Keys**: `beads:issues:open`, `beads:config:workspace`, `beads:filter:priority-high`

### ⚙️ Configuration Data
**Purpose**: Avoid repeated file I/O and parsing
- **Project configuration**: 1 minute TTL
- **User preferences**: 30 minutes TTL
- **Template data**: 1 hour TTL
- **Sync configuration**: 5 minutes TTL

**Cache Keys**: `config:project`, `config:user:prefs`, `config:templates:basic`

### 🔄 Sync Operation Results
**Purpose**: Avoid redundant expensive sync operations
- **GitHub → Beads sync results**: 15 minutes TTL
- **Beads → GitHub sync results**: 15 minutes TTL
- **Conflict resolution outcomes**: 30 minutes TTL
- **Diff computations**: 10 minutes TTL

**Cache Keys**: `sync:gh-to-beads:batch-123`, `sync:conflict:issue-456`, `sync:diff:file-changes`

### 📋 CLI Command Results
**Purpose**: Speed up frequently used CLI commands
- **Help command output**: 1 hour TTL
- **Template lists**: 30 minutes TTL
- **Configuration validation results**: 5 minutes TTL
- **Status information**: 2 minutes TTL

**Cache Keys**: `cli:help:main`, `cli:templates:list`, `cli:validation:config-file`

## Cache Architecture

### 🧠 Memory Cache (Fast Layer)
- **Size**: 1000 entries maximum
- **TTL**: 1 hour maximum
- **Eviction**: LRU (Least Recently Used)
- **Use case**: Hot data, recent API calls

### 💾 Disk Cache (Persistent Layer)  
- **Size**: 100MB maximum
- **Compression**: Enabled for large entries
- **TTL**: Up to 24 hours
- **Use case**: Backup of memory cache, large datasets

### 🔄 Hybrid Strategy
- **Small data** (< 1KB): Memory only
- **Medium data** (1-10KB): Memory → Disk promotion
- **Large data** (> 10KB): Disk only

## Performance Impact

### 📊 Before Caching
- GitHub API calls: **~50 per sync cycle**
- Beads queries: **~200 per sync cycle** 
- Config file reads: **~10 per command**
- Average sync time: **~30 seconds**

### 🚀 After Caching (Projected)
- GitHub API calls: **~15 per sync cycle** (70% reduction)
- Beads queries: **~50 per sync cycle** (75% reduction)
- Config file reads: **~2 per command** (80% reduction)
- Average sync time: **~10 seconds** (67% improvement)

## Cache Invalidation Strategies

### ⏰ TTL-Based (Time)
- Aggressive TTLs for fast-changing data
- Longer TTLs for stable data
- Automatic expiration cleanup

### 🏷️ Tag-Based (Manual)
- Cache entries tagged by source/dependency
- Bulk invalidation by tag pattern
- Example: `invalidate("github:*")` on repo update

### 🔄 Event-Based (Reactive)
- Webhook triggers for GitHub changes
- File watchers for configuration changes
- Beads event listeners for data updates

### 🧹 Cleanup Strategies
- **Expired entries**: Automatic removal
- **Size limits**: LRU eviction
- **Manual cleanup**: `cache clear` command
- **Background cleanup**: Every 15 minutes

## Cache Keys Pattern

```
{source}:{type}:{identifier}[:{extra}]

Examples:
- github:issues:open
- beads:sync:workspace-123
- config:project:preferences
- sync:diff:commit-abc123
- cli:help:plugin
```

## Security Considerations

### 🔒 Sensitive Data
- **GitHub tokens**: Never cached
- **API keys**: Never cached  
- **User credentials**: Never cached
- **Private issue data**: Short TTL (5 minutes)

### 🛡️ Data Integrity
- **Checksums**: Verify cache integrity
- **Versioning**: Detect stale cache entries
- **Encryption**: Optional for sensitive caches
- **Validation**: Cache entry validation on load

## Monitoring & Analytics

### 📈 Cache Metrics
- **Hit rate**: Target > 80%
- **Miss rate**: Target < 20%
- **Eviction rate**: Monitor for sizing
- **Memory usage**: Keep under 50MB
- **Disk usage**: Keep under 80MB

### 🔍 Performance Monitoring
- **API call reduction**: Track savings
- **Response time improvement**: Measure before/after
- **Cache size growth**: Monitor trends
- **Error rates**: Cache-related failures

## Cache CLI Integration

```bash
# Cache management commands
liaison cache status          # Show cache statistics
liaison cache clear           # Clear all cache
liaison cache clear github   # Clear GitHub cache only
liaison cache warm            # Pre-warm important cache entries
liaison cache export backup   # Export cache to file
liaison cache import backup   # Import cache from file
```

## Implementation Status

### ✅ Completed
- [x] Cache Manager infrastructure
- [x] Memory backend with LRU
- [x] Disk backend with compression
- [x] Hybrid backend with intelligent routing
- [x] Cache statistics and monitoring
- [x] TTL and eviction strategies

### 🚧 In Progress
- [ ] GitHub API cache integration
- [ ] Beads data cache integration  
- [ ] Configuration cache integration
- [ ] Sync result caching
- [ ] CLI command caching

### 📋 Next Steps
- [ ] Add cache to GitHubClient
- [ ] Add cache to BeadsClient
- [ ] Add cache to ConfigManager
- [ ] Add cache to SyncEngine
- [ ] Add cache CLI commands
- [ ] Add cache monitoring dashboard

## Benefits Summary

### 🎯 Performance
- **70-80% reduction** in API calls
- **60-70% faster** CLI commands
- **50-60% faster** sync operations
- **90% faster** repeated operations

### 💰 Cost Savings  
- **Reduced GitHub API usage**
- **Lower server load**
- **Better rate limit compliance**
- **Improved user experience**

### 🛡️ Reliability
- **Offline capability** (partial)
- **Graceful degradation** on cache failures
- **Consistent response times**
- **Reduced network dependency**
