# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🛠️ Modern Development Workflow

This project uses **Just** as the primary task runner, providing a modern, cross-platform alternative to Make with better syntax and features.

## Quick Commands

### Environment Setup
```bash
# Setup complete development environment
just setup

# Build all packages
just build

# Run all tests
just test

# Start development mode
just dev

# Clean build artifacts
just clean
```

### Package-Specific Work

```bash
# Liaison Integration Package
cd packages/liaison
just setup              # Setup package environment
just dev                 # Start development
just test:all            # Run comprehensive test suite
just build               # Build package
just publish             # Publish to npm

# OpenCode Config Package
just opencode-test        # Run Python tests
just opencode-lint        # Lint Python code
just opencode-format      # Format Python code
```

### Testing Strategy

The project implements comprehensive testing using Vitest, Playwright, Cucumber.js, and security tools:

```bash
# Core testing
just test                # Run all tests
just test:unit           # Unit tests only
just test:integration     # Integration tests only
just test:e2e           # End-to-end tests only
just test:bdd            # BDD tests only
just test:security       # Security tests only
just test:performance    # Performance tests only

# Quality assurance
just qa                  # Run all quality checks
just lint                # Lint all code
just format              # Format all code
just type-check          # Type checking
just security:all        # Security scanning
```

### Release Management

```bash
# Automated releases
just release-patch       # v0.1.0 → v0.1.1
just release-minor       # v0.1.1 → v0.2.0
just release-major       # v0.2.0 → v1.0.0

# Publishing
just publish            # Build, test, and publish all packages
just deploy             # Deploy to registries
```

## Project Architecture

### Core Components

1. **Just Task Runner** - Modern task automation with parameter support
2. **Monorepo Structure** - Multiple packages with shared tooling
3. **Cody-Beads Integration** - TypeScript package for AI development workflows
4. **OpenCode Config** - Python package for configuration management
5. **Comprehensive Testing** - 8 categories of testing with quality gates

### Development Workflow

1. **Initial Setup**: `just setup` installs all dependencies and configures hooks
2. **Development**: `just dev` starts development servers with hot reload
3. **Quality**: `just qa` runs linting, testing, and security checks
4. **Release**: `just release-patch` automates version bumping and publishing

### Package Management

- **Bun** - Fast JavaScript runtime and package manager for Node.js projects
- **uv** - Fast Python package manager and environment manager
- **Just** - Task runner for development workflow automation

### Testing Framework

- **Vitest** - Fast unit and integration testing
- **Playwright** - Cross-browser end-to-end testing
- **Cucumber.js** - Behavior-driven development testing
- **Stryker** - Mutation testing for code quality
- **Security Tools** - Snyk, Git-Secrets, audit-ci

## Configuration Management

### Project Configuration

Configuration files use cascading priority:
1. **Project-level** (`.opencode/`) - Highest priority
2. **Global** (`~/.opencode/`) - Medium priority
3. **Defaults** - Built-in defaults - Lowest priority

### Cody-Beads Integration

Package-level configuration for `packages/liaison`:
```bash
# Interactive setup
cd packages/liaison
just config:setup

# Test configuration
just config:test

# Show current configuration
just config:show
```

## AI Development Integration

### Cody Product Builder Toolkit

The project provides complete :cody integration:
- `/cody plan` - Planning and discovery workflows
- `/cody build` - Implementation and build workflows
- `/cody refresh` - Project context refresh
- `/cody version-add` - Version management workflows

### Beads Development Platform

Integration with Beads for task management:
- Automatic issue synchronization
- Conflict resolution strategies
- Bidirectional data sync
- Template-based project setup

## Quality Standards

### Code Quality Gates

- ✅ Unit test coverage ≥ 80%
- ✅ Integration test pass rate = 100%
- ✅ Security scan with zero high vulnerabilities
- ✅ Accessibility score ≥ 90%
- ✅ Performance score ≥ 80%
- ✅ Mutation score ≥ 80%

### Development Standards

- Use Just for task automation
- Follow ESLint configuration
- Maintain TypeScript strict mode
- Write comprehensive tests
- Document public APIs
- Use semantic versioning

## Working with This Project

### Getting Started

1. **Clone and Setup**: `git clone` + `just setup`
2. **Development**: `just dev` to start development servers
3. **Testing**: `just test` to run comprehensive test suite
4. **Quality**: `just qa` to run all quality checks
5. **Release**: `just release-patch` for patch releases

### Common Tasks

```bash
# Fix code formatting and linting
just format && just lint

# Run full test suite with coverage
just test:coverage

# Security scan before deployment
just security:all

# Create new feature release
just release-minor
```

### Debugging

```bash
# Debug tests with verbose output
LOG_LEVEL=debug just test:unit

# Debug integration tests
just debug:integration

# Debug E2E tests with browser inspector
cd packages/liaison
just debug:e2e
```

## Package-Specific Guidance

### OpenCode Config Package

- **Location**: `packages/opencode_config/`
- **Language**: Python 3.11+
- **Package Manager**: uv
- **Testing**: pytest with coverage
- **Linting**: ruff + mypy

### Cody-Beads Integration Package

- **Location**: `packages/liaison/`
- **Language**: TypeScript
- **Runtime**: Bun
- **Testing**: Vitest + Playwright + Cucumber.js
- **Building**: TypeScript compilation

### Monorepo Management

- **Workspace**: pnpm-workspace.yaml
- **Orchestration**: Turborepo
- **Shared Scripts**: Root justfile for common tasks
- **Dependencies**: Cross-package dependency management

## Tooling Integration

### Just Task Runner Features

- **Function Parameters**: `just recipe param1 param2="default"`
- **Cross-Platform**: Works on Windows, macOS, Linux
- **Dependency Management**: Recipes can depend on other recipes
- **Private Recipes**: Helper functions starting with `_`
- **Rich Output**: Formatted output with emojis and colors

### Development Tools

- **Bun**: Package management, building, and running
- **uv**: Python environment management and package installation
- **Just**: Task automation and workflow management
- **GitHub Actions**: CI/CD pipeline with comprehensive testing

## Best Practices

### Development Workflow

1. **Before Starting**: `just setup` and `just health`
2. **During Development**: `just dev` with frequent `just test`
3. **Before Committing**: `just pre-commit`
4. **Before Pushing**: `just pre-push`
5. **Before Release**: `just qa` and `just test:all`

### Code Standards

- Use TypeScript for new Node.js code
- Follow Python type hints for new Python code
- Write tests for all new functionality
- Maintain 80% test coverage minimum
- Use semantic commit messages
- Update documentation for API changes

### Security Practices

- Never commit secrets or API keys
- Run `just security:all` before releases
- Use environment variables for sensitive data
- Enable 2FA for package publishing
- Regular dependency updates

This project leverages modern tooling and comprehensive testing to provide a robust foundation for AI-driven development workflows. The Just task runner simplifies development while maintaining high quality standards.