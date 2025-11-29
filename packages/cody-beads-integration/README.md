# Comprehensive Testing Strategy

This document outlines the comprehensive testing strategy implemented for the Cody-Beads Integration package.

## 🧪 Testing Framework Overview

### Core Technologies
- **Vitest** - Fast unit and integration testing framework
- **Playwright** - End-to-end testing across browsers
- **Cucumber.js** - Behavior-driven development (BDD) testing
- **MSW** - API mocking for integration tests
- **Testcontainers** - Containerized testing environments
- **Stryker** - Mutation testing for code quality assurance

### Test Categories

## 1. Unit Tests (`tests/unit/`)

Fast, isolated tests for individual functions and modules.

**Configuration:** `vitest.config.ts`
**Command:** `bun run test:unit`
**Coverage Threshold:** 80% across all metrics

### Structure
```
tests/unit/
├── utils/
│   ├── config.test.ts
│   ├── github.test.ts
│   └── beads.test.ts
├── commands/
│   ├── sync.test.ts
│   ├── config.test.ts
│   ├── template.test.ts
│   ├── init.test.ts
│   └── version.test.ts
├── core/
│   ├── sync-engine.test.ts
│   └── conflict-resolver.test.ts
└── types/
    └── validation.test.ts
```

### Example Usage
```bash
# Run all unit tests
bun run test:unit

# Run specific test file
bun run test:unit -- tests/unit/utils/config.test.ts

# Run with coverage
bun run test:coverage

# Watch mode during development
bun run test:watch
```

## 2. Integration Tests (`tests/integration/`)

Tests that verify interactions between components and external APIs.

**Configuration:** `vitest.integration.config.ts`
**Command:** `bun run test:integration`
**Environment:** Container-based mock services

### Features
- **Mock GitHub API** - Complete GitHub API simulation
- **Mock Beads API** - Beads task management simulation
- **Test Containers** - Real database and service environments
- **Network Isolation** - Controlled test environments

### Structure
```
tests/integration/
├── github-api.test.ts
├── beads-api.test.ts
├── sync-workflows.test.ts
├── template-system.test.ts
├── config-management.test.ts
├── setup.ts          # Integration test setup
├── global-setup.ts   # Global test environment
├── global-teardown.ts # Global cleanup
└── test-sequencer.ts # Test execution order
```

## 3. End-to-End Tests (`tests/e2e/`)

Full application workflow testing across multiple browsers and platforms.

**Framework:** Playwright
**Configuration:** `playwright.config.ts`
**Command:** `bun run test:e2e`
**Coverage:** Chrome, Firefox, Safari, Mobile platforms

### Test Scenarios
- CLI workflow automation
- Template application and validation
- Configuration setup and management
- Synchronization workflows
- Error handling and recovery

### Example Tests
```typescript
// CLI Setup Workflow
test('should complete interactive configuration setup', async ({ page }) => {
  await page.goto('http://localhost:3000');
  // Test complete CLI setup flow
});

// Template Application
test('should apply template to new project', async () => {
  // Test template creation and application
});
```

## 4. Behavior-Driven Development (BDD) Tests (`tests/bdd/`)

User story validation with natural language specifications.

**Framework:** Cucumber.js
**Configuration:** `cucumber.yml`
**Command:** `bun run test:bdd`

### Feature Structure
```
tests/bdd/
├── features/
│   ├── sync-workflows.feature
│   ├── template-management.feature
│   ├── configuration.feature
│   └── error-handling.feature
├── steps/
│   ├── sync-steps.ts
│   ├── template-steps.ts
│   └── config-steps.ts
└── support/
    ├── world.ts
    └── hooks.ts
```

### Example Feature
```gherkin
Feature: Cody-Beads Synchronization Workflows
  As a developer using Cody Product Builder Toolkit and Beads
  I want to synchronize issues and pull requests between the platforms
  So that I can maintain consistency and track progress across both systems

  Scenario: Sync issues from Cody to Beads
    Given I have open issues in my Cody project
    And those issues don't exist in Beads
    When I run "cody-beads sync --direction cody-to-beads"
    Then the issues should be created in Beads
    And the original issues should remain unchanged in Cody
```

## 5. Accessibility Testing (`test:a11y`)

WCAG compliance and screen reader compatibility testing.

**Tool:** Pa11y CI
**Configuration:** `.pa11yci.json`
**Command:** `bun run test:a11y`

### Coverage Areas
- CLI help interface accessibility
- Web component interactions
- Screen reader compatibility
- Keyboard navigation
- Color contrast compliance

## 6. Security Testing (`test:security`)

Comprehensive security validation and vulnerability scanning.

**Tools:**
- **Snyk** - Dependency vulnerability scanning
- **Git-Secrets** - Secret detection
- **Audit-CI** - npm package auditing

**Command:** `bun run test:security`

### Security Checks
```bash
# Dependency vulnerability scan
bunx snyk test --severity-threshold=high

# Secret detection
bunx git-secrets --scan

# Package audit
bunx audit-ci --moderate
```

## 7. Performance Testing (`test:performance`)

Application performance and load testing.

**Tool:** Lighthouse CI
**Configuration:** `.lighthouserc.js`
**Command:** `bun run test:performance`

### Metrics
- Performance score (>80)
- Accessibility score (>90)
- Best practices score (>80)
- SEO compliance

## 8. Mutation Testing (`test:mutation`)

Code quality assurance through mutation analysis.

**Tool:** Stryker
**Configuration:** `.stryker.conf.json`
**Command:** `bun run test:mutation`

### Quality Gates
- Mutation score threshold: 80%
- Code coverage analysis
- Surviving mutant analysis

## 🚀 Test Execution

### Local Development
```bash
# Install dependencies
bun install

# Run all test types
bun run test:all

# Run specific test categories
bun run test:unit          # Unit tests only
bun run test:integration    # Integration tests only
bun run test:e2e           # End-to-end tests only
bun run test:bdd           # BDD tests only
bun run test:a11y          # Accessibility tests only
bun run test:security      # Security tests only
bun run test:performance   # Performance tests only
bun run test:mutation      # Mutation tests only
```

### Pre-commit Hooks
Automated testing triggered by git hooks:
```bash
# Pre-commit checks
bun run pre-commit
# Runs:
# - Linting with ESLint
# - Unit tests execution
# - Type checking with TypeScript
# - Security scan
# - Secret detection
```

### Pre-push Hooks
Comprehensive validation before pushing:
```bash
# Pre-push checks
bun run test:all
# Runs all test categories plus:
# - Build verification
# - Complete security audit
```

## 📊 Test Reporting

### Coverage Reports
- **HTML Report:** `coverage/index.html`
- **LCOV Format:** `coverage/lcov.info`
- **JSON Summary:** `coverage/coverage-summary.json`
- **Cobertura XML:** `coverage/cobertura-coverage.xml`

### CI/CD Integration
- **Codecov Integration:** Automatic coverage upload
- **SonarCloud Analysis:** Code quality and security
- **GitHub Actions:** Comprehensive test matrix
- **Test Artifacts:** Detailed test results and logs

### Mutation Reports
- **HTML Report:** `reports/mutation/index.html`
- **JSON Report:** `reports/mutation/mutation-report.json`
- **Dashboard Integration:** Stryker Dashboard

## 🔧 Test Configuration

### Environment Variables
```bash
# Test environment
NODE_ENV=test
LOG_LEVEL=error

# Test service endpoints
GITHUB_API_URL=http://localhost:3000
BEADS_API_URL=http://localhost:3001
GITHUB_TOKEN=test-token

# Test timeouts
TEST_TIMEOUT=30000
HOOK_TIMEOUT=10000

# Coverage thresholds
COVERAGE_THRESHOLD=80
```

### Test Data Management
```bash
# Test directories structure
test-data/              # Test fixtures and data
├── beads-project/        # Mock Beads project
├── github-repos/         # Mock GitHub repositories
├── configs/              # Test configurations
└── temp/                 # Temporary test files
```

## 🛡️ Quality Gates

### Mandatory Requirements
- ✅ Unit test coverage ≥ 80%
- ✅ Integration test pass rate = 100%
- ✅ Security scan with zero high vulnerabilities
- ✅ Accessibility score ≥ 90%
- ✅ Performance score ≥ 80%
- ✅ Mutation score ≥ 80%

### Release Criteria
- All test categories passing
- No security vulnerabilities
- Full documentation coverage
- Performance benchmarks met
- Accessibility compliance verified

## 🔍 Test Debugging

### Common Issues
1. **Test Isolation** - Ensure tests don't share state
2. **Mock Configuration** - Verify API mocking is correct
3. **Environment Setup** - Check test environment variables
4. **Timing Issues** - Use appropriate timeouts and waits
5. **Resource Cleanup** - Ensure proper test teardown

### Debug Commands
```bash
# Debug specific test
bun run test:unit -- --reporter=verbose --no-coverage

# Debug integration tests with logging
LOG_LEVEL=debug bun run test:integration

# Debug E2E tests with browser inspector
bunx playwright test --debug

# Debug BDD tests with step-by-step execution
bun run test:bdd --format=progress
```

## 📈 Continuous Improvement

### Test Metrics Tracking
- Test execution time trends
- Coverage percentage changes
- Flaky test identification
- Performance benchmarking
- Security scan results

### Maintenance Tasks
- Regular test suite updates
- Mock service maintenance
- Test data refresh
- Documentation updates
- Tool version management

This comprehensive testing strategy ensures robust, secure, and maintainable code delivery across all environments and use cases.