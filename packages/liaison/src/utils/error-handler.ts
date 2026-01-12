import chalk from 'chalk';

export interface ErrorContext {
  command: string;
  operation: string;
  filePath?: string;
  additionalInfo?: Record<string, unknown>;
}

export interface RecoverySuggestion {
  action: string;
  command?: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export interface FormattedError {
  message: string;
  code?: string;
  suggestions: RecoverySuggestion[];
  context: ErrorContext;
  originalError?: unknown;
}

export interface ErrorCategory {
  code: string;
  pattern: RegExp;
  category: 'network' | 'permissions' | 'git' | 'input' | 'filesystem' | 'validation' | 'unknown';
  defaultMessage: string;
  getSuggestions: (error: Error, context: ErrorContext) => RecoverySuggestion[];
}

const ERROR_CATEGORIES: ErrorCategory[] = [
  {
    code: 'PERMISSION_DENIED',
    pattern: /EACCES|permission denied|not allowed|Access is denied/i,
    category: 'permissions',
    defaultMessage: 'Permission denied when accessing a resource',
    getSuggestions: (error: Error, context: ErrorContext) => [
      {
        action: 'Check file permissions',
        command: `chmod 600 ${context.filePath || '<file>'}`,
        description: 'Ensure you have read/write access to the file',
        priority: 'high',
      },
      {
        action: 'Run with elevated permissions',
        command: context.command,
        description: 'Try running the command with sudo (Unix) or as administrator (Windows)',
        priority: 'medium',
      },
      {
        action: 'Verify ownership',
        command: `ls -la ${context.filePath || '.'}`,
        description: 'Check file ownership and permissions',
        priority: 'medium',
      },
    ],
  },
  {
    code: 'FILE_NOT_FOUND',
    pattern: /ENOENT|no such file|not found|cannot find/i,
    category: 'filesystem',
    defaultMessage: 'File or directory not found',
    getSuggestions: (error: Error, context: ErrorContext) => [
      {
        action: 'Verify file path',
        command: `ls -la ${context.filePath || '.'}`,
        description: 'Check if the file or directory exists',
        priority: 'high',
      },
      {
        action: 'Create parent directory',
        command: `mkdir -p ${context.filePath?.split('/').slice(0, -1).join('/') || '<path>'}`,
        description: 'Create the parent directory if it does not exist',
        priority: 'high',
      },
      {
        action: 'Check working directory',
        command: 'pwd && ls -la',
        description: 'Verify you are in the correct directory',
        priority: 'medium',
      },
    ],
  },
  {
    code: 'GIT_CONFLICT',
    pattern: /git|merge conflict|conflict|concurrent modification/i,
    category: 'git',
    defaultMessage: 'Git or version control conflict detected',
    getSuggestions: (error: Error, context: ErrorContext) => [
      {
        action: 'Pull latest changes',
        command: 'git pull',
        description: 'Pull the latest changes from remote',
        priority: 'high',
      },
      {
        action: 'Resolve conflicts',
        command: 'git status',
        description: 'Check git status and resolve any conflicts',
        priority: 'high',
      },
      {
        action: 'Create backup and continue',
        command: 'liaison config export --output backup.json',
        description: 'Export your current config before resolving',
        priority: 'medium',
      },
    ],
  },
  {
    code: 'NETWORK_ERROR',
    pattern: /network|ECONNREFUSED|ETIMEDOUT|dns|socket|fetch|request/i,
    category: 'network',
    defaultMessage: 'Network error occurred',
    getSuggestions: (error: Error, context: ErrorContext) => [
      {
        action: 'Check internet connection',
        command: 'ping -c 3 google.com',
        description: 'Verify your internet connection is working',
        priority: 'high',
      },
      {
        action: 'Check proxy settings',
        command: 'env | grep -i proxy',
        description: 'Verify proxy configuration if behind a firewall',
        priority: 'medium',
      },
      {
        action: 'Retry operation',
        command: context.command,
        description: 'The error may be transient - try again',
        priority: 'medium',
      },
    ],
  },
  {
    code: 'INVALID_INPUT',
    pattern: /invalid|invalid syntax|type error|undefined|null|expected/i,
    category: 'input',
    defaultMessage: 'Invalid input or configuration',
    getSuggestions: (error: Error, context: ErrorContext) => [
      {
        action: 'Validate configuration',
        command: `liaison config validate -d ${context.filePath || '.'}`,
        description: 'Run validation on your configuration',
        priority: 'high',
      },
      {
        action: 'Check command syntax',
        command: context.command.split(' ')[0] + ' --help',
        description: 'Review the command documentation',
        priority: 'high',
      },
      {
        action: 'Reset to defaults',
        command: `liaison config opencode --overwrite`,
        description: 'Reset configuration to default values',
        priority: 'medium',
      },
    ],
  },
  {
    code: 'VALIDATION_ERROR',
    pattern: /validation|schema|required|missing|constraint/i,
    category: 'validation',
    defaultMessage: 'Configuration validation failed',
    getSuggestions: (error: Error, context: ErrorContext) => [
      {
        action: 'Check configuration format',
        command: `cat ${context.filePath || '<file>'}`,
        description: 'Review the configuration file for syntax errors',
        priority: 'high',
      },
      {
        action: 'Use a JSON validator',
        command: 'cat config.json | python3 -m json.tool',
        description: 'Validate JSON syntax',
        priority: 'high',
      },
      {
        action: 'View template',
        command: `liaison config template`,
        description: 'Check available templates for required fields',
        priority: 'medium',
      },
    ],
  },
  {
    code: 'FILESYSTEM_ERROR',
    pattern: /ENOSPC|EMFILE|EBUSY|disk|storage|space/i,
    category: 'filesystem',
    defaultMessage: 'Filesystem error occurred',
    getSuggestions: (error: Error, context: ErrorContext) => [
      {
        action: 'Check disk space',
        command: 'df -h',
        description: 'Ensure sufficient disk space is available',
        priority: 'high',
      },
      {
        action: 'Close open files',
        command: 'lsof | grep deleted',
        description: 'Close any deleted but open file handles',
        priority: 'medium',
      },
      {
        action: 'Clean up backups',
        command: 'liaison cleanup --backups',
        description: 'Remove old backup files to free space',
        priority: 'medium',
      },
    ],
  },
];

function categorizeError(error: unknown): ErrorCategory {
  const errorMessage = error instanceof Error ? error.message : String(error);

  for (const category of ERROR_CATEGORIES) {
    if (category.pattern.test(errorMessage)) {
      return category;
    }
  }

  return {
    code: 'UNKNOWN_ERROR',
    pattern: /./,
    category: 'unknown',
    defaultMessage: 'An unexpected error occurred',
    getSuggestions: (error: Error, context: ErrorContext) => [
      {
        action: 'Check command documentation',
        command: context.command.split(' ')[0] + ' --help',
        description: 'Review the command documentation',
        priority: 'high',
      },
      {
        action: 'Verify installation',
        command: 'liaison --version',
        description: 'Ensure liaison is properly installed',
        priority: 'medium',
      },
      {
        action: 'Run with verbose output',
        command: `${context.command} -v`,
        description: 'Get more detailed error information',
        priority: 'medium',
      },
    ],
  };
}

function extractErrorCode(error: unknown): string | undefined {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const codeMatch = errorMessage.match(/\[([A-Z0-9_]+)\]/);
  return codeMatch?.[1];
}

export function handleError(
  error: unknown,
  context: ErrorContext
): FormattedError {
  const category = categorizeError(error);
  const errorCode = extractErrorCode(error) || category.code;
  const suggestions = category.getSuggestions(
    error instanceof Error ? error : new Error(String(error)),
    context
  );

  return {
    message: category.defaultMessage,
    code: errorCode,
    suggestions,
    context,
    originalError: error,
  };
}

export function formatError(error: FormattedError): string {
  const parts: string[] = [];

  parts.push(chalk.red('❌ ' + error.message));

  if (error.code) {
    parts.push(chalk.gray(`  Error code: ${error.code}`));
  }

  if (error.context.filePath) {
    parts.push(chalk.gray(`  File: ${error.context.filePath}`));
  }

  if (error.context.operation) {
    parts.push(chalk.gray(`  Operation: ${error.context.operation}`));
  }

  if (error.originalError instanceof Error && error.originalError.message) {
    parts.push(chalk.gray(`  Details: ${error.originalError.message}`));
  }

  parts.push('');
  parts.push(chalk.yellow('💡 Suggested recovery actions:'));

  const sortedSuggestions = error.suggestions.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  for (const suggestion of sortedSuggestions) {
    const icon = suggestion.priority === 'high' ? '🔴' :
                 suggestion.priority === 'medium' ? '🟡' : '🟢';
    parts.push(`${icon} ${chalk.cyan(suggestion.action)}`);
    if (suggestion.command) {
      parts.push(chalk.gray(`   Command: ${suggestion.command}`));
    }
    parts.push(chalk.gray(`   ${suggestion.description}`));
    parts.push('');
  }

  return parts.join('\n');
}

export function suggestRecovery(error: unknown): RecoverySuggestion[] {
  const category = categorizeError(error);
  const context: ErrorContext = {
    command: '',
    operation: '',
  };

  return category.getSuggestions(
    error instanceof Error ? error : new Error(String(error)),
    context
  );
}

export function createErrorHandler(context: ErrorContext) {
  return {
    handle: (error: unknown) => handleError(error, context),
    format: (error: unknown) => formatError(handleError(error, context)),
    exit: (error: unknown) => {
      console.error(formatError(handleError(error, context)));
      process.exit(1);
    },
  };
}

export function withErrorHandling<T>(
  operation: () => T,
  context: ErrorContext
): T {
  try {
    return operation();
  } catch (error) {
    console.error(formatError(handleError(error, context)));
    process.exit(1);
  }
}

export async function withAsyncErrorHandling<T>(
  operation: () => Promise<T>,
  context: ErrorContext
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error(formatError(handleError(error, context)));
    process.exit(1);
  }
}

export function getErrorCategory(error: unknown): string {
  return categorizeError(error).category;
}

export function isRetryableError(error: unknown): boolean {
  const category = categorizeError(error);
  return ['network', 'filesystem'].includes(category.category);
}

export function logError(error: FormattedError): void {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] [${error.code || 'UNKNOWN'}] ${error.message} | Context: ${JSON.stringify(error.context)}`;

  console.error(chalk.gray(logLine));
}
