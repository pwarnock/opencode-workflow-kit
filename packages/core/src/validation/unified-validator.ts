/**
 * Unified validation framework with business rules
 */

import { z } from 'zod';
import { 
  UnifiedConfig, 
  SyncConfig, 
  ValidationResult
} from '../types/index.js';
import { 
  OpenCodeError, 
  ErrorFactory, 
  ErrorCode,
  ErrorContext,
  errorHandler
} from '../errors/index.js';

/**
 * Business rule definition
 */
export interface BusinessRule<T = any> {
  name: string;
  description: string;
  validate: (data: T) => BusinessRuleResult;
  severity: 'error' | 'warning' | 'info';
  category: string;
}

/**
 * Business rule validation result
 */
export interface BusinessRuleResult {
  valid: boolean;
  message: string;
  suggestion?: string;
  metadata?: Record<string, any>;
}

/**
 * Comprehensive validation result with business rules
 */
export interface ComprehensiveValidationResult extends ValidationResult {
  businessRules: {
    passed: string[];
    failed: Array<{
      rule: string;
      message: string;
      severity: 'error' | 'warning' | 'info';
      suggestion?: string;
    }>;
  };
  schemaErrors: Array<{
    path: string;
    message: string;
    code: string;
  }>;
  metadata: {
    validationTime: number;
    rulesExecuted: number;
    schemasValidated: number;
  };
}

/**
 * Validation context for tracking validation operations
 */
export interface ValidationContext {
  operation: string;
  component: string;
  userId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
}

/**
 * Custom schema registration
 */
export interface SchemaRegistration {
  name: string;
  schema: z.ZodSchema<any>;
  businessRules?: BusinessRule[];
  metadata?: Record<string, any>;
}

/**
 * Unified Validator with schema validation and business rules
 */
export class UnifiedValidator {
  private schemas = new Map<string, SchemaRegistration>();
  private businessRules = new Map<string, BusinessRule[]>();
  private validationHistory: ComprehensiveValidationResult[] = [];

  constructor() {
    this.initializeBuiltInSchemas();
    this.initializeBuiltInRules();
  }

  /**
   * Validate data against schema and business rules
   */
  async validate<T>(
    data: unknown,
    schemaName: string,
    context?: ValidationContext
  ): Promise<ComprehensiveValidationResult> {
    const startTime = Date.now();
    
    try {
      const registration = this.schemas.get(schemaName);
      if (!registration) {
        throw ErrorFactory.validation(
          ErrorCode.VALIDATION_SCHEMA_ERROR,
          `Schema not found: ${schemaName}`,
          context
        );
      }

      const result: ComprehensiveValidationResult = {
        valid: true,
        errors: [],
        warnings: [],
        businessRules: {
          passed: [],
          failed: []
        },
        schemaErrors: [],
        metadata: {
          validationTime: 0,
          rulesExecuted: 0,
          schemasValidated: 1
        }
      };

      // Schema validation
      const schemaResult = registration.schema.safeParse(data);
      if (!schemaResult.success) {
        result.valid = false;
        result.schemaErrors = schemaResult.error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code
        }));
        result.errors = result.schemaErrors.map(err => `${err.path}: ${err.message}`);
      }

      // Business rule validation
      const businessRuleResults = await this.validateBusinessRules(
        data as T,
        registration.businessRules || [],
        context
      );

      result.businessRules = businessRuleResults;
      
      // Check for business rule errors
      const ruleErrors = businessRuleResults.failed.filter(r => r.severity === 'error');
      const ruleWarnings = businessRuleResults.failed.filter(r => r.severity === 'warning');

      if (ruleErrors.length > 0) {
        result.valid = false;
        result.errors.push(...ruleErrors.map(r => r.message));
      }

      if (ruleWarnings.length > 0) {
        result.warnings.push(...ruleWarnings.map(r => r.message));
      }

      result.metadata.validationTime = Date.now() - startTime;
      result.metadata.rulesExecuted = businessRuleResults.passed.length + businessRuleResults.failed.length;

      // Store in history
      this.validationHistory.push(result);
      
      // Keep history size manageable
      if (this.validationHistory.length > 100) {
        this.validationHistory = this.validationHistory.slice(-50);
      }

      return result;

    } catch (error) {
      throw errorHandler.handle(error as Error, {
        operation: 'validate',
        component: 'UnifiedValidator',
        ...context
      });
    }
  }

  /**
   * Validate unified configuration
   */
  async validateUnifiedConfig(
    config: unknown,
    context?: ValidationContext
  ): Promise<ComprehensiveValidationResult> {
    return this.validate(config, 'unified-config', {
      operation: 'validate-unified-config',
      component: 'ConfigurationManager',
      ...context
    });
  }

  /**
   * Validate sync configuration
   */
  async validateSyncConfig(
    config: unknown,
    context?: ValidationContext
  ): Promise<ComprehensiveValidationResult> {
    return this.validate(config, 'sync-config', {
      operation: 'validate-sync-config',
      component: 'SyncEngine',
      ...context
    });
  }

  /**
   * Register custom schema
   */
  registerSchema(registration: SchemaRegistration): void {
    this.schemas.set(registration.name, registration);
    
    if (registration.businessRules) {
      this.businessRules.set(registration.name, registration.businessRules);
    }
  }

  /**
   * Register business rule for schema
   */
  registerBusinessRule(schemaName: string, rule: BusinessRule): void {
    const existingRules = this.businessRules.get(schemaName) || [];
    existingRules.push(rule);
    this.businessRules.set(schemaName, existingRules);

    // Also add to schema registration if it exists
    const registration = this.schemas.get(schemaName);
    if (registration) {
      registration.businessRules = existingRules;
    }
  }

  /**
   * Get registered schemas
   */
  getRegisteredSchemas(): string[] {
    return Array.from(this.schemas.keys());
  }

  /**
   * Get business rules for schema
   */
  getBusinessRules(schemaName: string): BusinessRule[] {
    return this.businessRules.get(schemaName) || [];
  }

  /**
   * Get validation history
   */
  getValidationHistory(limit?: number): ComprehensiveValidationResult[] {
    return limit ? this.validationHistory.slice(-limit) : this.validationHistory;
  }

  /**
   * Clear validation history
   */
  clearHistory(): void {
    this.validationHistory = [];
  }

  /**
   * Validate business rules for data
   */
  private async validateBusinessRules<T>(
    data: T,
    rules: BusinessRule<T>[],
    context?: ValidationContext
  ): Promise<ComprehensiveValidationResult['businessRules']> {
    const result = {
      passed: [] as string[],
      failed: [] as Array<{
        rule: string;
        message: string;
        severity: 'error' | 'warning' | 'info';
        suggestion?: string;
      }>
    };

    for (const rule of rules) {
      try {
        const ruleResult = rule.validate(data);
        
        if (ruleResult.valid) {
          result.passed.push(rule.name);
        } else {
          result.failed.push({
            rule: rule.name,
            message: ruleResult.message,
            severity: rule.severity,
            suggestion: ruleResult.suggestion
          });
        }
      } catch (error) {
        result.failed.push({
          rule: rule.name,
          message: `Business rule execution failed: ${(error as Error).message}`,
          severity: 'error',
          suggestion: 'Check business rule implementation'
        });
      }
    }

    return result;
  }

  /**
   * Initialize built-in schemas
   */
  private initializeBuiltInSchemas(): void {
    // Unified Config Schema
    this.registerSchema({
      name: 'unified-config',
      schema: z.object({
        version: z.string().min(1, 'Version is required'),
        name: z.string().optional(),
        description: z.string().optional(),
        github: z.object({
          token: z.string().min(1, 'GitHub token is required when github config is provided'),
          username: z.string().optional(),
          repository: z.string().optional(),
          apiUrl: z.string().url().optional(),
          timeout: z.number().min(1000).max(300000).default(30000),
          retries: z.number().min(0).max(10).default(3)
        }).optional(),
        cody: z.object({
          enabled: z.boolean().default(true),
          workspacePath: z.string().optional(),
          configPath: z.string().optional()
        }).optional(),
        beads: z.object({
          enabled: z.boolean().default(true),
          dataPath: z.string().optional(),
          autoSync: z.boolean().default(true),
          syncInterval: z.number().min(60000).default(300000)
        }).optional(),
        sync: z.object({
          enabled: z.boolean().default(true),
          direction: z.enum(['bidirectional', 'github-to-beads', 'beads-to-github']).default('bidirectional'),
          conflictResolution: z.enum(['manual', 'github-wins', 'beads-wins', 'most-recent']).default('manual')
        }).optional()
      }),
      businessRules: [
        {
          name: 'version-semver',
          description: 'Version should follow semantic versioning',
          validate: (data: any) => {
            const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;
            return {
              valid: semverRegex.test(data.version),
              message: semverRegex.test(data.version) ? '' : 'Version should follow semantic versioning (e.g., 1.0.0)',
              suggestion: 'Use semantic versioning format: MAJOR.MINOR.PATCH'
            };
          },
          severity: 'warning' as const,
          category: 'versioning'
        },
        {
          name: 'sync-interval-reasonable',
          description: 'Sync interval should be reasonable (not too frequent)',
          validate: (data: any) => {
            if (!data.sync?.enabled || !data.beads?.autoSync) {
              return { valid: true, message: '' };
            }
            
            const interval = data.sync?.interval || data.beads?.syncInterval || 300000;
            const isReasonable = interval >= 60000; // At least 1 minute
            
            return {
              valid: isReasonable,
              message: isReasonable ? '' : 'Sync interval should be at least 1 minute to avoid excessive API calls',
              suggestion: 'Set sync interval to 60000ms (1 minute) or more'
            };
          },
          severity: 'warning' as const,
          category: 'performance'
        }
      ]
    });

    // Sync Config Schema
    this.registerSchema({
      name: 'sync-config',
      schema: z.object({
        enabled: z.boolean().default(true),
        direction: z.enum(['bidirectional', 'github-to-beads', 'beads-to-github']).default('bidirectional'),
        conflictResolution: z.enum(['manual', 'github-wins', 'beads-wins', 'most-recent']).default('manual'),
        batchProcessing: z.object({
          enabled: z.boolean().default(true),
          batchSize: z.number().min(1).max(1000).default(50),
          delay: z.number().min(100).max(10000).default(1000)
        }).optional(),
        filters: z.object({
          labels: z.array(z.string()).optional(),
          states: z.array(z.string()).optional(),
          assignees: z.array(z.string()).optional()
        }).optional()
      }),
      businessRules: [
        {
          name: 'batch-size-reasonable',
          description: 'Batch size should be reasonable for API limits',
          validate: (data: any) => {
            if (!data.batchProcessing?.enabled) {
              return { valid: true, message: '' };
            }
            
            const batchSize = data.batchProcessing?.batchSize || 50;
            const isReasonable = batchSize <= 100;
            
            return {
              valid: isReasonable,
              message: isReasonable ? '' : 'Batch size should be 100 or less to avoid API rate limiting',
              suggestion: 'Use batch size of 50 or less for optimal performance'
            };
          },
          severity: 'warning' as const,
          category: 'performance'
        },
        {
          name: 'conflict-resolution-strategy',
          description: 'Conflict resolution strategy should be appropriate for use case',
          validate: (data: any) => {
            const strategy = data.conflictResolution;
            
            if (strategy === 'manual' && !data.filters) {
              return {
                valid: false,
                message: 'Manual conflict resolution requires filters to limit conflicts',
                suggestion: 'Add filters to reduce potential conflicts or use automatic resolution'
              };
            }
            
            return { valid: true, message: '' };
          },
          severity: 'error' as const,
          category: 'reliability'
        }
      ]
    });
  }

  /**
   * Initialize built-in business rules
   */
  private initializeBuiltInRules(): void {
    // Common validation rules can be added here
  }

  /**
   * Create validation summary
   */
  createSummary(results: ComprehensiveValidationResult[]): {
    total: number;
    valid: number;
    invalid: number;
    averageValidationTime: number;
    commonErrors: Array<{ error: string; count: number }>;
    commonWarnings: Array<{ warning: string; count: number }>;
  } {
    const total = results.length;
    const valid = results.filter(r => r.valid).length;
    const invalid = total - valid;
    
    const averageValidationTime = results.reduce((sum, r) => sum + r.metadata.validationTime, 0) / total;
    
    // Count common errors
    const errorCounts = new Map<string, number>();
    const warningCounts = new Map<string, number>();
    
    results.forEach(result => {
      result.errors.forEach(error => {
        errorCounts.set(error, (errorCounts.get(error) || 0) + 1);
      });
      
      result.warnings.forEach(warning => {
        warningCounts.set(warning, (warningCounts.get(warning) || 0) + 1);
      });
    });
    
    const commonErrors = Array.from(errorCounts.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    const commonWarnings = Array.from(warningCounts.entries())
      .map(([warning, count]) => ({ warning, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      total,
      valid,
      invalid,
      averageValidationTime,
      commonErrors,
      commonWarnings
    };
  }
}