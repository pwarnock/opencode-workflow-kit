import { ConfigManager } from './dist/utils/config.js';

const configManager = new ConfigManager();
const mockConfig = {
  version: '1.0.0',
  github: {
    owner: 'test',
    repo: 'test-repo',
    token: 'test-token'
  },
  cody: {
    projectId: 'test-project'
  },
  beads: {
    projectPath: './test-beads'
  },
  sync: {
    defaultDirection: 'bidirectional',
    conflictResolution: 'manual'
  },
  templates: {
    defaultTemplate: 'minimal'
  }
};

const result = configManager.validateConfig(mockConfig);
console.log('Validation result:', JSON.stringify(result, null, 2));
console.log('typeof result:', typeof result);