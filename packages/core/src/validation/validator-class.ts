import { z } from 'zod';
import { ValidationResult, ValidationError } from '../types/index.js';
import chalk from 'chalk';

/**
 * Core validation utilities
 */
export class Validator {
  /**
   * Validate data against schema
   */
  validate<T>(data: unknown, schema: z.ZodSchema<T>): ValidationResult {
    try {
      const result = schema.safeParse(data);
      
      if (result.success) {
        return {
          valid: true,
          errors: [],
          warnings: []
        };
      } else {
        return {
          valid: false,
          errors: result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
          warnings: []
        };
      }
    } catch (error) {
      return {
        valid: false,
        errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: []
      };
    }
  }

  /**
   * Sanitize data by removing potentially dangerous content
   */
  sanitize<T>(data: unknown): T {
    if (typeof data === 'string') {
      // Remove potentially dangerous HTML/JS content
      return data.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*?<\/script>/gi, '')
                 .replace(/javascript:/gi, '')
                 .replace(/on\w+\s*=/gi, '') as T;
    }
    
    if (typeof data === 'object' && data !== null) {
      // Recursively sanitize object properties
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = this.sanitize(value);
      }
      return sanitized;
    }
    
    return data as T;
  }

  /**
   * Validate configuration with detailed error reporting
   */
  validateConfig(config: unknown): ValidationResult {
    const result = this.validate(config, z.object({
      version: z.string().min(1, 'Version is required'),
      name: z.string().optional(),
      description: z.string().optional(),
      plugins: z.array(z.object({
        name: z.string(),
        version: z.string(),
        enabled: z.boolean(),
        config: z.record(z.any()).optional()
      })).optional()
    }));

    if (!result.valid) {
      console.error(chalk.red('❌ Configuration validation failed:'));
      result.errors.forEach(error => {
        console.error(chalk.red(`  • ${error}`));
      });
    }

    return result;
  }

  /**
   * Validate plugin configuration
   */
  validatePlugin(plugin: unknown): ValidationResult {
    const result = this.validate(plugin, z.object({
      name: z.string().min(1, 'Plugin name is required'),
      version: z.string().min(1, 'Plugin version is required'),
      enabled: z.boolean(),
      config: z.record(z.any()).optional()
    }));

    if (!result.valid) {
      console.error(chalk.red(`❌ Plugin validation failed:`));
      result.errors.forEach(error => {
        console.error(chalk.red(`  • ${error}`));
      });
    }

    return result;
  }

  /**
   * Validate security context
   */
  validateSecurityContext(context: unknown): ValidationResult {
    const result = this.validate(context, z.object({
      user: z.string().min(1, 'User is required'),
      permissions: z.array(z.string()).min(0, 'Permissions array required'),
      session: z.string().optional(),
      timestamp: z.number()
    }));

    return result;
  }
}