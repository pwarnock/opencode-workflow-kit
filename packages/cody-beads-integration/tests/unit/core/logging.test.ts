/**
 * Logging System Unit Tests
 * Comprehensive tests for the Pino-based logging framework
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createLogger, getGlobalLogger, resetGlobalLogger, PinoLoggingSystem } from '../../../src/core/logging/index.js';
import { LoggingConfig } from '../../../src/core/config/validation.js';

describe('Logging System', () => {
  let logger: PinoLoggingSystem;

  beforeEach(() => {
    // Reset global logger before each test
    resetGlobalLogger();
    logger = createLogger() as PinoLoggingSystem;
  });

  afterEach(async () => {
    // Cleanup after each test
    if (logger.cleanup) {
      await logger.cleanup();
    }
  });

  it('should create a logger instance', () => {
    expect(logger).toBeDefined();
    expect(logger).toBeInstanceOf(PinoLoggingSystem);
  });

  it('should have all required logging methods', () => {
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
  });

  it('should log messages at different levels', () => {
    // Pino logger should have methods to log at different levels
    // Just verify they don't throw
    expect(() => {
      logger.debug('Debug test');
      logger.info('Info test');
      logger.warn('Warn test');
      logger.error('Error test');
    }).not.toThrow();
  });

  it('should create child loggers', () => {
    if (logger.createChildLogger) {
      const childLogger = logger.createChildLogger('test-child');
      expect(childLogger).toBeDefined();
      expect(childLogger.info).toBeDefined();
    }
  });

  it('should handle error logging', () => {
    const testError = new Error('Test error');
    if (logger.logError) {
      expect(() => logger.logError(testError, 'test-context')).not.toThrow();
    }
  });

  it('should support performance measurement', () => {
    if (logger.startPerformanceMeasurement && logger.endPerformanceMeasurement) {
      const measurement = logger.startPerformanceMeasurement('test-op');
      expect(measurement).toHaveProperty('operation', 'test-op');
      expect(measurement).toHaveProperty('startTime');

      const metrics = logger.endPerformanceMeasurement(measurement);
      expect(metrics).toHaveProperty('duration');
      expect(metrics.duration).toBeGreaterThanOrEqual(0);
    }
  });

  it('should check if log levels are enabled', () => {
    if (logger.isLevelEnabled) {
      // Default log level is 'info' (2), so debug (1) is disabled
      expect(logger.isLevelEnabled('info')).toBe(true);
      expect(logger.isLevelEnabled('debug')).toBe(false);
      expect(logger.isLevelEnabled('error')).toBe(true);
    }
  });

  it('should handle global logger', () => {
    const globalLogger = getGlobalLogger();
    expect(globalLogger).toBeDefined();
    expect(globalLogger.info).toBeDefined();
  });
});

describe('Logging Configuration', () => {
  it('should use default configuration when none provided', () => {
    const logger = createLogger() as PinoLoggingSystem;
    expect(logger).toBeDefined();
  });

  it('should accept custom configuration', () => {
    const customConfig: LoggingConfig = {
      level: 'debug',
      format: 'json',
      console: {
        enabled: true,
        colorize: false
      }
    };

    const logger = createLogger(customConfig) as PinoLoggingSystem;
    expect(logger).toBeDefined();
  });
});

describe('Logging Decorators', () => {
  it('should have withLogging decorator', () => {
    expect(typeof withLogging).toBe('function');
  });

  it('should have measurePerformance decorator', () => {
    expect(typeof measurePerformance).toBe('function');
  });
});

// Import the decorators for testing
import { withLogging, measurePerformance } from '../../../src/core/logging/system.js';

class TestClass {}
const DecoratedTestClass = withLogging(TestClass);

it('withLogging decorator should work', () => {
  expect(DecoratedTestClass).toBeDefined();
});