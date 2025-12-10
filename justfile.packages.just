# Package-Specific Commands
# This file contains commands for specific packages

# Cody-Beads Integration specific recipes
cody-build:
    echo "🏗️ Building cody-beads-integration..."
    @cd packages/liaison && bun run build

cody-test:
    echo "🧪 Testing cody-beads-integration..."
    @cd packages/liaison && bun run test

cody-dev:
    echo "🚀 Starting cody-beads-integration development..."
    @cd packages/liaison && bun run dev

cody-clean:
    echo "🧹 Cleaning cody-beads-integration..."
    @cd packages/liaison && bun run clean

cody-lint:
    echo "🔍 Linting cody-beads-integration..."
    @cd packages/liaison && bun run lint

cody-format:
    echo "✨ Formatting cody-beads-integration..."
    @cd packages/liaison && bun run format

# OpenCode Config specific recipes
opencode-test:
    echo "🧪 Testing opencode-config..."
    @cd packages && uv run pytest

opencode-lint:
    echo "🔍 Linting opencode-config..."
    @cd packages && uv run ruff check opencode_config/
    @cd packages && uv run mypy opencode_config/

opencode-format:
    echo "✨ Formatting opencode-config..."
    @cd packages && uv run black opencode_config/
    @cd packages && uv run ruff format opencode_config/