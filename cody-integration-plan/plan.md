# Product Implementation Plan
This document defines how the product will be built and when.

## Section Explanations
| Section                  | Overview |
|--------------------------|--------------------------|
| Overview                 | A brief recap of what we're building and the current state of the PRD. |
| Architecture             | High-level technical decisions and structure (e.g., frontend/backend split, frameworks, storage). |
| Components               | Major parts of the system and their roles. Think modular: what pieces are needed to make it work. |
| Data Model               | What data structures or models are needed. Keep it conceptual unless structure is critical. |
| Major Technical Steps    | High-level implementation tasks that guide development. Not detailed coding steps. |
| Tools & Services         | External tools, APIs, libraries, or platforms this app will depend on. |
| Risks & Unknowns         | Technical or project-related risks, open questions, or blockers that need attention. |
| Milestones    | Key implementation checkpoints or phases to show progress. |
| Environment Setup | Prerequisites or steps to get the app running in a local/dev environment. |

## Overview
This plan outlines the implementation of OpenCode commands that expose the full :cody framework workflow through OpenCode's command system. The solution provides specialized subagents for different workflow types, automatic context detection, and seamless integration with the existing opencode-config project structure.

## Architecture
The solution follows OpenCode's command and agent architecture:
- **Command Structure**: OpenCode commands in markdown format with frontmatter configuration
- **Agent System**: Specialized subagents for different workflow types (planning, building, version management)
- **Integration Layer**: Configuration files that integrate with existing opencode-config structure
- **Context Management**: Automatic detection and maintenance of :cody project context
- **Error Handling**: Graceful degradation when :cody is unavailable

## Components
- **Command Definitions**: Markdown files for each :cody command (`/plan`, `/build`, `/version add`, etc.)
- **Subagent Configurations**: Agent definitions for planning, building, and version management workflows
- **Integration Scripts**: Tools for detecting :cody projects and managing context
- **Template Updates**: Modifications to existing opencode-config templates to include :cody commands
- **Validation Schemas**: JSON Schema updates for new command and agent configurations
- **Test Suite**: Comprehensive testing for commands, agents, and integration

## Data Model
- **Command Files**: Markdown files with YAML frontmatter defining command properties and templates
- **Agent Configurations**: JSON or markdown files defining subagent properties, tools, and permissions
- **Context Data**: Runtime information about :cody project state and available workflows
- **Error Responses**: Structured error information for troubleshooting and user feedback
- **Configuration Metadata**: Version and compatibility information for integration components

## Major Technical Steps
1. **Analyze Existing :cody Commands**: Document all :cody commands and their requirements
2. **Design Command Structure**: Create OpenCode command definitions for each :cody workflow
3. **Configure Subagents**: Create specialized agents for planning, building, and version management
4. **Implement Context Detection**: Build tools to detect and maintain :cody project context
5. **Update Templates**: Integrate commands and agents into existing opencode-config templates
6. **Create Validation**: Add schema validation for new configurations
7. **Build Test Suite**: Implement comprehensive testing for all components
8. **Documentation**: Create usage examples and integration guides

## Tools & Services
- **OpenCode**: Command system and agent infrastructure
- **:cody Framework**: Target workflow system to be integrated
- **opencode-config**: Existing project structure for integration
- **JSON Schema**: Configuration validation
- **Python**: Existing tooling and script language
- **Markdown**: Command and configuration file format
- **Git**: Version control for configuration files

## Risks & Unknowns
- **:cody Compatibility**: Risk of :cody command structure changes affecting integration
- **OpenCode Limitations**: Potential limitations in OpenCode's command or agent system
- **Context Management**: Complexity in maintaining proper :cody project context
- **Error Handling**: Challenge of providing useful error messages for various failure modes
- **Performance**: Potential performance impact of command and agent overhead
- **Maintenance**: Ongoing maintenance required for :cody framework updates

## Milestones
- **Milestone 1**: Command structure analysis and design documentation
- **Milestone 2**: Core command implementations (`/plan`, `/build`, `/refresh`)
- **Milestone 3**: Subagent configurations and permission systems
- **Milestone 4**: Version management commands (`/version add`, `/version build`)
- **Milestone 5**: Context detection and integration components
- **Milestone 6**: Template integration and configuration updates
- **Milestone 7**: Testing suite implementation and validation
- **Milestone 8**: Documentation and examples completion

## Environment Setup
- **Prerequisites**: OpenCode installation, :cody framework availability, Python environment
- **Development Setup**: Clone opencode-config repository, set up virtual environment
- **Testing Environment**: Configure test :cody projects for integration testing
- **Validation Tools**: Set up JSON Schema validation and configuration testing
- **Documentation**: Prepare markdown files and examples for user guidance