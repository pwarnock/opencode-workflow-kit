#!/usr/bin/env python3
"""
Test suite for Beads-Cody Integration System

This script validates the complete integration between Beads issue tracking
and Cody task management, ensuring data integrity and proper synchronization.
"""

import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock

# Import the beads-cody-sync module
import sys
sys.path.append(str(Path(__file__).parent))

# Import directly from the file
import importlib.util
spec = importlib.util.spec_from_file_location("beads_cody_sync", Path(__file__).parent / "beads-cody-sync.py")
beads_cody_sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(beads_cody_sync)

BeadsParser = beads_cody_sync.BeadsParser
CodyTasklistGenerator = beads_cody_sync.CodyTasklistGenerator
BeadsCodySync = beads_cody_sync.BeadsCodySync
BeadsIssue = beads_cody_sync.BeadsIssue
CodyTask = beads_cody_sync.CodyTask


class TestBeadsCodyIntegration(unittest.TestCase):
    """Test cases for Beads-Cody integration."""
    
    def setUp(self):
        """Set up test environment."""
        self.test_dir = Path(tempfile.mkdtemp())
        self.beads_dir = self.test_dir / ".beads"
        self.cody_dir = self.test_dir / ".cody" / "project" / "build"
        
        self.beads_dir.mkdir(parents=True)
        self.cody_dir.mkdir(parents=True)
        
        # Create test Beads issues
        self.test_issues = [
            {
                "id": "test-1",
                "title": "Design Beads-Cody integration",
                "description": "Create architecture for integration",
                "notes": "Initial design phase",
                "status": "open",
                "priority": 1,
                "issue_type": "feature",
                "created_at": "2025-10-24T10:00:00.000000-07:00",
                "updated_at": "2025-10-24T10:00:00.000000-07:00"
            },
            {
                "id": "test-2", 
                "title": "Implement v0.5.0 sync functionality",
                "description": "Build sync engine for v0.5.0",
                "notes": "Implementation for version 0.5.0",
                "status": "in_progress",
                "priority": 2,
                "issue_type": "feature",
                "created_at": "2025-10-24T10:00:00.000000-07:00",
                "updated_at": "2025-10-24T10:00:00.000000-07:00",
                "dependencies": [
                    {"issue_id": "test-2", "depends_on_id": "test-1", "type": "blocks"}
                ]
            },
            {
                "id": "test-3",
                "title": "Test integration",
                "description": "Comprehensive testing",
                "notes": "Testing phase",
                "status": "closed",
                "priority": 3,
                "issue_type": "task",
                "created_at": "2025-10-24T10:00:00.000000-07:00",
                "updated_at": "2025-10-24T10:00:00.000000-07:00",
                "closed_at": "2025-10-24T10:30:00.000000-07:00"
            }
        ]
        
        # Write test issues to JSONL file
        beads_file = self.beads_dir / "issues.jsonl"
        with open(beads_file, 'w') as f:
            for issue in self.test_issues:
                f.write(json.dumps(issue) + '\n')
    
    def test_beads_parser(self):
        """Test Beads JSONL parsing."""
        parser = BeadsParser(self.beads_dir / "issues.jsonl")
        issues = parser.parse_issues()
        
        self.assertEqual(len(issues), 3)
        self.assertEqual(issues[0].id, "test-1")
        self.assertEqual(issues[0].status, "open")
        self.assertEqual(issues[1].dependencies[0]["depends_on_id"], "test-1")
        self.assertEqual(issues[2].status, "closed")
    
    def test_open_issues_filter(self):
        """Test filtering open issues."""
        parser = BeadsParser(self.beads_dir / "issues.jsonl")
        open_issues = parser.get_open_issues()
        
        self.assertEqual(len(open_issues), 2)
        self.assertTrue(all(issue.status != "closed" for issue in open_issues))
    
    def test_cody_task_generation(self):
        """Test Cody task generation from Beads issues."""
        parser = BeadsParser(self.beads_dir / "issues.jsonl")
        generator = CodyTasklistGenerator(self.cody_dir)
        
        # Test status conversion
        self.assertEqual(generator.status_to_emoji("open"), "🔴")
        self.assertEqual(generator.status_to_emoji("in_progress"), "🟡")
        self.assertEqual(generator.status_to_emoji("closed"), "🟢")
        
        # Test priority conversion
        self.assertEqual(generator.priority_to_level(0), "High")
        self.assertEqual(generator.priority_to_level(1), "High")
        self.assertEqual(generator.priority_to_level(2), "Medium")
        self.assertEqual(generator.priority_to_level(3), "Low")
        self.assertEqual(generator.priority_to_level(4), "Low")
    
    def test_version_extraction(self):
        """Test version extraction from issues."""
        generator = CodyTasklistGenerator(self.cody_dir)
        
        # Test with version mapping
        issue_with_mapping = BeadsIssue(
            id="opencode-config-25",
            title="Design Beads-to-Cody generation system",
            description="Create architecture",
            notes="",
            status="open",
            priority=1,
            issue_type="feature",
            created_at="2025-10-24T10:00:00.000000-07:00",
            updated_at="2025-10-24T10:00:00.000000-07:00"
        )
        
        version = generator.extract_version_from_issue(issue_with_mapping)
        self.assertEqual(version, "v0.5.0")
        
        # Test with version in title
        issue_with_version = BeadsIssue(
            id="test-4",
            title="Implement v0.6.0 features",
            description="Version 0.6.0 implementation",
            notes="",
            status="open",
            priority=1,
            issue_type="feature",
            created_at="2025-10-24T10:00:00.000000-07:00",
            updated_at="2025-10-24T10:00:00.000000-07:00"
        )
        
        version = generator.extract_version_from_issue(issue_with_version)
        self.assertEqual(version, "v0.6.0")
    
    def test_feature_backlog_generation(self):
        """Test feature backlog markdown generation."""
        parser = BeadsParser(self.beads_dir / "issues.jsonl")
        generator = CodyTasklistGenerator(self.cody_dir)
        
        issues = parser.parse_issues()
        generator.update_feature_backlog(issues)
        
        backlog_file = self.cody_dir / "feature-backlog.md"
        self.assertTrue(backlog_file.exists())
        
        content = backlog_file.read_text()
        self.assertIn("# Feature Backlog", content)
        self.assertIn("test-1", content)
        self.assertIn("test-2", content)
        self.assertIn("test-3", content)
    
    def test_tasklist_generation(self):
        """Test tasklist generation for specific version."""
        # Create version directory
        version_dir = self.cody_dir / "v0.5.0"
        version_dir.mkdir()
        
        parser = BeadsParser(self.beads_dir / "issues.jsonl")
        generator = CodyTasklistGenerator(self.cody_dir)
        
        # Mock version mapping to include test issues
        with patch.object(generator, 'extract_version_from_issue') as mock_extract:
            mock_extract.side_effect = lambda issue: "v0.5.0" if issue.id in ["test-1", "test-2"] else None
            
            issues = parser.get_open_issues()
            version_groups = generator.group_issues_by_version(issues)
            
            if "v0.5.0" in version_groups:
                tasklist_content = generator.generate_tasklist_for_version("v0.5.0", version_groups["v0.5.0"])
                
                self.assertIn("# Version Tasklist – **v0.5.0**", tasklist_content)
                self.assertIn("test-1", tasklist_content)
                self.assertIn("test-2", tasklist_content)
    
    def test_full_sync_workflow(self):
        """Test complete synchronization workflow."""
        sync = BeadsCodySync(self.test_dir)
        
        # Run full sync
        sync.generate_cody_tasklists()
        
        # Check outputs
        feature_backlog = self.cody_dir / "feature-backlog.md"
        self.assertTrue(feature_backlog.exists())
        
        content = feature_backlog.read_text()
        self.assertIn("test-1", content)
        self.assertIn("test-2", content)
        self.assertIn("test-3", content)
    
    def test_error_handling(self):
        """Test error handling for malformed data."""
        # Create malformed JSONL file
        malformed_file = self.beads_dir / "malformed.jsonl"
        with open(malformed_file, 'w') as f:
            f.write('{"id": "test", "title": "test", "description": "", "notes": "", "status": "open", "priority": 1, "issue_type": "task", "created_at": "2025-10-24T10:00:00.000000-07:00", "updated_at": "2025-10-24T10:00:00.000000-07:00"}\n')
            f.write('{"invalid": json}\n')  # Invalid JSON
            f.write('{"id": "test2", "title": "test2", "description": "", "notes": "", "status": "open", "priority": 1, "issue_type": "task", "created_at": "2025-10-24T10:00:00.000000-07:00", "updated_at": "2025-10-24T10:00:00.000000-07:00"}\n')
        
        parser = BeadsParser(malformed_file)
        issues = parser.parse_issues()
        
        # Should parse valid lines and skip invalid ones
        self.assertEqual(len(issues), 2)
        self.assertEqual(issues[0].id, "test")
        self.assertEqual(issues[1].id, "test2")
    
    def test_dependency_mapping(self):
        """Test dependency mapping between Beads and Cody."""
        parser = BeadsParser(self.beads_dir / "issues.jsonl")
        generator = CodyTasklistGenerator(self.cody_dir)
        
        issues = parser.parse_issues()
        issue_with_deps = issues[1]  # test-2 has dependency on test-1
        
        task = generator._convert_issue_to_task(issue_with_deps, "v0.5.0", "Phase 1")
        
        self.assertEqual(task.id, "test-2")
        self.assertEqual(task.dependencies, ["test-1"])
    
    def tearDown(self):
        """Clean up test environment."""
        import shutil
        shutil.rmtree(self.test_dir)


def run_integration_tests():
    """Run integration tests and return results."""
    print("🧪 Running Beads-Cody Integration Tests...")
    
    # Create test suite
    suite = unittest.TestLoader().loadTestsFromTestCase(TestBeadsCodyIntegration)
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Return results
    return {
        "tests_run": result.testsRun,
        "failures": len(result.failures),
        "errors": len(result.errors),
        "success": result.wasSuccessful()
    }


def validate_current_integration():
    """Validate the current project integration."""
    print("🔍 Validating Current Beads-Cody Integration...")
    
    project_root = Path.cwd()
    beads_file = project_root / ".beads" / "issues.jsonl"
    cody_build_dir = project_root / ".cody" / "project" / "build"
    
    validation_results = {
        "beads_file_exists": beads_file.exists(),
        "cody_build_dir_exists": cody_build_dir.exists(),
        "feature_backlog_exists": (cody_build_dir / "feature-backlog.md").exists(),
        "v050_tasklist_exists": (cody_build_dir / "v0.5.0" / "tasklist.md").exists(),
        "sync_script_exists": (project_root / "scripts" / "beads-cody-sync.py").exists()
    }
    
    # Test parsing
    if validation_results["beads_file_exists"]:
        try:
            parser = BeadsParser(beads_file)
            issues = parser.parse_issues()
            validation_results["beads_parse_success"] = True
            validation_results["total_issues"] = len(issues)
            validation_results["open_issues"] = len([i for i in issues if i.status == "open"])
        except Exception as e:
            validation_results["beads_parse_success"] = False
            validation_results["beads_parse_error"] = str(e)
    
    # Test generation
    if validation_results["sync_script_exists"]:
        try:
            sync = BeadsCodySync(project_root)
            sync.generate_cody_tasklists()
            validation_results["generation_success"] = True
        except Exception as e:
            validation_results["generation_success"] = False
            validation_results["generation_error"] = str(e)
    
    return validation_results


if __name__ == "__main__":
    print("🚀 Beads-Cody Integration Test Suite")
    print("=" * 50)
    
    # Run unit tests
    test_results = run_integration_tests()
    print(f"\n📊 Unit Test Results: {test_results['tests_run']} tests run, "
          f"{test_results['failures']} failures, {test_results['errors']} errors")
    
    # Validate current integration
    validation_results = validate_current_integration()
    print(f"\n🔧 Integration Validation:")
    for key, value in validation_results.items():
        status = "✅" if value else "❌"
        print(f"  {status} {key}: {value}")
    
    # Overall result
    overall_success = test_results["success"] and validation_results.get("generation_success", False)
    print(f"\n🎯 Overall Result: {'✅ SUCCESS' if overall_success else '❌ FAILURE'}")
    
    if not overall_success:
        print("\n🔧 Troubleshooting:")
        if not test_results["success"]:
            print("  - Fix unit test failures")
        if not validation_results.get("generation_success", False):
            print("  - Check generation errors above")
            print("  - Ensure Beads file is accessible")
            print("  - Verify Cody directories exist")