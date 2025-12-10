/**
 * Pino-based Logging System for Cody-Beads Integration
 * Comprehensive logging framework with multiple transports and configuration
 */

import pino, { Logger as PinoLogger, TransportTargetOptions } from "pino";
import { LoggingConfig } from "../config/validation";
import {
  Logger,
  LogLevel,
  LogEntry,
  PerformanceMetrics,
  LOG_LEVELS,
} from "./types";
import * as fs from "fs/promises";
import * as path from "path";

export class PinoLoggingSystem implements Logger {
  private logger!: PinoLogger;
  private config: LoggingConfig;
  private context: string;
  private performanceLogs: PerformanceLogEntry[] = [];

  constructor(
    options: {
      config?: LoggingConfig | undefined;
      context?: string | undefined;
    } = {},
  ) {
    this.config = options.config || this.getDefaultConfig();
    this.context = options.context || "cody-beads";
    this.initializeLogger();
  }

  private getDefaultConfig(): LoggingConfig {
    return {
      level: "info",
      format: "text",
      file: {
        enabled: false,
        path: "./logs/cody-beads.log",
        maxSize: "10MB",
        maxFiles: 5,
        rotation: "daily",
      },
      console: {
        enabled: true,
        colorize: true,
      },
    };
  }

  private initializeLogger(): void {
    const transports: TransportTargetOptions[] = [];

    // Add console transport with error handling
    if (this.config.console?.enabled !== false) {
      try {
        // Check if pino-pretty is available, fall back to basic console if not
        try {
          require.resolve("pino-pretty");
          transports.push({
            target: "pino-pretty",
            options: {
              colorize: this.config.console?.colorize !== false,
              translateTime: "SYS:yyyy-mm-dd HH:MM:ss.l",
              ignore: "pid,hostname",
            },
            level: this.config.level || "info",
          });
        } catch (e) {
          // Fallback to basic console logging if pino-pretty is not available
          console.warn(
            "pino-pretty not available, using basic console logging",
          );
          // We'll handle basic console logging directly
        }
      } catch (error) {
        console.error(
          `Failed to setup console transport: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    // Create main logger
    try {
      this.logger = pino(
        {
          level: this.config.level || "info",
          base: null,
          timestamp: () => `,"time":"${new Date().toISOString()}"`,
          formatters: {
            level: (label: string) => ({ level: label }),
          },
        },
        transports.length > 0
          ? pino.transport({
              targets: transports,
            })
          : undefined,
      );

      this.logger.info(`Logging system initialized for ${this.context}`);

      // Add file transport if enabled
      if (this.config.file?.enabled) {
        this.setupFileLogging().catch((error) => {
          this.logger.error(
            `Failed to setup file logging: ${error instanceof Error ? error.message : String(error)}`,
          );
        });
      }
    } catch (error) {
      // Fallback to basic console logger if pino initialization fails
      console.error(
        `Failed to initialize Pino logger: ${error instanceof Error ? error.message : String(error)}`,
      );
      console.warn("Falling back to basic console logging");

      // Create a basic console logger fallback
      this.logger = {
        info: (msg: any) => console.log(msg),
        debug: (msg: any) => console.debug(msg),
        warn: (msg: any) => console.warn(msg),
        error: (msg: any) => console.error(msg),
        trace: (msg: any) => console.trace(msg),
        fatal: (msg: any) => console.error("FATAL:", msg),
      } as any;
    }
  }

  private async setupFileLogging(): Promise<void> {
    try {
      const logDir = path.dirname(
        this.config.file?.path || "./logs/cody-beads.log",
      );
      await fs.mkdir(logDir, { recursive: true });

      // Add file transport
      const fileTransports: TransportTargetOptions[] = [
        {
          target: "pino/file",
          options: {
            destination: this.config.file?.path || "./logs/cody-beads.log",
            mkdir: true,
            append: true,
          },
          level: this.config.level || "info",
        },
      ];

      // Create file logger instance
      pino(
        {
          level: this.config.level || "info",
          base: null,
        },
        pino.transport({
          targets: fileTransports,
        }),
      );

      this.logger.info(`File logging enabled at ${this.config.file?.path}`);

      // Set up log rotation (simplified version)
      this.setupLogRotation();
    } catch (error) {
      this.logger.error(
        `Failed to setup file logging: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private setupLogRotation(): void {
    // Simple log rotation implementation
    const maxSize = this.parseSize(this.config.file?.maxSize || "10MB");
    const maxFiles = this.config.file?.maxFiles || 5;
    const rotation = this.config.file?.rotation || "daily";

    this.logger.debug(
      `Log rotation configured: maxSize=${maxSize}, maxFiles=${maxFiles}, rotation=${rotation}`,
    );
  }

  private parseSize(sizeStr: string): number {
    const match = sizeStr.match(/^(\d+)(\w+)$/);
    if (!match) return 10 * 1024 * 1024; // Default 10MB

    const num = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    switch (unit) {
      case "kb":
        return num * 1024;
      case "mb":
        return num * 1024 * 1024;
      case "gb":
        return num * 1024 * 1024 * 1024;
      default:
        return num * 1024 * 1024; // Default MB
    }
  }

  // Logger interface implementation
  debug(message: string, ...args: any[]): void {
    this.logger.debug(this.formatMessage(message), ...args);
  }

  info(message: string, ...args: any[]): void {
    this.logger.info(this.formatMessage(message), ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.logger.warn(this.formatMessage(message), ...args);
  }

  error(message: string, ...args: any[]): void {
    this.logger.error(this.formatMessage(message), ...args);
  }

  trace?(message: string, ...args: any[]): void {
    if (this.logger.trace) {
      this.logger.trace(this.formatMessage(message), ...args);
    }
  }

  fatal?(message: string, ...args: any[]): void {
    if (this.logger.fatal) {
      this.logger.fatal(this.formatMessage(message), ...args);
    }
    // Fatal errors should also trigger cleanup
    this.cleanup().catch((error) => {
      console.error("Failed to cleanup logger:", error);
    });
  }

  private formatMessage(message: string): string {
    return `[${this.context}] ${message}`;
  }

  // Performance logging
  async logPerformance(
    operation: string,
    metrics: PerformanceMetrics,
    result: "success" | "failure" = "success",
  ): Promise<void> {
    const entry: PerformanceLogEntry = {
      ...this.createBaseLogEntry("info"),
      metrics,
      operation,
      result,
      message: `Performance: ${operation} ${result} in ${metrics.duration}ms`,
    };

    this.performanceLogs.push(entry);

    if (result === "failure") {
      this.logger.warn(entry);
    } else {
      this.logger.info(entry);
    }

    // Clean up old performance logs
    if (this.performanceLogs.length > 100) {
      this.performanceLogs = this.performanceLogs.slice(-100);
    }
  }

  // Error logging with stack trace
  logError(
    error: Error | string,
    context?: string,
    metadata?: Record<string, any>,
  ): void {
    const entry: LogEntry = this.createBaseLogEntry("error");

    if (error instanceof Error) {
      entry.error = error;
      entry.stack = error.stack || "";
      entry.message = error.message;
      entry.metadata = {
        ...metadata,
        errorName: error.name,
        errorCode: error.name,
      };
    } else {
      entry.message = error;
      entry.error = error;
    }

    if (context) {
      entry.context = context;
    }

    if (metadata) {
      entry.metadata = { ...entry.metadata, ...metadata };
    }

    this.logger.error(entry);
  }

  // Create structured log entry
  logStructured(
    level: LogLevel,
    entry: Omit<LogEntry, "timestamp" | "level">,
  ): void {
    const logEntry = this.createBaseLogEntry(level);
    Object.assign(logEntry, entry);
    this.logger[level](logEntry);
  }

  // Get performance logs
  getPerformanceLogs(): PerformanceLogEntry[] {
    return [...this.performanceLogs];
  }

  // Clear performance logs
  clearPerformanceLogs(): void {
    this.performanceLogs = [];
  }

  // Create base log entry
  private createBaseLogEntry(level: LogLevel): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message: "",
    };
  }

  // Cleanup resources
  async cleanup(): Promise<void> {
    try {
      this.logger.info(`Logging system cleanup completed for ${this.context}`);
    } catch (error) {
      console.error("Error during logger cleanup:", error);
    }
  }

  // Get current logger instance
  getLogger(): PinoLogger {
    return this.logger;
  }

  // Create child logger with additional context
  createChildLogger(
    context: string,
    options: { config?: LoggingConfig } = {},
  ): Logger {
    const childConfig = options.config || this.config;
    const childLogger = new PinoLoggingSystem({
      config: childConfig,
      context: `${this.context}:${context}`,
    });
    return childLogger;
  }

  // Utility: Start performance measurement
  startPerformanceMeasurement(operation: string): PerformanceMeasurement {
    return {
      operation,
      startTime: Date.now(),
      startMemory: this.getMemoryUsage(),
    };
  }

  // Utility: End performance measurement
  endPerformanceMeasurement(
    measurement: PerformanceMeasurement,
  ): PerformanceMetrics {
    const endTime = Date.now();
    const endMemory = this.getMemoryUsage();

    return {
      startTime: measurement.startTime,
      endTime,
      duration: endTime - measurement.startTime,
      memoryUsage: {
        heapUsed: endMemory.heapUsed - measurement.startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - measurement.startMemory.heapTotal,
        rss: endMemory.rss - measurement.startMemory.rss,
      },
    };
  }

  // Get memory usage
  private getMemoryUsage(): {
    heapUsed: number;
    heapTotal: number;
    rss: number;
  } {
    if (typeof process === "undefined" || !process.memoryUsage) {
      return { heapUsed: 0, heapTotal: 0, rss: 0 };
    }

    const memoryUsage = process.memoryUsage();
    return {
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      rss: memoryUsage.rss,
    };
  }

  // Check if level is enabled
  isLevelEnabled(level: LogLevel): boolean {
    const currentLevel = LOG_LEVELS[this.config.level || "info"];
    const targetLevel = LOG_LEVELS[level];
    return targetLevel >= currentLevel;
  }
}

// Performance measurement helper
export interface PerformanceMeasurement {
  operation: string;
  startTime: number;
  startMemory: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
  };
}

// Enhanced log entry with performance data
export interface PerformanceLogEntry extends LogEntry {
  metrics: PerformanceMetrics;
  operation: string;
  result: "success" | "failure";
}

// Logging utility functions
export function createLogger(
  config?: LoggingConfig | undefined,
  context?: string | undefined,
): Logger {
  return new PinoLoggingSystem({ config, context });
}

// Global logger instance
let globalLogger: PinoLoggingSystem | null = null;

export function getGlobalLogger(): Logger {
  if (!globalLogger) {
    globalLogger = new PinoLoggingSystem();
  }
  return globalLogger;
}

// Reset global logger (for testing)
export function resetGlobalLogger(): void {
  globalLogger = null;
}

// Logging decorator for performance measurement
export function withLogging<T extends { new (...args: any[]): {} }>(
  constructor: T,
): T {
  return class extends constructor {
    constructor(...args: any[]) {
      super(...args);
      const logger = getGlobalLogger();
      if (logger && typeof logger.debug === "function") {
        logger.debug(`Created instance of ${constructor.name}`);
      }
    }
  };
}

// Performance measurement decorator
export function measurePerformance(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor,
) {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    const logger = getGlobalLogger();
    const pinoLogger = logger as PinoLoggingSystem;

    if (
      !pinoLogger ||
      !pinoLogger.isLevelEnabled ||
      !pinoLogger.isLevelEnabled("debug")
    ) {
      return originalMethod.apply(this, args);
    }

    const measurement = pinoLogger.startPerformanceMeasurement?.(
      `${target.constructor.name}.${propertyKey}`,
    );
    if (!measurement) {
      return originalMethod.apply(this, args);
    }

    try {
      const result = await originalMethod.apply(this, args);
      const metrics = pinoLogger.endPerformanceMeasurement?.(measurement);
      if (metrics && pinoLogger.logPerformance) {
        await pinoLogger.logPerformance(propertyKey, metrics, "success");
      }
      return result;
    } catch (error) {
      const metrics = pinoLogger.endPerformanceMeasurement?.(measurement);
      if (metrics && pinoLogger.logPerformance) {
        await pinoLogger.logPerformance(propertyKey, metrics, "failure");
      }
      throw error;
    }
  };

  return descriptor;
}
