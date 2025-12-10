import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigFactory } from '../../../../src/services/init/ConfigFactory.js';
import { PACKAGE_METADATA } from '../../../../src/config/package-metadata.js';

describe('ConfigFactory', () => {
  let configFactory: ConfigFactory;

  beforeEach(() => {
    configFactory = new ConfigFactory();
  });

  describe('createProjectConfig', () => {
    it('should create a valid project configuration', () => {
      const projectName = 'test-project';
      const config = configFactory.createProjectConfig(projectName);

      expect(config).toEqual({
        name: projectName,
        version: '1.0.0',
        description: `${projectName} - ${PACKAGE_METADATA.integrations.cody.shortName} project`,
        integrations: {
          beads: {
            enabled: true,
            autoSync: false,
            syncInterval: 60,
          },
        },
      });
    });

    it('should handle different project names', () => {
      const config1 = configFactory.createProjectConfig('project-a');
      const config2 = configFactory.createProjectConfig('project-b');

      expect(config1.name).toBe('project-a');
      expect(config2.name).toBe('project-b');
    });
  });

  describe('createBeadsSyncDoc', () => {
    it('should create a valid beads sync documentation', () => {
      const doc = configFactory.createBeadsSyncDoc();

      expect(doc).toContain('# Beads Sync Command');
      expect(doc).toContain('Syncs');
      expect(doc).toContain(PACKAGE_METADATA.integrations.cody.shortName);
      expect(doc).toContain(PACKAGE_METADATA.integrations.beads.shortName);
      expect(doc).toContain('## Usage');
      expect(doc).toContain('## Options');
      expect(doc).toContain('## Integration');
      expect(doc).toContain('--dry-run');
      expect(doc).toContain('--direction');
      expect(doc).toContain('--force');
    });

    it('should include proper markdown formatting', () => {
      const doc = configFactory.createBeadsSyncDoc();

      expect(doc).toContain('```bash');
      expect(doc).toContain('```');
      expect(doc).toContain('`');
    });
  });

  describe('createCodyBeadsConfig', () => {
    it('should create a valid cody-beads configuration with git metadata', () => {
      const gitMetadata = {
        owner: 'test-owner',
        repo: 'test-repo',
        url: 'https://github.com/test-owner/test-repo',
      };

      const config = configFactory.createCodyBeadsConfig('test-project', 'minimal', gitMetadata);

      expect(config).toEqual({
        version: '1.0.0',
        github: {
          owner: 'test-owner',
          repo: 'test-repo',
        },
        cody: {
          projectId: '${CODY_PROJECT_ID}',
          apiUrl: 'https://api.cody.ai',
        },
        beads: {
          projectPath: './test-project',
          autoSync: false,
          syncInterval: 60,
        },
        sync: {
          defaultDirection: 'bidirectional',
          conflictResolution: 'manual',
          preserveComments: true,
          preserveLabels: true,
          syncMilestones: false,
        },
        templates: {
          defaultTemplate: 'minimal',
        },
      });
    });

    it('should create a valid cody-beads configuration without git metadata', () => {
      const config = configFactory.createCodyBeadsConfig('test-project', 'web-development');

      expect(config).toEqual({
        version: '1.0.0',
        github: {
          owner: '${GITHUB_OWNER}',
          repo: 'test-project',
        },
        cody: {
          projectId: '${CODY_PROJECT_ID}',
          apiUrl: 'https://api.cody.ai',
        },
        beads: {
          projectPath: './test-project',
          autoSync: false,
          syncInterval: 60,
        },
        sync: {
          defaultDirection: 'bidirectional',
          conflictResolution: 'manual',
          preserveComments: true,
          preserveLabels: true,
          syncMilestones: false,
        },
        templates: {
          defaultTemplate: 'web-development',
        },
      });
    });

    it('should handle current directory project name', () => {
      const config = configFactory.createCodyBeadsConfig('.', 'minimal');

      expect(config.beads.projectPath).toBe('./');
    });
  });

  describe('getRequiredGitignoreEntries', () => {
    it('should return the required gitignore entries', () => {
      const entries = configFactory.getRequiredGitignoreEntries();

      expect(entries).toEqual([
        'cody-beads.config.json',
        '.env',
        'logs/',
        '*.log',
      ]);
    });

    it('should return a consistent array', () => {
      const entries1 = configFactory.getRequiredGitignoreEntries();
      const entries2 = configFactory.getRequiredGitignoreEntries();

      expect(entries1).toEqual(entries2);
    });
  });
});
