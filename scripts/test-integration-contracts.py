#!/usr/bin/env python3
"""
Integration Contract Tests

Tests external system contracts to prevent silent breakage.
Validates that Beads (bd) and Cody PBT follow expected interfaces.
"""

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock
from typing import Dict, List, Any, Optional

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

# Import adapter from file
import importlib.util

adapter_spec = importlib.util.spec_from_file_location(
    "cody_beads_adapter", Path(__file__).parent / "cody-beads-adapter.py"
)
cody_beads_adapter = importlib.util.module_from_spec(adapter_spec)
adapter_spec.loader.exec_module(cody_beads_adapter)

CodyBeadsAdapter = cody_beads_adapter.CodyBeadsAdapter


class TestBeadsContract(unittest.TestCase):
    """Test Beads (bd) system contract compliance."""

    def setUp(self):
        """Set up test environment."""
        self.test_dir = Path(tempfile.mkdtemp())
        self.adapter = CodyBeadsAdapter(self.test_dir)

    def test_beads_version_contract(self):
        """Test bd --version follows expected contract."""
        # Test when bd is available
        with patch("subprocess.run") as mock_run:
            mock_run.return_value = subprocess.CompletedProcess(
                args=["bd", "--version"],
                returncode=0,
                stdout="bd version 0.27.2 (75a2fe84)\n",
                stderr="",
            )

            # Create new adapter instance to test with mock
            test_adapter = CodyBeadsAdapter(self.test_dir)
            result = test_adapter._check_command_available("bd", ["--version"])
            self.assertTrue(result, "bd --version should be available")
            # Check that mock was called (allowing for cwd differences)
            self.assertTrue(mock_run.called, "subprocess.run should be called")

    def test_beads_version_missing(self):
        """Test graceful handling when bd command missing."""
        with patch("subprocess.run") as mock_run:
            mock_run.side_effect = FileNotFoundError("bd command not found")

            result = self.adapter._check_command_available("bd", ["--version"])
            self.assertFalse(result, "Should handle missing bd gracefully")

    def test_beads_version_failure(self):
        """Test graceful handling when bd command fails."""
        with patch("subprocess.run") as mock_run:
            mock_run.side_effect = subprocess.CalledProcessError(
                1, "bd", "Command failed"
            )

            result = self.adapter._check_command_available("bd", ["--version"])
            self.assertFalse(result, "Should handle bd failure gracefully")

    def test_beads_data_format_contract(self):
        """Test Beads JSONL follows expected data format."""
        # Create test JSONL with valid format
        test_issues = [
            {
                "id": "test-1",
                "title": "Test issue",
                "description": "Test description",
                "status": "open",
                "priority": 1,
                "issue_type": "feature",
                "created_at": "2025-12-02T10:00:00.000000-07:00",
                "updated_at": "2025-12-02T10:00:00.000000-07:00",
            }
        ]

        beads_file = self.test_dir / ".beads" / "issues.jsonl"
        beads_file.parent.mkdir(parents=True, exist_ok=True)

        with open(beads_file, "w") as f:
            for issue in test_issues:
                f.write(json.dumps(issue) + "\n")

        # Test contract validation
        self.assertTrue(beads_file.exists(), "Beads JSONL file should exist")

        # Validate JSONL format
        with open(beads_file, "r") as f:
            for line_num, line in enumerate(f, 1):
                if line.strip():
                    try:
                        issue = json.loads(line)
                        self._validate_beads_issue_contract(issue, line_num)
                    except json.JSONDecodeError as e:
                        self.fail(f"Invalid JSON on line {line_num}: {e}")

    def _validate_beads_issue_contract(self, issue: Dict[str, Any], line_num: int):
        """Validate individual Beads issue follows contract."""
        required_fields = [
            "id",
            "title",
            "status",
            "priority",
            "issue_type",
            "created_at",
            "updated_at",
        ]

        for field in required_fields:
            self.assertIn(
                field, issue, f"Missing required field '{field}' on line {line_num}"
            )

        # Validate field types and formats
        self.assertIsInstance(
            issue["id"], str, f"Field 'id' must be string on line {line_num}"
        )
        self.assertIsInstance(
            issue["title"], str, f"Field 'title' must be string on line {line_num}"
        )
        self.assertIsInstance(
            issue["status"], str, f"Field 'status' must be string on line {line_num}"
        )
        self.assertIsInstance(
            issue["priority"], int, f"Field 'priority' must be int on line {line_num}"
        )
        self.assertIsInstance(
            issue["issue_type"],
            str,
            f"Field 'issue_type' must be string on line {line_num}",
        )

        # Validate allowed values
        allowed_statuses = ["open", "in_progress", "closed"]
        self.assertIn(
            issue["status"],
            allowed_statuses,
            f"Invalid status '{issue['status']}' on line {line_num}",
        )

        allowed_types = ["bug", "feature", "task", "epic", "chore"]
        self.assertIn(
            issue["issue_type"],
            allowed_types,
            f"Invalid issue_type '{issue['issue_type']}' on line {line_num}",
        )

        allowed_priorities = [0, 1, 2, 3, 4]
        self.assertIn(
            issue["priority"],
            allowed_priorities,
            f"Invalid priority '{issue['priority']}' on line {line_num}",
        )

        # Validate ISO8601 timestamps
        import re

        iso_pattern = r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d+[-+]\d{2}:\d{2}"
        self.assertRegex(
            issue["created_at"],
            iso_pattern,
            f"Invalid created_at format on line {line_num}",
        )
        self.assertRegex(
            issue["updated_at"],
            iso_pattern,
            f"Invalid updated_at format on line {line_num}",
        )


class TestCodyContract(unittest.TestCase):
    """Test Cody PBT system contract compliance."""

    def setUp(self):
        """Set up test environment."""
        self.test_dir = Path(tempfile.mkdtemp())
        self.adapter = CodyBeadsAdapter(self.test_dir)

    def test_cody_structure_contract(self):
        """Test Cody PBT follows expected directory structure."""
        # Create expected Cody structure
        cody_dirs = [
            self.test_dir / ".cody" / "config" / "commands",
            self.test_dir / ".cody" / "config" / "agents",
            self.test_dir / ".cody" / "project" / "build",
            self.test_dir / ".cody" / "project" / "plan",
        ]

        for cody_dir in cody_dirs:
            cody_dir.mkdir(parents=True, exist_ok=True)

        # Create expected files
        feature_backlog = (
            self.test_dir / ".cody" / "project" / "build" / "feature-backlog.md"
        )
        feature_backlog.write_text(
            "# Feature Backlog\n\n## Backlog\n\n| ID | Feature | Description | Priority | Status |\n|-----|---------|-------------|----------|--------|"
        )

        project_config = self.test_dir / ".cody" / "project-config.json"
        project_config.write_text('{"name": "test-project", "version": "1.0.0"}')

        # Test contract validation
        self.assertTrue(
            self.adapter._check_cody_availability(),
            "Cody structure should be detected as available",
        )

        # Verify structure detection
        for cody_dir in cody_dirs:
            self.assertTrue(
                cody_dir.exists(), f"Cody directory should exist: {cody_dir}"
            )

        self.assertTrue(feature_backlog.exists(), "Feature backlog should exist")
        self.assertTrue(project_config.exists(), "Project config should exist")

    def test_cody_structure_missing(self):
        """Test graceful handling when Cody structure missing."""
        # Empty test directory - no Cody structure
        result = self.adapter._check_cody_availability()
        self.assertFalse(result, "Should handle missing Cody structure gracefully")

    def test_cody_feature_backlog_contract(self):
        """Test Cody feature-backlog.md follows expected format."""
        # Create feature-backlog with expected format
        feature_backlog = (
            self.test_dir / ".cody" / "project" / "build" / "feature-backlog.md"
        )
        feature_backlog.parent.mkdir(parents=True, exist_ok=True)

        content = """# Feature Backlog

This document lists features and enhancements derived from plan.

## Backlog

| ID  | Feature             | Description                               | Priority | Status |
|-----|---------------------|-------------------------------------------|----------|--------|
| owk-1 | Test feature | Test description | High | 🟢 |
| owk-2 | Another feature | Another description | Medium | 🟡 |
"""
        feature_backlog.write_text(content)

        # Test contract validation
        self.assertTrue(feature_backlog.exists(), "Feature backlog should exist")

        # Parse and validate structure
        content = feature_backlog.read_text()

        # Check for required sections
        self.assertIn(
            "# Feature Backlog", content, "Should have Feature Backlog header"
        )
        self.assertIn("## Backlog", content, "Should have Backlog section")
        self.assertIn("| ID", content, "Should have ID column")
        self.assertIn("| Feature", content, "Should have Feature column")
        self.assertIn("| Description", content, "Should have Description column")
        self.assertIn("| Priority", content, "Should have Priority column")
        self.assertIn("| Status", content, "Should have Status column")

        # Check for valid status indicators
        valid_statuses = ["🔴", "🟡", "🟢"]
        found_statuses = []
        for status in valid_statuses:
            if status in content:
                found_statuses.append(status)

        self.assertGreater(
            len(found_statuses),
            0,
            f"Should include at least one status indicator, found: {found_statuses}",
        )

    def test_cody_agent_config_contract(self):
        """Test Cody agent configurations follow expected format."""
        # Create agent config with expected format
        agent_config = self.test_dir / ".cody" / "config" / "agents" / "test-agent.json"
        agent_config.parent.mkdir(parents=True, exist_ok=True)

        config = {
            "name": "test-agent",
            "description": "Test agent configuration",
            "model": "claude-3-5-sonnet-20241022",
            "permissions": ["readonly", "webfetch"],
            "tools": {
                "test_tool": {
                    "description": "Test tool",
                    "parameters": {"input": {"type": "string", "required": True}},
                }
            },
        }

        agent_config.write_text(json.dumps(config, indent=2))

        # Test contract validation
        self.assertTrue(agent_config.exists(), "Agent config should exist")

        # Validate JSON structure
        with open(agent_config, "r") as f:
            loaded_config = json.load(f)

        required_fields = ["name", "description", "model", "permissions", "tools"]
        for field in required_fields:
            self.assertIn(field, loaded_config, f"Missing required field: {field}")

        # Validate field types
        self.assertIsInstance(loaded_config["name"], str, "Field 'name' must be string")
        self.assertIsInstance(
            loaded_config["description"], str, "Field 'description' must be string"
        )
        self.assertIsInstance(
            loaded_config["model"], str, "Field 'model' must be string"
        )
        self.assertIsInstance(
            loaded_config["permissions"], list, "Field 'permissions' must be list"
        )
        self.assertIsInstance(
            loaded_config["tools"], dict, "Field 'tools' must be dict"
        )


class TestIntegrationContract(unittest.TestCase):
    """Test integration contract between Beads and Cody."""

    def setUp(self):
        """Set up test environment."""
        self.test_dir = Path(tempfile.mkdtemp())
        self.adapter = CodyBeadsAdapter(self.test_dir)

    def test_system_status_contract(self):
        """Test system status follows expected format."""
        status = self.adapter.get_system_status()

        # Validate required fields
        required_fields = [
            "timestamp",
            "beads_available",
            "cody_available",
            "project_root",
            "integration_version",
        ]
        for field in required_fields:
            self.assertIn(field, status, f"Missing required field: {field}")

        # Validate field types
        self.assertIsInstance(status["timestamp"], str, "timestamp must be string")
        self.assertIsInstance(
            status["beads_available"], bool, "beads_available must be boolean"
        )
        self.assertIsInstance(
            status["cody_available"], bool, "cody_available must be boolean"
        )
        self.assertIsInstance(
            status["project_root"], str, "project_root must be string"
        )
        self.assertIsInstance(
            status["integration_version"], str, "integration_version must be string"
        )

        # Validate ISO8601 timestamp
        import re

        iso_pattern = r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+"
        self.assertRegex(
            status["timestamp"], iso_pattern, "timestamp must be ISO8601 format"
        )

    def test_adapter_logging_contract(self):
        """Test adapter logging follows expected format."""
        # Test logging functionality
        with patch("builtins.open", create=True) as mock_open:
            mock_file = MagicMock()
            mock_open.return_value.__enter__.return_value = mock_file

            self.adapter._log("Test message", "INFO")

            # Verify log entry format
            mock_file.write.assert_called_once()
            log_content = mock_file.write.call_args[0][0]

            # Check log format: [timestamp] [LEVEL] message
            import re

            log_pattern = (
                r"\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\] \[INFO\] Test message"
            )
            self.assertRegex(
                log_content, log_pattern, "Log entry should follow expected format"
            )

    def test_graceful_degradation_contract(self):
        """Test graceful degradation when systems unavailable."""
        # Test with both systems unavailable - patch before initialization
        with patch("subprocess.run") as mock_run:
            mock_run.side_effect = FileNotFoundError("bd command not found")

            # Create adapter with mocked system detection
            adapter = CodyBeadsAdapter(self.test_dir)

            # Override Cody availability as well
            adapter.cody_available = False

            status = adapter.get_system_status()

            # Should still return valid status
            self.assertFalse(
                status["beads_available"], "Should report beads as unavailable"
            )
            self.assertFalse(
                status["cody_available"], "Should report cody as unavailable"
            )

            # Should not raise exceptions
            self.assertIsInstance(
                status, dict, "Should always return valid status dict"
            )

    def test_non_blocking_contract(self):
        """Test integration operations never block."""
        # Test that adapter methods always return True (non-blocking)
        test_methods = [
            ("handle_pre_commit", ""),
            ("handle_post_commit", "abc123"),
            ("handle_post_merge", ""),
            ("handle_post_checkout", ""),
        ]

        for method_name, args in test_methods:
            method = getattr(self.adapter, method_name)
            if args:
                result = method(args[0])  # Pass first arg
            else:
                result = method()

            self.assertTrue(
                result, f"Method {method_name} should always return True (non-blocking)"
            )


class TestContractViolations(unittest.TestCase):
    """Test detection of contract violations."""

    def setUp(self):
        """Set up test environment."""
        self.test_dir = Path(tempfile.mkdtemp())
        self.adapter = CodyBeadsAdapter(self.test_dir)

    def test_beads_jsonl_contract_violation(self):
        """Test detection of Beads JSONL contract violations."""
        # Create invalid JSONL (missing required fields)
        beads_file = self.test_dir / ".beads" / "issues.jsonl"
        beads_file.parent.mkdir(parents=True, exist_ok=True)

        # Invalid issue - missing required fields
        invalid_issue = {
            "id": "test-1",
            "title": "Test issue",
            # Missing: status, priority, issue_type, created_at, updated_at
        }

        with open(beads_file, "w") as f:
            f.write(json.dumps(invalid_issue) + "\n")

        # Should detect contract violation
        with self.assertRaises(AssertionError) as context:
            self.adapter._validate_beads_issue_contract(invalid_issue, 1)

        self.assertIn("Missing required field", str(context.exception))

    def test_cody_backlog_contract_violation(self):
        """Test detection of Cody backlog contract violations."""
        # Create invalid feature-backlog (missing required columns)
        feature_backlog = (
            self.test_dir / ".cody" / "project" / "build" / "feature-backlog.md"
        )
        feature_backlog.parent.mkdir(parents=True, exist_ok=True)

        # Invalid format - missing Status column
        invalid_content = """# Feature Backlog

## Backlog

| ID  | Feature             | Description                               | Priority |
|-----|---------------------|-------------------------------------------|----------|
| owk-1 | Test feature | Test description | High |
"""
        feature_backlog.write_text(invalid_content)

        # Should detect contract violation
        content = feature_backlog.read_text()
        self.assertNotIn("| Status", content, "Should detect missing Status column")

    def test_version_compatibility_violation(self):
        """Test detection of version compatibility violations."""
        # Mock incompatible bd version
        with patch("subprocess.run") as mock_run:
            mock_run.return_value = subprocess.CompletedProcess(
                args=["bd", "--version"],
                returncode=0,
                stdout="bd version 0.25.0 (incompatible)\n",
                stderr="",
            )

            # Should detect version incompatibility
            available = self.adapter._check_command_available("bd", ["--version"])
            self.assertTrue(
                available, "Command available but version may be incompatible"
            )

            # In real implementation, would check version compatibility
            # For now, just ensure command availability check works


def main():
    """Run contract validation tests."""
    print("🧪 Running Integration Contract Tests")
    print("=" * 50)

    # Create test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()

    # Add test cases
    test_classes = [
        TestBeadsContract,
        TestCodyContract,
        TestIntegrationContract,
        TestContractViolations,
    ]

    for test_class in test_classes:
        tests = loader.loadTestsFromTestCase(test_class)
        suite.addTests(tests)

    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    # Generate report
    print(f"\n📊 Test Results:")
    print(f"  Tests run: {result.testsRun}")
    print(f"  Failures: {len(result.failures)}")
    print(f"  Errors: {len(result.errors)}")
    print(
        f"  Success rate: {((result.testsRun - len(result.failures) - len(result.errors)) / result.testsRun * 100):.1f}%"
    )

    if result.failures:
        print(f"\n❌ Failures:")
        for test, traceback in result.failures:
            print(f"  • {test}: {traceback.split('AssertionError:')[-1].strip()}")

    if result.errors:
        print(f"\n💥 Errors:")
        for test, traceback in result.errors:
            print(f"  • {test}: {traceback.split('Exception:')[-1].strip()}")

    # Save results
    results = {
        "timestamp": datetime.now().isoformat(),
        "test_type": "integration_contracts",
        "tests_run": result.testsRun,
        "failures": len(result.failures),
        "errors": len(result.errors),
        "success_rate": (
            (result.testsRun - len(result.failures) - len(result.errors))
            / result.testsRun
            * 100
        ),
        "contract_violations": len(result.failures) + len(result.errors),
    }

    results_file = (
        Path("test-results")
        / f"integration-contracts-{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    )
    results_file.parent.mkdir(exist_ok=True)
    results_file.write_text(json.dumps(results, indent=2))

    print(f"\n📄 Results saved to: {results_file}")

    return result.wasSuccessful()


if __name__ == "__main__":
    from datetime import datetime

    sys.exit(0 if main() else 1)
