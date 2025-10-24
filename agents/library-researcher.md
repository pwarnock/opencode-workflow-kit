# Library-Researcher Subagent

## Overview
Specialized subagent for library documentation research using Context7 integration.

## Configuration

### Agent Settings
- **Name**: library-researcher
- **Type**: subagent
- **Model**: opencode/grok-code-fast
- **Description**: Subagent for library documentation research using Context7

### Capabilities
- library-research
- documentation-analysis  
- context7-integration

### Tools
- context7_resolve_library_id: true
- context7_get_library_docs: true
- webfetch: true
- read: true
- write: false
- bash: false
- edit: false

### Environment
- CONTEXT7_API_KEY: ${CONTEXT7_API_KEY:-}

### Behavior
- conservative_mode: true
- read_only_default: true
- confirm_external_requests: true
- cache_library_docs: true
- rate_limit_requests: true

### Triggers
- **library_research**:
  - enabled: true
  - keywords: ["library", "documentation", "docs", "api reference", "research"]
  - auto_delegate: true

### Permissions
- edit: deny
- bash: deny
- webfetch: allow

## Usage

The library-researcher subagent is automatically triggered when:
1. User mentions keywords: "library", "documentation", "docs", "api reference", "research"
2. Primary agent detects library research request
3. Auto-delegates to library-researcher subagent for parallel processing
4. Subagent uses Context7 tools to research and retrieve documentation
5. Results returned to primary agent

## Safety Features

- Read-only by default (write, bash, edit disabled)
- Conservative mode enabled
- External request confirmation required
- Rate limiting applied
- Secret scanning enabled

## Metadata

- **Created**: 2025-01-24T00:00:00Z
- **Updated**: 2025-01-24T00:00:00Z
- **Author**: opencode-config
- **License**: MIT