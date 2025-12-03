/**
 * Logging System Types and Interfaces
 * Comprehensive logging framework for Cody-Beads integration
 */

import { LoggingConfig } from '../../core/config/validation';

export interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  trace?(message: string, ...args: any[]): void;
  fatal?(message: string, ...args: any[]): void;
  logPerformance?(operation: string, metrics: PerformanceMetrics, result?: 'success' | 'failure'): Promise<void>;
  logError?(error: Error | string, context?: string, metadata?: Record<string, any>): void;
  logStructured?(level: LogLevel, entry: Omit<LogEntry, 'timestamp' | 'level'>): void;
  getPerformanceLogs?(): PerformanceLogEntry[];
  clearPerformanceLogs?(): void;
  isLevelEnabled?(level: LogLevel): boolean;
  startPerformanceMeasurement?(operation: string): PerformanceMeasurement;
  endPerformanceMeasurement?(measurement: PerformanceMeasurement): PerformanceMetrics;
  createChildLogger?(context: string, options?: { config?: LoggingConfig }): Logger;
  getLogger?(): any;
  cleanup?(): Promise<void>;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  metadata?: Record<string, any>;
  error?: Error | string;
  stack?: string;
}

export interface LogTransport {
  log(entry: LogEntry): Promise<void>;
  close(): Promise<void>;
}

export interface LogFormatter {
  format(entry: LogEntry): string;
}

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export const LOG_LEVELS: Record<LogLevel, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  fatal: 5
};

export interface LoggingSystemOptions {
  config?: LoggingConfig;
  context?: string;
  metadata?: Record<string, any>;
}

export interface PerformanceMeasurement {
  operation: string;
  startTime: number;
  startMemory: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
  };
}

export interface PerformanceMetrics {
  startTime: number;
  endTime: number;
  duration: number;
  memoryUsage?: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
  };
  cpuUsage?: {
    user: number;
    system: number;
  };
}

export interface PerformanceLogEntry extends LogEntry {
  metrics: PerformanceMetrics;
  operation: string;
  result?: 'success' | 'failure';
}