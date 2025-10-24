# Discovery
This document captures the raw, unfiltered idea or initial AI prompt that sparked the project.

## Starting Prompt
**USER:** I need to plan a feature for opencode-config that creates OpenCode commands to instruct subagents to execute :cody framework workflows.

The user wants:
1. OpenCode commands (not custom tools) that tell subagents to use :cody
2. Subagents should have appropriate tools to execute :cody workflows
3. Commands should follow OpenCode's command structure
4. Integration with the existing opencode-config project

Please analyze the current codebase structure and create a comprehensive plan for:
- What OpenCode commands should be created
- How subagents should be configured for :cody workflows  
- Command implementation approach
- Integration with existing project structure
- Testing and validation strategy

Focus on planning, not implementation. Use the existing :cody planning templates and workflow.

## Questions

**AGENT Q1:** What specific :cody workflows do you want to expose through OpenCode commands? For example, do you want to expose the full planning/build lifecycle, or specific workflows like version management, project setup, etc.?  
**USER A1:** All core :cody workflows should be exposed - plan, build, version management, refresh, relearn, upgrade, etc.

**AGENT Q2:** How should the OpenCode commands be organized? Should they be prefixed (like `/cody-plan`, `/cody-build`) or use the exact :cody command names (like `/plan`, `/build`)?  
**USER A2:** Use the exact :cody command names for consistency - `/plan`, `/build`, `/version add`, etc.

**AGENT Q3:** What level of integration do you want with the existing opencode-config project? Should this be a new environment template, an addition to existing templates, or a separate module?  
**USER A3:** Integration with existing project structure - add to current templates and configurations

**AGENT Q4:** How should subagents be configured for :cody workflows? Should there be a single :cody-capable subagent, or multiple specialized subagents for different workflows?  
**USER A4:** Multiple specialized subagents for different workflow types - planning, building, version management

**AGENT Q5:** What tools and permissions should the :cody subagents have access to? Should they have full file system access or be restricted to specific :cody-related operations?  
**USER A5:** Appropriate tools for each workflow type - planning agents get read-only, building agents get write access, etc.

**AGENT Q6:** How should the commands handle :cody project context? Should they automatically detect existing :cody projects or require explicit project setup?  
**USER A6:** Automatically detect existing :cody projects and handle context appropriately

**AGENT Q7:** What testing strategy do you want for this feature? Should we test the commands individually, integration with :cody, or both?  
**USER A7:** Both individual command testing and integration testing with :cody workflows

**AGENT Q8:** How should error handling work when :cody is not available or when :cody commands fail?  
**USER A8:** Graceful error handling with clear messages about :cody availability and command failures

## Discovery Summary
This project aims to create OpenCode commands that expose the full :cody framework workflow through OpenCode's command system. The solution will integrate with the existing opencode-config project structure and provide specialized subagents for different workflow types (planning, building, version management).

The approach will use exact :cody command names for consistency, automatically detect existing :cody projects, and provide appropriate tool access for each workflow type. The implementation will include comprehensive testing of both individual commands and integration with :cody workflows, with graceful error handling for :cody availability issues.

Success is measured by seamless integration of :cody workflows into OpenCode's command system, maintaining the full power of :cody while leveraging OpenCode's agent and command infrastructure. The solution will be distributed as part of the existing opencode-config templates and configurations.