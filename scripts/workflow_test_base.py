#!/usr/bin/env python3
"""
Base test classes and utilities for v0.5.0 workflow automation testing.

This module provides the foundation for all workflow automation tests,
including test setup, common utilities, and base test classes.
"""

import json
import tempfile
import unittest
from pathlib import Path
from typing import Dict, List, Any
from datetime import datetime, timedelta

# Import the beads-cody-sync module
import sys
sys.path.append(str(Path(__file__).parent))

# Import directly from the file
import importlib.util
spec = importlib.util.spec_from_file_location("beads_cody_sync", str(Path(__file__).parent / "beads-cody-sync.py"))
if spec and spec.loader:
    beads_cody_sync = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(beads_cody_sync)
else:
    raise ImportError("Could not load beads-cody-sync module")

BeadsParser = beads_cody_sync.BeadsParser
CodyTasklistGenerator = beads_cody_sync.CodyTasklistGenerator
BeadsCodySync = beads_cody_sync.BeadsCodySync
BeadsIssue = beads_cody_sync.BeadsIssue
CodyTask = beads_cody_sync.CodyTask

class WorkflowTestBase(unittest.TestCase):
    """Base test class for workflow automation tests."""

    def setUp(self):
        """Set up test environment."""
        self.test_dir = Path(tempfile.mkdtemp())
        self.beads_dir = self.test_dir / ".beads"
        self.cody_dir = self.test_dir / ".cody" / "project" / "build"

        self.beads_dir.mkdir(parents=True)
        self.cody_dir.mkdir(parents=True)

        # Create test dataset
        self.test_issues = self._create_test_dataset()

        # Write test issues to JSONL file
        beads_file = self.beads_dir / "issues.jsonl"
        with open(beads_file, 'w') as f:
            for issue in self.test_issues:
                f.write(json.dumps(issue) + '\n')

    def _create_test_dataset(self) -> List[Dict[str, Any]]:
        """Create test dataset for workflow automation."""
        base_date = datetime(2025, 10, 24, 10, 0, 0)

        return [
            {
                "id": "opencode-config-25",
                "title": "Create core package structure for v0.5.0",
                "description": "Implement packages/core with shared types, validation, errors, utils",
                "notes": "Phase 1: Week 1-2",
                "status": "closed",
                "priority": 0,
                "issue_type": "feature",
                "created_at": (base_date - timedelta(days=30)).isoformat(),
                "updated_at": (base_date - timedelta(days=25)).isoformat(),
                "closed_at": (base_date - timedelta(days=20)).isoformat()
            },
            {
                "id": "opencode-config-26",
                "title": "Implement unified type definitions",
                "description": "Create comprehensive type system for v0.5.0",
                "notes": "Phase 1: Week 1",
                "status": "closed",
                "priority": 1,
                "issue_type": "feature",
                "created_at": (base_date - timedelta(days=28)).isoformat(),
                "updated_at": (base_date - timedelta(days=26)).isoformat(),
                "closed_at": (base_date - timedelta(days=24)).isoformat(),
                "dependencies": [
                    {"issue_id": "opencode-config-26", "depends_on_id": "opencode-config-25", "type": "blocks"}
                ]
            },
            {
                "id": "opencode-config-27",
                "title": "Create unified CLI package",
                "description": "Implement packages/unified-cli with plugin architecture",
                "notes": "Phase 2: Week 3-4",
                "status": "in_progress",
                "priority": 0,
                "issue_type": "feature",
                "created_at": (base_date - timedelta(days=15)).isoformat(),
                "updated_at": (base_date - timedelta(days=10)).isoformat()
            }
        ]

    def tearDown(self):
        """Clean up test environment."""
        import shutil
        shutil.rmtree(self.test_dir)

def create_parser_and_generator(test_dir: Path) -> tuple:
    """Create BeadsParser and CodyTasklistGenerator instances for testing."""
    beads_dir = test_dir / ".beads"
    cody_dir = test_dir / ".cody" / "project" / "build"

    parser = BeadsParser(beads_dir / "issues.jsonl")
    generator = CodyTasklistGenerator(cody_dir)

    return parser, generator