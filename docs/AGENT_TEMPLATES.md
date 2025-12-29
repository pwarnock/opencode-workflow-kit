# Agent Template Reference

Complete reference for all 12 available agent templates in the liaison agent system.

## Quick Reference Table

| Template | Domain | Framework | Best For | Required Skills |
|----------|--------|-----------|-----------|----------------|
| `cli-specialist` | cli-development | commander.js | CLI commands, argument parsing, UX | cli-development, bun-development |
| `ci-cd-specialist` | devops | github-actions | CI/CD pipelines, testing automation | testing-automation, bun-development |
| `release-engineer` | release-management | changesets | Version management, publishing | release-publishing, git-automation, bun-development |
| `security-validator` | security-assurance | owasp-cwe-snyk | Security audits, vulnerability scanning | security-scanning, git-automation |
| `workflow-architect` | workflow-automation | liaison | Multi-agent coordination | subagent-coordination, liaison-workflows, bun-development |
| `code-reviewer` | code-review | quality | Code review, best practices | N/A |
| `library-researcher` | library-research | research | API research, documentation | N/A |
| `docs-writer` | documentation | technical-writing | README, API docs | N/A |
| `liaison-specialist` | liaison-architecture | workflow-automation | Workflow design | N/A |
| `qa-subagent` | quality-assurance | testing | Test strategy, QA | N/A |
| `security-subagent` | security-assurance | security | Security compliance | N/A |
| `custom-agent` | general | general | General purpose tasks | N/A |

## Template Details

### cli-specialist

**Domain**: `cli-development`  
**Framework**: `commander.js`  
**Category**: Development Tools

**When to use:**
- Creating CLI commands with Commander.js
- Implementing argument parsing and validation
- Building CLI user experience and help text
- Adding command-line options and flags
- Formatting output for terminal display
- Handling CLI errors and exit codes

**Capabilities:**
- `command-patterns`: Implement CLI command structures
- `argument-validation`: Validate user input and arguments
- `cli-ux`: Design user-friendly CLI experience
- `help-text-formatting`: Format help and usage text
- `error-handling`: Handle CLI errors gracefully
- `option-definition`: Define command options and flags
- `subcommand-structure`: Create nested subcommands
- `output-formatting`: Format CLI output (colors, tables, spinners)
- `progress-indicators`: Show progress during long operations
- `input-validation`: Validate user input before processing

**Required Skills:**
- `cli-development`: Commander.js patterns and best practices
- `bun-development`: Bun build system and development workflow

**Tool Permissions:**
- `read`: ✅ File reading for templates and configs
- `write`: ✅ File writing for generated code
- `edit`: ✅ Code editing for CLI implementation
- `bash`: ✅ Terminal commands for CLI testing
- `grep`: ✅ Text search in codebases
- `glob`: ✅ File pattern matching
- `list`: ✅ Directory listing
- `webfetch`: ❌ No web access needed
- `todowrite`: ✅ Task management for CLI features
- `todoread`: ✅ Task tracking

**Behavior Settings:**
- `conservative`: false (allows code generation)
- `confirmation_required`: false (direct implementation)
- `context_preservation`: true (maintains CLI context)
- `rollback_enabled`: true (can undo changes)
- `system_aware`: true (understands CLI ecosystems)
- `version_aware`: true (handles version-specific CLI patterns)

**Example Usage:**
```bash
# Create CLI specialist agent
liaison opencode agent create my-cli-bot --template cli-specialist

# Agent will have CLI-specific tools and load cli-development skill
# Use with OpenCode, Claude, Cursor to build CLI commands

# Example task: "Create a CLI tool for managing user profiles with
# add, list, delete commands using Commander.js"
```

---

### ci-cd-specialist

**Domain**: `devops`  
**Framework**: `github-actions`  
**Category**: DevOps & Automation

**When to use:**
- Setting up CI/CD pipelines in GitHub Actions
- Configuring automated testing workflows
- Enforcing code coverage thresholds
- Implementing quality gates
- Managing deployment automation
- Setting up release workflows

**Capabilities:**
- `ci-setup`: Configure CI pipeline structure
- `test-automation`: Set up automated testing
- `coverage-enforcement`: Implement coverage requirements
- `quality-gates`: Define quality standards
- `workflow-automation`: Automate development workflows
- `artifact-management`: Handle build artifacts
- `environment-setup`: Configure CI environments
- `trigger-management`: Set up workflow triggers
- `matrix-strategy`: Configure multi-environment testing

**Required Skills:**
- `testing-automation`: Testing frameworks and automation patterns
- `bun-development`: Bun build system integration

**Tool Permissions:**
- `read`: ✅ Reading workflow files and configs
- `write`: ✅ Writing workflow YAML files
- `edit`: ✅ Modifying CI configurations
- `bash`: ✅ Running CI commands and scripts
- `grep`: ✅ Searching code for CI requirements
- `glob`: ✅ Finding test and config files
- `list`: ✅ Directory exploration
- `webfetch`: ❌ No external API calls needed
- `todowrite`: ✅ Managing CI tasks
- `todoread`: ✅ Tracking CI progress

**Behavior Settings:**
- `conservative`: false (allows infrastructure changes)
- `confirmation_required`: false (automated setup)
- `context_preservation`: true (maintains CI context)
- `rollback_enabled`: false (CI changes are reversible)
- `system_aware`: true (understands CI/CD systems)
- `version_aware`: true (handles tool versioning)

**Example Usage:**
```bash
# Create CI/CD specialist agent
liaison opencode agent create my-ci-bot --template ci-cd-specialist

# Example task: "Set up GitHub Actions workflow with:
# - Run tests on pull request
# - Enforce 80% test coverage
# - Run on Node.js 18 and 20
# - Deploy on successful merge"
```

---

### release-engineer

**Domain**: `release-management`  
**Framework**: `changesets`  
**Category**: Release Management

**When to use:**
- Managing version numbers and releases
- Generating changelogs from commits
- Publishing packages to npm
- Creating GitHub releases
- Coordinating version bumps across packages
- Managing release workflows

**Capabilities:**
- `version-bump`: Increment version numbers
- `changelog-gen`: Generate release notes
- `npm-publish`: Publish to package registries
- `github-releases`: Create GitHub releases
- `version-coordination`: Coordinate multi-package versions
- `release-coordination`: Manage release processes
- `tag-management`: Handle git tags
- `dependency-updates`: Update package dependencies

**Required Skills:**
- `release-publishing`: Publishing workflows and best practices
- `git-automation`: Git operations for releases
- `bun-development`: Package management

**Tool Permissions:**
- `read`: ✅ Reading package files and changelogs
- `write`: ✅ Writing changelog and version files
- `edit`: ✅ Modifying package.json files
- `bash`: ✅ Running publish commands
- `grep`: ✅ Finding version references
- `glob`: ✅ Locating package files
- `list`: ✅ Directory exploration
- `webfetch`: ❌ No external calls needed
- `todowrite`: ✅ Release task management
- `todoread`: ✅ Release progress tracking

**Behavior Settings:**
- `conservative`: true (releases are critical)
- `confirmation_required`: true (release verification)
- `context_preservation`: true (maintains release context)
- `rollback_enabled`: false (releases are one-way)
- `system_aware`: true (understands package ecosystems)
- `version_aware`: true (handles semantic versioning)

**Example Usage:**
```bash
# Create release engineer agent
liaison opencode agent create my-release-bot --template release-engineer

# Example task: "Prepare v1.2.0 release:
# - Update version in package.json
# - Generate changelog from commits
# - Create GitHub release
# - Publish to npm"
```

---

### security-validator

**Domain**: `security-assurance`  
**Framework**: `owasp-cwe-snyk`  
**Category**: Security & Compliance

**When to use:**
- Performing security audits and vulnerability scanning
- Detecting secrets in codebases
- Validating security compliance
- Assessing security posture
- Implementing security best practices
- Managing security-related tasks

**Capabilities:**
- `dependency-audit`: Scan for vulnerable dependencies
- `secret-detection`: Find secrets in code
- `vulnerability-management`: Handle security issues
- `compliance-validation`: Check security compliance
- `threat-modeling`: Assess security threats
- `code-security-review`: Review code for security issues
- `access-control`: Manage permissions and access
- `encryption-validation`: Verify encryption usage

**Required Skills:**
- `security-scanning`: Security tools and scanning techniques
- `git-automation`: Git operations for security patches

**Tool Permissions:**
- `read`: ✅ Reading code for security analysis
- `write`: ❌ No direct file modifications
- `edit`: ✅ Fixing security issues
- `bash`: ✅ Running security scanners
- `grep`: ✅ Searching for security patterns
- `glob`: ❌ Limited file access for security
- `list`: ✅ Directory exploration
- `webfetch`: ✅ Checking vulnerability databases
- `todowrite`: ❌ No task creation
- `todoread`: ❌ No task reading

**Behavior Settings:**
- `conservative`: true (security is critical)
- `confirmation_required`: true (security changes need verification)
- `context_preservation`: true (maintains security context)
- `rollback_enabled`: false (security fixes are permanent)
- `system_aware`: true (understands security ecosystems)
- `version_aware`: true (handles security tool versions)

**Example Usage:**
```bash
# Create security validator agent
liaison opencode agent create my-security-bot --template security-validator

# Example task: "Perform security audit:
# - Run dependency vulnerability scan
# - Check for secrets in codebase
# - Validate security configurations
# - Generate security report"
```

---

### workflow-architect

**Domain**: `workflow-automation`  
**Framework**: `liaison`  
**Category**: Workflow Orchestration

**When to use:**
- Designing multi-agent workflows
- Coordinating complex development processes
- Managing agent delegation and handoffs
- Creating automated development pipelines
- Orchestrating specialized agent interactions

**Capabilities:**
- `agent-orchestration`: Coordinate multiple agents
- `delegation-routing`: Route tasks to appropriate agents
- `workflow-graph`: Design workflow dependencies
- `inter-agent-communication`: Manage agent interactions
- `workflow-design`: Create workflow architectures
- `task-driven-automation`: Automate task-based workflows
- `process-optimization`: Optimize workflow efficiency
- `error-recovery`: Handle workflow failures

**Required Skills:**
- `subagent-coordination`: Multi-agent coordination patterns
- `liaison-workflows`: Liaison workflow integration
- `bun-development`: Development workflow integration

**Tool Permissions:**
- `read`: ✅ Reading workflow configurations
- `write`: ✅ Creating workflow files
- `edit`: ✅ Modifying workflow definitions
- `bash`: ✅ Running workflow commands
- `grep`: ✅ Searching workflow patterns
- `glob`: ✅ Finding workflow files
- `list`: ✅ Directory exploration
- `webfetch`: ❌ No external calls needed
- `todowrite`: ✅ Task orchestration
- `todoread`: ✅ Workflow tracking

**Behavior Settings:**
- `conservative`: false (allows workflow experimentation)
- `confirmation_required`: false (automated coordination)
- `context_preservation`: true (maintains workflow context)
- `rollback_enabled`: true (can revert workflow changes)
- `system_aware`: true (understands agent ecosystems)
- `version_aware`: true (handles workflow versioning)

**Example Usage:**
```bash
# Create workflow architect agent
liaison opencode agent create my-workflow-bot --template workflow-architect

# Example task: "Design multi-agent workflow for feature development:
# - Code reviewer analyzes requirements
# - CLI specialist implements commands
# - CI/CD specialist sets up testing
# - Release engineer handles deployment"
```

---

### code-reviewer

**Domain**: `code-review`  
**Framework**: `quality`  
**Category**: Code Quality

**When to use:**
- Performing code reviews
- Enforcing coding standards
- Identifying code quality issues
- Suggesting improvements
- Validating best practices

**Capabilities:**
- `code-review`: Comprehensive code review
- `quality-assurance`: Quality assessment
- `best-practices-enforcement`: Best practice validation
- `security-review`: Security-focused code review
- `performance-analysis`: Performance code review
- `maintainability-assessment`: Code maintainability review

**Required Skills:** None

**Tool Permissions:** Standard review permissions (read, edit, grep)

---

### library-researcher

**Domain**: `library-research`  
**Framework**: `research`  
**Category**: Research & Documentation

**When to use:**
- Researching libraries and APIs
- Finding documentation and examples
- Evaluating technology options
- Understanding framework capabilities

**Capabilities:**
- `library-research`: Comprehensive library research
- `documentation-analysis`: Documentation review
- `context7-integration`: Context7 API integration
- `api-analysis`: API capability assessment
- `comparison-analysis`: Technology comparison

**Required Skills:** None

**Tool Permissions:** Research permissions (read, webfetch, grep)

---

### docs-writer

**Domain**: `documentation`  
**Framework**: `technical-writing`  
**Category**: Documentation

**When to use:**
- Writing technical documentation
- Creating README files
- Generating API documentation
- Writing tutorials and guides

**Capabilities:**
- `documentation-generation`: Documentation creation
- `api-docs`: API documentation
- `tutorials`: Tutorial writing
- `user-guides`: User guide creation
- `technical-writing`: Technical content writing

**Required Skills:** None

**Tool Permissions:** Writing permissions (read, write, edit, bash)

---

### liaison-specialist

**Domain**: `liaison-architecture`  
**Framework**: `workflow-automation`  
**Category**: Architecture

**When to use:**
- Designing liaison workflows
- Creating task automation systems
- Managing integration patterns
- Planning architectural improvements

**Capabilities:**
- `workflow-design`: Workflow architecture design
- `task-automation`: Task automation systems
- `integration-management`: System integration
- `architecture-guidance`: Architectural guidance

**Required Skills:** None

**Tool Permissions:** Full permissions with rollback enabled

---

### qa-subagent

**Domain**: `quality-assurance`  
**Framework**: `testing`  
**Category**: Quality Assurance

**When to use:**
- Developing test strategies
- Implementing testing frameworks
- Quality assurance processes
- Performance testing

**Capabilities:**
- `test-strategy`: Test strategy development
- `test-execution`: Test execution
- `quality-gate-enforcement`: Quality gate implementation
- `performance-testing`: Performance testing

**Required Skills:** None

**Tool Permissions:** QA permissions (bash, grep, conservative behavior)

---

### security-subagent

**Domain**: `security-assurance`  
**Framework**: `security`  
**Category**: Security

**When to use:**
- Security compliance tasks
- Basic security assessments
- Security best practice implementation

**Capabilities:**
- `vulnerability-scanning`: Vulnerability scanning
- `security-audit`: Security audits
- `compliance-validation`: Compliance validation
- `threat-modeling`: Threat modeling

**Required Skills:** None

**Tool Permissions:** Security permissions (read, grep, conservative behavior)

---

### custom-agent

**Domain**: `general`  
**Framework**: `general`  
**Category**: General Purpose

**When to use:**
- General purpose tasks
- When no specialized template fits
- Basic assistance tasks

**Capabilities:**
- `general-assistance`: General purpose assistance

**Required Skills:** None

**Tool Permissions:** Basic permissions (read, edit, webfetch)