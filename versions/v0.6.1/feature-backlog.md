# Feature Backlog - v0.6.1 (Post-Refinement)

## Overview
This version focuses on fixing the Beads binary installation issue and adding quality-of-life improvements to the Liaison CLI.

## Atomic Beads (Work Units)

### Beads Integration Fixes
- [ ] **[Bead-1] Fix Beads Binary Installation**
  - Investigate why `@beads/bd` binary is not being downloaded properly
  - Ensure postinstall scripts run correctly in bun environment
  - Add fallback mechanism for binary download failures

- [ ] **[Bead-2] Improve Error Handling**
  - Add more descriptive error messages for Beads connectivity issues
  - Implement retry logic for transient failures
  - Add health check command for Beads integration

### CLI Enhancements
- [ ] **[Bead-3] Add Interactive Mode**
  - Implement `liaison` command without arguments that enters interactive mode
  - Add guided workflow for common operations
  - Include progress indicators for long-running operations

- [ ] **[Bead-4] Config Management Improvements**
  - Add `liaison config validate` command
  - Implement environment variable substitution in config files
  - Add config migration utilities for version upgrades

### Documentation & Testing
- [ ] **[Bead-5] Improve Documentation**
  - Add comprehensive README for the Liaison package
  - Create troubleshooting guide for common issues
  - Add examples for common workflows

- [ ] **[Bead-6] Enhanced Testing**
  - Add integration tests for the full init workflow
  - Add mock tests for Beads client when binary is unavailable
  - Implement end-to-end tests with temporary directories

## Release Preparation
- [ ] Verify Beads binary installation works across platforms
- [ ] Test interactive mode with user workflows
- [ ] Validate config management features
- [ ] Complete documentation review