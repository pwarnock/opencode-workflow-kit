# Justfile for OpenCode Workflow Kit
# Modern replacement for Make with better syntax and features

# Default recipe
default:
    @echo "OpenCode Workflow Kit"
    @echo ""
    @echo "Available recipes:"
    @echo "  setup        - Initialize development environment"
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

# Environment setup
setup:
    #!/usr/bin/env sh
    echo "🔧 Setting up development environment..."

    # Install uv if not present
    @if ! command -v uv >/dev/null 2>&1; then
        echo "📦 Installing uv..."
        curl -LsSf https://astral.sh/uv/install.sh | sh
    fi

    # Install Bun if not present
    @if ! command -v bun >/dev/null 2>&1; then
        echo "📦 Installing Bun..."
        curl -fsSL https://bun.sh/install | bash
    fi

    # Setup Python environment
    echo "🐍 Setting up Python environment..."
    @uv sync

    # Setup Node.js environment
    echo "🟨 Setting up Node.js environment..."
    @cd packages/cody-beads-integration && bun install

    # Setup Git hooks
    echo "🪝 Setting up Git hooks..."
    @bun run setup:hooks || echo "Hooks setup completed"

    echo "✅ Development environment ready!"

# Build all packages
build:
    echo "🏗️ Building all packages..."

    # Build opencode-config
    echo "📦 Building opencode-config..."
    @uv run python -m build

    # Build cody-beads-integration
    echo "📦 Building cody-beads-integration..."
    @cd packages/cody-beads-integration && bun run build

    echo "✅ All packages built successfully!"

# Test all packages
test: test-python test-node
    echo "✅ All tests passed!"

# Test Python packages
test-python:
    echo "🧪 Testing Python packages..."
    @uv run pytest --cov=opencode_config --cov-report=term-missing

# Test Node.js packages
test-node:
    echo "🧪 Testing Node.js packages..."
    @cd packages/cody-beads-integration && bun run test:all

# Lint all code
lint: lint-python lint-node
    echo "✅ All linting completed!"

# Lint Python code
lint-python:
    echo "🔍 Linting Python code..."
    @uv run ruff check opencode_config/
    @uv run mypy opencode_config/

# Lint Node.js code
lint-node:
    echo "🔍 Linting Node.js code..."
    @cd packages/cody-beads-integration && bun run lint

# Format all code
format: format-python format-node
    echo "✅ All code formatted!"

# Format Python code
format-python:
    echo "✨ Formatting Python code..."
    @uv run black opencode_config/
    @uv run ruff format opencode_config/

# Format Node.js code
format-node:
    echo "✨ Formatting Node.js code..."
    @cd packages/cody-beads-integration && bun run format

# Clean build artifacts
clean:
    echo "🧹 Cleaning build artifacts..."

    # Python cleanup
    @rm -rf build/
    @rm -rf dist/
    @rm -rf *.egg-info/
    @rm -rf .pytest_cache/
    @rm -rf .coverage
    @rm -rf htmlcov/
    @find . -type d -name __pycache__ -exec rm -rf {} +
    @find . -type f -name "*.pyc" -delete

    # Node.js cleanup
    @cd packages/cody-beads-integration && \
        rm -rf dist/ && \
        rm -rf node_modules/.cache && \
        rm -rf coverage/ && \
        rm -rf test-results/ && \
        rm -rf playwright-report/ && \
        rm -rf .stryker-tmp/

    echo "✅ Build artifacts cleaned!"

# Development mode
dev:
    echo "🚀 Starting development mode..."

    # Start Python development server
    @echo "Starting Python development server..." && \
        uv run python -m opencode_config.cli --dev &

    # Start Node.js development server
    @echo "Starting Node.js development server..." && \
        cd packages/cody-beads-integration && bun run dev &

    echo "✅ Development servers started!"
    echo "Press Ctrl+C to stop all servers"

# Cody-Beads Integration specific recipes
cody-build:
    echo "🏗️ Building cody-beads-integration..."
    @cd packages/cody-beads-integration && bun run build

cody-test:
    echo "🧪 Testing cody-beads-integration..."
    @cd packages/cody-beads-integration && bun run test:all

cody-dev:
    echo "🚀 Starting cody-beads-integration development..."
    @cd packages/cody-beads-integration && bun run dev

cody-clean:
    echo "🧹 Cleaning cody-beads-integration..."
    @cd packages/cody-beads-integration && bun run clean

cody-lint:
    echo "🔍 Linting cody-beads-integration..."
    @cd packages/cody-beads-integration && bun run lint

cody-format:
    echo "✨ Formatting cody-beads-integration..."
    @cd packages/cody-beads-integration && bun run format

# OpenCode Config specific recipes
opencode-test:
    echo "🧪 Testing opencode-config..."
    @uv run pytest

opencode-lint:
    echo "🔍 Linting opencode-config..."
    @uv run ruff check opencode_config/
    @uv run mypy opencode_config/

opencode-format:
    echo "✨ Formatting opencode-config..."
    @uv run black opencode_config/
    @uv run ruff format opencode_config/

# Deployment recipes
deploy: deploy-python deploy-node
    echo "✅ All packages deployed!"

deploy-python:
    echo "🚀 Deploying Python packages..."
    @uv run python -m build
    @uv run python -m twine upload dist/*

deploy-node:
    echo "🚀 Deploying Node.js packages..."
    @cd packages/cody-beads-integration && bun run publish

# Release management
release-patch:
    #!/usr/bin/env sh
    echo "🏷️ Creating patch release..."

    # Update Python package version
    @cd packages/opencode_config && \
        bump2version patch --config-file ../../pyproject.toml

    # Update Node.js package version
    @cd packages/cody-beads-integration && \
        bunx bumpp patch --package "package.json"

    just build
    just test
    just deploy

    echo "✅ Patch release completed!"

release-minor:
    #!/usr/bin/env sh
    echo "🏷️ Creating minor release..."

    @cd packages/opencode_config && \
        bump2version minor --config-file ../../pyproject.toml

    @cd packages/cody-beads-integration && \
        bunx bumpp minor --package "package.json"

    just build
    just test
    just deploy

    echo "✅ Minor release completed!"

release-major:
    #!/usr/bin/env sh
    echo "🏷️ Creating major release..."

    @cd packages/opencode_config && \
        bump2version major --config-file ../../pyproject.toml

    @cd packages/cody-beads-integration && \
        bunx bumpp major --package "package.json"

    just build
    just test
    just deploy

    echo "✅ Major release completed!"

# Quality assurance
qa:
    echo "🔍 Running quality assurance checks..."
    just lint
    just test
    just security-scan
    echo "✅ QA checks passed!"

# Security scanning
security-scan:
    echo "🔒 Running security scans..."

    # Python security scan
    @echo "Scanning Python packages..." && \
        uv run safety check

    # Node.js security scan
    @echo "Scanning Node.js packages..." && \
        cd packages/cody-beads-integration && bun run test:security

    # Secret detection
    @echo "Scanning for secrets..." && \
        bunx git-secrets --scan

    echo "✅ Security scans completed!"

# Documentation
docs:
    echo "📚 Generating documentation..."

    # Generate Python documentation
    @echo "Generating Python docs..." && \
        cd packages/opencode_config && \
        uv run sphinx-build -b html docs/ docs/_build/

    # Generate Node.js documentation
    @echo "Generating Node.js docs..." && \
        cd packages/cody-beads-integration && \
        bun run docs

    echo "✅ Documentation generated!"

# Performance monitoring
perf:
    echo "📊 Running performance analysis..."

    # Python performance analysis
    @echo "Analyzing Python performance..." && \
        uv run python -m cProfile -o profile.stats -m opencode_config.cli

    # Node.js performance analysis
    @echo "Analyzing Node.js performance..." && \
        cd packages/cody-beads-integration && \
        bun run test:performance

    echo "✅ Performance analysis completed!"

# Health check
health:
    echo "🏥 Running health checks..."

    # Check Python environment
    @echo "Checking Python environment..." && \
        python --version && \
        uv --version

    # Check Node.js environment
    @echo "Checking Node.js environment..." && \
        node --version && \
        bun --version

    # Check project dependencies
    @echo "Checking dependencies..." && \
        uv run python -c "import opencode_config; print('✅ Python imports OK')" && \
        cd packages/cody-beads-integration && \
        bun run type-check

    echo "✅ Health checks completed!"

# CI/CD simulation
ci:
    echo "🔄 Simulating CI/CD pipeline..."

    # Setup environment
    just setup

    # Quality checks
    just lint

    # Run all tests
    just test

    # Security scans
    just security-scan

    # Build packages
    just build

    echo "✅ CI/CD simulation completed successfully!"

# Git helpers
git-status:
    @echo "📋 Git Status:"
    @git status --porcelain

git-sync:
    @echo "🔄 Syncing with remote..."
    @git pull origin main
    @git add .
    @git status --porcelain

    # Ask for commit message if there are changes
    @if [ -n "$(git status --porcelain)" ]; then \
        echo "Enter commit message:" && \
        read -r message && \
        git commit -m "$message"; \
    fi

    @git push origin main

# Help system
help:
    @echo "OpenCode Workflow Kit - Just Task Runner"
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
    @echo "Package Management:"
    @echo "  just cody-*    - Cody-Beads integration commands"
    @echo "  just opencode-* - OpenCode config commands"
    @echo ""
    @echo "Release Management:"
    @echo "  just release-patch - Create patch release"
    @echo "  just release-minor - Create minor release"
    @echo "  just release-major - Create major release"
    @echo ""
    @echo "Quality Assurance:"
    @echo "  just qa         - Run QA checks"
    @echo "  just security   - Security scanning"
    @echo "  just health     - Health checks"
    @echo "  just ci         - Simulate CI/CD"
    @echo ""
    @echo "Documentation:"
    @echo "  just docs       - Generate documentation"
    @echo "  just help       - Show this help"

# Private recipes (start with _)
_setup-hooks:
    @echo "🪝 Setting up Git hooks..."
    @cd packages/cody-beads-integration && \
        bunx husky install || echo "Husky already installed"

_check-deps:
    @echo "🔍 Checking dependencies..."
    @which uv || (echo "❌ uv not found. Run 'just setup'" && exit 1)
    @which bun || (echo "❌ bun not found. Run 'just setup'" && exit 1)

# Aliases for common commands
b: build
t: test
l: lint
f: format
d: dev
c: clean