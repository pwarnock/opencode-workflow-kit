# Justfile for Liaison Toolkit
# Modern replacement for Make with better syntax and features
# This is the main entry point that includes all modular justfiles

# BD (beads) Issue Tracker Commands
# Check for ready work
bd-ready:
    #!/usr/bin/env sh
    echo "📋 Checking for ready work..."
    ./scripts/bd-wrapper.sh ready

# Default recipe
default:
    @echo "Liaison Toolkit"
    @echo ""
    @echo "Available recipes:"
    @echo "  setup        - Initialize development environment"
    @echo "  bd-setup     - Setup bd (beads) issue tracker"
    @echo "  bd-ready     - Check for ready work"
    @echo "  bd-create    - Create new bd issue"
    @echo "  build        - Build all packages"
    @echo "  test         - Run all tests"
    @echo "  lint         - Lint all code"
    @echo "  format       - Format all code"
    @echo "  clean        - Clean build artifacts"
    @echo "  dev          - Start development mode"
    @echo "  deploy       - Deploy packages"
    @echo ""
    @echo "Package-specific recipes:"
    @echo "  cody-build   - Build cody-beads-integration"
    @echo "  cody-test    - Test cody-beads-integration"
    @echo "  opencode-test - Test opencode-config"
    @echo ""
    @echo "Task Management (Simple Commands):"
    @echo "  just list        - List all tasks"
    @echo "  just create      - Create a new task"
    @echo "  just update      - Update a task"
    @echo "  just close       - Close a task"
    @echo "  just next        - Get next task"
    @echo "  just sync        - Start synchronization"
    @echo "  just config      - Show configuration"
    @echo ""
    @echo "Quality Assurance & Testing:"
    @echo "  just qa           - Run QA checks (lint + test + security)"
    @echo "  just ci           - Simulate CI/CD pipeline"
    @echo "  just pre-push     - Run all pre-push validations (⭐ use before git push)"
    @echo "  just type-check   - Run TypeScript type checking"
    @echo "  just security-scan - Run security scans"
    @echo "  just health       - Health checks (parallel)"
    @echo "  just health-precise - Health checks (sequential)"
    @echo "  just health-sync   - Sync status check"
    @echo "  just health-coordinator - Coordinator health"
    @echo "  just health-deps   - Dependency verification"
    @echo "  just health-config - Configuration validation"
    @echo ""
    @echo "Release Management:"
    @echo "  just release-patch - Create patch release"
    @echo "  just release-minor - Create minor release"
    @echo "  just release-major - Create major release"
    @echo ""
    @echo "Documentation:"
    @echo "  just docs       - Generate documentation"
    @echo "  just help       - Show this help"
    @echo ""
    @echo "Quick shortcuts:"
    @echo "  just b          - Build"
    @echo "  just t          - Test"
    @echo "  just l          - Lint"
    @echo "  just f          - Format"
    @echo "  just d          - Dev mode"
    @echo "  just c          - Clean"

# Package-specific recipes
cody-build:
    echo "🏗️ Building cody-beads-integration..."
    @cd packages/liaison && bun run build

cody-test:
    echo "🧪 Testing cody-beads-integration..."
    @cd packages/liaison && bun run test

opencode-test:
    echo "🧪 Testing opencode-config..."
    @cd packages && uv run pytest

# Liaison CLI Commands (Simple, descriptive names)
# Underlying command chain remains 'liaison', but just commands are simplified

# Task Commands
list:
    node packages/liaison-coordinator/bin/liaison.js task list

create title description="":
    node packages/liaison-coordinator/bin/liaison.js task create --title "{{title}}" --description "{{description}}"

update id status description="":
    node packages/liaison-coordinator/bin/liaison.js task update --id "{{id}}" --status "{{status}}" --description "{{description}}"

close id description="":
    node packages/liaison-coordinator/bin/liaison.js task update --id "{{id}}" --status "closed" --description "{{description}}"

# Configuration Commands
config-setup:
    node packages/liaison-coordinator/bin/liaison.js config setup

config-test:
    node packages/liaison-coordinator/bin/liaison.js config test

config-show:
    node packages/liaison-coordinator/bin/liaison.js config show

# Sync Commands
sync:
    # Check if GitHub is configured, skip if not
    @if node -e "const config = require('./cody-beads.config.json'); process.exit(!(config.github && config.github.token && config.github.token !== '\${GITHUB_TOKEN}') ? 0 : 1)"; then \
        echo "ℹ️  GitHub integration is not configured. Skipping GitHub sync."; \
        echo "    Use 'just config-setup' to configure GitHub integration when ready."; \
    else \
        node packages/liaison-coordinator/bin/liaison.js sync; \
    fi

sync-dry-run:
    # Check if GitHub is configured, skip if not
    @if node -e "const config = require('./cody-beads.config.json'); process.exit(!(config.github && config.github.token && config.github.token !== '\${GITHUB_TOKEN}') ? 0 : 1)"; then \
        echo "ℹ️  GitHub integration is not configured. Skipping GitHub sync."; \
        echo "    Use 'just config-setup' to configure GitHub integration when ready."; \
    else \
        node packages/liaison-coordinator/bin/liaison.js sync --dry-run; \
    fi

# Health Check System
health:
    # Run comprehensive health checks with parallel execution
    @echo "🏥 Running comprehensive health checks..."
    @python3 scripts/health-check.py --format=json | jq '.'

health-precise:
    # Run precise health checks sequentially for accuracy
    @echo "🔍 Running precise health checks (sequential)..."
    @cd packages/liaison && bun run dist/cli.js health --sequential --format=json | jq '.'

health-sync:
    # Check sync status and Beads integration
    @echo "🔄 Checking sync status..."
    @cd packages/liaison && bun run dist/cli.js health --component=sync --format=json | jq '.'

health-coordinator:
    # Check liaison coordinator health
    @echo "🎛️ Checking coordinator health..."
    @node packages/liaison-coordinator/bin/liaison.js health --format=json

health-deps:
    # Verify dependencies and build tools
    @echo "📦 Verifying dependencies..."
    @cd packages/liaison && bun run dist/cli.js health --component=deps --format=json | jq '.'

health-config:
    # Validate configuration files
    @echo "⚙️ Validating configuration..."
    @cd packages/liaison && bun run dist/cli.js health --component=config --format=json | jq '.'

health-verbose:
    # Run health checks with detailed output
    @echo "🏥 Running detailed health checks..."
    @cd packages/liaison && bun run dist/cli.js health --verbose --format=json | jq '.'

# Aliases for backward compatibility and common usage patterns
next:
    # Get the next available task (filter for open/pending tasks)
    @uv run python scripts/get-next-task.py

# Quick shortcuts for task management
task-list: list
config: config-show

# Help system
help:
    @echo "Liaison Toolkit - Just Task Runner"
    @echo ""
    @echo "Core Development:"
    @echo "  just setup      - Initialize development environment"
    @echo "  just build      - Build all packages"
    @echo "  just test       - Run all tests"
    @echo "  just lint       - Lint all code"
    @echo "  just format     - Format all code"
    @echo "  just clean      - Clean build artifacts"
    @echo "  just dev        - Start development mode"
    @echo ""
    @echo "BD (Beads) Commands:"
    @echo "  just bd-setup   - Setup bd (beads) issue tracker"
    @echo "  just bd-ready   - Check for ready work"
    @echo "  just bd-create  - Create new bd issue"
    @echo "  just bd-update  - Update bd issue"
    @echo "  just bd-close   - Close bd issue"
    @echo "  just bd-list    - List all bd issues"
    @echo "  just bd-show    - Show bd issue details"
    @echo ""
    @echo "Task Management (Simple Commands):"
    @echo "  just list        - List all tasks"
    @echo "  just create      - Create a new task"
    @echo "  just update      - Update a task"
    @echo "  just close       - Close a task"
    @echo "  just next        - Get next task"
    @echo "  just sync        - Start synchronization"
    @echo "  just config      - Show configuration"
    @echo ""
    @echo "Package Management:"
    @echo "  just cody-*       - Cody-Beads integration commands"
    @echo "  just opencode-*   - OpenCode config commands"
    @echo ""
    @echo "Quality Assurance & Testing:"
    @echo "  just qa           - Run QA checks (lint + test + security)"
    @echo "  just ci           - Simulate CI/CD pipeline"
    @echo "  just pre-push     - Run all pre-push validations (⭐ use before git push)"
    @echo "  just type-check   - Run TypeScript type checking"
    @echo "  just security-scan - Run security scans"
    @echo "  just health       - Health checks"
    @echo ""
    @echo "Release Management:"
    @echo "  just release-patch - Create patch release"
    @echo "  just release-minor - Create minor release"
    @echo "  just release-major - Create major release"
    @echo ""
    @echo "Documentation:"
    @echo "  just docs       - Generate documentation"
    @echo "  just help       - Show this help"
    @echo ""
    @echo "Quick shortcuts:"
    @echo "  just b          - Build"
    @echo "  just t          - Test"
    @echo "  just l          - Lint"
    @echo "  just f          - Format"
    @echo "  just d          - Dev mode"
    @echo "  just c          - Clean"
