---
description: Creates a Cody project and starts the PLAN phase using OpenCode infrastructure
agent: cody-planner
subtask: true
model: opencode/code-supernova
---

# OpenCode :cody plan Command

This command implements the :cody plan workflow using OpenCode's agent system.

## Context Detection

First, check if this is already a :cody project:
- Look for `.cody/` directory structure
- Check for existing plan documents in `.cody/project/plan/`
- Identify current project state

## Plan Phase Workflow

### Step 1: Initialize Planning
If no existing :cody project is found:
```
+-----------------+
PLAN PHASE : START
+-----------------+
```

### Step 2: Interactive Discovery
Start with: `What do you want to create?`

Follow the Knowledge Criteria approach:
- Target Users — who the app is for
- Problem Being Solved — what pain point it addresses  
- Desired Outcome — what the app should achieve
- Success Criteria — how we'll know the app is successful
- Primary Use Case(s) — main ways the app will be used
- Must-Have Features — critical to version 1.0
- Nice-to-Have Features — can wait until later versions
- Constraints — budget, timeline, tech stack, integrations
- Existing Alternatives — what users are doing today
- Risks & Assumptions — anything that could block success

### Step 3: Document Creation
Create the :cody project structure:
```
.cody/project/
├── plan/
│   ├── discovery.md
│   ├── prd.md
│   └── plan.md
├── build/
└── library/
    ├── assets/
    └── docs/
```

### Step 4: Template Processing
- Copy templates from `templates/cody-commands/plan/`
- Generate discovery.md based on user dialogue
- Create PRD from discovery information
- Generate implementation plan

### Step 5: User Review and Approval
Present documents for user review and iteration.

## Error Handling

- If :cody framework not available, provide alternative workflow
- If template files missing, use built-in templates
- If permission issues, guide user on proper setup

## Integration Notes

This command integrates with:
- OpenCode's file system tools for document creation
- OpenCode's conversation system for interactive dialogue
- OpenCode's template system for document generation
- Existing opencode-config project structure