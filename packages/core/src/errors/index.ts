/**
 * Standardized error handling system for OpenCode Workflow Kit
 */

import { z } from 'zod';

// Error Code Categories
export enum ErrorCategory {
  CONFIGURATION = 'CONFIGURATION',
  SYNC = 'SYNC',
  API = 'API',
  AGENT = 'AGENT',
  FILE_SYSTEM = 'FILE_SYSTEM',
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  SECURITY = 'SECURITY',
  PLUGIN = 'PLUGIN',
  CACHE = 'CACHE',
  EVENT = 'EVENT'
}

// Error Severity Levels
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

// Error Codes
export enum ErrorCode {
  // Configuration Errors
  CONFIG_NOT_FOUND = 'CONFIG_NOT_FOUND',
  CONFIG_INVALID = 'CONFIG_INVALID',
  CONFIG_SCHEMA_VALIDATION_FAILED = 'CONFIG_SCHEMA_VALIDATION_FAILED',
  CONFIG_MERGE_FAILED = 'CONFIG_MERGE_FAILED',
  CONFIG_INHERITANCE_FAILED = 'CONFIG_INHERITANCE_FAILED',

  // Sync Errors
  SYNC_FAILED = 'SYNC_FAILED',
  SYNC_CONFLICT = 'SYNC_CONFLICT',
  SYNC_TIMEOUT = 'SYNC_TIMEOUT',
  SYNC_BATCH_FAILED = 'SYNC_BATCH_FAILED',
  SYNC_STATE_INVALID = 'SYNC_STATE_INVALID',
  SYNC_ENGINE_ERROR = 'SYNC_ENGINE_ERROR',

  // API Errors
  API_REQUEST_FAILED = 'API_REQUEST_FAILED',
  API_TIMEOUT = 'API_TIMEOUT',
  API_RATE_LIMITED = 'API_RATE_LIMITED',
  API_UNAUTHORIZED = 'API_UNAUTHORIZED',
  API_NOT_FOUND = 'API_NOT_FOUND',
  API_SERVER_ERROR = 'API_SERVER_ERROR',
  API_INVALID_RESPONSE = 'API_INVALID_RESPONSE',

  // Agent Errors
  AGENT_NOT_FOUND = 'AGENT_NOT_FOUND',
  AGENT_INITIALIZATION_FAILED = 'AGENT_INITIALIZATION_FAILED',
  AGENT_EXECUTION_FAILED = 'AGENT_EXECUTION_FAILED',
  AGENT_PERMISSION_DENIED = 'AGENT_PERMISSION_DENIED',
  AGENT_TIMEOUT = 'AGENT_TIMEOUT',

  // File System Errors
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_ACCESS_DENIED = 'FILE_ACCESS_DENIED',
  FILE_ALREADY_EXISTS = 'FILE_ALREADY_EXISTS',
  DIRECTORY_NOT_FOUND = 'DIRECTORY_NOT_FOUND',
  FILE_READ_ERROR = 'FILE_READ_ERROR',
  FILE_WRITE_ERROR = 'FILE_WRITE_ERROR',
  FILE_DELETE_ERROR = 'FILE_DELETE_ERROR',

  // Network Errors
  NETWORK_CONNECTION_FAILED = 'NETWORK_CONNECTION_FAILED',
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  NETWORK_DNS_RESOLUTION_FAILED = 'NETWORK_DNS_RESOLUTION_FAILED',
  NETWORK_SSL_ERROR = 'NETWORK_SSL_ERROR',

  // Validation Errors
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  VALIDATION_SCHEMA_ERROR = 'VALIDATION_SCHEMA_ERROR',
  VALIDATION_RULE_VIOLATION = 'VALIDATION_RULE_VIOLATION',
  VALIDATION_TYPE_ERROR = 'VALIDATION_TYPE_ERROR',

  // Security Errors
  SECURITY_UNAUTHORIZED = 'SECURITY_UNAUTHORIZED',
  SECURITY_FORBIDDEN = 'SECURITY_FORBIDDEN',
  SECURITY_TOKEN_EXPIRED = 'SECURITY_TOKEN_EXPIRED',
  SECURITY_INVALID_TOKEN = 'SECURITY_INVALID_TOKEN',
  SECURITY_PERMISSION_DENIED = 'SECURITY_PERMISSION_DENIED',

  // Plugin Errors
  PLUGIN_NOT_FOUND = 'PLUGIN_NOT_FOUND',
  PLUGIN_LOAD_FAILED = 'PLUGIN_LOAD_FAILED',
  PLUGIN_VERSION_INCOMPATIBLE = 'PLUGIN_VERSION_INCOMPATIBLE',
  PLUGIN_DEPENDENCY_MISSING = 'PLUGIN_DEPENDENCY_MISSING',
  PLUGIN_EXECUTION_FAILED = 'PLUGIN_EXECUTION_FAILED',

  // Cache Errors
  CACHE_MISS = 'CACHE_MISS',
  CACHE_ERROR = 'CACHE_ERROR',
  CACHE_CONNECTION_FAILED = 'CACHE_CONNECTION_FAILED',
  CACHE_SERIALIZATION_ERROR = 'CACHE_SERIALIZATION_ERROR',

  // Event Errors
  EVENT_EMIT_FAILED = 'EVENT_EMIT_FAILED',
  EVENT_HANDLER_ERROR = 'EVENT_HANDLER_ERROR',
  EVENT_VALIDATION_FAILED = 'EVENT_VALIDATION_FAILED',
  EVENT_STORE_ERROR = 'EVENT_STORE_ERROR'
}

// Error Context Schema
export const ErrorContextSchema = z.object({
  operation: z.string().optional(),
  component: z.string().optional(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  requestId: z.string().optional(),
  timestamp: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional()
});

export type ErrorContext = z.infer<typeof ErrorContextSchema>;

// Error Details Schema
export const ErrorDetailsSchema = z.object({
  field: z.string().optional(),
  value: z.any().optional(),
  expected: z.string().optional(),
  actual: z.string().optional(),
  constraint: z.string().optional(),
  suggestion: z.string().optional()
});

export type ErrorDetails = z.infer<typeof ErrorDetailsSchema>;

/**
 * Main OpenCode Error Class
 */
export class OpenCodeError extends Error {
  public readonly category: ErrorCategory;
  public readonly code: ErrorCode;
  public readonly severity: ErrorSeverity;
  public readonly context?: ErrorContext;
  public readonly details?: ErrorDetails;
  public readonly cause?: Error;
  public readonly timestamp: string;
  public readonly correlationId?: string;

  constructor(
    message: string,
    code: ErrorCode,
    category: ErrorCategory,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: ErrorContext,
    details?: ErrorDetails,
    cause?: Error,
    correlationId?: string
  ) {
    super(message);
    
    this.name = 'OpenCodeError';
    this.code = code;
    this.category = category;
    this.severity = severity;
    this.context = {
      timestamp: new Date().toISOString(),
      ...context
    };
    this.details = details;
    this.cause = cause;
    this.timestamp = new Date().toISOString();
    this.correlationId = correlationId;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, OpenCodeError);
    }
  }

  /**
   * Convert error to JSON for logging/serialization
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      category: this.category,
      severity: this.severity,
      context: this.context,
      details: this.details,
      cause: this.cause ? {
        name: this.cause.name,
        message: this.cause.message,
        stack: this.cause.stack
      } : undefined,
      timestamp: this.timestamp,
      correlationId: this.correlationId,
      stack: this.stack
    };
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    const baseMessage = this.message;
    
    if (this.details?.suggestion) {
      return `${baseMessage}\n\n💡 Suggestion: ${this.details.suggestion}`;
    }
    
    return baseMessage;
  }

  /**
   * Check if error is retryable
   */
  isRetryable(): boolean {
    const retryableCodes = [
      ErrorCode.API_TIMEOUT,
      ErrorCode.NETWORK_TIMEOUT,
      ErrorCode.NETWORK_CONNECTION_FAILED,
      ErrorCode.API_RATE_LIMITED,
      ErrorCode.CACHE_CONNECTION_FAILED,
      ErrorCode.SYNC_TIMEOUT
    ];
    
    return retryableCodes.includes(this.code);
  }

  /**
   * Check if error requires user intervention
   */
  requiresUserIntervention(): boolean {
    const interventionCodes = [
      ErrorCode.SECURITY_UNAUTHORIZED,
      ErrorCode.SECURITY_TOKEN_EXPIRED,
      ErrorCode.FILE_ACCESS_DENIED,
      ErrorCode.AGENT_PERMISSION_DENIED,
      ErrorCode.SYNC_CONFLICT
    ];
    
    return interventionCodes.includes(this.code);
  }

  /**
   * Create a new error with additional context
   */
  withContext(additionalContext: Partial<ErrorContext>): OpenCodeError {
    return new OpenCodeError(
      this.message,
      this.code,
      this.category,
      this.severity,
      { ...this.context, ...additionalContext },
      this.details,
      this.cause,
      this.correlationId
    );
  }

  /**
   * Create a new error with a different cause
   */
  withCause(newCause: Error): OpenCodeError {
    return new OpenCodeError(
      this.message,
      this.code,
      this.category,
      this.severity,
      this.context,
      this.details,
      newCause,
      this.correlationId
    );
  }
}

/**
 * Error Factory Functions
 */
export class ErrorFactory {
  /**
   * Create configuration error
   */
  static configuration(
    code: ErrorCode,
    message: string,
    context?: ErrorContext,
    details?: ErrorDetails,
    cause?: Error
  ): OpenCodeError {
    return new OpenCodeError(
      message,
      code,
      ErrorCategory.CONFIGURATION,
      ErrorSeverity.HIGH,
      context,
      details,
      cause
    );
  }

  /**
   * Create sync error
   */
  static sync(
    code: ErrorCode,
    message: string,
    context?: ErrorContext,
    details?: ErrorDetails,
    cause?: Error
  ): OpenCodeError {
    return new OpenCodeError(
      message,
      code,
      ErrorCategory.SYNC,
      ErrorSeverity.MEDIUM,
      context,
      details,
      cause
    );
  }

  /**
   * Create API error
   */
  static api(
    code: ErrorCode,
    message: string,
    context?: ErrorContext,
    details?: ErrorDetails,
    cause?: Error
  ): OpenCodeError {
    return new OpenCodeError(
      message,
      code,
      ErrorCategory.API,
      ErrorSeverity.MEDIUM,
      context,
      details,
      cause
    );
  }

  /**
   * Create agent error
   */
  static agent(
    code: ErrorCode,
    message: string,
    context?: ErrorContext,
    details?: ErrorDetails,
    cause?: Error
  ): OpenCodeError {
    return new OpenCodeError(
      message,
      code,
      ErrorCategory.AGENT,
      ErrorSeverity.MEDIUM,
      context,
      details,
      cause
    );
  }

  /**
   * Create file system error
   */
  static fileSystem(
    code: ErrorCode,
    message: string,
    context?: ErrorContext,
    details?: ErrorDetails,
    cause?: Error
  ): OpenCodeError {
    return new OpenCodeError(
      message,
      code,
      ErrorCategory.FILE_SYSTEM,
      ErrorSeverity.HIGH,
      context,
      details,
      cause
    );
  }

  /**
   * Create network error
   */
  static network(
    code: ErrorCode,
    message: string,
    context?: ErrorContext,
    details?: ErrorDetails,
    cause?: Error
  ): OpenCodeError {
    return new OpenCodeError(
      message,
      code,
      ErrorCategory.NETWORK,
      ErrorSeverity.MEDIUM,
      context,
      details,
      cause
    );
  }

  /**
   * Create validation error
   */
  static validation(
    code: ErrorCode,
    message: string,
    context?: ErrorContext,
    details?: ErrorDetails,
    cause?: Error
  ): OpenCodeError {
    return new OpenCodeError(
      message,
      code,
      ErrorCategory.VALIDATION,
      ErrorSeverity.LOW,
      context,
      details,
      cause
    );
  }

  /**
   * Create security error
   */
  static security(
    code: ErrorCode,
    message: string,
    context?: ErrorContext,
    details?: ErrorDetails,
    cause?: Error
  ): OpenCodeError {
    return new OpenCodeError(
      message,
      code,
      ErrorCategory.SECURITY,
      ErrorSeverity.HIGH,
      context,
      details,
      cause
    );
  }

  /**
   * Create plugin error
   */
  static plugin(
    code: ErrorCode,
    message: string,
    context?: ErrorContext,
    details?: ErrorDetails,
    cause?: Error
  ): OpenCodeError {
    return new OpenCodeError(
      message,
      code,
      ErrorCategory.PLUGIN,
      ErrorSeverity.MEDIUM,
      context,
      details,
      cause
    );
  }

  /**
   * Create cache error
   */
  static cache(
    code: ErrorCode,
    message: string,
    context?: ErrorContext,
    details?: ErrorDetails,
    cause?: Error
  ): OpenCodeError {
    return new OpenCodeError(
      message,
      code,
      ErrorCategory.CACHE,
      ErrorSeverity.LOW,
      context,
      details,
      cause
    );
  }

  /**
   * Create event error
   */
  static event(
    code: ErrorCode,
    message: string,
    context?: ErrorContext,
    details?: ErrorDetails,
    cause?: Error
  ): OpenCodeError {
    return new OpenCodeError(
      message,
      code,
      ErrorCategory.EVENT,
      ErrorSeverity.MEDIUM,
      context,
      details,
      cause
    );
  }
}

/**
 * Error Handler Utility
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorListeners: Array<(error: OpenCodeError) => void> = [];

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Add error listener
   */
  addListener(listener: (error: OpenCodeError) => void): void {
    this.errorListeners.push(listener);
  }

  /**
   * Remove error listener
   */
  removeListener(listener: (error: OpenCodeError) => void): void {
    const index = this.errorListeners.indexOf(listener);
    if (index > -1) {
      this.errorListeners.splice(index, 1);
    }
  }

  /**
   * Handle error
   */
  handle(error: Error | OpenCodeError, context?: ErrorContext): OpenCodeError {
    let openCodeError: OpenCodeError;

    if (error instanceof OpenCodeError) {
      openCodeError = context ? error.withContext(context) : error;
    } else {
      // Convert regular Error to OpenCodeError
      openCodeError = new OpenCodeError(
        error.message,
        ErrorCode.VALIDATION_FAILED,
        ErrorCategory.VALIDATION,
        ErrorSeverity.MEDIUM,
        context,
        undefined,
        error
      );
    }

    // Notify listeners
    this.errorListeners.forEach(listener => {
      try {
        listener(openCodeError);
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError);
      }
    });

    return openCodeError;
  }

  /**
   * Handle and log error
   */
  handleAndLog(error: Error | OpenCodeError, context?: ErrorContext): OpenCodeError {
    const openCodeError = this.handle(error, context);
    console.error('OpenCode Error:', JSON.stringify(openCodeError.toJSON(), null, 2));
    return openCodeError;
  }

  /**
   * Wrap function with error handling
   */
  wrap<T extends any[], R>(
    fn: (...args: T) => R,
    context?: ErrorContext
  ): (...args: T) => R {
    return (...args: T): R => {
      try {
        return fn(...args);
      } catch (error) {
        throw this.handle(error as Error, context);
      }
    };
  }

  /**
   * Wrap async function with error handling
   */
  wrapAsync<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    context?: ErrorContext
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      try {
        return await fn(...args);
      } catch (error) {
        throw this.handle(error as Error, context);
      }
    };
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

// Re-export utilities
export * from './utils.js';