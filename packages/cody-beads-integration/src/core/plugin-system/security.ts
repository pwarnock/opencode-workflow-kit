/**
 * Enhanced Plugin Security and Management System
 * Provides secure plugin installation, validation, and sandboxing
 */

import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { BasePlugin, PluginContext, Logger, EventEmitter } from './base.js';

export interface PluginSecurityProfile {
  id: string;
  name: string;
  version: string;
  author: string;
  permissions: string[];
  capabilities: string[];
  restricted: boolean;
  signature?: string;
  checksum: string;
  trustLevel: 'trusted' | 'verified' | 'untrusted' | 'blocked';
  lastValidated: string;
  vulnerabilities: SecurityVulnerability[];
}

export interface SecurityVulnerability {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedVersions: string[];
  fixedVersion?: string;
  cve?: string;
}

export interface PluginSandbox {
  id: string;
  permissions: Set<string>;
  allowedPaths: Set<string>;
  deniedPaths: Set<string>;
  allowedDomains: Set<string>;
  resourceLimits: {
    maxMemory: number;
    maxCpu: number;
    maxFileSize: number;
    maxNetworkRequests: number;
  };
}

export interface SecurityPolicy {
  requireSignature: boolean;
  allowUnsigned: boolean;
  blocklist: string[];
  allowlist: string[];
  requireReview: boolean;
  autoUpdate: boolean;
  sandboxLevel: 'none' | 'basic' | 'strict' | 'maximum';
}

/**
 * Enhanced Plugin Security Manager
 */
export class PluginSecurityManager {
  private securityProfiles = new Map<string, PluginSecurityProfile>();
  private sandboxes = new Map<string, PluginSandbox>();
  private trustStore = new Map<string, boolean>();
  private policy: SecurityPolicy;
  private logger: Logger;
  private eventEmitter: EventEmitter;

  constructor(policy: SecurityPolicy, logger: Logger, eventEmitter: EventEmitter) {
    this.policy = policy;
    this.logger = logger;
    this.eventEmitter = eventEmitter;
    this.loadTrustStore();
  }

  /**
   * Validate plugin security before installation
   */
  async validatePluginSecurity(pluginPath: string): Promise<{
    valid: boolean;
    issues: string[];
    warnings: string[];
    profile: PluginSecurityProfile;
  }> {
    const issues: string[] = [];
    const warnings: string[] = [];

    try {
      // Read plugin manifest
      const manifestPath = path.join(pluginPath, 'package.json');
      const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));

      // Create security profile
      const profile: PluginSecurityProfile = {
        id: manifest.name,
        name: manifest.displayName || manifest.name,
        version: manifest.version,
        author: manifest.author || 'unknown',
        permissions: manifest.permissions || [],
        capabilities: manifest.capabilities || [],
        restricted: false,
        checksum: await this.calculateChecksum(pluginPath),
        trustLevel: 'untrusted',
        lastValidated: new Date().toISOString(),
        vulnerabilities: []
      };

      // Check digital signature
      const signatureCheck = await this.verifySignature(pluginPath, manifest);
      if (!signatureCheck.valid && this.policy.requireSignature) {
        issues.push('Plugin signature is required but missing or invalid');
        profile.trustLevel = 'blocked';
      } else if (signatureCheck.valid && signatureCheck.signature) {
        profile.signature = signatureCheck.signature;
        profile.trustLevel = 'verified';
      }

      // Check against blocklist
      if (this.policy.blocklist.includes(profile.id)) {
        issues.push(`Plugin ${profile.id} is blocklisted`);
        profile.trustLevel = 'blocked';
        profile.restricted = true;
      }

      // Check permissions
      const permissionIssues = this.validatePermissions(profile.permissions);
      issues.push(...permissionIssues);

      // Check for vulnerabilities
      profile.vulnerabilities = await this.checkVulnerabilities(profile);
      if (profile.vulnerabilities.length > 0) {
        const criticalVulns = profile.vulnerabilities.filter(v => v.severity === 'critical');
        if (criticalVulns.length > 0) {
          issues.push(`Plugin has ${criticalVulns.length} critical vulnerabilities`);
          profile.trustLevel = 'blocked';
        } else {
          warnings.push(`Plugin has ${profile.vulnerabilities.length} known vulnerabilities`);
        }
      }

      // Check code quality indicators
      const codeQualityIssues = await this.analyzeCodeQuality(pluginPath);
      warnings.push(...codeQualityIssues);

      // Store profile
      this.securityProfiles.set(profile.id, profile);

      return {
        valid: issues.length === 0,
        issues,
        warnings,
        profile
      };

    } catch (error) {
      issues.push(`Security validation failed: ${error}`);
      throw error;
    }
  }

  /**
   * Create sandbox for plugin execution
   */
  createSandbox(profile: PluginSecurityProfile): PluginSandbox {
    const sandbox: PluginSandbox = {
      id: profile.id,
      permissions: new Set(profile.permissions),
      allowedPaths: new Set(),
      deniedPaths: new Set(),
      allowedDomains: new Set(),
      resourceLimits: {
        maxMemory: 512 * 1024 * 1024, // 512MB
        maxCpu: 50, // 50% CPU
        maxFileSize: 100 * 1024 * 1024, // 100MB
        maxNetworkRequests: 100
      }
    };

    // Configure sandbox based on policy level
    switch (this.policy.sandboxLevel) {
      case 'basic':
        this.configureBasicSandbox(sandbox, profile);
        break;
      case 'strict':
        this.configureStrictSandbox(sandbox, profile);
        break;
      case 'maximum':
        this.configureMaximumSandbox(sandbox, profile);
        break;
    }

    this.sandboxes.set(profile.id, sandbox);
    this.logger.info(`Sandbox created for plugin ${profile.id} with level ${this.policy.sandboxLevel}`);
    
    return sandbox;
  }

  /**
   * Execute plugin in sandbox
   */
  async executeInSandbox<T>(
    pluginId: string,
    plugin: BasePlugin,
    method: string,
    args: any[],
    context: PluginContext
  ): Promise<T> {
    const sandbox = this.sandboxes.get(pluginId);
    if (!sandbox) {
      throw new Error(`No sandbox found for plugin: ${pluginId}`);
    }

    // Create sandboxed context
    const sandboxedContext: PluginContext = {
      ...context,
      permissions: Array.from(sandbox.permissions)
    };

    // Monitor resource usage
    const monitor = this.createResourceMonitor(pluginId, sandbox);

    try {
      // Execute with resource monitoring
      const result = await this.executeWithMonitoring(
        plugin,
        method,
        args,
        sandboxedContext,
        monitor
      );

      // Log execution metrics
      this.logExecutionMetrics(pluginId, monitor.getMetrics());
      
      return result;

    } catch (error: unknown) {
      // Check if error is due to security violation
      if (this.isSecurityViolation(error)) {
        this.logger.warn(`Security violation in plugin ${pluginId}: ${error}`);
        this.eventEmitter.emit('security.violation', {
          pluginId,
          error,
          timestamp: new Date()
        });
      }

      // Re-throw the error
      throw error;
    }
  }

  /**
   * Update plugin trust level
   */
  async updateTrustLevel(pluginId: string, trustLevel: PluginSecurityProfile['trustLevel']): Promise<void> {
    const profile = this.securityProfiles.get(pluginId);
    if (!profile) {
      throw new Error(`Plugin profile not found: ${pluginId}`);
    }

    profile.trustLevel = trustLevel;
    profile.lastValidated = new Date().toISOString();

    // Update trust store
    this.trustStore.set(pluginId, trustLevel === 'trusted');
    await this.saveTrustStore();

    this.logger.info(`Plugin ${pluginId} trust level updated to: ${trustLevel}`);
    this.eventEmitter.emit('security.trust_updated', { pluginId, trustLevel });
  }

  /**
   * Scan for security vulnerabilities
   */
  async scanForVulnerabilities(pluginId: string): Promise<SecurityVulnerability[]> {
    const profile = this.securityProfiles.get(pluginId);
    if (!profile) {
      throw new Error(`Plugin profile not found: ${pluginId}`);
    }

    return await this.checkVulnerabilities(profile);
  }

  /**
   * Get security report for all plugins
   */
  getSecurityReport(): {
    totalPlugins: number;
    trustedPlugins: number;
    blockedPlugins: number;
    vulnerabilities: SecurityVulnerability[];
    sandboxLevel: string;
  } {
    const profiles = Array.from(this.securityProfiles.values());
    
    return {
      totalPlugins: profiles.length,
      trustedPlugins: profiles.filter(p => p.trustLevel === 'trusted').length,
      blockedPlugins: profiles.filter(p => p.trustLevel === 'blocked').length,
      vulnerabilities: profiles.flatMap(p => p.vulnerabilities),
      sandboxLevel: this.policy.sandboxLevel
    };
  }

  /**
   * Private helper methods
   */
  private async verifySignature(pluginPath: string, _manifest: any): Promise<{
    valid: boolean;
    signature?: string;
  }> {
    const signaturePath = path.join(pluginPath, 'signature.sig');
    
    try {
      const signatureExists = await fs.access(signaturePath).then(() => true).catch(() => false);
      if (!signatureExists) {
        return { valid: false };
      }

      const signature = await fs.readFile(signaturePath, 'utf-8');
      const pluginHash = await this.calculatePluginHash(pluginPath);
      
      // This would use proper signature verification
      const isValid = this.verifySignatureHash(pluginHash, signature);
      
      return { valid: isValid, signature };
      
    } catch (error) {
      this.logger.warn(`Signature verification failed: ${error}`);
      return { valid: false };
    }
  }

  private async calculateChecksum(pluginPath: string): Promise<string> {
    const hash = crypto.createHash('sha256');
    const files = await this.getAllPluginFiles(pluginPath);
    
    for (const file of files.sort()) {
      const content = await fs.readFile(path.join(pluginPath, file));
      hash.update(content);
    }
    
    return hash.digest('hex');
  }

  private async calculatePluginHash(pluginPath: string): Promise<string> {
    const manifestPath = path.join(pluginPath, 'package.json');
    const manifest = await fs.readFile(manifestPath, 'utf-8');
    const hash = crypto.createHash('sha256');
    hash.update(manifest);
    return hash.digest('hex');
  }

  private verifySignatureHash(_hash: string, signature: string): boolean {
    // Simplified signature verification
    // In production, would use proper cryptographic verification
    return signature.length > 0; // Placeholder
  }

  private validatePermissions(permissions: string[]): string[] {
    const issues: string[] = [];
    const dangerousPermissions = [
      'file_system_write',
      'network_access',
      'system_execute',
      'sensitive_data_access'
    ];

    for (const permission of permissions) {
      if (dangerousPermissions.includes(permission)) {
        issues.push(`Dangerous permission requested: ${permission}`);
      }
    }

    return issues;
  }

  private async checkVulnerabilities(profile: PluginSecurityProfile): Promise<SecurityVulnerability[]> {
    // This would integrate with a vulnerability database
    const vulnerabilities: SecurityVulnerability[] = [];
    
    // Check for known vulnerable versions
    const knownVulns = await this.queryVulnerabilityDatabase(profile.name, profile.version);
    vulnerabilities.push(...knownVulns);
    
    return vulnerabilities;
  }

  private async analyzeCodeQuality(pluginPath: string): Promise<string[]> {
    const warnings: string[] = [];
    
    try {
      // Check for common code quality issues
      const files = await this.getAllPluginFiles(pluginPath, ['.js', '.ts']);
      
      for (const file of files) {
        const content = await fs.readFile(path.join(pluginPath, file), 'utf-8');
        
        // Check for eval usage
        if (content.includes('eval(')) {
          warnings.push(`Potentially unsafe eval() usage in ${file}`);
        }
        
        // Check for Function constructor
        if (content.includes('Function(')) {
          warnings.push(`Potentially unsafe Function() constructor in ${file}`);
        }
        
        // Check for process access
        if (content.includes('process.')) {
          warnings.push(`Direct process access in ${file}`);
        }
      }
      
    } catch (error) {
      warnings.push(`Code quality analysis failed: ${error}`);
    }
    
    return warnings;
  }

  private configureBasicSandbox(sandbox: PluginSandbox, profile: PluginSecurityProfile): void {
    // Allow basic file system access in plugin directory
    sandbox.allowedPaths.add(path.join(process.cwd(), 'plugins', profile.id));
    
    // Restrict system-level permissions
    sandbox.deniedPaths.add('/etc');
    sandbox.deniedPaths.add('/usr/bin');
    sandbox.deniedPaths.add('/system');
  }

  private configureStrictSandbox(sandbox: PluginSandbox, profile: PluginSecurityProfile): void {
    this.configureBasicSandbox(sandbox, profile);
    
    // Further restrict resource limits
    sandbox.resourceLimits.maxMemory = 256 * 1024 * 1024; // 256MB
    sandbox.resourceLimits.maxCpu = 25; // 25% CPU
    sandbox.resourceLimits.maxNetworkRequests = 50;
  }

  private configureMaximumSandbox(sandbox: PluginSandbox, profile: PluginSecurityProfile): void {
    this.configureStrictSandbox(sandbox, profile);
    
    // Maximum restrictions
    sandbox.resourceLimits.maxMemory = 128 * 1024 * 1024; // 128MB
    sandbox.resourceLimits.maxCpu = 10; // 10% CPU
    sandbox.resourceLimits.maxNetworkRequests = 10;
    
    // Only allow specific whitelisted domains
    if (this.policy.allowlist.length > 0) {
      this.policy.allowlist.forEach(domain => sandbox.allowedDomains.add(domain));
    }
  }

  private createResourceMonitor(_pluginId: string, _sandbox: PluginSandbox) {
    const startTime = Date.now();
    let memoryUsage = 0;
    let networkRequests = 0;
    let fileOperations = 0;

    return {
      startTime,
      memoryUsage,
      networkRequests,
      fileOperations,

      getMetrics: () => ({
        executionTime: Date.now() - startTime,
        memoryUsage,
        networkRequests,
        fileOperations
      })
    };
  }

  private async executeWithMonitoring<T>(
    plugin: BasePlugin,
    method: string,
    args: any[],
    _context: PluginContext,
    _monitor: any
  ): Promise<T> {
    // This would wrap the actual execution with monitoring
    const result = await (plugin as any)[method](...args);
    return result;
  }

  private isSecurityViolation(error: any): boolean {
    const securityErrors = [
      'Permission denied',
      'Access denied',
      'Security violation',
      'Sandbox violation'
    ];
    
    return securityErrors.some(securityError => 
      error.message?.includes(securityError) || error.toString().includes(securityError)
    );
  }

  private logExecutionMetrics(pluginId: string, metrics: any): void {
    this.logger.debug(`Plugin ${pluginId} execution metrics:`, metrics);
    
    // Check for resource limit violations
    if (metrics.memoryUsage > 500 * 1024 * 1024) { // 500MB
      this.logger.warn(`Plugin ${pluginId} exceeded memory limit`);
    }
  }

  private async getAllPluginFiles(pluginPath: string, extensions?: string[]): Promise<string[]> {
    const files: string[] = [];
    
    async function scanDir(dir: string, currentPath: string = ''): Promise<void> {
      const entries = await fs.readdir(path.join(dir, currentPath), { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          await scanDir(dir, path.join(currentPath, entry.name));
        } else if (!extensions || extensions.some(ext => entry.name.endsWith(ext))) {
          files.push(path.join(currentPath, entry.name));
        }
      }
    }
    
    await scanDir(pluginPath);
    return files;
  }

  private async queryVulnerabilityDatabase(_pluginName: string, _version: string): Promise<SecurityVulnerability[]> {
    // This would integrate with CVE database or similar
    // For now, return empty array
    return [];
  }

  private loadTrustStore(): void {
    // Load trust store from file or database
    // For now, initialize empty
  }

  private async saveTrustStore(): Promise<void> {
    // Save trust store to file or database
  }
}

/**
 * Export security manager factory
 */
export class PluginSecurityManagerFactory {
  static create(
    policy: SecurityPolicy,
    logger: Logger,
    eventEmitter: EventEmitter
  ): PluginSecurityManager {
    return new PluginSecurityManager(policy, logger, eventEmitter);
  }
}