/**
 * Security Validation Tests
 * Tests plugin sandboxing, permission validation, and security measures
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PluginSecurityManager, PluginSecurityManagerFactory } from '../../src/core/plugin-system/security.js';
import { EventEmitter } from 'events';

describe('Security Validation', () => {
  let securityManager: PluginSecurityManager;
  let mockLogger: any;
  let mockEventEmitter: EventEmitter;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };
    
    mockEventEmitter = new EventEmitter();
    
    const securityPolicy = {
      requireSignature: true,
      allowUnsigned: false,
      blocklist: ['malicious-plugin'],
      allowlist: [],
      requireReview: true,
      autoUpdate: false,
      sandboxLevel: 'strict' as const
    };
    
    securityManager = PluginSecurityManagerFactory.create(
      securityPolicy,
      mockLogger,
      mockEventEmitter
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Plugin Signature Validation', () => {
    it('should reject plugins without signatures', async () => {
      const pluginPath = '/fake/plugin/path';
      const manifest = {
        name: 'unsigned-plugin',
        version: '1.0.0',
        permissions: ['file_read']
      };

      // Mock file system to return unsigned plugin
      const mockFs = require('fs');
      mockFs.promises = {
        ...mockFs.promises,
        access: jest.fn().mockResolvedValue(true),
        readFile: jest.fn()
          .mockResolvedValueOnce(JSON.stringify(manifest))
          .mockResolvedValueOnce('') // No signature file
      };

      const result = await securityManager.validatePluginSecurity(pluginPath);

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('signature is required but missing or invalid');
      expect(result.profile.trustLevel).toBe('blocked');
    });

    it('should accept plugins with valid signatures', async () => {
      const pluginPath = '/fake/signed/plugin/path';
      const manifest = {
        name: 'signed-plugin',
        version: '1.0.0',
        permissions: ['file_read'],
        signature: 'valid-signature-123'
      };

      const mockFs = require('fs');
      mockFs.promises = {
        ...mockFs.promises,
        access: jest.fn().mockResolvedValue(true),
        readFile: jest.fn()
          .mockResolvedValueOnce(JSON.stringify(manifest))
          .mockResolvedValueOnce('valid-signature-data') // Valid signature
      };

      const result = await securityManager.validatePluginSecurity(pluginPath);

      expect(result.valid).toBe(true);
      expect(result.profile.signature).toBe('valid-signature-data');
      expect(result.profile.trustLevel).toBe('verified');
    });

    it('should detect invalid signatures', async () => {
      const pluginPath = '/fake/invalid/plugin/path';
      const manifest = {
        name: 'invalid-signature-plugin',
        version: '1.0.0',
        permissions: ['file_read']
      };

      const mockFs = require('fs');
      mockFs.promises = {
        ...mockFs.promises,
        access: jest.fn().mockResolvedValue(true),
        readFile: jest.fn()
          .mockResolvedValueOnce(JSON.stringify(manifest))
          .mockResolvedValueOnce('invalid-signature-data') // Invalid signature
      };

      const result = await securityManager.validatePluginSecurity(pluginPath);

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('signature is required but missing or invalid');
      expect(result.profile.trustLevel).toBe('blocked');
    });
  });

  describe('Blocklist Validation', () => {
    it('should block blocklisted plugins', async () => {
      const pluginPath = '/fake/blocked/plugin/path';
      const manifest = {
        name: 'malicious-plugin',
        version: '1.0.0',
        permissions: ['file_system_write']
      };

      const mockFs = require('fs');
      mockFs.promises = {
        ...mockFs.promises,
        access: jest.fn().mockResolvedValue(true),
        readFile: jest.fn().mockResolvedValue(JSON.stringify(manifest))
      };

      const result = await securityManager.validatePluginSecurity(pluginPath);

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Plugin malicious-plugin is blocklisted');
      expect(result.profile.trustLevel).toBe('blocked');
      expect(result.profile.restricted).toBe(true);
    });

    it('should allow non-blocklisted plugins', async () => {
      const pluginPath = '/fake/safe/plugin/path';
      const manifest = {
        name: 'safe-plugin',
        version: '1.0.0',
        permissions: ['file_read']
      };

      const mockFs = require('fs');
      mockFs.promises = {
        ...mockFs.promises,
        access: jest.fn().mockResolvedValue(true),
        readFile: jest.fn().mockResolvedValue(JSON.stringify(manifest))
      };

      const result = await securityManager.validatePluginSecurity(pluginPath);

      expect(result.valid).toBe(true);
      expect(result.profile.trustLevel).toBe('untrusted');
      expect(result.profile.restricted).toBe(false);
    });
  });

  describe('Permission Validation', () => {
    it('should flag dangerous permissions', async () => {
      const pluginPath = '/fake/dangerous/plugin/path';
      const manifest = {
        name: 'dangerous-plugin',
        version: '1.0.0',
        permissions: [
          'file_system_write',
          'network_access',
          'system_execute',
          'sensitive_data_access'
        ]
      };

      const mockFs = require('fs');
      mockFs.promises = {
        ...mockFs.promises,
        access: jest.fn().mockResolvedValue(true),
        readFile: jest.fn().mockResolvedValue(JSON.stringify(manifest))
      };

      const result = await securityManager.validatePluginSecurity(pluginPath);

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Dangerous permission requested: file_system_write');
      expect(result.issues).toContain('Dangerous permission requested: network_access');
      expect(result.issues).toContain('Dangerous permission requested: system_execute');
      expect(result.issues).toContain('Dangerous permission requested: sensitive_data_access');
    });

    it('should allow safe permissions', async () => {
      const pluginPath = '/fake/safe-permissions/plugin/path';
      const manifest = {
        name: 'safe-permissions-plugin',
        version: '1.0.0',
        permissions: ['file_read', 'config_read']
      };

      const mockFs = require('fs');
      mockFs.promises = {
        ...mockFs.promises,
        access: jest.fn().mockResolvedValue(true),
        readFile: jest.fn().mockResolvedValue(JSON.stringify(manifest))
      };

      const result = await securityManager.validatePluginSecurity(pluginPath);

      expect(result.valid).toBe(true);
      expect(result.issues.length).toBe(0);
    });
  });

  describe('Vulnerability Scanning', () => {
    it('should detect known vulnerabilities', async () => {
      const pluginPath = '/fake/vulnerable/plugin/path';
      const manifest = {
        name: 'vulnerable-plugin',
        version: '1.0.0',
        permissions: ['file_read']
      };

      const mockFs = require('fs');
      mockFs.promises = {
        ...mockFs.promises,
        access: jest.fn().mockResolvedValue(true),
        readFile: jest.fn().mockResolvedValue(JSON.stringify(manifest))
      };

      // Mock vulnerability database
      const originalCheckVulns = (securityManager as any).checkVulnerabilities;
      (securityManager as any).checkVulnerabilities = async () => [
        {
          id: 'CVE-2024-001',
          severity: 'critical' as const,
          description: 'Remote code execution vulnerability',
          affectedVersions: ['1.0.0', '0.9.0'],
          fixedVersion: '1.0.1',
          cve: 'CVE-2024-001'
        }
      ];

      const result = await securityManager.validatePluginSecurity(pluginPath);

      expect(result.valid).toBe(false);
      expect(result.warnings).toContain('Plugin has 1 known vulnerabilities');
      expect(result.profile.vulnerabilities).toHaveLength(1);
      expect(result.profile.vulnerabilities[0].severity).toBe('critical');

      // Restore original method
      (securityManager as any).checkVulnerabilities = originalCheckVulns;
    });

    it('should handle plugins without vulnerabilities', async () => {
      const pluginPath = '/fake/secure/plugin/path';
      const manifest = {
        name: 'secure-plugin',
        version: '2.0.0',
        permissions: ['file_read']
      };

      const mockFs = require('fs');
      mockFs.promises = {
        ...mockFs.promises,
        access: jest.fn().mockResolvedValue(true),
        readFile: jest.fn().mockResolvedValue(JSON.stringify(manifest))
      };

      // Mock empty vulnerability database
      const originalCheckVulns = (securityManager as any).checkVulnerabilities;
      (securityManager as any).checkVulnerabilities = async () => [];

      const result = await securityManager.validatePluginSecurity(pluginPath);

      expect(result.valid).toBe(true);
      expect(result.profile.vulnerabilities).toHaveLength(0);

      // Restore original method
      (securityManager as any).checkVulnerabilities = originalCheckVulns;
    });
  });

  describe('Code Quality Analysis', () => {
    it('should detect unsafe code patterns', async () => {
      const pluginPath = '/fake/unsafe-code/plugin/path';
      const manifest = {
        name: 'unsafe-code-plugin',
        version: '1.0.0',
        permissions: ['file_read']
      };

      const mockFs = require('fs');
      mockFs.promises = {
        ...mockFs.promises,
        access: jest.fn().mockResolvedValue(true),
        readFile: jest.fn().mockResolvedValue(JSON.stringify(manifest)),
        readdir: jest.fn().mockResolvedValue(['index.js', 'utils.js'])
      };

      // Mock unsafe code files
      mockFs.promises.readFile
        .mockImplementationOnce((filePath: string) => {
          if (filePath.includes('index.js')) {
            return 'eval("malicious code");';
          } else if (filePath.includes('utils.js')) {
            return 'Function("dangerous constructor");';
          }
          return JSON.stringify(manifest);
        })
        );

      const result = await securityManager.validatePluginSecurity(pluginPath);

      expect(result.valid).toBe(false);
      expect(result.warnings).toContain('Potentially unsafe eval() usage in index.js');
      expect(result.warnings).toContain('Potentially unsafe Function() constructor in utils.js');
    });

    it('should pass safe code analysis', async () => {
      const pluginPath = '/fake/safe-code/plugin/path';
      const manifest = {
        name: 'safe-code-plugin',
        version: '1.0.0',
        permissions: ['file_read']
      };

      const mockFs = require('fs');
      mockFs.promises = {
        ...mockFs.promises,
        access: jest.fn().mockResolvedValue(true),
        readFile: jest.fn().mockResolvedValue(JSON.stringify(manifest)),
        readdir: jest.fn().mockResolvedValue(['index.js'])
      };

      // Mock safe code file
      mockFs.promises.readFile
        .mockImplementationOnce((filePath: string) => {
          if (filePath.includes('index.js')) {
            return 'export function safeFunction() { return "safe"; }';
          }
          return JSON.stringify(manifest);
        })
        );

      const result = await securityManager.validatePluginSecurity(pluginPath);

      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBe(0);
    });
  });

  describe('Sandbox Configuration', () => {
    it('should create strict sandbox for untrusted plugins', async () => {
      const pluginPath = '/fake/untrusted/plugin/path';
      const manifest = {
        name: 'untrusted-plugin',
        version: '1.0.0',
        permissions: ['file_read']
      };

      const mockFs = require('fs');
      mockFs.promises = {
        ...mockFs.promises,
        access: jest.fn().mockResolvedValue(true),
        readFile: jest.fn().mockResolvedValue(JSON.stringify(manifest))
      };

      const result = await securityManager.validatePluginSecurity(pluginPath);
      const sandbox = securityManager.createSandbox(result.profile);

      expect(sandbox.id).toBe('untrusted-plugin');
      expect(sandbox.resourceLimits.maxMemory).toBe(256 * 1024 * 1024); // 256MB for strict
      expect(sandbox.resourceLimits.maxCpu).toBe(25); // 25% CPU for strict
      expect(sandbox.deniedPaths.has('/etc')).toBe(true);
      expect(sandbox.deniedPaths.has('/usr/bin')).toBe(true);
    });

    it('should create basic sandbox for trusted plugins', async () => {
      // Change policy to basic
      const basicSecurityManager = PluginSecurityManagerFactory.create({
        requireSignature: false,
        allowUnsigned: true,
        blocklist: [],
        allowlist: [],
        requireReview: false,
        autoUpdate: false,
        sandboxLevel: 'basic' as const
      }, mockLogger, mockEventEmitter);

      const pluginPath = '/fake/trusted/plugin/path';
      const manifest = {
        name: 'trusted-plugin',
        version: '1.0.0',
        permissions: ['file_read', 'file_write']
      };

      const mockFs = require('fs');
      mockFs.promises = {
        ...mockFs.promises,
        access: jest.fn().mockResolvedValue(true),
        readFile: jest.fn().mockResolvedValue(JSON.stringify(manifest))
      };

      const result = await basicSecurityManager.validatePluginSecurity(pluginPath);
      const sandbox = basicSecurityManager.createSandbox(result.profile);

      expect(sandbox.id).toBe('trusted-plugin');
      expect(sandbox.resourceLimits.maxMemory).toBe(512 * 1024 * 1024); // 512MB for basic
      expect(sandbox.resourceLimits.maxCpu).toBe(50); // 50% CPU for basic
      expect(sandbox.allowedPaths.size).toBeGreaterThan(0); // Should have some allowed paths
    });
  });

  describe('Trust Level Management', () => {
    it('should update plugin trust level', async () => {
      const pluginPath = '/fake/trust-update/plugin/path';
      const manifest = {
        name: 'trust-update-plugin',
        version: '1.0.0',
        permissions: ['file_read']
      };

      const mockFs = require('fs');
      mockFs.promises = {
        ...mockFs.promises,
        access: jest.fn().mockResolvedValue(true),
        readFile: jest.fn().mockResolvedValue(JSON.stringify(manifest))
      };

      const result = await securityManager.validatePluginSecurity(pluginPath);
      expect(result.profile.trustLevel).toBe('untrusted');

      // Update trust level to trusted
      await securityManager.updateTrustLevel('trust-update-plugin', 'trusted');

      // Verify trust store was updated
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Plugin trust-update-plugin trust level updated to: trusted'
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'security.trust_updated',
        { pluginId: 'trust-update-plugin', trustLevel: 'trusted' }
      );
    });

    it('should maintain trust level across validations', async () => {
      const pluginPath = '/fake/trust-persist/plugin/path';
      const manifest = {
        name: 'trust-persist-plugin',
        version: '1.0.0',
        permissions: ['file_read']
      };

      const mockFs = require('fs');
      mockFs.promises = {
        ...mockFs.promises,
        access: jest.fn().mockResolvedValue(true),
        readFile: jest.fn().mockResolvedValue(JSON.stringify(manifest))
      };

      // Set initial trust level
      await securityManager.updateTrustLevel('trust-persist-plugin', 'trusted');

      // Validate multiple times - should maintain trust level
      const result1 = await securityManager.validatePluginSecurity(pluginPath);
      expect(result1.profile.trustLevel).toBe('trusted');

      const result2 = await securityManager.validatePluginSecurity(pluginPath);
      expect(result2.profile.trustLevel).toBe('trusted');

      const result3 = await securityManager.validatePluginSecurity(pluginPath);
      expect(result3.profile.trustLevel).toBe('trusted');
    });
  });

  describe('Security Reporting', () => {
    it('should generate comprehensive security report', () => {
      // Create multiple plugins with different security profiles
      const plugins = [
        { id: 'trusted-plugin', trustLevel: 'trusted' as const, vulnerabilities: [] },
        { id: 'untrusted-plugin', trustLevel: 'untrusted' as const, vulnerabilities: [] },
        { id: 'vulnerable-plugin', trustLevel: 'blocked' as const, vulnerabilities: [
          { id: 'CVE-2024-001', severity: 'critical' as const }
        ]},
        { id: 'suspicious-plugin', trustLevel: 'untrusted' as const, vulnerabilities: [
          { id: 'CVE-2024-002', severity: 'medium' as const }
        ]}
      ];

      // Mock security profiles
      plugins.forEach(plugin => {
        (securityManager as any).securityProfiles.set(plugin.id, plugin);
      });

      const report = securityManager.getSecurityReport();

      expect(report.totalPlugins).toBe(plugins.length);
      expect(report.trustedPlugins).toBe(1); // Only trusted-plugin
      expect(report.blockedPlugins).toBe(1); // Only vulnerable-plugin
      expect(report.vulnerabilities).toHaveLength(2); // critical + medium
      expect(report.sandboxLevel).toBe('strict');
      expect(report.vulnerabilities.some(v => v.severity === 'critical')).toBe(true);
    });

    it('should track security metrics over time', async () => {
      const initialReport = securityManager.getSecurityReport();
      
      // Simulate security events
      mockEventEmitter.emit('security.violation', {
        pluginId: 'test-plugin',
        error: new Error('Security violation'),
        timestamp: new Date()
      });

      mockEventEmitter.emit('security.trust_updated', {
        pluginId: 'test-plugin-2',
        trustLevel: 'verified'
      });

      const finalReport = securityManager.getSecurityReport();

      // Should reflect updated state
      expect(finalReport.totalPlugins).toBe(initialReport.totalPlugins + 2);
    });
  });

  describe('Resource Limit Enforcement', () => {
    it('should enforce memory limits in sandbox', async () => {
      const pluginPath = '/fake/resource-limit/plugin/path';
      const manifest = {
        name: 'resource-limit-plugin',
        version: '1.0.0',
        permissions: ['file_read']
      };

      const mockFs = require('fs');
      mockFs.promises = {
        ...mockFs.promises,
        access: jest.fn().mockResolvedValue(true),
        readFile: jest.fn().mockResolvedValue(JSON.stringify(manifest))
      };

      const result = await securityManager.validatePluginSecurity(pluginPath);
      const sandbox = securityManager.createSandbox(result.profile);

      // Mock plugin execution that tries to use excessive memory
      const mockPlugin = {
        execute: async () => {
          // Simulate large memory allocation
          const largeArray = new Array(1000000).fill(0);
          return largeArray.reduce((a, b) => a + b, 0);
        }
      };

      // Execute in sandbox
      const monitor = (securityManager as any).createResourceMonitor('test-plugin', sandbox);
      
      try {
        await (securityManager as any).executeInSandbox(
          'test-plugin',
          mockPlugin,
          'execute',
          [],
          {},
          monitor
        );
      } catch {
        // Should handle memory limit exceeded
      }

      const metrics = monitor.getMetrics();
      expect(metrics.memoryUsage).toBeGreaterThan(256 * 1024 * 1024); // Should exceed limit
    });

    it('should enforce network request limits', async () => {
      const pluginPath = '/fake/network-limit/plugin/path';
      const manifest = {
        name: 'network-limit-plugin',
        version: '1.0.0',
        permissions: ['network_access']
      };

      const mockFs = require('fs');
      mockFs.promises = {
        ...mockFs.promises,
        access: jest.fn().mockResolvedValue(true),
        readFile: jest.fn().mockResolvedValue(JSON.stringify(manifest))
      };

      const result = await securityManager.validatePluginSecurity(pluginPath);
      const sandbox = securityManager.createSandbox(result.profile);

      // Mock plugin that makes many network requests
      const mockPlugin = {
        execute: async () => {
          const promises = Array.from({ length: 200 }, () => 
            fetch('https://httpbin.org/delay/10')
          );
          return Promise.all(promises);
        }
      };

      const monitor = (securityManager as any).createResourceMonitor('network-limit-plugin', sandbox);
      
      try {
        await (securityManager as any).executeInSandbox(
          'network-limit-plugin',
          mockPlugin,
          'execute',
          [],
          {},
          monitor
        );
      } catch {
        // Should handle network limit exceeded
      }

      const metrics = monitor.getMetrics();
      expect(metrics.networkRequests).toBeGreaterThan(100); // Should exceed limit
    });
  });
});