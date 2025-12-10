#!/usr/bin/env python3
"""
Integration workflow tests for v0.5.0 task tracking.

This module tests the integration between Beads and Cody systems,
including synchronization, file generation, and validation.
"""

import unittest
import time
from workflow_test_base import WorkflowTestBase, create_parser_and_generator

class TestIntegrationWorkflow(WorkflowTestBase):
    """Test integration workflow functionality."""

    def test_full_sync_workflow(self):
        """Test complete synchronization workflow."""
        from beads_cody_sync import BeadsCodySync
        sync = BeadsCodySync(self.test_dir)

        # Run full sync
        start_time = time.time()
        sync.generate_cody_tasklists()
        sync_time = time.time() - start_time

        # Verify outputs
        feature_backlog = self.cody_dir / "feature-backlog.md"
        self.assertTrue(feature_backlog.exists())

        # Verify content
        content = feature_backlog.read_text()
        self.assertIn("# Feature Backlog", content)
        self.assertIn("opencode-config-25", content)
        self.assertIn("opencode-config-26", content)

        print(f"✅ Sync completed in {sync_time:.3f}s")

    def test_feature_backlog_generation(self):
        """Test feature backlog markdown generation."""
        parser, generator = create_parser_and_generator(self.test_dir)
        issues = parser.parse_issues()

        generator.update_feature_backlog(issues)

        backlog_file = self.cody_dir / "feature-backlog.md"
        self.assertTrue(backlog_file.exists())

        content = backlog_file.read_text()
        self.assertIn("# Feature Backlog", content)
        self.assertIn("## v0.5.0", content)

    def test_version_tasklist_generation(self):
        """Test version-specific tasklist generation."""
        # Create version directory
        version_dir = self.cody_dir / "v0.5.0"
        version_dir.mkdir()

        parser, generator = create_parser_and_generator(self.test_dir)
        issues = parser.get_open_issues()

        # Generate tasklist for v0.5.0
        tasklist_content = generator.generate_tasklist_for_version("v0.5.0", issues)

        self.assertIn("# Version Tasklist – **v0.5.0**", tasklist_content)
        self.assertIn("opencode-config-25", tasklist_content)

    def test_file_validation(self):
        """Test validation of generated files."""
        from beads_cody_sync import BeadsCodySync
        sync = BeadsCodySync(self.test_dir)
        sync.generate_cody_tasklists()

        # Read and validate generated files
        feature_backlog = self.cody_dir / "feature-backlog.md"
        content = feature_backlog.read_text()

        # Should have proper structure
        lines = content.split('\n')
        self.assertTrue(lines[0].startswith("# Feature Backlog"))

        # Should have version sections
        version_sections = [line for line in lines if line.startswith("## v0.5.0")]
        self.assertGreater(len(version_sections), 0)

def run_integration_workflow_tests():
    """Run integration workflow tests and return results."""
    print("🔗 Running Integration Workflow Tests...")

    suite = unittest.TestLoader().loadTestsFromTestCase(TestIntegrationWorkflow)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    return {
        "tests_run": result.testsRun,
        "failures": len(result.failures),
        "errors": len(result.errors),
        "success": result.wasSuccessful()
    }

if __name__ == "__main__":
    result = run_integration_workflow_tests()
    print(f"\n📊 Integration Workflow Test Results: {result['tests_run']} tests, "
          f"{result['failures']} failures, {result['errors']} errors")

    if result["success"]:
        print("✅ All integration workflow tests passed!")
    else:
        print("❌ Some integration workflow tests failed!")