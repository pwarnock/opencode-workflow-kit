/**
 * Reconciler Module - Main Entry Point
 * Export types, adapters, and core classes
 */

export * from './types';

// Legacy adapter interface (deprecated)
export { type TaskBackendAdapter } from './adapter';

// New unified adapter types and implementations
export * from './adapters';

// Core classes
export { TasklistParser } from './tasklist-parser';
export { ReconcilerEngine } from './reconciler-engine';
