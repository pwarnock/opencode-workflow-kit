module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000'],
      startServerCommand: 'npm run build && npm run start:test',
      startServerReadyPattern: 'Server running on port 3000',
      startServerReadyTimeout: 30000,
      settings: {
        chromeFlags: '--no-sandbox --headless'
      }
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.8 }],
        'categories:seo': ['off'],
        'categories:pwa': ['off']
      }
    },
    upload: {
      target: 'temporary-public-storage'
    }
  }
};