# Dogfooding Workflow Guide

## Overview

This guide outlines how to properly use the Cody framework tools to manage the project itself - the practice of "dogfooding" where we use our own tools to build our own tools.

## Proper Workflow for Adding Features

### 1. Planning Phase - Using `/cody plan`

Instead of manually editing the feature backlog, use the structured planning workflow:

```bash
/cody plan
```

**What happens:**
- Guided conversation to understand requirements
- Automatic creation of discovery documents
- Generation of PRD (Product Requirements Document)
- Creation of structured plan document
- Proper integration with Beads task tracking

### 2. Build Phase - Using `/cody build`

After planning is complete, implement using the build workflow:

```bash
/cody build
```

**What happens:**
- Creates feature backlog from planned features
- Sets up version structure
- Generates task lists
- Integrates with git automation
- Provides progress tracking

### 3. Refresh and Update - Using `/cody refresh`

Keep the project state updated:

```bash
/cody refresh
```

**What happens:**
- Updates project context
- Syncs Beads issues with current state
- Refreshes documentation
- Validates configuration

## Intuitive Workflow for New Projects

### Quick Start Guide

1. **Install the package in any project:**
   ```bash
   npm install @pwarnock/liaison
   ```

2. **Initialize liaison framework:**
   ```bash
   npx liaison init
   ```

3. **Start planning:**
   ```bash
   /cody plan
   ```

4. **Build your features:**
   ```bash
   /cody build
   ```

5. **Regular refreshes:**
   ```bash
   /cody refresh
   ```

## Improving Developer Experience (DX)

### Current Pain Points

1. **Complex Setup**: Multiple configuration files and setup steps
2. **Unclear Workflow**: Not obvious how to start using the tools
3. **Manual Processes**: Still some manual editing required
4. **Error Handling**: Errors can be cryptic and hard to debug
5. **Documentation Gaps**: Missing intuitive guides for common workflows

### Proposed Improvements

1. **Simplified Onboarding**:
   - Single command setup: `npx cody-beads quickstart`
   - Interactive configuration wizard
   - Automatic dependency detection

2. **Guided Workflows**:
   - Step-by-step interactive guides
   - Context-aware help system
   - Visual progress indicators

3. **Better Error Handling**:
   - Clear, actionable error messages
   - Suggested fixes and alternatives
   - Debug mode for detailed troubleshooting

4. **Enhanced Documentation**:
   - Quick reference guides
   - Common workflow examples
   - Troubleshooting sections

## Agent Experience Improvements

### Making Agents More Intuitive

1. **Context-Aware Agents**:
   - Agents understand project context automatically
   - Smart suggestions based on current state
   - Adaptive behavior for different project types

2. **Improved Communication**:
   - Clearer prompts and questions
   - Better formatting of responses
   - Progress updates during long operations

3. **Task Management Integration**:
   - Seamless Beads integration
   - Automatic task creation and tracking
   - Status updates and notifications

## Implementation Roadmap

### Phase 1: Core Workflow Improvements
- [ ] Simplified initialization process
- [ ] Interactive planning assistant
- [ ] Visual build progress tracking
- [ ] Enhanced error reporting

### Phase 2: Agent Experience Enhancements
- [ ] Context-aware agent behavior
- [ ] Improved agent communication
- [ ] Better task management integration
- [ ] Adaptive workflow suggestions

### Phase 3: Documentation and Onboarding
- [ ] Quick start guides
- [ ] Interactive tutorials
- [ ] Common workflow examples
- [ ] Troubleshooting documentation

## Best Practices for Dogfooding

1. **Always use the tools**: Never manually edit what the tools can handle
2. **Follow the workflow**: Use `/cody plan` → `/cody build` → `/cody refresh` sequence
3. **Leverage automation**: Use git automation for all commits
4. **Document everything**: Use the built-in documentation features
5. **Provide feedback**: Improve the tools based on your experience using them

## Adoption Strategy

### For New Projects:
1. Install package: `npm install @pwarnock/liaison`
2. Run initialization: `npx liaison init`
3. Follow guided workflow: `/cody plan`, `/cody build`, `/cody refresh`

### For Existing Projects:
1. Add package to existing project
2. Run migration: `npx liaison migrate`
3. Integrate with existing workflows
4. Gradually adopt Cody commands

This workflow ensures we're using our own tools effectively while continuously improving the developer experience.