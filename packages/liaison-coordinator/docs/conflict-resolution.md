# Conflict Resolution System

The Liaison toolkit includes a sophisticated conflict resolution system for handling data conflicts during bidirectional synchronization between Cody and Beads.

## Overview

The `ConflictResolver` provides pluggable resolution strategies that can be selected based on the conflict type and user preferences. Each strategy implements a specific approach to resolving conflicts when the same data has been modified in both systems.

## Available Strategies

### 1. cody-wins
**Use when:** Cody (GitHub) should be the source of truth

Always resolves conflicts by using the Cody (GitHub) data and overwriting Beads data.

```typescript
const result = await resolver.resolve(conflict, 'cody-wins');
```

### 2. beads-wins
**Use when:** Beads should be the source of truth

Always resolves conflicts by using the Beads data and overwriting Cody (GitHub) data.

```typescript
const result = await resolver.resolve(conflict, 'beads-wins');
```

### 3. timestamp
**Use when:** Most recent changes should win

Compares the `updated_at` timestamps of both data sources and uses the most recently updated version.

```typescript
const result = await resolver.resolve(conflict, 'timestamp');
```

**Example:**
- Cody updated: 2025-12-05 10:00:00
- Beads updated: 2025-12-05 09:00:00
- Result: Cody wins (more recent)

### 4. merge
**Use when:** Both changes should be preserved

Intelligently merges non-conflicting fields from both sources:
- Combines arrays (labels, tags) without duplicates
- Merges descriptions by concatenating with separator
- Preserves unique fields from both sources

```typescript
const result = await resolver.resolve(conflict, 'merge');
```

**Example merge result:**
```json
{
  "title": "From Cody",
  "priority": "From Beads",
  "labels": ["bug", "feature"],  // Combined from both
  "description": "Cody description\n\n---\n\nBeads description"
}
```

### 5. manual
**Use when:** Human intervention is required

Displays conflict details and requires manual resolution. This is the default fallback strategy.

```typescript
const result = await resolver.resolve(conflict, 'manual');
```

**Output:**
```
⚠️  Manual resolution required:
  Conflict: Both systems updated recently
  Item: #123 / beads-456
  
  Cody data:
    { "title": "Fix bug", "status": "open" }
  
  Beads data:
    { "title": "Fix bug", "status": "in_progress" }
```

## Usage

### Basic Usage

```typescript
import { ConflictResolver } from './core/conflict-resolver.js';

const resolver = new ConflictResolver();

// Resolve with specific strategy
const result = await resolver.resolve(conflict, 'timestamp');

if (result.success) {
  console.log(`Resolved with action: ${result.action}`);
  console.log(`Merged data:`, result.data);
} else {
  console.error(`Resolution failed: ${result.error}`);
}
```

### Custom Strategies

You can register custom resolution strategies:

```typescript
import { ResolutionStrategy, ConflictContext, ResolutionResult } from './core/conflict-resolver.js';

class PriorityBasedStrategy implements ResolutionStrategy {
  name = 'priority-based' as const;

  canHandle(conflict: SyncConflict): boolean {
    return !!(conflict.codyData && conflict.beadsData);
  }

  async resolve(context: ConflictContext): Promise<ResolutionResult> {
    const { codyData, beadsData } = context.conflict;
    
    // Custom logic: check priority labels
    const codyPriority = this.extractPriority(codyData.labels);
    const beadsPriority = beadsData.priority;
    
    if (codyPriority > beadsPriority) {
      return { success: true, action: 'cody-wins', data: codyData };
    } else {
      return { success: true, action: 'beads-wins', data: beadsData };
    }
  }

  private extractPriority(labels: any[]): number {
    // Implementation...
  }
}

// Register custom strategy
resolver.registerStrategy(new PriorityBasedStrategy());

// Use custom strategy
const result = await resolver.resolve(conflict, 'priority-based');
```

### Fallback Strategy

Set a default fallback strategy for when the preferred strategy fails:

```typescript
resolver.setFallbackStrategy('timestamp');

// If 'unknown-strategy' fails, 'timestamp' will be used
const result = await resolver.resolve(conflict, 'unknown-strategy');
```

## Integration with SyncEngine

The `SyncEngine` automatically uses the `ConflictResolver`:

```typescript
import { SyncEngine } from './core/sync-engine.js';

const syncEngine = new SyncEngine(config, githubClient, beadsClient);

// Conflicts are automatically detected and resolved
const result = await syncEngine.executeSync({
  direction: 'bidirectional',
  dryRun: false,
  force: false,
});

// Manual conflict resolution
for (const conflict of result.conflicts) {
  await syncEngine.resolveConflict(conflict, 'merge');
}
```

## Configuration

Configure default conflict resolution strategy in your liaison config:

```json
{
  "sync": {
    "conflictResolution": "timestamp",
    "autoResolve": true
  }
}
```

## Best Practices

### 1. Choose the Right Strategy

- **Development**: Use `timestamp` for most recent changes
- **Production**: Use `manual` for critical data
- **Automated workflows**: Use `merge` to preserve all changes
- **Single source of truth**: Use `cody-wins` or `beads-wins`

### 2. Handle Resolution Results

Always check the `success` field and handle errors:

```typescript
const result = await resolver.resolve(conflict, strategy);

if (!result.success) {
  logger.error(`Conflict resolution failed: ${result.error}`);
  // Fallback to manual resolution
  await notifyUser(conflict);
}
```

### 3. Test Custom Strategies

Write comprehensive tests for custom strategies:

```typescript
describe('CustomStrategy', () => {
  it('should handle edge cases', async () => {
    const conflict = createTestConflict();
    const result = await strategy.resolve({ conflict, timestamp: new Date() });
    expect(result.success).toBe(true);
  });
});
```

### 4. Monitor Conflict Patterns

Track which conflicts occur most frequently to improve your sync strategy:

```typescript
const conflictStats = {
  'timestamp': 45,
  'merge': 23,
  'manual': 12,
};

// Adjust strategies based on patterns
if (conflictStats.manual > threshold) {
  // Consider adjusting sync frequency or data model
}
```

## Troubleshooting

### Conflict Not Resolving

**Problem:** Strategy returns `success: false`

**Solutions:**
1. Check if strategy can handle the conflict type
2. Verify both `codyData` and `beadsData` are present
3. Check for missing required fields
4. Review strategy implementation

### Unexpected Merge Results

**Problem:** Merged data doesn't match expectations

**Solutions:**
1. Review merge strategy logic
2. Check field precedence rules
3. Verify array merging behavior
4. Test with sample data

### Manual Resolution Required

**Problem:** Too many manual resolutions needed

**Solutions:**
1. Increase sync frequency to reduce conflicts
2. Use more aggressive strategies (`timestamp`, `merge`)
3. Implement custom strategy for your use case
4. Review data model for conflict-prone fields

## API Reference

### ConflictResolver

```typescript
class ConflictResolver {
  constructor();
  registerStrategy(strategy: ResolutionStrategy): void;
  resolve(conflict: SyncConflict, preferredStrategy?: ConflictResolutionStrategy): Promise<ResolutionResult>;
  setFallbackStrategy(strategy: ConflictResolutionStrategy): void;
}
```

### ResolutionStrategy

```typescript
interface ResolutionStrategy {
  name: ConflictResolutionStrategy;
  canHandle(conflict: SyncConflict): boolean;
  resolve(context: ConflictContext): Promise<ResolutionResult>;
}
```

### ResolutionResult

```typescript
interface ResolutionResult {
  success: boolean;
  action: 'cody-wins' | 'beads-wins' | 'merge' | 'manual' | 'skip';
  data?: any;
  error?: string;
}
```

## Examples

### Example 1: Timestamp-based Resolution

```typescript
const conflict = {
  type: 'issue',
  itemId: 'test-1',
  itemType: 'Issue',
  message: 'Both systems updated',
  codyData: { updated_at: '2025-12-05T10:00:00Z', title: 'New title' },
  beadsData: { updated_at: '2025-12-05T09:00:00Z', title: 'Old title' },
};

const result = await resolver.resolve(conflict, 'timestamp');
// Result: cody-wins (more recent)
```

### Example 2: Merge Strategy

```typescript
const conflict = {
  type: 'issue',
  itemId: 'test-1',
  itemType: 'Issue',
  message: 'Different labels',
  codyData: { labels: ['bug'], description: 'Cody desc' },
  beadsData: { labels: ['feature'], priority: 1 },
};

const result = await resolver.resolve(conflict, 'merge');
// Result: { labels: ['bug', 'feature'], description: 'Cody desc', priority: 1 }
```

### Example 3: Custom Strategy

```typescript
class SmartMergeStrategy implements ResolutionStrategy {
  name = 'smart-merge' as const;

  canHandle(conflict: SyncConflict): boolean {
    return conflict.type === 'issue';
  }

  async resolve(context: ConflictContext): Promise<ResolutionResult> {
    const { codyData, beadsData } = context.conflict;
    
    // Smart merge logic
    const merged = {
      title: codyData.title || beadsData.title,
      status: this.mergeStatus(codyData.state, beadsData.status),
      priority: Math.max(codyData.priority || 0, beadsData.priority || 0),
      labels: [...new Set([...codyData.labels, ...beadsData.labels])],
    };

    return { success: true, action: 'merge', data: merged };
  }

  private mergeStatus(codyState: string, beadsStatus: string): string {
    // Custom status merging logic
    const statusPriority = { closed: 3, in_progress: 2, open: 1 };
    return statusPriority[codyState] > statusPriority[beadsStatus]
      ? codyState
      : beadsStatus;
  }
}
```

## See Also

- [Sync Engine Documentation](./sync-engine.md)
- [Configuration Guide](./configuration.md)
- [API Reference](./api-reference.md)
