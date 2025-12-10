# Release Management Commands
# This file contains all release-related commands

# Release management
release-patch:
    #!/usr/bin/env sh
    echo "🏷️ Creating patch release..."

    # Update Python package version
    @cd packages/opencode_config && \
        bump2version patch --config-file ../../pyproject.toml

    # Update Node.js package version
    @cd packages/liaison && \
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

    @if ! command -v bun >/dev/null 2>&1; then echo "❌ ERROR: bun not found - this is a critical dependency"; exit 1; fi
    @cd packages/liaison && \
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

    @if ! command -v bun >/dev/null 2>&1; then echo "❌ ERROR: bun not found - this is a critical dependency"; exit 1; fi
    @cd packages/liaison && \
        bunx bumpp major --package "package.json"

    just build
    just test
    just deploy

    echo "✅ Major release completed!"

# Deployment recipes
deploy: deploy-python deploy-node
    echo "✅ All packages deployed!"

deploy-python:
    echo "🚀 Deploying Python packages..."
    @uv run python -m build
    @uv run python -m twine upload dist/*

deploy-node:
    echo "🚀 Deploying Node.js packages..."
    @cd packages/liaison && bun run publish