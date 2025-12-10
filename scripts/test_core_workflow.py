#!/usr/bin/env python3
"""
Core workflow automation tests for v0.5.0 task tracking.

This module tests the fundamental workflow automation functionality,
including parsing, dependency resolution, and basic synchronization.
"""

import unittest
from workflow_test_base import WorkflowTestBase, create_parser_and_generator

class TestCoreWorkflow(WorkflowTestBase):
    """Test core workflow automation functionality."""

    def test_basic_parsing(self):
        """Test basic Beads issue parsing."""
        parser, _ = create_parser_and_generator(self.test_dir)
        issues = parser.parse_issues()

        self.assertEqual(len(issues), 3)
        self.assertEqual(issues[0].id, "opencode-config-25")
        self.assertEqual(issues[1].id, "opencode-config-26")
        self.assertEqual(issues[2].id, "opencode-config-27")

    def test_status_filtering(self):
        """Test issue status filtering."""
        parser, _ = create_parser_and_generator(self.test_dir)

        all_issues = parser.parse_issues()
        open_issues = parser.get_open_issues()

        self.assertEqual(len(all_issues), 3)
        self.assertEqual(len(open_issues), 2)  # 2 open, 1 closed

    def test_dependency_resolution(self):
        """Test dependency resolution."""
        parser, generator = create_parser_and_generator(self.test_dir)
        issues = parser.get_open_issues()

        dependency_graph = generator.build_dependency_graph(issues)

        # Verify dependency relationships
        self.assertIn("opencode-config-26", dependency_graph)
        self.assertIn("opencode-config-25", dependency_graph["opencode-config-26"])

    def test_topological_sorting(self):
        """Test topological sorting of issues."""
        parser, generator = create_parser_and_generator(self.test_dir)
        issues = parser.get_open_issues()
        dependency_graph = generator.build_dependency_graph(issues)

        sorted_issues = generator.topological_sort(issues, dependency_graph)

        # Verify ordering constraints
        issue_ids = [i.id for i in sorted_issues]
        idx_25 = issue_ids.index("opencode-config-25")
        idx_26 = issue_ids.index("opencode-config-26")

        self.assertLess(idx_25, idx_26, "Dependencies should be resolved in topological order")

def run_core_workflow_tests():
    """Run core workflow tests and return results."""
    print("🧪 Running Core Workflow Tests...")

    suite = unittest.TestLoader().loadTestsFromTestCase(TestCoreWorkflow)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    return {
        "tests_run": result.testsRun,
        "failures": len(result.failures),
        "errors": len(result.errors),
        "success": result.wasSuccessful()
    }

if __name__ == "__main__":
    result = run_core_workflow_tests()
    print(f"\n📊 Core Workflow Test Results: {result['tests_run']} tests, "
          f"{result['failures']} failures, {result['errors']} errors")

    if result["success"]:
        print("✅ All core workflow tests passed!")
    else:
        print("❌ Some core workflow tests failed!")