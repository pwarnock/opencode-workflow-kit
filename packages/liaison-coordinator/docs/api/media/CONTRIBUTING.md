# Contributing to @pwarnock/liaison

Thank you for your interest in contributing! This guide will help you get started.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Git
- Basic knowledge of TypeScript

### Development Setup

```bash
# Clone the repository
git clone https://github.com/pwarnock/liaison-toolkit.git
cd liaison-toolkit

# Install dependencies
npm install

# Navigate to the package
cd packages/liaison

# Start development
npm run dev
```

## 🧪 Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Your Changes

- Follow the existing code style
- Add tests for new functionality
- Update documentation as needed

### 3. Run Tests

```bash
# Run all tests
npm test

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:e2e

# Type check
npm run type-check

# Lint
npm run lint
```

### 4. Commit Your Changes

```bash
git add .
git commit -m "feat: add your feature description"
```

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

### 5. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a pull request on GitHub.

## 🏗️ Project Structure

```
packages/liaison/
├── src/                    # Source code
│   ├── commands/           # CLI command implementations
│   ├── core/              # Core functionality
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   └── index.ts           # Main entry point
├── tests/                  # Test files
│   ├── unit/             # Unit tests
│   ├── integration/       # Integration tests
│   ├── e2e/              # End-to-end tests
│   └── bdd/               # BDD tests
├── templates/              # Project templates
├── scripts/               # Build and utility scripts
├── docs/                  # Documentation
└── bin/                   # Executable scripts
```

## 🧪 Testing Guidelines

### Writing Tests

#### Unit Tests
- Test individual functions and classes
- Mock external dependencies
- Focus on edge cases and error conditions

```typescript
// Example unit test
import { describe, it, expect } from 'vitest';
import { ConfigManager } from '../src/utils/config.js';

describe('ConfigManager', () => {
  it('should load configuration from file', async () => {
    const configManager = new ConfigManager();
    const config = await configManager.loadConfig();
    
    expect(config).toBeDefined();
    expect(config.version).toBe('1.0.0');
  });
});
```

#### Integration Tests
- Test interactions between components
- Use real or containerized services
- Focus on API integrations

#### E2E Tests
- Test complete user workflows
- Use the actual CLI interface
- Focus on real-world scenarios

### Test Commands

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode during development
npm run test:watch

# Run specific test file
npm run test:unit -- tests/unit/utils/config.test.ts
```

## 📝 Code Style

### TypeScript Guidelines

- Use strict TypeScript settings
- Provide type annotations for all public APIs
- Prefer interfaces over types for object shapes
- Use `unknown` instead of `any` when appropriate

### ESLint Configuration

We use ESLint with TypeScript support. Run `npm run lint` to check your code.

### Formatting

Use Prettier for consistent formatting:

```bash
# Format all files
npm run format

# Format specific file
npx prettier --write src/commands/config.ts
```

## 🐛 Bug Reports

### Before Creating a Bug Report

1. **Check existing issues** - Search for duplicates
2. **Try the latest version** - Ensure the bug still exists
3. **Create minimal reproduction** - Isolate the problem

### Bug Report Template

```markdown
## Bug Description
Brief description of the bug

## Steps to Reproduce
1. Run `codybeads config setup`
2. Enter invalid token
3. See error message

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: [e.g., macOS 13.0]
- Node.js version: [e.g., 18.17.0]
- Package version: [e.g., 0.5.0]

## Additional Context
Any other relevant information
```

## 💡 Feature Requests

### Feature Request Template

```markdown
## Feature Description
Clear description of the feature

## Problem Statement
What problem does this solve?

## Proposed Solution
How should this work?

## Alternatives Considered
Other approaches you considered

## Additional Context
Any other relevant information
```

## 📚 Documentation

### Updating Documentation

- README.md for user-facing changes
- Code comments for complex logic
- Type definitions for public APIs
- Examples in docstrings

### Documentation Style

- Use clear, concise language
- Provide code examples
- Include error scenarios
- Add troubleshooting tips

## 🔧 Development Scripts

### Available Scripts

```bash
# Development
npm run dev              # Start development with watch
npm run build            # Build the package
npm run type-check       # TypeScript type checking

# Testing
npm run test             # Run all tests
npm run test:unit        # Run unit tests only
npm run test:integration  # Run integration tests only
npm run test:e2e          # Run E2E tests only
npm run test:coverage    # Run tests with coverage

# Code Quality
npm run lint             # Check code style
npm run lint:fix         # Fix auto-fixable issues
npm run format           # Format code

# Release
npm run pack             # Create npm package
npm run publish          # Publish to npm
```

## 🏷️ Release Process

### Version Management

We use Semantic Versioning (SemVer):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Checklist

- [ ] All tests pass
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version bumped
- [ ] Package builds successfully
- [ ] Security scan passes

### Publishing

```bash
# Build package
npm run build

# Test package
npm pack

# Publish (maintainers only)
npm publish
```

## 🤝 Community Guidelines

### Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Assume good intentions

### Getting Help

- 📖 [Documentation](https://github.com/pwarnock/liaison-toolkit/tree/main/packages/liaison)
- 🐛 [Issues](https://github.com/pwarnock/liaison-toolkit/issues)
- 💬 [Discussions](https://github.com/pwarnock/liaison-toolkit/discussions)
- 📧 [Email](mailto:contribute@peterwarnock.com)

## 🏆 Recognition

Contributors are recognized in:

- README.md contributors list
- Release notes
- GitHub contributors graph
- Annual community highlights

Thank you for contributing to @pwarnock/liaison! 🎉