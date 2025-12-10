/**
 * Error definitions for the workflow engine
 */

export enum ErrorCode {
  WORKFLOW_NOT_FOUND = "WORKFLOW_NOT_FOUND",
  WORKFLOW_ALREADY_RUNNING = "WORKFLOW_ALREADY_RUNNING",
  WORKFLOW_FAILED = "WORKFLOW_FAILED",
  STEP_FAILED = "STEP_FAILED",
  INVALID_CONFIGURATION = "INVALID_CONFIGURATION",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  TIMEOUT = "TIMEOUT",
  CANCELLED = "CANCELLED",
  WORKFLOW_REGISTRATION_FAILED = "WORKFLOW_REGISTRATION_FAILED",
  WORKFLOW_UNREGISTRATION_FAILED = "WORKFLOW_UNREGISTRATION_FAILED",
  WORKFLOW_DISABLED = "WORKFLOW_DISABLED",
  FILE_WATCHER_SETUP_FAILED = "FILE_WATCHER_SETUP_FAILED",
  VALIDATION_FAILED = "VALIDATION_FAILED",
}

export class ErrorFactory {
  static create(
    code: ErrorCode,
    message: string,
    details?: any,
  ): OpenCodeError {
    return new OpenCodeError(message, code, details);
  }

  static workflow = {
    registrationFailed: (message: string, details?: any) =>
      new OpenCodeError(
        message,
        ErrorCode.WORKFLOW_REGISTRATION_FAILED,
        details,
      ),
    unregistrationFailed: (message: string, details?: any) =>
      new OpenCodeError(
        message,
        ErrorCode.WORKFLOW_UNREGISTRATION_FAILED,
        details,
      ),
    disabled: (message: string, details?: any) =>
      new OpenCodeError(message, ErrorCode.WORKFLOW_DISABLED, details),
    notFound: (message: string, details?: any) =>
      new OpenCodeError(message, ErrorCode.WORKFLOW_NOT_FOUND, details),
    alreadyRunning: (message: string, details?: any) =>
      new OpenCodeError(message, ErrorCode.WORKFLOW_ALREADY_RUNNING, details),
    failed: (message: string, details?: any) =>
      new OpenCodeError(message, ErrorCode.WORKFLOW_FAILED, details),
  };

  static fileWatcher = {
    setupFailed: (message: string, details?: any) =>
      new OpenCodeError(message, ErrorCode.FILE_WATCHER_SETUP_FAILED, details),
  };

  static validation = {
    failed: (message: string, details?: any) =>
      new OpenCodeError(message, ErrorCode.VALIDATION_FAILED, details),
  };
}

export class OpenCodeError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public details?: any,
  ) {
    super(message);
    this.name = "OpenCodeError";
  }
}
