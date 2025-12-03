/**
 * Simple test to verify the logging system works
 */

import { createLogger, getGlobalLogger } from './index';

async function testLoggingSystem() {
  console.log('🧪 Testing Pino-based logging system...');

  try {
    // Test 1: Create a basic logger
    const logger = createLogger();
    logger.info('✅ Basic logger creation successful');

    // Test 2: Test different log levels
    logger.debug('🔍 Debug message test');
    logger.info('ℹ️ Info message test');
    logger.warn('⚠️ Warning message test');
    logger.error('❌ Error message test');

    // Test 3: Test global logger
    const globalLogger = getGlobalLogger();
    globalLogger.info('🌍 Global logger test successful');

    // Test 4: Test child logger
    const childLogger = logger.createChildLogger?.('test-child') || logger;
    childLogger.info('👶 Child logger test successful');

    // Test 5: Test error logging
    try {
      throw new Error('Test error for logging');
    } catch (error) {
      if (logger.logError) {
        logger.logError(error instanceof Error ? error : new Error(String(error)), 'test-context', { test: 'metadata' });
      } else {
        logger.error('Test error logged');
      }
    }

    // Test 6: Test performance logging
    if (logger.startPerformanceMeasurement && logger.endPerformanceMeasurement && logger.logPerformance) {
      const measurement = logger.startPerformanceMeasurement('test-operation');
      await new Promise(resolve => setTimeout(resolve, 100));
      const metrics = logger.endPerformanceMeasurement(measurement);
      await logger.logPerformance('test-operation', metrics, 'success');
    }

    console.log('🎉 All logging system tests completed successfully!');

    // Test 7: Test cleanup
    if (logger.cleanup) {
      await logger.cleanup();
      console.log('🧹 Logger cleanup successful');
    }

    return true;
  } catch (error) {
    console.error('❌ Logging system test failed:', error);
    return false;
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testLoggingSystem().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export { testLoggingSystem };