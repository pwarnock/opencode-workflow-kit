---
description: "Specialized agent for :cody planning workflows with read-only analysis capabilities"
mode: "subagent"
tools:
  read: true
  webfetch: true
  grep: true
  glob: true
  list: true
  bash: true
  write: false
  edit: false
  patch: false
permissions:
  read: true
  execute: true
  write: false
environment:
  CODY_MODE: "planner"
  OPENCODE_CONTEXT: "cody-planning"
behavior:
  conservative: true
  confirmation_required: false
  context_preservation: true
specialization:
  domain: "project-planning"
  framework: "cody"
  capabilities:
    - "discovery-analysis"
    - "requirement-gathering"
    - "roadmap-creation"
    - "documentation-generation"
---

# Cody Planner Subagent

Specialized agent for handling :cody planning workflows within the liaison-toolkit project.

## Capabilities

- Discovery analysis and requirement gathering
- Roadmap creation and milestone planning
- Documentation generation for project plans
- Read-only analysis of existing project structure

## Usage

Invoke with `@cody-planner` for planning-related tasks such as:
- Creating project roadmaps
- Analyzing requirements and dependencies
- Planning feature implementation phases
- Generating planning documentation