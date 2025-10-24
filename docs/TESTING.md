# Testing Guide for OpenCode Config

This guide provides comprehensive testing procedures for contributors and users of opencode-config.

## Overview

OpenCode Config includes a robust testing framework designed to ensure configuration compatibility across platforms, validate schema compliance, and verify integration with OpenCode agents.

## Testing Infrastructure

### Test Scripts Location

All test scripts are located in the `scripts/` directory:

- `test-compatibility.py` - Enhanced compatibility testing framework
- `test-runner.py` - Automated test runner for multiple environments
- `test-reporter.py` - Comprehensive test reporting with HTML/JSON output
- `config-validator.py` - Schema validation for configuration files
- `schema-validation-test.py` - Comprehensive schema validation testing
- `opencode-integration-test.py` - OpenCode agent integration testing
- `template-validation-suite.py` - Environment template validation suite

### Test Results

Test results are saved in the `test-results/` directory with timestamps:
- `test-report-YYYYMMDD_HHMMSS.html` - HTML reports
- `test-report-YYYYMMDD_HHMMSS.json` - JSON reports
- `schema-validation-report-YYYYMMDD_HHMMSS.json` - Schema validation reports
- `opencode-integration-report-YYYYMMDD_HHMMSS.json` - Integration test reports
- `template-validation-report-YYYYMMDD_HHMMSS.json` - Template validation reports

## Quick Start Testing

### Prerequisites

Ensure you have the development environment set up:

```bash
# Install dependencies
uv sync

# Activate virtual environment (optional)
source .venv/bin/activate
```

### Run All Tests

```bash
# Run compatibility tests
uv run python scripts/test-compatibility.py --verbose

# Run automated test runner across all environments
uv run python scripts/test-runner.py --environments macos linux windows wsl2

# Generate comprehensive test report
uv run python scripts/test-reporter.py --format both
```

### Validate Configurations

```bash
# Validate all configurations
uv run python scripts/config-validator.py config/

# Validate specific directory
uv run python scripts/config-validator.py config/global/

# Validate with verbose output
uv run python scripts/config-validator.py config/ --verbose
```

## Testing Procedures

### 1. Compatibility Testing

#### Basic Compatibility Test

```bash
# Run basic compatibility tests
uv run python scripts/test-compatibility.py

# Run with verbose output for detailed results
uv run python scripts/test-compatibility.py --verbose
```

#### Cross-Platform Testing

```bash
# Test specific platforms
uv run python scripts/test-runner.py --environments macos linux windows

# Test all supported environments
uv run python scripts/test-runner.py --environments macos linux ubuntu centos alpine windows wsl2

# Test with custom output file
uv run python scripts/test-runner.py --output my-test-results.json
```

#### What Compatibility Tests Check

- **Structure Tests**: Configuration file structure and required fields
- **Validation Tests**: JSON schema validation
- **Path Tests**: Cross-platform path compatibility
- **Platform Tests**: Platform-specific configuration overrides
- **Template Tests**: Environment template functionality
- **Installation Tests**: Setup script validation

### 2. Schema Validation Testing

#### Comprehensive Schema Validation

```bash
# Run comprehensive schema validation
uv run python scripts/schema-validation-test.py config/

# Test specific configuration directory
uv run python scripts/schema-validation-test.py config/global/

# Generate detailed report
uv run python scripts/schema-validation-test.py config/ --output schema-report.json
```

#### Schema Validation Coverage

- **Agent Configurations**: `agent-config.json` schema
- **MCP Servers**: `mcp-servers.json` schema
- **Permissions**: `permissions.json` schema
- **Project Configurations**: `project-config.json` schema

### 3. OpenCode Integration Testing

#### Integration Test Suite

```bash
# Run full integration test suite
uv run python scripts/opencode-integration-test.py config/

# Test specific configuration directory
uv run python scripts/opencode-integration-test.py config/global/

# Generate integration report
uv run python scripts/opencode-integration-test.py config/ --output integration-report.json
```

#### Integration Test Scenarios

- **Config Loading**: JSON parsing and basic validation
- **Environment Compatibility**: Platform-specific configurations
- **MCP Server Config**: Server command and configuration validation
- **Runtime Simulation**: Agent initialization simulation

### 4. Template Validation Testing

#### Template Validation Suite

```bash
# Run full template validation suite
uv run python scripts/template-validation-suite.py

# Test specific template
uv run python scripts/template-validation-suite.py --template web-development

# Generate template report
uv run python scripts/template-validation-suite.py --output template-report.json
```

#### Template Test Scenarios

- **Template Application**: Basic template application to projects
- **Customization**: Template customization scenarios
- **Inheritance**: Configuration inheritance testing
- **Compatibility**: Cross-environment compatibility

## Environment-Specific Testing

### macOS Testing

```bash
# Test macOS-specific configurations
uv run python scripts/test-runner.py --environments macos

# Verify platform overrides for macOS
grep -r "darwin" config/
```

### Linux Testing

```bash
# Test Linux distributions
uv run python scripts/test-runner.py --environments linux ubuntu centos alpine

# Verify Linux-specific paths and commands
uv run python -c "
import os
from pathlib import Path
linux_paths = {
    'config': Path('~/.config/opencode').expanduser(),
    'cache': Path('~/.cache/opencode').expanduser(),
}
for name, path in linux_paths.items():
    print(f'{name}: {path}')
"
```

### Windows/WSL Testing

```bash
# Test Windows/WSL configurations
uv run python scripts/test-runner.py --environments windows wsl2

# Verify Windows-specific commands
grep -r "windows" config/ | grep -E "(cmd|powershell)"
```

## Test Reporting

### Generate HTML Reports

```bash
# Generate HTML test report
uv run python scripts/test-reporter.py --format html

# Generate both HTML and JSON reports
uv run python scripts/test-reporter.py --format both

# Specify custom output directory
uv run python scripts/test-reporter.py --output-dir ./my-reports
```

### Report Analysis

HTML reports include:
- **Executive Summary**: Overall test results and success rates
- **Detailed Results**: Individual test results with error messages
- **Coverage Analysis**: Test coverage across platforms and configurations
- **Trends Analysis**: Historical test performance (if multiple reports)
- **Recommendations**: Automated suggestions for improvements

## Continuous Integration Testing

### Pre-commit Testing

Add to `.pre-commit-config.yaml`:

```yaml
repos:
  - repo: local
    hooks:
      - id: opencode-config-test
        name: opencode-config test
        entry: uv run python scripts/test-compatibility.py
        language: system
        pass_filenames: false
        always_run: true

      - id: opencode-config-validate
        name: opencode-config validate
        entry: uv run python scripts/config-validator.py
        args: [config/]
        language: system
        pass_filenames: false
        always_run: true
```

### GitHub Actions

Create `.github/workflows/test.yml`:

```yaml
name: Test OpenCode Config

on: [push, pull_request]

jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    
    - name: Install uv
      run: curl -LsSf https://astral.sh/uv/install.sh | sh
    
    - name: Install dependencies
      run: uv sync
    
    - name: Run compatibility tests
      run: uv run python scripts/test-compatibility.py --verbose
    
    - name: Run schema validation
      run: uv run python scripts/schema-validation-test.py config/
    
    - name: Run integration tests
      run: uv run python scripts/opencode-integration-test.py config/
    
    - name: Upload test results
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: test-results-${{ matrix.os }}
        path: test-results/
```

## Troubleshooting

### Common Issues

#### Schema Validation Failures

```bash
# Check schema files exist
ls -la schemas/

# Validate specific schema
uv run python -c "
import json
from jsonschema import validate
schema = json.load(open('schemas/agent-config.json'))
validate(instance=config, schema=schema)
"
```

#### Template Application Failures

```bash
# Check template availability
uv run python scripts/environment-templates.py list

# Test template application manually
mkdir -p /tmp/test-template
uv run python scripts/environment-templates.py apply minimal /tmp/test-template
ls -la /tmp/test-template/
```

#### Platform-Specific Issues

```bash
# Check platform detection
python -c "import platform; print(f'Platform: {platform.system()} {platform.machine()}')"

# Verify platform overrides
grep -A 10 -B 2 '"darwin"' config/global/agents/default.json
```

### Debug Mode

Enable debug output for test scripts:

```bash
# Set debug environment variable
export OPENCODE_CONFIG_DEBUG=1

# Run tests with debug output
uv run python scripts/test-compatibility.py --verbose
```

## Contributing Test Improvements

### Adding New Tests

1. **Create test script** in `scripts/` directory
2. **Follow naming convention**: `test-*.py` or `*-test.py`
3. **Include comprehensive error handling**
4. **Add JSON output support** for reporting
5. **Update this documentation**

### Test Script Template

```python
#!/usr/bin/env python3
"""
Test script template for opencode-config.
"""

import sys
import json
from pathlib import Path
from datetime import datetime

def main():
    """Main test function."""
    results = {
        'timestamp': datetime.now().isoformat(),
        'tests_run': 0,
        'passed': 0,
        'failed': 0,
        'errors': []
    }
    
    # Your test logic here
    
    # Output results
    print(json.dumps(results, indent=2))
    
    # Exit with error code if tests failed
    if results['failed'] > 0:
        sys.exit(1)

if __name__ == "__main__":
    main()
```

## Performance Testing

### Benchmark Tests

```bash
# Run performance benchmarks
time uv run python scripts/test-compatibility.py

# Test with large configuration sets
for i in {1..100}; do
  uv run python scripts/config-validator.py config/ > /dev/null
done
```

### Memory Usage

```bash
# Monitor memory usage during tests
/usr/bin/time -v uv run python scripts/test-runner.py --environments linux

# Profile Python memory usage
uv run python -m memory_profiler scripts/test-compatibility.py
```

## Best Practices

### Before Submitting Changes

1. **Run full test suite**:
   ```bash
   uv run python scripts/test-compatibility.py --verbose
   uv run python scripts/schema-validation-test.py config/
   uv run python scripts/opencode-integration-test.py config/
   ```

2. **Check all platforms**:
   ```bash
   uv run python scripts/test-runner.py --environments macos linux windows wsl2
   ```

3. **Validate templates**:
   ```bash
   uv run python scripts/template-validation-suite.py
   ```

4. **Generate reports**:
   ```bash
   uv run python scripts/test-reporter.py --format both
   ```

### Test-Driven Development

1. **Write tests first** for new features
2. **Ensure all tests pass** before committing
3. **Add test coverage** for edge cases
4. **Update documentation** for new test procedures

## Support

For testing-related issues:

1. Check existing test results in `test-results/`
2. Review this documentation
3. Run tests with `--verbose` flag for detailed output
4. Check GitHub Issues for known problems
5. Create new issue with test results and error details