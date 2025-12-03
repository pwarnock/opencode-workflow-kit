# Cody-Beads Logging System

A comprehensive Pino-based logging framework for the Cody-Beads integration system.

## Overview

The logging system provides:

- **Multiple Transport Support**: Console and file logging with configurable outputs
- **Structured Logging**: JSON and text formatting with metadata support
- **Performance Monitoring**: Built-in performance measurement and logging
- **Error Handling**: Comprehensive error logging with stack traces
- **Configuration Integration**: Seamless integration with Cody-Beads configuration
- **Decorator Support**: Performance measurement decorators for easy instrumentation

## Installation

The logging system is automatically included with the Cody-Beads integration package. No additional installation is required.

## Usage

### Basic Usage

```typescript
import { createLogger, getGlobalLogger } from './core/logging';

// Create a logger instance
const logger = createLogger({
  level: 'debug',
  context: 'my-component'
});

// Log messages at different levels
logger.debug('Debug message');
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message');

// Use the global logger
const globalLogger = getGlobalLogger();
globalLogger.info('Global log message');
```

### Configuration

The logging system supports comprehensive configuration:

```typescript
const config = {
  level: 'info', // trace, debug, info, warn, error, fatal
  format: 'text', // text or json
  file: {
    enabled: true,
    path: './logs/cody-beads.log',
    maxSize: '10MB',
    maxFiles: 5,
    rotation: 'daily' // daily, weekly, monthly
  },
  console: {
    enabled: true,
    colorize: true
  }
};

const logger = createLogger(config);
```

### Performance Logging

```typescript
import { measurePerformance } from './core/logging';

// Decorate methods for automatic performance measurement
class MyService {
  @measurePerformance
  async processData(data: any) {
    // Your implementation
    return processedData;
  }
}

// Manual performance measurement
const logger = getGlobalLogger();
const measurement = logger.startPerformanceMeasurement('data-processing');
try {
  // Your operation
  const result = await someOperation();
  const metrics = logger.endPerformanceMeasurement(measurement);
  await logger.logPerformance('data-processing', metrics, 'success');
} catch (error) {
  const metrics = logger.endPerformanceMeasurement(measurement);
  await logger.logPerformance('data-processing', metrics, 'failure');
}
```

### Error Logging

```typescript
try {
  // Your operation
} catch (error) {
  logger.logError(error, 'operation-context', {
    input: 'data',
    attempt: 1
  });
}
```

### Child Loggers

```typescript
// Create child logger with additional context
const parentLogger = createLogger({ context: 'parent' });
const childLogger = parentLogger.createChildLogger('child-component');

// Child logger inherits parent configuration but adds context
childLogger.info('This log includes parent:child-component context');
```

## API Reference

### Logger Interface

```typescript
interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  trace?(message: string, ...args: any[]): void;
  fatal?(message: string, ...args: any[]): void;

  // Performance methods
  logPerformance?(operation: string, metrics: PerformanceMetrics, result?: 'success' | 'failure'): Promise<void>;
  startPerformanceMeasurement?(operation: string): PerformanceMeasurement;
  endPerformanceMeasurement?(measurement: PerformanceMeasurement): PerformanceMetrics;

  // Error handling
  logError?(error: Error | string, context?: string, metadata?: Record<string, any>): void;

  // Structured logging
  logStructured?(level: LogLevel, entry: Omit<LogEntry, 'timestamp' | 'level'>): void;

  // Utility methods
  getPerformanceLogs?(): PerformanceLogEntry[];
  clearPerformanceLogs?(): void;
  isLevelEnabled?(level: LogLevel): boolean;
  createChildLogger?(context: string, options?: { config?: LoggingConfig }): Logger;
  getLogger?(): any;
  cleanup?(): Promise<void>;
}
```

### Utility Functions

```typescript
// Create logger with optional configuration
function createLogger(config?: LoggingConfig, context?: string): Logger;

// Get global logger instance
function getGlobalLogger(): Logger;

// Reset global logger (for testing)
function resetGlobalLogger(): void;

// Logging decorator for class instantiation
function withLogging<T extends { new (...args: any[]): {} }>(constructor: T): T;

// Performance measurement decorator
function measurePerformance(target: any, propertyKey: string, descriptor: PropertyDescriptor): void;
```

## Integration with Existing Systems

### Plugin System Integration

The logging system integrates seamlessly with the existing plugin system:

```typescript
// In plugin implementations
this.context.logger.info('Plugin operation completed');
this.context.logger.error('Plugin error occurred', error);
```

### Agent System Integration

Agents can use the logging system for comprehensive logging:

```typescript
// In agent implementations
this.context.logger.debug('Agent processing started');
this.context.logger.info('Agent operation completed');
```

## Configuration Reference

### Logging Configuration Schema

```typescript
interface LoggingConfig {
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  format: 'json' | 'text';
  file?: {
    enabled: boolean;
    path: string;
    maxSize: string; // e.g., '10MB', '1GB'
    maxFiles: number;
    rotation: 'daily' | 'weekly' | 'monthly';
  };
  console?: {
    enabled: boolean;
    colorize: boolean;
  };
}
```

### Log Levels

| Level | Priority | Usage |
|-------|----------|-------|
| trace | 0 | Most verbose, detailed debugging |
| debug | 1 | Debugging information |
| info | 2 | General information |
| warn | 3 | Warnings and potential issues |
| error | 4 | Error conditions |
| fatal | 5 | Critical failures requiring immediate attention |

## Best Practices

### Log Level Selection

- **Development**: Use `debug` or `trace` for detailed debugging
- **Production**: Use `info` or `warn` for operational logging
- **Performance Critical**: Use `warn` or `error` to minimize overhead

### Contextual Logging

Always provide meaningful context for logs:

```typescript
// Good
logger.info('User authentication successful', { userId: '123', method: 'oauth' });

// Better
const userLogger = logger.createChildLogger('authentication');
userLogger.info('Authentication successful', { userId: '123', method: 'oauth' });
```

### Performance Monitoring

Use performance logging for critical operations:

```typescript
// Monitor important operations
@measurePerformance
async processUserData(userId: string) {
  // Your implementation
}
```

### Error Handling

Provide comprehensive error information:

```typescript
try {
  await riskyOperation();
} catch (error) {
  logger.logError(error, 'data-processing', {
    inputSize: data.length,
    userId: currentUser.id,
    retryCount: attempt
  });
}
```

## Advanced Features

### Log Rotation

The system supports automatic log rotation with configurable policies:

```typescript
const config = {
  file: {
    enabled: true,
    maxSize: '100MB',
    maxFiles: 10,
    rotation: 'daily'
  }
};
```

### Multiple Transports

Configure different logging outputs:

```typescript
// Console + File logging
const config = {
  console: { enabled: true, colorize: true },
  file: { enabled: true, path: './logs/app.log' }
};
```

### Structured Logging

Use structured logging for better log analysis:

```typescript
logger.logStructured('info', {
  message: 'User login',
  userId: '123',
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0',
  timestamp: new Date().toISOString()
});
```

## Troubleshooting

### Common Issues

**Issue: Logs not appearing**
- Check log level configuration
- Verify file permissions for log directory
- Ensure logger is properly initialized

**Issue: Performance overhead**
- Reduce log level in production
- Use async logging where possible
- Avoid excessive debug logging in hot paths

**Issue: File logging not working**
- Check directory permissions
- Verify disk space availability
- Ensure file path is writable

## Migration Guide

### From Console Logging

Replace `console.log` calls with structured logging:

```typescript
// Before
console.log('User created:', user.id);

// After
logger.info('User created', { userId: user.id });
```

### From Custom Loggers

Integrate existing loggers with the new system:

```typescript
// Create logger with similar configuration
const logger = createLogger({
  level: 'info',
  context: 'legacy-component'
});

// Replace custom logger calls
logger.info('Legacy operation completed');
```

## Examples

### Complete Integration Example

```typescript
import { createLogger, measurePerformance } from './core/logging';

class DataProcessor {
  private logger = createLogger({ context: 'data-processor' });

  @measurePerformance
  async processDataset(dataset: any[]) {
    this.logger.info('Starting dataset processing', { size: dataset.length });

    try {
      const results = await this.transformData(dataset);
      this.logger.info('Dataset processing completed', { processed: results.length });
      return results;
    } catch (error) {
      this.logger.logError(error, 'dataset-processing', { size: dataset.length });
      throw error;
    }
  }

  private async transformData(data: any[]) {
    return data.map(item => ({
      ...item,
      processedAt: new Date().toISOString()
    }));
  }
}
```

### CLI Integration

```typescript
import { getGlobalLogger } from './core/logging';

const logger = getGlobalLogger();

program
  .command('process')
  .action(async () => {
    logger.info('CLI command started');
    try {
      await processData();
      logger.info('CLI command completed successfully');
    } catch (error) {
      logger.error('CLI command failed', error);
      process.exit(1);
    }
  });
```

## Performance Considerations

- **Log Level Impact**: Higher log levels (trace, debug) have more overhead
- **Async Logging**: File logging is asynchronous by default
- **Batch Processing**: Consider batching logs for high-volume scenarios
- **Memory Usage**: Performance metrics include memory usage tracking

## Future Enhancements

- **Remote Logging**: Add support for remote logging services
- **Log Analysis**: Built-in log analysis and reporting
- **Alerting**: Integration with monitoring and alerting systems
- **Distributed Tracing**: Support for distributed tracing IDs

This logging system provides a robust foundation for comprehensive logging throughout the Cody-Beads integration, with flexibility to handle various use cases from development debugging to production monitoring.