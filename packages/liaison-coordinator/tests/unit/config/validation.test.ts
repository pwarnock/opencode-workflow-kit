/**
 * Configuration Validation Framework Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  ConfigurationValidator, 
  validateConfiguration, 
  validateConfigurationFile,
  Configuration 
} from '../../../src/core/config/validation.js';

describe('Configuration Validation Framework', () => {
  let validator: ConfigurationValidator;

  beforeEach(() => {
    validator = new ConfigurationValidator();
  });

  describe('Basic Validation', () => {
    it('should validate a complete configuration', () => {
      const config: Configuration = {
        version: "1.0.0",
        github: {
          owner: "testowner",
          repo: "testrepo",
          token: "ghp_test123",
          apiUrl: "https://api.github.com",
          timeout: 30000,
          retries: 3
        },
        cody: {
          projectId: "test-project-id",
          apiUrl: "https://api.cody.ai",
          timeout: 30000,
          retries: 3,
          workspace: "./.cody",
          autoAdvance: false
        },
        beads: {
          projectPath: "./.beads",
          configPath: ".beads/beads.json",
          autoSync: false,
          syncInterval: 60
        },
        sync: {
          defaultDirection: "bidirectional",
          conflictResolution: "manual",
          includeLabels: ["bug", "feature"],
          excludeLabels: ["wontfix"],
          preserveComments: true,
          preserveLabels: true,
          syncMilestones: false,
          syncAssignees: true,
          syncProjects: false
        },
        templates: {
          defaultTemplate: "minimal",
          templatePath: "./templates"
        }
      };

      const result = validator.validate(config);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.data).toBeDefined();
    });

    it('should reject configuration with missing required fields', () => {
      const config = {
        version: "1.0.0",
        github: {
          owner: "testowner"
          // Missing repo and token
        }
      };

      const result = validator.validate(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.path.includes('repo'))).toBe(true);
      expect(result.errors.some(e => e.path.includes('token'))).toBe(true);
    });

    it('should reject invalid version format', () => {
      const config = {
        version: "invalid",
        github: {
          owner: "testowner",
          repo: "testrepo",
          token: "ghp_test123"
        },
        cody: {
          projectId: "test-project-id"
        },
        beads: {
          projectPath: "./.beads",
          autoSync: false,
          syncInterval: 60
        },
        sync: {
          defaultDirection: "bidirectional",
          conflictResolution: "manual"
        },
        templates: {
          defaultTemplate: "minimal"
        }
      };

      const result = validator.validate(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.path === 'version')).toBe(true);
    });
  });

  describe('GitHub Configuration Validation', () => {
    it('should validate GitHub configuration with defaults', () => {
      const githubConfig = {
        owner: "testowner",
        repo: "testrepo",
        token: "ghp_test123",
        apiUrl: "https://api.github.com",
        timeout: 30000,
        retries: 3
      };

      const result = validator.validate(githubConfig, 'github');
      
      expect(result.valid).toBe(true);
      expect(result.data?.apiUrl).toBe("https://api.github.com");
    });

    it('should warn about invalid GitHub token format', () => {
      const config = {
        version: "1.0.0",
        github: {
          owner: "testowner",
          repo: "testrepo",
          token: "invalid_token"
        },
        cody: {
          projectId: "test-project-id"
        },
        beads: {
          projectPath: "./.beads",
          autoSync: false,
          syncInterval: 60
        },
        sync: {
          defaultDirection: "bidirectional",
          conflictResolution: "manual"
        },
        templates: {
          defaultTemplate: "minimal"
        }
      };

      const result = validator.validate(config);
      
      expect(result.warnings.some(w => 
        w.path === 'github.token' && w.code === 'INVALID_TOKEN_FORMAT'
      )).toBe(true);
    });

    it('should reject invalid GitHub API URL', () => {
      const githubConfig = {
        owner: "testowner",
        repo: "testrepo",
        token: "ghp_test123",
        apiUrl: "invalid-url",
        timeout: 30000,
        retries: 3
      };

      const result = validator.validate(githubConfig, 'github');
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.path.includes('apiUrl'))).toBe(true);
    });
  });

  describe('Beads Configuration Validation', () => {
    it('should warn about low sync interval', () => {
      const config = {
        version: "1.0.0",
        github: {
          owner: "testowner",
          repo: "testrepo",
          token: "ghp_test123"
        },
        cody: {
          projectId: "test-project-id"
        },
        beads: {
          projectPath: "./.beads",
          autoSync: false,
          syncInterval: 15 // Less than 30 seconds
        },
        sync: {
          defaultDirection: "bidirectional",
          conflictResolution: "manual"
        },
        templates: {
          defaultTemplate: "minimal"
        }
      };

      const result = validator.validate(config);
      
      expect(result.warnings.some(w => 
        w.path === 'beads.syncInterval' && w.code === 'LOW_SYNC_INTERVAL'
      )).toBe(true);
    });

    it('should warn about unsafe project path', () => {
      const config = {
        version: "1.0.0",
        github: {
          owner: "testowner",
          repo: "testrepo",
          token: "ghp_test123"
        },
        cody: {
          projectId: "test-project-id"
        },
        beads: {
          projectPath: "../unsafe/path",
          autoSync: false,
          syncInterval: 60
        },
        sync: {
          defaultDirection: "bidirectional",
          conflictResolution: "manual"
        },
        templates: {
          defaultTemplate: "minimal"
        }
      };

      const result = validator.validate(config);
      
      expect(result.warnings.some(w => 
        w.path === 'beads.projectPath' && w.code === 'UNSAFE_PATH'
      )).toBe(true);
    });
  });

  describe('Sync Configuration Validation', () => {
    it('should validate sync configuration with defaults', () => {
      const syncConfig = {
        defaultDirection: "bidirectional" as const,
        conflictResolution: "manual" as const,
        includeLabels: ["bug", "feature"],
        excludeLabels: ["wontfix"],
        preserveComments: true,
        preserveLabels: true,
        syncMilestones: false,
        syncAssignees: true,
        syncProjects: false
      };

      const result = validator.validate(syncConfig, 'sync');
      
      expect(result.valid).toBe(true);
      expect(result.data?.includeLabels).toEqual(["bug", "feature"]);
      expect(result.data?.excludeLabels).toEqual(["wontfix"]);
    });

    it('should reject invalid sync direction', () => {
      const syncConfig = {
        defaultDirection: "invalid-direction",
        conflictResolution: "manual"
      };

      const result = validator.validate(syncConfig, 'sync');
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.path.includes('defaultDirection'))).toBe(true);
    });
  });

  describe('Custom Schema Registration', () => {
    it('should allow registration of custom schemas', () => {
      const customSchema = {
        test: {
          type: 'string',
          minLength: 1
        }
      };

      // This would use Zod schema in real implementation
      expect(() => {
        validator.registerSchema('custom', customSchema as any);
      }).not.toThrow();
    });

    it('should handle missing schema gracefully', () => {
      const result = validator.validate({}, 'nonexistent');
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'SCHEMA_NOT_FOUND')).toBe(true);
    });
  });

  describe('Convenience Functions', () => {
    it('should provide validateConfiguration convenience function', () => {
      const config = {
        version: "1.0.0",
        github: {
          owner: "testowner",
          repo: "testrepo",
          token: "ghp_test123"
        },
        cody: {
          projectId: "test-project-id"
        },
        beads: {
          projectPath: "./.beads",
          autoSync: false,
          syncInterval: 60
        },
        sync: {
          defaultDirection: "bidirectional",
          conflictResolution: "manual"
        },
        templates: {
          defaultTemplate: "minimal"
        }
      };

      const result = validateConfiguration(config);
      
      expect(result.valid).toBe(true);
    });
  });

  describe('Schema Export', () => {
    it('should export schema as JSON', () => {
      const schema = validator.getSchemaAsJson('configuration');
      
      expect(schema).toBeDefined();
      expect(schema.type).toBe('object');
      expect(schema.properties).toBeDefined();
      expect(schema.properties.version).toBeDefined();
    });

    it('should throw error for nonexistent schema', () => {
      expect(() => {
        validator.getSchemaAsJson('nonexistent');
      }).toThrow('Schema \'nonexistent\' not found');
    });
  });

  describe('Error Handling', () => {
    it('should handle file validation errors', async () => {
      const result = await validateConfigurationFile('/nonexistent/file.json');
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'FILE_ERROR')).toBe(true);
    });
  });

  describe('Type Safety', () => {
    it('should provide proper TypeScript types', () => {
      const config: Configuration = {
        version: "1.0.0",
        github: {
          owner: "test",
          repo: "test",
          token: "ghp_test"
        },
        cody: {
          projectId: "test"
        },
        beads: {
          projectPath: "./.beads",
          autoSync: false,
          syncInterval: 60
        },
        sync: {
          defaultDirection: "bidirectional",
          conflictResolution: "manual"
        },
        templates: {
          defaultTemplate: "minimal"
        }
      };

      // This should compile without TypeScript errors
      expect(config.github.owner).toBeTypeOf('string');
      expect(config.cody.projectId).toBeTypeOf('string');
    });
  });
});