/**
 * Common error utilities and helper functions
 */

import { 
  OpenCodeError, 
  ErrorFactory, 
  ErrorCode, 
  ErrorContext,
  ErrorDetails 
} from './index.js';

/**
 * Common error creation utilities
 */
export class CommonErrors {
  /**
   * Create file not found error
   */
  static fileNotFound(filePath: string, operation?: string): OpenCodeError {
    return ErrorFactory.fileSystem(
      ErrorCode.FILE_NOT_FOUND,
      `File not found: ${filePath}`,
      { operation, component: 'FileSystem' },
      { 
        field: 'filePath',
        value: filePath,
        suggestion: 'Check if the file exists and the path is correct'
      }
    );
  }

  /**
   * Create configuration not found error
   */
  static configNotFound(configPath: string, operation?: string): OpenCodeError {
    return ErrorFactory.configuration(
      ErrorCode.CONFIG_NOT_FOUND,
      `Configuration file not found: ${configPath}`,
      { operation, component: 'Configuration' },
      { 
        field: 'configPath',
        value: configPath,
        suggestion: 'Create a configuration file or specify the correct path'
      }
    );
  }

  /**
   * Create API timeout error
   */
  static apiTimeout(url: string, timeout: number): OpenCodeError {
    return ErrorFactory.api(
      ErrorCode.API_TIMEOUT,
      `API request to ${url} timed out after ${timeout}ms`,
      { operation: 'api_request', component: 'APIClient' },
      { 
        field: 'timeout',
        value: timeout,
        suggestion: 'Increase timeout or check network connectivity'
      }
    );
  }

  /**
   * Create validation error
   */
  static validationFailed(
    field: string, 
    value: any, 
    expected: string,
    operation?: string
  ): OpenCodeError {
    return ErrorFactory.validation(
      ErrorCode.VALIDATION_FAILED,
      `Validation failed for field '${field}'`,
      { operation, component: 'Validator' },
      { 
        field,
        value,
        expected,
        suggestion: `Ensure ${field} matches the expected format: ${expected}`
      }
    );
  }

  /**
   * Create unauthorized error
   */
  static unauthorized(operation: string, resource?: string): OpenCodeError {
    return ErrorFactory.security(
      ErrorCode.SECURITY_UNAUTHORIZED,
      `Unauthorized access${resource ? ` to ${resource}` : ''}`,
      { operation, component: 'Security' },
      { 
        suggestion: 'Check authentication credentials and permissions'
      }
    );
  }

  /**
   * Create plugin not found error
   */
  static pluginNotFound(pluginName: string): OpenCodeError {
    return ErrorFactory.plugin(
      ErrorCode.PLUGIN_NOT_FOUND,
      `Plugin not found: ${pluginName}`,
      { operation: 'plugin_load', component: 'PluginManager' },
      { 
        field: 'pluginName',
        value: pluginName,
        suggestion: 'Check if the plugin is installed and registered'
      }
    );
  }

  /**
   * Create sync conflict error
   */
  static syncConflict(
    issueId: string, 
    conflictType: string,
    operation?: string
  ): OpenCodeError {
    return ErrorFactory.sync(
      ErrorCode.SYNC_CONFLICT,
      `Sync conflict detected for issue ${issueId}: ${conflictType}`,
      { operation, component: 'SyncEngine' },
      { 
        field: 'issueId',
        value: issueId,
        suggestion: 'Resolve conflict manually or configure conflict resolution strategy'
      }
    );
  }

  /**
   * Create network connection error
   */
  static networkConnectionFailed(host: string, port?: number): OpenCodeError {
    const target = port ? `${host}:${port}` : host;
    return ErrorFactory.network(
      ErrorCode.NETWORK_CONNECTION_FAILED,
      `Failed to connect to ${target}`,
      { operation: 'network_connect', component: 'NetworkClient' },
      { 
        field: 'target',
        value: target,
        suggestion: 'Check network connectivity and server availability'
      }
    );
  }

  /**
   * Create agent execution error
   */
  static agentExecutionFailed(
    agentName: string, 
    error: Error,
    operation?: string
  ): OpenCodeError {
    return ErrorFactory.agent(
      ErrorCode.AGENT_EXECUTION_FAILED,
      `Agent execution failed: ${agentName}`,
      { operation, component: 'Agent' },
      { 
        field: 'agentName',
        value: agentName,
        suggestion: 'Check agent configuration and available resources'
      },
      error
    );
  }
}

/**
 * Error handling utilities
 */
export class ErrorUtils {
  /**
   * Check if error is of specific category
   */
  static isCategory(error: Error, category: string): boolean {
    return error instanceof OpenCodeError && error.category === category;
  }

  /**
   * Check if error has specific code
   */
  static isCode(error: Error, code: string): boolean {
    return error instanceof OpenCodeError && error.code === code;
  }

  /**
   * Extract correlation ID from error or generate new one
   */
  static getCorrelationId(error?: Error): string {
    if (error instanceof OpenCodeError && error.correlationId) {
      return error.correlationId;
    }
    
    // Generate new correlation ID
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  /**
   * Create error context from request
   */
  static createRequestContext(
    operation: string,
    userId?: string,
    requestId?: string,
    additional?: Record<string, any>
  ): ErrorContext {
    return {
      operation,
      component: 'API',
      userId,
      requestId,
      timestamp: new Date().toISOString(),
      metadata: additional
    };
  }

  /**
   * Wrap async function with error handling and correlation ID
   */
  static withErrorHandling<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    operation: string,
    component: string = 'Unknown'
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      const correlationId = ErrorUtils.getCorrelationId();
      const context: ErrorContext = {
        operation,
        component,
        timestamp: new Date().toISOString(),
        metadata: { correlationId }
      };

      try {
        return await fn(...args);
      } catch (error) {
        if (error instanceof OpenCodeError) {
          throw error.withContext(context);
        } else {
          throw new OpenCodeError(
            (error as Error).message,
            ErrorCode.VALIDATION_FAILED,
            'VALIDATION' as any,
            'MEDIUM' as any,
            context,
            undefined,
            error as Error,
            correlationId
          );
        }
      }
    };
  }

  /**
   * Extract user-friendly error message
   */
  static getUserMessage(error: Error): string {
    if (error instanceof OpenCodeError) {
      return error.getUserMessage();
    }
    
    // Handle common error types
    if (error.name === 'ValidationError') {
      return `Validation error: ${error.message}`;
    }
    
    if (error.name === 'TypeError') {
      return `Type error: ${error.message}`;
    }
    
    return error.message || 'An unexpected error occurred';
  }

  /**
   * Check if error should be retried
   */
  static shouldRetry(error: Error, attempt: number, maxAttempts: number = 3): boolean {
    if (attempt >= maxAttempts) {
      return false;
    }

    if (error instanceof OpenCodeError) {
      return error.isRetryable();
    }

    // Retry network errors and timeouts
    const retryableMessages = [
      'timeout',
      'connection',
      'network',
      'rate limit',
      'temporary'
    ];

    return retryableMessages.some(msg => 
      error.message.toLowerCase().includes(msg)
    );
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  static calculateRetryDelay(attempt: number, baseDelay: number = 1000): number {
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 0.1 * exponentialDelay; // Add 10% jitter
    
    return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
  }

  /**
   * Create retry wrapper for async functions
   */
  static async withRetry<R>(
    fn: () => Promise<R>,
    options: {
      maxAttempts?: number;
      baseDelay?: number;
      operation?: string;
      component?: string;
    } = {}
  ): Promise<R> {
    const {
      maxAttempts = 3,
      baseDelay = 1000,
      operation = 'retry_operation',
      component = 'RetryWrapper'
    } = options;

    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (!ErrorUtils.shouldRetry(lastError, attempt, maxAttempts)) {
          throw lastError;
        }
        
        if (attempt < maxAttempts) {
          const delay = ErrorUtils.calculateRetryDelay(attempt, baseDelay);
          console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, lastError.message);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError!;
  }
}

/**
 * Error logging utilities
 */
export class ErrorLogger {
  /**
   * Log error with structured format
   */
  static log(error: Error, level: 'error' | 'warn' | 'info' = 'error'): void {
    const logData = {
      timestamp: new Date().toISOString(),
      level,
      type: error.name,
      message: error.message,
      ...(error instanceof OpenCodeError ? {
        category: error.category,
        code: error.code,
        severity: error.severity,
        context: error.context,
        details: error.details,
        correlationId: error.correlationId
      } : {
        stack: error.stack
      })
    };

    console[level]('OpenCode Error:', JSON.stringify(logData, null, 2));
  }

  /**
   * Log error with user-friendly message
   */
  static logUserFriendly(error: Error, operation?: string): void {
    const userMessage = ErrorUtils.getUserMessage(error);
    const correlationId = ErrorUtils.getCorrelationId(error);
    
    console.error(`❌ Error in ${operation || 'operation'}: ${userMessage}`);
    
    if (correlationId) {
      console.error(`🔍 Correlation ID: ${correlationId}`);
      console.error('Please include this ID when reporting issues.');
    }
  }

  /**
   * Create error summary for reporting
   */
  static createSummary(errors: Error[]): {
    total: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
    critical: OpenCodeError[];
  } {
    const summary = {
      total: errors.length,
      byCategory: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      critical: [] as OpenCodeError[]
    };

    errors.forEach(error => {
      if (error instanceof OpenCodeError) {
        summary.byCategory[error.category] = (summary.byCategory[error.category] || 0) + 1;
        summary.bySeverity[error.severity] = (summary.bySeverity[error.severity] || 0) + 1;
        
        if (error.severity === 'CRITICAL') {
          summary.critical.push(error);
        }
      } else {
        summary.byCategory['UNKNOWN'] = (summary.byCategory['UNKNOWN'] || 0) + 1;
        summary.bySeverity['UNKNOWN'] = (summary.bySeverity['UNKNOWN'] || 0) + 1;
      }
    });

    return summary;
  }
}