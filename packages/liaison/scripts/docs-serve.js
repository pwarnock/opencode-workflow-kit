#!/usr/bin/env node

/**
 * Documentation server for Cody Beads Integration
 * Serves generated API documentation locally
 */

import { createServer } from 'http';
import { handler } from 'serve-handler';
import { URL } from 'url';

const PORT = process.env.DOCS_PORT || 3000;
const DOCS_DIR = new URL('../docs/api/', import.meta.url).pathname;

const server = createServer(async (req, res) => {
  return handler(req, res, {
    public: DOCS_DIR,
    cleanUrls: true,
    directoryListing: true,
    headers: [
      {
        source: '**/*.{js,css,html}',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache'
          }
        ]
      }
    ]
  });
});

server.listen(PORT, () => {
  console.log(`📚 API Documentation available at: http://localhost:${PORT}`);
  console.log(`📂 Serving from: ${DOCS_DIR}`);
  console.log(`\n🔗 Main API Reference: http://localhost:${PORT}/index.html`);
  console.log(`\n💡 Press Ctrl+C to stop the server`);
});

process.on('SIGINT', () => {
  console.log('\n👋 Documentation server stopped');
  server.close();
  process.exit(0);
});