# CI/CD Integration for v0.5.0 Workflow Automation Tests

## Overview

This directory contains modular CI/CD integration scripts for the v0.5.0 task tracking workflow automation testing infrastructure.

## Architecture

The CI/CD integration follows a modular design:

```
scripts/ci/
├── ci_detect.sh          # CI environment detection
├── ci_logger.sh          # Logging functions
├── ci_annotations.sh     # CI-specific annotations
├── ci_main.sh            # Main CI entry point
└── README.md             # This documentation
```

## Modules

### 1. CI Detection (`ci_detect.sh`)

**Purpose**: Detect CI environment and provide configuration

**Functions**:
- `detect_ci_environment()`: Identifies GitHub Actions, GitLab CI, or generic CI
- `ci_setup()`: Performs environment-specific setup

**Usage**:
```bash
# Detect environment
ci_type=$(./ci_detect.sh)

# Setup environment
./ci_detect.sh setup "$ci_type"
```

### 2. CI Logger (`ci_logger.sh`)

**Purpose**: Provides colored logging with timestamps

**Functions**:
- `init_logging()`: Initialize log file
- `log_info()`, `log_success()`, `log_warning()`, `log_error()`: Log messages with colors

**Usage**:
```bash
# Initialize logging
./ci_logger.sh init "test.log"

# Log messages
./ci_logger.sh info "Starting tests" "test.log"
./ci_logger.sh success "Tests passed" "test.log"
./ci_logger.sh error "Tests failed" "test.log"
```

### 3. CI Annotations (`ci_annotations.sh`)

**Purpose**: Generate CI-specific annotations from test reports

**Features**:
- GitHub Actions annotations (`::notice::`, `::error::`)
- GitLab CI annotations
- Generic console output

**Usage**:
```bash
./ci_annotations.sh "github" "test-report.json"
./ci_annotations.sh "gitlab" "test-report.json"
```

### 4. CI Main (`ci_main.sh`)

**Purpose**: Main entry point for CI/CD workflow automation tests

**Features**:
- Command-line argument parsing
- Test execution with proper logging
- CI environment detection
- Annotation generation
- Exit code handling

**Usage**:
```bash
# Run full test suite
./ci_main.sh

# Run quick tests
./ci_main.sh --quick

# Run performance tests
./ci_main.sh --performance

# Run integration tests
./ci_main.sh --integration

# Show help
./ci_main.sh --help
```

## Integration Examples

### GitHub Actions

```yaml
name: v0.5.0 Workflow Automation Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v4

    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'

    - name: Install dependencies
      run: pip install -r requirements.txt

    - name: Run workflow tests
      run: bash scripts/ci/ci_main.sh --quick

    - name: Upload test results
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: workflow-test-results
        path: test-results/
```

### GitLab CI

```yaml
stages:
  - test

workflow_tests:
  stage: test
  script:
    - bash scripts/ci/ci_main.sh --quick
  artifacts:
    when: always
    paths:
      - test-results/
    expire_in: 1 week
```

### Local Development

```bash
# Run tests locally
bash scripts/ci/ci_main.sh

# Run specific test type
bash scripts/ci/ci_main.sh --performance

# Check results
cat test-results/workflow-test-report-*.json | jq .
```

## Features

### Environment Detection
- Automatically detects GitHub Actions, GitLab CI, or local environment
- Performs environment-specific setup and configuration

### Comprehensive Logging
- Color-coded output for easy reading
- Timestamped log entries
- Separate log files for each test run

### CI-Specific Annotations
- GitHub Actions: Native annotations with `::notice::` and `::error::`
- GitLab CI: Formatted output for job summaries
- Generic: Console output for other CI systems

### Test Types
- **Full**: Complete test suite (core + integration + performance)
- **Quick**: Core workflow tests only (fast feedback)
- **Performance**: Performance and scalability tests
- **Integration**: Integration and synchronization tests

### Reporting
- JSON reports with comprehensive metrics
- Test execution details and timings
- Success/failure rates
- Performance characteristics
- Integration validation results

## Best Practices

### CI Configuration
1. **Run tests on every commit**: Ensure continuous validation
2. **Use appropriate test type**: Quick tests for PRs, full tests for main branch
3. **Upload artifacts**: Preserve test results for debugging
4. **Set timeouts**: Prevent hanging tests (default 300s)
5. **Monitor performance**: Track test execution times over time

### Local Development
1. **Run tests frequently**: Catch issues early
2. **Use quick tests**: Fast feedback during development
3. **Review logs**: Check detailed output for debugging
4. **Validate reports**: Ensure JSON structure is correct
5. **Test CI locally**: Verify CI scripts work before committing

## Troubleshooting

### Common Issues
1. **Permission denied**: Ensure scripts are executable (`chmod +x scripts/ci/*.sh`)
2. **Missing dependencies**: Install required tools (`jq`, Python, etc.)
3. **Timeout issues**: Increase timeout for complex test scenarios
4. **JSON parsing errors**: Validate test report structure
5. **CI detection failures**: Check environment variables

### Debugging
```bash
# Run with verbose output
bash -x scripts/ci/ci_main.sh --quick

# Check individual components
bash scripts/ci/ci_detect.sh
bash scripts/ci/ci_logger.sh init test.log
bash scripts/ci/ci_annotations.sh local test-report.json

# Validate JSON reports
cat test-results/*.json | jq .
```

## Future Enhancements

1. **Parallel Test Execution**: Run test modules in parallel
2. **Test Coverage**: Integration with coverage tools
3. **Performance Benchmarking**: Historical comparison
4. **Slack Notifications**: Test result notifications
5. **Artifact Management**: Long-term storage of test results
6. **Test Impact Analysis**: Identify affected tests based on code changes

## Conclusion

This modular CI/CD integration provides:
- ✅ **Environment Detection**: Automatic CI platform identification
- ✅ **Comprehensive Logging**: Detailed, color-coded output
- ✅ **CI-Specific Annotations**: Native integration with CI platforms
- ✅ **Flexible Test Execution**: Multiple test types and configurations
- ✅ **Detailed Reporting**: Comprehensive metrics and analysis
- ✅ **Production Ready**: v0.5.0 workflow automation CI/CD pipeline