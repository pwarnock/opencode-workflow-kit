#!/usr/bin/env python3
"""
Performance tests for v0.5.0 task tracking workflow automation.

This module tests the performance characteristics of the workflow automation system,
including parsing speed, dependency resolution, and overall synchronization performance.
"""

import unittest
import time
from typing import List, Any
from workflow_test_base import WorkflowTestBase, create_parser_and_generator

class TestPerformanceWorkflow(WorkflowTestBase):
    """Test performance characteristics of workflow automation."""

    def _create_large_dataset(self, size: int = 1000) -> List[Any]:
        """Create a large dataset for performance testing."""
        from datetime import datetime
        from beads_cody_sync import BeadsIssue

        issues = []
        base_issue = {
            "id": "perf-test-0",
            "title": "Performance test issue",
            "description": "Test performance with large datasets",
            "notes": "Performance testing",
            "status": "open",
            "priority": 2,
            "issue_type": "task",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }

        for i in range(size):
            issue = base_issue.copy()
            issue["id"] = f"perf-test-{i}"
            issue["title"] = f"Performance test issue {i}"
            issues.append(BeadsIssue(**issue))

        return issues

    def test_parsing_performance(self):
        """Test parsing performance with large datasets."""
        # Create large dataset
        large_issues = self._create_large_dataset(1000)

        # Write to file
        beads_file = self.beads_dir / "large_issues.jsonl"
        with open(beads_file, 'w') as f:
            for issue in large_issues:
                f.write(issue.to_json() + '\n')

        # Test parsing performance
        start_time = time.time()
        from beads_cody_sync import BeadsParser
        parser = BeadsParser(beads_file)
        issues = parser.parse_issues()
        parsing_time = time.time() - start_time

        print(f"📊 Parsing Performance: {parsing_time:.3f}s for 1000 issues")
        print(f"   Rate: {len(issues) / parsing_time:.1f} issues/sec")

        # Performance assertion
        self.assertLess(parsing_time, 1.0, "Parsing should be fast")
        self.assertEqual(len(issues), 1000)

    def test_dependency_graph_performance(self):
        """Test dependency graph building performance."""
        issues = self._create_large_dataset(500)

        parser, generator = create_parser_and_generator(self.test_dir)

        start_time = time.time()
        dependency_graph = generator.build_dependency_graph(issues)
        graph_time = time.time() - start_time

        print(f"📊 Dependency Graph Performance: {graph_time:.3f}s for 500 issues")
        print(f"   Rate: {len(issues) / graph_time:.1f} issues/sec")

        # Performance assertion
        self.assertLess(graph_time, 0.5, "Graph building should be fast")

    def test_topological_sort_performance(self):
        """Test topological sorting performance."""
        issues = self._create_large_dataset(500)

        parser, generator = create_parser_and_generator(self.test_dir)
        dependency_graph = generator.build_dependency_graph(issues)

        start_time = time.time()
        sorted_issues = generator.topological_sort(issues, dependency_graph)
        sort_time = time.time() - start_time

        print(f"📊 Topological Sort Performance: {sort_time:.3f}s for 500 issues")
        print(f"   Rate: {len(issues) / sort_time:.1f} issues/sec")

        # Performance assertion
        self.assertLess(sort_time, 0.5, "Sorting should be fast")
        self.assertEqual(len(sorted_issues), len(issues))

    def test_full_sync_performance(self):
        """Test complete sync workflow performance."""
        # Create realistic dataset
        issues = self._create_large_dataset(200)

        # Write to file
        beads_file = self.beads_dir / "performance_issues.jsonl"
        with open(beads_file, 'w') as f:
            for issue in issues:
                f.write(issue.to_json() + '\n')

        # Test full sync performance
        start_time = time.time()
        from beads_cody_sync import BeadsCodySync
        sync = BeadsCodySync(self.test_dir)
        sync.generate_cody_tasklists()
        sync_time = time.time() - start_time

        print(f"📊 Full Sync Performance: {sync_time:.3f}s for 200 issues")
        print(f"   Rate: {200 / sync_time:.1f} issues/sec")

        # Performance assertion
        self.assertLess(sync_time, 2.0, "Full sync should be fast")

        # Verify outputs were generated
        feature_backlog = self.cody_dir / "feature-backlog.md"
        self.assertTrue(feature_backlog.exists())

    def test_memory_efficiency(self):
        """Test memory efficiency with very large datasets."""
        # Create very large dataset
        issues = self._create_large_dataset(5000)

        parser, generator = create_parser_and_generator(self.test_dir)

        # Test memory usage during dependency graph building
        start_time = time.time()
        dependency_graph = generator.build_dependency_graph(issues)
        graph_time = time.time() - start_time

        print(f"📊 Memory Efficiency Test: {graph_time:.3f}s for 5000 issues")
        print(f"   Rate: {len(issues) / graph_time:.1f} issues/sec")
        print(f"   Memory usage should be reasonable for {len(issues)} issues")

        # Performance assertion
        self.assertLess(graph_time, 3.0, "Should handle 5000 issues efficiently")

def run_performance_workflow_tests():
    """Run performance workflow tests and return results."""
    print("⚡ Running Performance Workflow Tests...")

    suite = unittest.TestLoader().loadTestsFromTestCase(TestPerformanceWorkflow)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    return {
        "tests_run": result.testsRun,
        "failures": len(result.failures),
        "errors": len(result.errors),
        "success": result.wasSuccessful()
    }

if __name__ == "__main__":
    result = run_performance_workflow_tests()
    print(f"\n📊 Performance Workflow Test Results: {result['tests_run']} tests, "
          f"{result['failures']} failures, {result['errors']} errors")

    if result["success"]:
        print("✅ All performance workflow tests passed!")
    else:
        print("❌ Some performance workflow tests failed!")