---
name: security-scanning
description: Security scanning with dependency audits, secret detection, static analysis, and vulnerability management. Use when checking for vulnerabilities, scanning dependencies, or enforcing security gates.
license: MIT
metadata:
  author: liaison-toolkit
  version: "1.0"
  keywords: "security, audit, vulnerability, secrets, sast, compliance"
---

# Security Scanning

Security vulnerability detection, secret scanning, and compliance checking for TypeScript and Node.js projects.

## When to use this skill

Use this skill when:
- Checking for dependency vulnerabilities
- Scanning for exposed secrets in code or commits
- Running static code analysis
- Enforcing security gates before deployment
- Reviewing code for security issues
- Auditing package manifests

## Dependency Auditing

### Bun Audit

```bash
# Check for vulnerabilities in dependencies
bun audit

# Fix vulnerabilities automatically (interactive)
bun audit --fix

# Check production dependencies only
bun audit --production

# Generate audit report
bun audit --report-format json > audit-report.json
```

### npm Audit (alternative)

```bash
# Standard audit
npm audit

# Fix vulnerabilities automatically
npm audit fix

# Audit specific severity levels
npm audit --audit-level moderate
npm audit --audit-level high
```

### Snyk Integration

```bash
# Install Snyk CLI
bun install -g snyk

# Scan dependencies
snyk test

# Scan with all vulnerabilities shown
snyk test --severity-threshold=low

# Generate SARIF report
snyk test --sarif-file security-results.sarif
```

### Dependency Allowlists

```json
// .npmrc or .yarnrc
{
  "auditConfig": {
    "allowlist": [
      "package@1.0.0",
      "another-package@2.x.x"
    ]
  }
}
```

## Secret Detection

### Git Pre-commit Hooks

```bash
# .git/hooks/pre-commit
#!/bin/bash

# Scan for secrets before committing
SECRETS=$(git diff --cached --name-only | xargs grep -lE 'password|secret|key|token')

if [ -n "$SECRETS" ]; then
  echo "Error: Potential secrets found in staged files:"
  echo "$SECRETS"
  exit 1
fi
```

### Gitleaks Integration

```bash
# Install gitleaks
bun install -g gitleaks

# Scan repository
gitleaks detect --source HEAD

# Scan with config
gitleaks detect --config .gitleaks.toml

# Prevent leaks in commits
gitleaks protect
```

### Secret Patterns

```typescript
// Common secret patterns to detect
const SECRET_PATTERNS = [
  /password\s*=\s*['"][^'"]+['"]/i,
  /api[_-]?key\s*=\s*['"][^'"]+['"]/i,
  /secret[_-]?key\s*=\s*['"][^'"]+['"]/i,
  /token\s*=\s*['"][^'"]+['"]/i,
  /bearer\s+[\s:]+['"][a-z0-9]{20,}/i,
  /aws[_-]access[_-]key[_-]id\s*=\s*['"][a-z0-9]{20,}/i,
  /private[_-]key\s*=\s*-----BEGIN\s+(RSA|EC|OPENSSH)/i,
];

// Scan files
function scanForSecrets(content: string): string[] {
  const secrets: string[] = [];
  for (const pattern of SECRET_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) secrets.push(...matches);
  }
  return secrets;
}
```

## Static Code Analysis

### TypeScript Strict Mode

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### ESLint Security Rules

```javascript
// .eslintrc.js
module.exports = {
  rules: {
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    'security/detect-object-injection': 'error',
    'security/detect-non-literal-regexp': 'error',
    'security/detect-possible-timing-attacks': 'error'
  }
};
```

### Security Linting Tools

```bash
# ESLint with security plugin
bun eslint src --plugin security

# Bandit for Python (if applicable)
bandit -r src/

# Semgrep for custom security rules
semgrep --config security.yaml src/
```

## Vulnerability Management

### CVSS Scoring

```
CVSS Base Score:
0.0 - 3.9: LOW
4.0 - 6.9: MEDIUM
7.0 - 10.0: HIGH
10.1 - 10.0: CRITICAL
```

### Fixing Vulnerabilities

```bash
# Review vulnerability report
bun audit --json | jq '.vulnerabilities[] | select(.severity == "high")'

# Update vulnerable package
bun update package-name

# Update all vulnerable packages
bun update

# Install specific patched version
bun install package-name@patched-version
```

### Security Gates

### CI Security Check

```yaml
# .github/workflows/security.yml
name: Security Scan

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run security audit
        run: |
          bun audit --json > audit-results.json
      - name: Check for vulnerabilities
        run: |
          HIGH_VULNS=$(jq '.vulnerabilities | length | select(.severity == "high") | length' audit-results.json)
          if [ "$HIGH_VULNS" -gt 0 ]; then
            echo "Found $HIGH_VULNS high severity vulnerabilities"
            exit 1
          fi
      - name: Upload results
        uses: actions/upload-artifact@v4
        with:
          name: audit-results
          path: audit-results.json
```

### Pre-deployment Checklist

```bash
# Security checks before deployment
bun run security-check

# Should verify:
# - No high/critical vulnerabilities
# - No secrets in code
# - All security linting passes
# - Dependencies are up to date
# - No deprecated packages used
```

## Compliance Standards

### OWASP Top 10

| Issue | Prevention |
|-------|------------|
| Injection | Use prepared statements, parameterized queries |
| Broken Authentication | Implement proper auth mechanisms |
| Sensitive Data Exposure | Encrypt data at rest |
| XML External Entities | Use safe XML parsers |
| Broken Access Control | Implement RBAC |
| Security Misconfiguration | Follow security best practices |
| XSS | Sanitize user input, escape output |
| Insecure Deserialization | Use safe deserialization |
| Using Components with Known Vulnerabilities | Keep dependencies updated |
| Insufficient Logging | Log security events |

### Security Headers

```typescript
// Set security headers
import { NextResponse } from 'next/server';

export function GET(request: Request) {
  return NextResponse.json(data, {
    headers: {
      'Content-Security-Policy': "default-src 'self'",
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'X-XSS-Protection': '1; mode=block'
    }
  });
}
```

## Verification

After implementing security checks:
- [ ] Dependency audit runs on every build
- [ ] Secret detection in pre-commit hooks
- [ ] Security gate blocks vulnerable deployments
- [ ] High/critical vulnerabilities addressed promptly
- [ ] Static analysis findings are reviewed
- [ ] Security headers configured
- [ ] No secrets in repository history
- [ ] Security documentation is maintained

## Examples from liaison-toolkit

### Example 1: Security Audit in CI

```yaml
# .github/workflows/security.yml
- name: Audit dependencies
  run: |
    bun audit --json > results.json

- name: Check for critical vulnerabilities
  run: |
    CRITICAL=$(jq '.vulnerabilities | map(select(.severity == "critical")) | length' results.json)
    if [ "$CRITICAL" -gt 0 ]; then
      echo "CRITICAL vulnerabilities found!"
      exit 1
    fi
```

### Example 2: Pre-commit Secret Scan

```bash
# .githooks/pre-commit
#!/usr/bin/env bun

import { execSync } from 'child_process';

const FILES = execSync('git diff --cached --name-only', { encoding: 'utf-8' });
const SECRET_PATTERNS = ['password', 'secret', 'api_key', 'token', 'private_key'];

for (const file of FILES.split('\n')) {
  if (!file.trim()) continue;

  const content = execSync(`git show :${file}`, { encoding: 'utf-8' });

  for (const pattern of SECRET_PATTERNS) {
    if (content.toLowerCase().includes(pattern)) {
      console.error(`Error: Potential secret found in ${file}`);
      process.exit(1);
    }
  }
}
```

## Related Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten)
- [CWE/SANS Top 25](https://cwe.mitre.org/top25)
- [NVD Vulnerability Database](https://nvd.nist.gov)
- [Snyk Vulnerability Database](https://snyk.io/vuln)
- [Gitleaks](https://github.com/gitleaks/gitleaks)
