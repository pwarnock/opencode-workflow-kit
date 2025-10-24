# Product Requirements Document (PRD)
This document formalizes the idea and defines the what and the why of the product the USER is building.

## Section Explanations
| Section           | Overview |
|-------------------|--------------------------|
| Summary           | Sets the high-level context for the product. |
| Goals             | Articulates the product's purpose — core to the "why". |
| Target Users      | Clarifies the audience, essential for shaping features and priorities. |
| Key Features      | Describes what needs to be built to meet the goals — part of the "what". |
| Success Criteria  | Defines what outcomes validate the goals. |
| Out of Scope      | Prevents scope creep and sets boundaries. |
| User Stories      | High-level stories keep focus on user needs (why) and guide what to build. |
| Assumptions       | Makes the context and unknowns explicit — essential for product clarity. |
| Dependencies      | Identifies blockers and critical integrations — valuable for planning dependencies and realism. |

## Summary
OpenCode commands that expose the full :cody framework workflow through OpenCode's command system, enabling users to execute :cody workflows using OpenCode's agent infrastructure and specialized subagents.

## Goals
- Enable seamless integration of :cody workflows into OpenCode's command system
- Provide specialized subagents optimized for different :cody workflow types
- Maintain consistency with existing :cody command structure and behavior
- Leverage OpenCode's agent and permission system for enhanced workflow control
- Distribute as part of the existing opencode-config project structure

## Target Users
OpenCode users who want to use :cody framework workflows within the OpenCode ecosystem, including developers who work across multiple machines and projects using opencode-config.

## Key Features
- **Core :cody Commands**: `/plan`, `/build`, `/version add`, `/version build`, `/refresh`, `/relearn`, `/upgrade`
- **Specialized Subagents**: Planning agent (read-only), Building agent (full access), Version management agent (version-specific tools)
- **Automatic Context Detection**: Detect existing :cody projects and maintain appropriate context
- **Error Handling**: Graceful handling of :cody availability and command failures
- **Integration**: Seamless integration with existing opencode-config templates and configurations

## Success Criteria
- All core :cody workflows are accessible through OpenCode commands
- Commands maintain consistency with :cody behavior and structure
- Subagents have appropriate tool access for their workflow types
- Integration works seamlessly with existing opencode-config project
- Error handling provides clear feedback for troubleshooting

## Out of Scope (Optional)
- Custom :cody command creation beyond the core workflow
- Modification of :cody framework behavior
- Integration with other project management systems
- Real-time collaboration features

## User Stories (Optional)
- As a developer, I want to use `/plan` to start a :cody planning phase using OpenCode's infrastructure
- As a developer, I want to use `/build` to execute :cody build workflows with specialized subagents
- As a developer, I want to use `/version add` to manage versions through OpenCode commands
- As a developer, I want automatic detection of my existing :cody projects when using OpenCode commands
- As a developer, I want clear error messages when :cody is not available or commands fail

## Assumptions
- Users have :cody framework installed and available
- OpenCode's command and agent system supports the required functionality
- Existing opencode-config structure can accommodate the new commands and agents
- :cody command structure is stable and well-documented

## Dependencies
- :cody framework installation and availability
- OpenCode's command system functionality
- OpenCode's agent and subagent infrastructure
- Existing opencode-config project structure and templates
- JSON Schema validation for new configurations