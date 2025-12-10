/**
 * Simple Logging System Test
 * Basic test to verify the logging system works
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createLogger, getGlobalLogger, resetGlobalLogger } from '../../../src/core/logging/index.js';

describe('Logging System - Simple Test', () => {
  beforeEach(() => {
    resetGlobalLogger();
  });

  it('should be able to import and create a basic logger', async () => {
    const logger = createLogger();
    expect(logger).toBeDefined();
    expect(logger).toHaveProperty('info');
    expect(logger).toHaveProperty('debug');
    expect(logger).toHaveProperty('warn');
    expect(logger).toHaveProperty('error');
  });

  it('should verify logging system files exist', async () => {
    const logger = createLogger();
    expect(logger).toBeDefined();

    // Test basic logging functionality
    expect(() => {
      logger.info('Test info message');
      logger.debug('Test debug message');
      logger.warn('Test warn message');
      logger.error('Test error message');
    }).not.toThrow();
  });

  it('should handle global logger', async () => {
    const globalLogger = getGlobalLogger();
    expect(globalLogger).toBeDefined();
    expect(globalLogger).toHaveProperty('info');
    expect(globalLogger).toHaveProperty('error');
  });
});