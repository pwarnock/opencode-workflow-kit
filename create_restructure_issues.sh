#!/bin/bash

# Create Beads issues for Liaison Toolkit restructuring

echo "Creating Beads issues for Liaison Toolkit restructuring..."

# Phase 2: Package Renaming
echo "Creating Phase 2 tasks..."

bd create "TASK-001: Rename unified-cli → liaison package" \
  -t task \
  -p P0 \
  -d "Rename @pwarnock/toolkit-cli to @pwarnock/liaison. Update package.json name, bin entry to 'liaison' command, all internal references, exports, and documentation. Build and test to verify."

bd create "TASK-002: Rename liaison → liaison-coordinator package" \
  -t task \
  -p P0 \
  -d "Rename @pwarnock/liaison to @pwarnock/liaison-coordinator. Remove bin entry (library only). Update package.json, all internal references, exports, and documentation. Build and test to verify."

bd create "TASK-003: Update opencode_config references" \
  -t chore \
  -p P1 \
  -d "Verify package name stays @pwarnock/opencode_config. Update documentation to clarify role in Liaison Toolkit. Update CLI help text to reflect new positioning."

# Phase 3: Directory & File Reorganization
echo "Creating Phase 3 tasks..."

bd create "TASK-004: Reorganize source directories" \
  -t task \
  -p P0 \
  -d "Move packages/unified-cli/ → packages/liaison/. Move packages/liaison/ → packages/liaison-coordinator/. Update all import paths and module references. Update workspace configuration."

bd create "TASK-005: Update configuration files" \
  -t task \
  -p P0 \
  -d "Update pnpm-workspace.yaml, turbo.json, root package.json workspaces with new package names and paths. Verify all build orchestration still works."

# Phase 4: Documentation & References
echo "Creating Phase 4 tasks..."

bd create "TASK-006: Update README files" \
  -t task \
  -p P0 \
  -d "Update root README.md (project name, architecture). Update packages/liaison/README.md and packages/liaison-coordinator/README.md. Update installation and usage examples."

bd create "TASK-007: Update inline documentation" \
  -t chore \
  -p P1 \
  -d "Update code comments referencing old names. Update JSDoc comments, type definitions, and architecture diagrams. Ensure documentation is consistent with new structure."

bd create "TASK-008: Update configuration files documentation" \
  -t chore \
  -p P1 \
  -d "Update .github/workflows CI/CD references. Update .cody/ project structure docs. Update CLAUDE.md and code examples throughout project."

# Phase 5: Testing & Validation
echo "Creating Phase 5 tasks..."

bd create "TASK-009: Build and compile verification" \
  -t task \
  -p P0 \
  -d "Verify TypeScript compilation for all packages. Run type checking. Verify dist file generation. Validate package.json structure and exports."

bd create "TASK-010: Integration testing" \
  -t task \
  -p P0 \
  -d "Test CLI functionality (liaison command). Test plugin loading. Test coordinator sync. Test cross-package imports and module resolution."

# Phase 6: GitHub Repository
echo "Creating Phase 6 tasks..."

bd create "TASK-011: GitHub repository migration" \
  -t chore \
  -p P1 \
  -d "Rename GitHub repository (if applicable). Update GitHub Actions workflows with new package names. Update branch protection rules and repository settings."

echo ""
echo "✅ All 11 Beads issues created successfully!"
echo ""
echo "Run: bd ready"
echo "to see all newly created issues ready for work"
