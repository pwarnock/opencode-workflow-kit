---
name: testing-automation
description: Testing patterns with Bun test runner, coverage thresholds, mocking, and CI/CD integration. Use when writing tests, organizing test files, or setting up quality gates.
license: MIT
metadata:
  author: liaison-toolkit
  version: "1.0"
  keywords: "testing, bun, coverage, mocking, ci-cd, quality"
---

# Testing Automation

Patterns and best practices for testing TypeScript projects with Bun test runner, including coverage thresholds, mocking strategies, and CI/CD integration.

## When to use this skill

Use this skill when:
- Writing unit tests or integration tests
- Organizing test file structure
- Configuring test coverage thresholds
- Mocking dependencies for CLI testing
- Setting up CI/CD test pipelines
- Debugging failing tests

## Bun Test Runner Basics

### Running Tests

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run tests with coverage
bun test --coverage

# Run specific test file
bun test path/to/specific.test.ts

# Run tests matching pattern
bun test --pattern "**/*command.test.ts"
```

### Test File Organization

```typescript
// src/cli.test.ts (test file alongside source)
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';

describe('CLI Command', () => {
  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
  });

  it('should parse command arguments correctly', async () => {
    const result = parseCommand(['create', 'test']);
    expect(result.name).toBe('test');
  });
});
```

### Test Types

```typescript
// Unit tests - test individual functions
it('should validate skill name format', () => {
  expect(validateSkillName('test-skill')).toBe(true);
  expect(validateSkillName('Invalid_Name')).toBe(false);
});

// Integration tests - test workflows
it('should create skill with all subdirectories', async () => {
  await createSkill('test-skill');
  const skillExists = await fs.exists('.skills/test-skill/SKILL.md');
  expect(skillExists).toBe(true);
});

// Smoke tests - basic functionality tests
it('should run without errors', async () => {
  const result = await executeCommand(['list']);
  expect(result.exitCode).toBe(0);
});
```

## Test Coverage

### Coverage Thresholds

From qa-subagent configuration in `agents/qa-subagent.json`:

```typescript
// Target: 80% code coverage
const coverageThreshold = 80;
```

### Generating Coverage Reports

```bash
# Run tests with coverage
bun test --coverage

# Coverage output in coverage/ directory
# - coverage/index.html - HTML report
# - coverage/coverage-final.json - JSON for CI
```

### Enforcing Coverage in CI

```yaml
# .github/workflows/test.yml
- name: Check coverage
  run: bun test --coverage
- name: Verify threshold
  run: |
    COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
    if (( $(echo "$COVERAGE < 80" | bc -l) )); then
      echo "Coverage $(COVERAGE)% is below 80%"
      exit 1
    fi
```

## Mocking and Stubbing

### Mocking File System

```typescript
import { mockFS } from 'bun:test/mock';

mockFS({
  '.skills/test-skill/SKILL.md': 'content here',
}, async () => {
  await createSkill('test-skill');
  const content = await fs.readFile('.skills/test-skill/SKILL.md', 'utf-8');
  expect(content).toBe('content here');
});
```

### Mocking CLI Input

```typescript
import { mockProcess } from 'bun:test/mock';

mockProcess({
  argv: ['create', 'test-skill'],
  stdin: 'y\n',  // Simulate user input
});

await executeCommand();
// Verify command behavior with mocked input
```

### Mocking External Services

```typescript
import { mock, spyOn } from 'bun:test';

// Mock Context7 API
const mockContext7 = mock(() => ({
  resolveLibrary: async (name: string) => ({ id: name, docs: '...' }),
}));

// Use mock in test
const result = await mockContext7.resolveLibrary('react');
expect(result.docs).toBeDefined();
```

## CLI Testing Patterns

### Capturing Output

```typescript
import { stdout, stderr } from 'bun:test';

const spyStdout = spyOn(stdout, 'write');
const spyStderr = spyOn(stderr, 'write');

await executeCommand(['list']);

expect(spyStdout).toHaveBeenCalled();
expect(spyStderr).not.toHaveBeenCalled();
```

### Testing Exit Codes

```typescript
import { mockProcess } from 'bun:test/mock';

mockProcess({
  exit: (code: number) => {
    exitCode = code;
  },
});

await executeCommand(['invalid-command']);
expect(exitCode).toBe(1);
```

### Testing Error Messages

```typescript
it('should show error message on invalid input', async () => {
  const spyConsoleError = spyOn(console, 'error');

  await executeCommand(['create', 'Invalid_Name']);

  expect(spyConsoleError).toHaveBeenCalledWith(
    expect.stringContaining('Invalid skill name')
  );
});
```

## CI/CD Integration

### GitHub Actions Test Workflow

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - name: Install dependencies
        run: bun install
      - name: Run tests
        run: bun test --coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/coverage-final.json
```

### Test Matrix Strategy

```yaml
# Test across multiple Node versions and OS
strategy:
  matrix:
    os: [ubuntu-latest, macos-latest, windows-latest]
    bun-version: ['1.0.x', 'latest']

steps:
  - name: Run tests
    run: bun test
```

## Quality Gates

### Pre-commit Test Hooks

```json
// package.json
{
  "scripts": {
    "test": "bun test",
    "test:watch": "bun test --watch",
    "test:coverage": "bun test --coverage",
    "precommit": "bun test"
  }
}
```

### Linting Tests

```bash
# Run linter on test files
bun lint src/**/*.test.ts

# Format test files
bun format src/**/*.test.ts
```

## Verification

After implementing test infrastructure:
- [ ] Test files organized alongside source code
- [ ] Coverage threshold (80%) is enforced
- [ ] Mocks are used for external dependencies
- [ ] CI/CD runs tests on every PR
- [ ] Output capture tests verify correct formatting
- [ ] Exit code tests validate error handling
- [ ] Pre-commit hooks prevent broken tests from committing

## Examples from liaison-toolkit

### Example 1: Testing Skill List Command

```typescript
// packages/liaison/__tests__/skill.test.ts
import { describe, it, expect, mock } from 'bun:test';

describe('skill list command', () => {
  it('should list all available skills', async () => {
    // Mock discoverSkills
    mock(() => ({
      '.skills/library-research/SKILL.md': '...',
      '.skills/git-automation/SKILL.md': '...',
    }), async () => {
      const result = await executeCommand(['skill', 'list']);
      expect(result.skills.length).toBeGreaterThan(0);
    });
  });
});
```

### Example 2: Testing Validation

```typescript
import { describe, it, expect } from 'bun:test';

describe('skill validation', () => {
  it('should reject invalid skill names', async () => {
    const result = await validateSkillName('Invalid_Name');
    expect(result.valid).toBe(false);
    expect(result.errors[0].type).toBe('invalid-name');
  });

  it('should accept valid skill names', async () => {
    const result = await validateSkillName('test-skill');
    expect(result.valid).toBe(true);
  });
});
```

## Related Resources

- [Bun Testing Documentation](https://bun.sh/docs/cli/test)
- [bun:test API](https://bun.sh/docs/test/bun-test)
- [Jest-like Testing Patterns](https://kentcdodds.com/blog/getting-started-with-jest)
- [Test Coverage Best Practices](https://www.codecademy.com/resources/blog/what-is-test-coverage)
