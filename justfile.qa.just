# Quality Assurance Commands
# This file contains all QA-related commands

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
        cd packages/liaison && bun run test:security

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
        cd packages/liaison && \
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
        cd packages/liaison && \
        bun run test:performance

    echo "✅ Performance analysis completed!"

# Health check
health:
    echo "🏥 Running health checks..."

    # Check Python environment
    @echo "Checking Python environment..." && \
        uv run python --version && \
        uv --version

    # Check Node.js environment
    @echo "Checking Node.js environment..." && \
        node --version && \
        bun --version

    # Check project dependencies
    @echo "Checking dependencies..." && \
        uv run python -c "import sys; sys.path.insert(0, 'packages'); import opencode_config; print('✅ Python imports OK')" && \
        cd packages/liaison && \
        (bun run type-check || echo "⚠️ TypeScript check failed but continuing...")

    echo "✅ Health checks completed!"

# CI/CD simulation - Mirrors GitHub Actions workflow
ci:
    echo "🔄 Simulating CI/CD pipeline..."

    # Fail fast on any error
    set -e

    # Setup environment
    just setup

    # Quality checks
    just lint
    just type-check

    # Run all tests
    just test

    # Security scans
    just security-scan

    # Build packages
    just build

    echo "✅ CI/CD simulation completed successfully!"

# Comprehensive pre-push validation - Run before git push
pre-push:
    echo "🚨 Running pre-push validation (mirrors GitHub Actions)..."
    echo ""

    # Fail on first error
    set -e

    echo "📦 Installing dependencies..."
    cd packages/liaison && bun install --frozen-lockfile
    cd ../../

    echo ""
    echo "🔒 Security audit..."
    cd packages/liaison && bun run test:security
    cd ../../

    echo ""
    echo "🔍 Type checking..."
    cd packages/liaison && bun run type-check
    cd ../../

    echo ""
    echo "🔍 Linting..."
    cd packages/liaison && bun run lint
    cd ../../

    echo ""
    echo "🏗️ Building..."
    cd packages/liaison && bun run build
    cd ../../

    echo ""
    echo "🧪 Running tests..."
    cd packages/liaison && bun run test
    cd ../../

    echo ""
    echo "✅ All pre-push checks passed!"
    echo "Ready to push to GitHub 🚀"

# Type checking
type-check:
    echo "🔍 Running type checks..."
    cd packages/liaison && bun run type-check
    echo "✅ Type checking passed!"

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