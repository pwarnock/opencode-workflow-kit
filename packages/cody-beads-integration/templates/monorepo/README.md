# Monorepo with Cody-Beads Integration

This template provides a comprehensive monorepo setup with seamless integration between Cody Spec Driven Development Framework and Beads issue tracking.

## 🏗️ Structure

```
monorepo/
├── .cody/                  # Cody project configuration
├── .beads/                 # Beads issue tracking
├── .github/                # GitHub workflows
├── packages/               # Shared packages
│   ├── ui/                # UI component library
│   ├── utils/             # Utility functions
│   └── config/            # Shared configuration
├── apps/                   # Applications
│   ├── web/               # Web application
│   ├── mobile/            # Mobile application
│   └── api/               # API service
├── tools/                  # Development tools
│   ├── scripts/           # Build scripts
│   └── generators/        # Code generators
├── docs/                   # Documentation
└── templates/             # Project templates
```

## 🚀 Quick Start

### 1. Initialize Project

```bash
# Create new monorepo
bunx create-monorepo my-project --template cody-beads

cd my-project

# Install dependencies
bun install

# Initialize Cody-Beads integration
bun cody:init
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env.local

# Edit environment variables
nano .env.local
```

### 3. Start Development

```bash
# Start all services in development mode
bun dev

# Or start specific packages
bun dev --filter=web
bun dev --filter=api
```

## 🔧 Configuration

### Cody Configuration (.cody/config.json)

```json
{
  "project": {
    "name": "my-monorepo",
    "description": "A monorepo with Cody-Beads integration",
    "version": "1.0.0"
  },
  "workflows": {
    "build": {
      "command": "turbo run build",
      "description": "Build all packages and applications"
    },
    "test": {
      "command": "turbo run test",
      "description": "Run all tests across packages"
    },
    "deploy": {
      "command": "turbo run deploy",
      "description": "Deploy applications"
    }
  },
  "integrations": {
    "beads": {
      "enabled": true,
      "syncDirection": "bidirectional",
      "autoSync": true
    }
  }
}
```

### Beads Configuration (.beads/config.json)

```json
{
  "project": {
    "name": "my-monorepo",
    "description": "Monorepo project management"
  },
  "workflows": {
    "default": {
      "statuses": ["open", "in_progress", "review", "done"],
      "types": ["feature", "bug", "task", "chore"],
      "priorities": [0, 1, 2, 3]
    }
  },
  "integrations": {
    "cody": {
      "enabled": true,
      "syncDirection": "bidirectional"
    },
    "github": {
      "enabled": true,
      "repository": "your-org/your-monorepo"
    }
  }
}
```

### Turbo Configuration (turbo.json)

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [
    "**/.env.*local",
    ".cody/config.json",
    ".beads/config.json"
  ],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "outputs": []
    },
    "type-check": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "clean": {
      "cache": false
    }
  }
}
```

## 📦 Package Management

### Creating New Packages

```bash
# Create new shared package
bun create:package --name=analytics --type=library

# Create new application
bun create:app --name=admin --type=web

# Create new tool
bun create:tool --name=deploy --type=script
```

### Package Dependencies

```json
// packages/ui/package.json
{
  "name": "@my-monorepo/ui",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "jest",
    "lint": "eslint src --ext .ts,.tsx"
  },
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "typescript": "^5.0.0"
  }
}
```

## 🔄 Cody-Beads Workflow

### Development Workflow

1. **Plan Feature**
   ```bash
   # Create new feature in Cody
   cody plan feature "Add user authentication"
   
   # This automatically creates corresponding Beads issues
   ```

2. **Start Development**
```bash
# Check ready work
bun beads:ready

# Claim task
bun beads:update -- owk-123 --status in_progress

# Start development
bun dev
```

3. **Track Progress**
```bash
# Sync progress between Cody and Beads
bun cody:sync

# Update task status
bun beads:update -- owk-123 --notes "Implemented auth UI"
```

4. **Complete Feature**
```bash
# Mark as complete in Beads
bun beads:update -- owk-123 --status closed

# Sync to Cody
bun cody:sync

# Cody automatically advances to next version
```

### Automated Workflows

```yaml
# .github/workflows/sync.yml
name: Cody-Beads Sync

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'bun'
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
      
      - name: Install dependencies
        run: bun install
      
      - name: Sync Cody and Beads
        run: bun cody:sync
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          BEADS_API_KEY: ${{ secrets.BEADS_API_KEY }}
      
      - name: Run tests
        run: bun test
      
      - name: Build packages
        run: bun build
```

## 🧪 Testing Strategy

### Unit Tests

```bash
# Run all unit tests
bun test

# Run tests for specific package
bun test --filter=ui

# Run tests with coverage
bun test -- --coverage
```

### Integration Tests

```bash
# Run integration tests
bun test:integration

# Run E2E tests
bun test:e2e
```

### Test Configuration

```javascript
// jest.config.js
module.exports = {
  projects: [
    {
      displayName: 'packages',
      testMatch: ['<rootDir>/packages/*/src/**/*.test.{js,ts}'],
      setupFilesAfterEnv: ['<rootDir>/test-setup.js']
    },
    {
      displayName: 'apps',
      testMatch: ['<rootDir>/apps/*/src/**/*.test.{js,ts}'],
      setupFilesAfterEnv: ['<rootDir>/test-setup.js']
    }
  ],
  collectCoverageFrom: [
    'packages/*/src/**/*.{js,ts}',
    'apps/*/src/**/*.{js,ts}',
    '!**/*.d.ts',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

## 🚀 Deployment

### Build Process

```bash
# Build all packages
bun build

# Build specific application
bun build --filter=web

# Build for production
bun build:prod
```

### Deployment Configuration

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build applications
        run: npm run build
      
      - name: Deploy web application
        run: npm run deploy --filter=web
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
      
      - name: Deploy API
        run: npm run deploy --filter=api
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

## 📊 Monitoring

### Health Checks

```bash
# Check system health
bun health:check

# Check package dependencies
bun health:deps

# Check sync status
bun cody:status
```

### Metrics

```typescript
// tools/metrics/collector.ts
import { collectMetrics } from '@my-monorepo/monitoring';

export async function collectProjectMetrics() {
  const metrics = await collectMetrics({
    packages: ['ui', 'utils', 'config'],
    apps: ['web', 'mobile', 'api'],
    tools: ['scripts', 'generators']
  });
  
  return {
    timestamp: new Date().toISOString(),
    ...metrics
  };
}
```

## 🛠️ Development Tools

### Code Generators

```bash
# Generate new component
bun generate:component --name=Button --package=ui

# Generate new hook
bun generate:hook --name=useAuth --package=utils

# Generate new API endpoint
bun generate:endpoint --name=users --package=api
```

### Scripts

```bash
# Update all dependencies
bun update:deps

# Clean all packages
bun clean

# Lint all packages
bun lint

# Type check all packages
bun type-check
```

## 📚 Documentation

### Generating Documentation

```bash
# Generate API documentation
bun docs:api

# Generate component documentation
bun docs:components

# Serve documentation locally
bun docs:serve
```

### Documentation Structure

```
docs/
├── api/                   # API documentation
├── components/            # Component documentation
├── guides/               # User guides
├── tutorials/            # Tutorials
└── examples/             # Code examples
```

## 🤝 Contributing

### Development Workflow

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Make changes and commit: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Create Pull Request

### Code Standards

- Use TypeScript for all new code
- Follow ESLint configuration
- Write comprehensive tests
- Update documentation

### Pre-commit Hooks

```json
// .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
npm run type-check
npm run test
```

## 📄 License

This template is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

### Third-Party Licenses

- **Cody Framework**: Licensed under terms specified in the Cody repository
- **Beads**: Licensed under terms specified in the Beads repository
- **Turbo**: Licensed under the MIT License
- **Other dependencies**: Each under their respective licenses