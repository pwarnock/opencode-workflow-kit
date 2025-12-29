# Agent Workflow Examples

Practical examples of using liaison agents for real development workflows. These examples demonstrate how specialized agents work together to accomplish complex tasks.

## Example 1: CLI Command Development

**Goal**: Create a complete CLI tool for user management with argument parsing, validation, and help text.

### Step-by-Step Workflow

#### 1. Create CLI Specialist Agent

```bash
liaison opencode agent create my-cli-bot --template cli-specialist
```

**What this creates:**
- Agent with `cli-development` domain and `commander.js` framework
- Full tool access for file operations, terminal commands, and code editing
- Loads `cli-development` and `bun-development` skills
- Specialized capabilities for CLI patterns and UX

#### 2. Define Requirements

**Task**: "Create a CLI tool for managing user profiles with these features:
- Add user with username and email validation
- List all users in a formatted table
- Delete user by ID with confirmation
- Use Commander.js for parsing
- Provide helpful error messages and validation
- Include progress indicators for operations"

#### 3. Agent Execution

The CLI specialist agent will:

1. **Load Skills**: Access `cli-development` skill from `.skills/` directory
2. **Analyze Requirements**: Parse the task into specific CLI components
3. **Generate Code Structure**:
   ```javascript
   // Create basic Commander.js structure
   import { Command } from 'commander';
   const program = new Command();

   // Add commands with proper patterns
   program
     .name('user-manager')
     .description('Manage user profiles')
     .version('1.0.0');
   ```

4. **Implement Commands**:
   - `add` command with username/email validation
   - `list` command with formatted table output
   - `delete` command with confirmation prompt
   - Help text and error handling

5. **Add UX Enhancements**:
   - Colored output using chalk
   - Progress spinners for operations
   - Input validation with helpful error messages
   - Consistent command patterns

#### 4. Review Generated Code

**Expected CLI Structure:**
```
user-manager/
├── package.json
├── src/
│   ├── index.js          # Main CLI entry point
│   ├── commands/
│   │   ├── add.js        # Add user command
│   │   ├── list.js       # List users command
│   │   └── delete.js     # Delete user command
│   └── utils/
│       └── validation.js # Input validation helpers
└── README.md            # Generated documentation
```

**Key Features Implemented:**
- ✅ Commander.js command structure
- ✅ Email and username validation
- ✅ Formatted table output
- ✅ Confirmation prompts for destructive operations
- ✅ Progress indicators
- ✅ Comprehensive help text
- ✅ Error handling with colored output

#### 5. Test and Validate

```bash
# Test the CLI functionality
cd user-manager
bun run build
bun src/index.js --help
bun src/index.js add --username john --email john@example.com
bun src/index.js list
bun src/index.js delete --id 1
```

---

## Example 2: CI/CD Pipeline Setup

**Goal**: Set up a complete GitHub Actions workflow for automated testing, coverage enforcement, and deployment.

### Step-by-Step Workflow

#### 1. Create CI/CD Specialist Agent

```bash
liaison opencode agent create my-ci-bot --template ci-cd-specialist
```

**What this creates:**
- Agent with `devops` domain and `github-actions` framework
- Full development tools access
- Loads `testing-automation` and `bun-development` skills
- Specialized for CI/CD pipeline automation

#### 2. Define Pipeline Requirements

**Task**: "Set up GitHub Actions workflow with:
- Run tests on every pull request
- Enforce minimum 80% test coverage
- Test on Node.js 18, 20, and 22
- Run linting and type checking
- Deploy to npm on main branch merges
- Include security scanning
- Send notifications on failures"

#### 3. Agent Execution

The CI/CD specialist will:

1. **Load Skills**: Access testing and development skills
2. **Create Workflow Structure**:
   ```yaml
   # .github/workflows/ci.yml
   name: CI
   on:
     pull_request:
       branches: [ main ]
     push:
       branches: [ main ]
   ```

3. **Implement Test Matrix**:
   ```yaml
   jobs:
     test:
       runs-on: ubuntu-latest
       strategy:
         matrix:
           node-version: [18, 20, 22]
   ```

4. **Add Quality Gates**:
   - Test execution with coverage reporting
   - Coverage threshold enforcement (80%)
   - Linting and type checking
   - Security vulnerability scanning

5. **Configure Deployment**:
   - Automated npm publishing on main branch
   - Version tagging and release creation
   - Build artifact management

#### 4. Review Generated Workflow

**Complete Workflow Features:**
- ✅ Multi-Node.js version testing matrix
- ✅ Coverage reporting and thresholds
- ✅ Automated deployment on merge
- ✅ Security scanning integration
- ✅ Failure notifications
- ✅ Caching for faster builds
- ✅ Proper job dependencies

#### 5. Test Pipeline Execution

```bash
# Test workflow locally (if possible)
# Push to trigger CI
git add .
git commit -m "Add CI/CD pipeline"
git push origin main

# Monitor GitHub Actions tab
# Verify all jobs pass
# Check coverage reports
# Confirm deployment succeeds
```

---

## Example 3: Multi-Agent Security Workflow

**Goal**: Perform comprehensive security audit and coordinate fixes across multiple agents.

### Step-by-Step Workflow

#### 1. Create Specialized Agents

```bash
# Security auditor
liaison opencode agent create security-auditor --template security-validator

# Code fixer (can be CLI specialist or general)
liaison opencode agent create code-fixer --template cli-specialist

# Release coordinator
liaison opencode agent create release-coordinator --template release-engineer
```

#### 2. Define Security Audit Scope

**Task**: "Perform comprehensive security audit and implement fixes:
1. Scan dependencies for vulnerabilities
2. Check for secrets in codebase
3. Review code for security issues
4. Update vulnerable packages
5. Remove or encrypt found secrets
6. Create security patch release"

#### 3. Phase 1: Security Assessment (Security Validator)

The security validator agent:
1. **Runs Dependency Audit**: `bun audit` or `npm audit`
2. **Scans for Secrets**: Searches for API keys, passwords, tokens
3. **Performs Code Analysis**: Looks for security anti-patterns
4. **Generates Report**: Lists all findings with severity levels

**Delegation Decision**: Based on findings, delegates specific fixes

#### 4. Phase 2: Fix Implementation (CLI Specialist)

The CLI specialist agent:
1. **Updates Dependencies**: Runs `bun update` for vulnerable packages
2. **Fixes Code Issues**: Implements secure coding patterns
3. **Removes Secrets**: Identifies and removes hardcoded secrets
4. **Implements Encryption**: Adds proper secret management

**Tools Used**:
- File editing for code fixes
- Terminal commands for dependency updates
- Search capabilities for finding security issues

#### 5. Phase 3: Release Coordination (Release Engineer)

The release engineer agent:
1. **Creates Security Patch**: Bumps version appropriately (e.g., 1.2.3 → 1.2.4)
2. **Generates Changelog**: Documents security fixes
3. **Creates GitHub Release**: Tags and releases security patch
4. **Publishes Package**: Updates npm with security fixes

#### 6. Complete Workflow Integration

**Agent Communication:**
- Security validator reports findings to primary agent
- Primary agent delegates fixes to appropriate specialists
- Each specialist reports completion status
- Release engineer coordinates final deployment

**Expected Outcomes:**
- ✅ All vulnerabilities patched
- ✅ Secrets removed/encrypted
- ✅ Security patch released
- ✅ Documentation updated
- ✅ Stakeholders notified

---

## Example 4: Full-Stack Feature Development

**Goal**: Implement a complete user authentication feature across frontend, backend, and infrastructure.

### Multi-Agent Coordination

#### 1. Create Development Team

```bash
# API/backend specialist
liaison opencode agent create api-specialist --template cli-specialist

# Frontend specialist
liaison opencode agent create frontend-specialist --template custom-agent

# Database specialist
liaison opencode agent create db-specialist --template cli-specialist

# Testing specialist
liaison opencode agent create qa-specialist --template qa-subagent

# DevOps specialist
liaison opencode agent create devops-specialist --template ci-cd-specialist
```

#### 2. Feature Requirements

**Task**: "Implement user authentication system:
- JWT-based authentication
- Password hashing with bcrypt
- User registration and login APIs
- React frontend with login form
- Database schema for users
- Comprehensive test coverage
- CI/CD deployment"

#### 3. Parallel Development Phases

**Phase 1: Backend API (API Specialist)**
- Design authentication endpoints
- Implement JWT token generation
- Create user model with password hashing
- Add middleware for protected routes

**Phase 2: Database Schema (DB Specialist)**
- Design user table schema
- Create migrations
- Set up indexes and constraints
- Implement database connection

**Phase 3: Frontend (Frontend Specialist)**
- Create login/register forms
- Implement authentication state management
- Add protected route components
- Handle token storage and refresh

**Phase 4: Testing (QA Specialist)**
- Write API integration tests
- Create frontend component tests
- Implement E2E authentication flows
- Set up test coverage reporting

**Phase 5: Infrastructure (DevOps Specialist)**
- Configure CI/CD for full-stack testing
- Set up staging environment
- Implement deployment automation
- Configure environment secrets

#### 4. Integration and Deployment

**Workflow Orchestration:**
1. Each specialist works on their component
2. Regular integration points for API contracts
3. Combined testing across all layers
4. Coordinated deployment with rollback capability

**Success Metrics:**
- ✅ Authentication APIs functional
- ✅ Frontend login/logout works
- ✅ Database properly structured
- ✅ Tests pass with >80% coverage
- ✅ Deployed to staging environment

---

## Best Practices from Examples

### Agent Selection Guidelines

1. **Match Domain to Task**: Choose agents whose domain matches the primary work
2. **Consider Required Skills**: Ensure agents have needed specialized knowledge
3. **Balance Specialization vs Flexibility**: Use specific agents for complex tasks, general agents for simple ones

### Workflow Design Patterns

1. **Sequential Dependencies**: Security audit → fixes → release
2. **Parallel Development**: Frontend + backend + database simultaneous work
3. **Quality Gates**: Always include testing and validation steps
4. **Error Recovery**: Design workflows that can handle partial failures

### Multi-Agent Coordination

1. **Clear Interfaces**: Define API contracts between agents early
2. **Status Communication**: Regular progress updates between agents
3. **Conflict Resolution**: Handle cases where agents make conflicting changes
4. **Integration Testing**: Test combined agent outputs before final deployment

### Tool and Permission Management

1. **Minimal Permissions**: Give agents only tools they need
2. **Security Considerations**: Restrict dangerous operations appropriately
3. **Audit Trail**: Track which agents made which changes
4. **Rollback Capability**: Enable undoing changes when needed

### Quality Assurance

1. **Test Early, Test Often**: Include testing at every workflow stage
2. **Coverage Requirements**: Enforce minimum test coverage
3. **Security Validation**: Include security checks in all workflows
4. **Performance Monitoring**: Track workflow execution times

---

## Troubleshooting Common Issues

### Agent Not Following Instructions

**Problem**: Agent doesn't implement features as expected

**Solutions**:
- Check if required skills are loaded
- Verify agent has necessary tools enabled
- Review agent specialization matches task domain
- Try breaking complex tasks into simpler steps

### Skill Knowledge Gaps

**Problem**: Agent lacks knowledge for specific technologies

**Solutions**:
- Create new skills for missing knowledge areas
- Update existing skills with current best practices
- Use general-purpose agents for novel technologies

### Tool Permission Errors

**Problem**: Agent can't perform required operations

**Solutions**:
- Review agent configuration tool permissions
- Enable additional tools if safe to do so
- Use delegation to agents with proper permissions
- Modify agent config to add missing capabilities

### Workflow Coordination Issues

**Problem**: Multiple agents conflict or don't integrate properly

**Solutions**:
- Define clear interfaces and contracts upfront
- Use sequential workflows instead of parallel when possible
- Implement integration testing between agent outputs
- Add validation steps between workflow phases

---

## Getting Started with Workflows

### Quick Start Template

```bash
# Create a basic development agent
liaison opencode agent create my-dev-bot --template cli-specialist

# Start with simple tasks to understand agent capabilities
# Example: "Create a simple CLI tool that greets users by name"

# Gradually increase complexity as you understand agent patterns
# Example: "Create a task management CLI with add, list, complete commands"
```

### Learning Progression

1. **Single-Agent Tasks**: Start with individual agent capabilities
2. **Agent Hand-offs**: Learn how to delegate between agents
3. **Workflow Design**: Create multi-step automated processes
4. **Complex Coordination**: Manage multiple agents on large projects

### Resources

- [Agent Templates Reference](./AGENT_TEMPLATES.md) - Complete template details
- [Agent System Guide](./AGENTS.md) - Comprehensive agent documentation
- [Skill Integration](../SKILLS.md) - Skills system documentation