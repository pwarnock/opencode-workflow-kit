#!/usr/bin/env python3
"""
Advanced tests for git automation features including:
- Bidirectional Beads integration
- Issue dependency validation
- Conflict detection and resolution
- Advanced CLI commands
"""

import json
import os
import subprocess
import tempfile
import unittest
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock

# Add the parent directory to the path to import git-automation
import sys
sys.path.insert(0, str(Path(__file__).parent))

from git_automation import GitAutomation, ValidationResult


class TestBeadsIntegration(unittest.TestCase):
    """Test bidirectional Beads integration features."""
    
    def setUp(self):
        """Set up test environment."""
        self.test_dir = Path(tempfile.mkdtemp())
        self.automation = GitAutomation(self.test_dir)
        
        # Create mock beads file
        self.beads_dir = self.test_dir / ".beads"
        self.beads_dir.mkdir()
        self.beads_file = self.beads_dir / "issues.jsonl"
        
        # Create mock git repo
        self.git_dir = self.test_dir / ".git"
        self.git_dir.mkdir()
        
    def test_load_beads_issues_empty(self):
        """Test loading Beads issues when file doesn't exist."""
        issues = self.automation.load_beads_issues()
        self.assertEqual(issues, {})
    
    def test_load_beads_issues_with_data(self):
        """Test loading Beads issues with valid data."""
        test_issues = [
            {
                "id": "opencode-config-123",
                "title": "Test Issue",
                "status": "open",
                "priority": 1,
                "dependencies": ["opencode-config-456"]
            },
            {
                "id": "opencode-config-456",
                "title": "Dependency Issue",
                "status": "closed",
                "priority": 2,
                "dependencies": []
            }
        ]
        
        # Write test data
        with open(self.beads_file, 'w') as f:
            for issue in test_issues:
                f.write(json.dumps(issue) + '\n')
        
        issues = self.automation.load_beads_issues()
        self.assertEqual(len(issues), 2)
        self.assertIn("opencode-config-123", issues)
        self.assertIn("opencode-config-456", issues)
    
    @patch('subprocess.run')
    def test_get_recent_beads_issues_success(self, mock_run):
        """Test getting recent Beads issues successfully."""
        mock_run.return_value.stdout = json.dumps([
            {"id": "opencode-config-123", "title": "Recent Issue", "status": "open"}
        ])
        mock_run.return_value.returncode = 0
        
        issues = self.automation._get_recent_beads_issues(days=7)
        self.assertEqual(len(issues), 1)
        self.assertEqual(issues[0]["id"], "opencode-config-123")
    
    @patch('subprocess.run')
    def test_get_recent_beads_issues_fallback(self, mock_run):
        """Test fallback behavior when updated-since flag fails."""
        # First call fails (updated-since not supported)
        # Second call succeeds (list all issues)
        mock_run.side_effect = [
            Mock(returncode=1),  # First call fails
            Mock(stdout=json.dumps([
                {"id": "opencode-config-123", "title": "Recent Issue", "status": "open", "updated_at": datetime.now().isoformat()}
            ]), returncode=0)  # Second call succeeds
        ]
        
        issues = self.automation._get_recent_beads_issues(days=7)
        self.assertEqual(len(issues), 1)
    
    @patch('subprocess.run')
    def test_create_closing_commit_for_issue(self, mock_run):
        """Test creating closing commit for issue."""
        issue = {
            "id": "opencode-config-123",
            "title": "Test Issue",
            "description": "Test description",
            "issue_type": "bug",
            "priority": 1
        }
        
        # Mock git commands
        mock_run.side_effect = [
            Mock(returncode=0),  # git status (no staged files)
            Mock(returncode=0),  # git add
            Mock(returncode=0),  # git commit
            Mock(returncode=0, stdout="abc123"),  # git rev-parse
            Mock(returncode=0),  # git add (updated file)
            Mock(returncode=0)   # git commit --amend
        ]
        
        result = self.automation._create_closing_commit_for_issue(issue)
        self.assertTrue(result)
        
        # Verify closing file was created
        closing_file = self.beads_dir / "opencode-config-123-closed.md"
        self.assertTrue(closing_file.exists())
    
    @patch('subprocess.run')
    def test_create_progress_commit_for_issue(self, mock_run):
        """Test creating progress commit for issue."""
        issue = {
            "id": "opencode-config-123",
            "title": "Test Issue",
            "status": "in_progress",
            "notes": "Working on implementation",
            "issue_type": "feature",
            "priority": 2
        }
        
        # Mock git commands
        mock_run.side_effect = [
            Mock(returncode=0),  # git log (no commits)
            Mock(returncode=0),  # git add
            Mock(returncode=0)   # git commit
        ]
        
        result = self.automation._create_progress_commit_for_issue(issue)
        self.assertTrue(result)
        
        # Verify progress file was created
        progress_file = self.beads_dir / "opencode-config-123-progress.md"
        self.assertTrue(progress_file.exists())


class TestDependencyValidation(unittest.TestCase):
    """Test issue dependency validation features."""
    
    def setUp(self):
        """Set up test environment."""
        self.test_dir = Path(tempfile.mkdtemp())
        self.automation = GitAutomation(self.test_dir)
    
    def test_analyze_dependency_simple(self):
        """Test simple dependency analysis."""
        issues = {
            "opencode-config-123": {
                "dependencies": ["opencode-config-456"]
            },
            "opencode-config-456": {
                "dependencies": []
            }
        }
        
        analysis = self.automation._analyze_dependency("opencode-config-123", issues)
        self.assertFalse(analysis['has_circular'])
        self.assertEqual(analysis['max_depth'], 1)
    
    def test_analyze_dependency_circular(self):
        """Test circular dependency detection."""
        issues = {
            "opencode-config-123": {
                "dependencies": ["opencode-config-456"]
            },
            "opencode-config-456": {
                "dependencies": ["opencode-config-123"]
            }
        }
        
        analysis = self.automation._analyze_dependency("opencode-config-123", issues)
        self.assertTrue(analysis['has_circular'])
        self.assertIn("opencode-config-123", analysis['cycle'])
        self.assertIn("opencode-config-456", analysis['cycle'])
    
    def test_validate_dependency_graph(self):
        """Test dependency graph validation."""
        issues = {
            "opencode-config-123": {
                "dependencies": ["opencode-config-456", "opencode-config-789"]
            },
            "opencode-config-456": {
                "dependencies": []
            },
            "opencode-config-789": {
                "dependencies": []
            }
        }
        
        validation = self.automation._validate_dependency_graph(issues)
        self.assertEqual(len(validation['errors']), 0)
        self.assertEqual(len(validation['warnings']), 0)
    
    def test_validate_dependency_graph_orphaned(self):
        """Test dependency graph validation with orphaned dependencies."""
        issues = {
            "opencode-config-123": {
                "dependencies": ["opencode-config-999"]  # Non-existent dependency
            }
        }
        
        validation = self.automation._validate_dependency_graph(issues)
        self.assertEqual(len(validation['warnings']), 1)
        self.assertIn("orphaned dependencies", validation['warnings'][0])
    
    def test_determine_dependency_transition(self):
        """Test dependency status transition logic."""
        # Dependency closed -> dependent can be opened
        transition = self.automation._determine_dependency_transition("blocked", "closed")
        self.assertEqual(transition, "open")
        
        # Dependency blocked -> dependent should be blocked
        transition = self.automation._determine_dependency_transition("open", "blocked")
        self.assertEqual(transition, "blocked")
        
        # No transition needed
        transition = self.automation._determine_dependency_transition("open", "open")
        self.assertIsNone(transition)


class TestConflictDetection(unittest.TestCase):
    """Test conflict detection and resolution."""
    
    def setUp(self):
        """Set up test environment."""
        self.test_dir = Path(tempfile.mkdtemp())
        self.automation = GitAutomation(self.test_dir)
    
    def test_assess_conflict_severity(self):
        """Test conflict severity assessment."""
        # High severity: closed vs open
        severity = self.automation._assess_conflict_severity("closed", "open")
        self.assertEqual(severity, "high")
        
        # Medium severity: different but not critical
        severity = self.automation._assess_conflict_severity("in_progress", "open")
        self.assertEqual(severity, "medium")
    
    def test_get_conflict_recommendation(self):
        """Test conflict resolution recommendations."""
        # Git closed, beads open -> update beads
        rec = self.automation._get_conflict_recommendation("closed", "open")
        self.assertIn("Update Beads status to 'closed'", rec)
        
        # Beads closed, git open -> review reopening
        rec = self.automation._get_conflict_recommendation("open", "closed")
        self.assertIn("review if issue should be reopened", rec)
    
    @patch('subprocess.run')
    def test_detect_sync_conflicts(self, mock_run):
        """Test sync conflict detection."""
        # Mock git log output
        mock_run.return_value.stdout = "abc123 feat: opencode-config-123 Add feature\ndef456 fix: opencode-config-456 Fix bug"
        mock_run.return_value.returncode = 0
        
        # Create test beads issues
        self.beads_dir = self.test_dir / ".beads"
        self.beads_dir.mkdir()
        self.beads_file = self.beads_dir / "issues.jsonl"
        
        test_issues = [
            {"id": "opencode-config-123", "status": "open"},  # Conflict: git says feat, beads says open
            {"id": "opencode-config-456", "status": "closed"}  # No conflict: git says fix, beads says closed
        ]
        
        with open(self.beads_file, 'w') as f:
            for issue in test_issues:
                f.write(json.dumps(issue) + '\n')
        
        conflicts = self.automation._detect_sync_conflicts()
        self.assertEqual(len(conflicts), 1)
        self.assertEqual(conflicts[0]['issue_id'], "opencode-config-123")
        self.assertEqual(conflicts[0]['type'], "status_mismatch")


class TestAdvancedCLI(unittest.TestCase):
    """Test advanced CLI commands."""
    
    def setUp(self):
        """Set up test environment."""
        self.test_dir = Path(tempfile.mkdtemp())
        self.automation = GitAutomation(self.test_dir)
    
    @patch('subprocess.run')
    def test_bidirectional_sync_command(self, mock_run):
        """Test bidirectional sync CLI command."""
        # Mock all the subprocess calls
        mock_run.return_value.returncode = 0
        mock_run.return_value.stdout = "[]"
        
        with patch.object(self.automation, 'bidirectional_sync_beads') as mock_sync:
            mock_sync.return_value = {
                'git_to_beads': {},
                'beads_to_git': {'updated': [], 'errors': []},
                'conflicts': [],
                'summary': {
                    'git_to_beads_synced': 0,
                    'git_to_beads_failed': 0,
                    'beads_to_git_synced': 0,
                    'beads_to_git_failed': 0,
                    'conflicts_detected': 0
                }
            }
            
            result = self.automation.bidirectional_sync(auto_resolve=False)
            self.assertIn('summary', result)
    
    @patch('subprocess.run')
    def test_dependency_check_command(self, mock_run):
        """Test dependency check CLI command."""
        mock_run.return_value.returncode = 0
        
        with patch.object(self.automation, 'load_beads_issues') as mock_load:
            mock_load.return_value = {
                "opencode-config-123": {
                    "dependencies": [],
                    "status": "open"
                }
            }
            
            result = self.automation.dependency_check(auto_transition=False)
            self.assertIn('validated_issues', result)
            self.assertIn('dependency_graph', result)
            self.assertIn('recommendations', result)
    
    @patch('subprocess.run')
    def test_conflict_resolve_command(self, mock_run):
        """Test conflict resolve CLI command."""
        mock_run.return_value.returncode = 0
        
        # Create mock conflicts
        conflicts = [
            {
                'issue_id': 'opencode-config-123',
                'type': 'status_mismatch',
                'git_status': 'closed',
                'beads_status': 'open'
            }
        ]
        
        with patch.object(self.automation, '_detect_sync_conflicts') as mock_detect:
            mock_detect.return_value = conflicts
            
            with patch.object(self.automation, 'resolve_sync_conflicts') as mock_resolve:
                mock_resolve.return_value = {
                    'resolved': ['opencode-config-123: Updated Beads to closed'],
                    'failed': [],
                    'skipped': []
                }
                
                result = self.automation.resolve_sync_conflicts(conflicts)
                self.assertEqual(len(result['resolved']), 1)


class TestErrorHandling(unittest.TestCase):
    """Test error handling and edge cases."""
    
    def setUp(self):
        """Set up test environment."""
        self.test_dir = Path(tempfile.mkdtemp())
        self.automation = GitAutomation(self.test_dir)
    
    @patch('subprocess.run')
    def test_beads_command_failure(self, mock_run):
        """Test handling of Beads command failures."""
        mock_run.side_effect = subprocess.CalledProcessError(1, 'bd')
        
        # Should handle gracefully and return empty list
        issues = self.automation._get_recent_beads_issues()
        self.assertEqual(issues, [])
    
    @patch('subprocess.run')
    def test_git_command_failure(self, mock_run):
        """Test handling of git command failures."""
        mock_run.side_effect = subprocess.CalledProcessError(1, 'git')
        
        # Should handle gracefully and return empty dict
        sync_status = self.automation.check_beads_sync_status()
        self.assertEqual(sync_status, {})
    
    def test_malformed_beads_file(self):
        """Test handling of malformed Beads JSONL file."""
        beads_dir = self.test_dir / ".beads"
        beads_dir.mkdir()
        beads_file = beads_dir / "issues.jsonl"
        
        # Write malformed JSON
        beads_file.write_text("invalid json\n{also invalid}\n")
        
        # Should handle gracefully and return empty dict
        issues = self.automation.load_beads_issues()
        self.assertEqual(issues, {})


class TestIntegration(unittest.TestCase):
    """Integration tests for the complete workflow."""
    
    def setUp(self):
        """Set up test environment."""
        self.test_dir = Path(tempfile.mkdtemp())
        self.automation = GitAutomation(self.test_dir)
        
        # Create realistic test data
        self.beads_dir = self.test_dir / ".beads"
        self.beads_dir.mkdir()
        self.beads_file = self.beads_dir / "issues.jsonl"
        
        test_issues = [
            {
                "id": "opencode-config-123",
                "title": "Main Feature",
                "status": "in_progress",
                "priority": 1,
                "dependencies": ["opencode-config-456"],
                "issue_type": "feature",
                "description": "Main feature implementation"
            },
            {
                "id": "opencode-config-456",
                "title": "Dependency Feature",
                "status": "closed",
                "priority": 2,
                "dependencies": [],
                "issue_type": "feature",
                "description": "Required dependency"
            },
            {
                "id": "opencode-config-789",
                "title": "Bug Fix",
                "status": "open",
                "priority": 0,
                "dependencies": [],
                "issue_type": "bug",
                "description": "Critical bug to fix"
            }
        ]
        
        with open(self.beads_file, 'w') as f:
            for issue in test_issues:
                f.write(json.dumps(issue) + '\n')
    
    @patch('subprocess.run')
    def test_complete_workflow(self, mock_run):
        """Test complete workflow from validation to sync."""
        # Mock git commands for status and commits
        mock_run.side_effect = [
            Mock(returncode=0, stdout="M test.py\nA README.md"),  # git status
            Mock(returncode=0, stdout="abc123 feat: opencode-config-123 Add feature"),  # git log
            Mock(returncode=0),  # bd update
            Mock(returncode=0, stdout=json.dumps([{"id": "opencode-config-123", "status": "in_progress"}]))  # bd list
        ]
        
        # Test atomic commit validation
        files = ["test.py", "README.md"]
        validation = self.automation.validate_atomic_commit(files)
        self.assertIsInstance(validation, ValidationResult)
        
        # Test dependency check
        dep_results = self.automation.dependency_check()
        self.assertIn('validated_issues', dep_results)
        self.assertEqual(dep_results['validated_issues'], 3)
        
        # Test sync status check
        sync_status = self.automation.check_beads_sync_status()
        self.assertIsInstance(sync_status, dict)


if __name__ == '__main__':
    # Run the tests
    unittest.main(verbosity=2)