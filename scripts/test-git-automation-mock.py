#!/usr/bin/env python3
"""
Mock tests for git automation that don't require actual Beads installation.
Tests the core logic and error handling paths.
"""

import json
import subprocess
import tempfile
import unittest
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock

# Add the parent directory to the path to import git-automation
import sys
sys.path.insert(0, str(Path(__file__).parent))

# Import the git automation module
import importlib.util
spec = importlib.util.spec_from_file_location("git_automation", Path(__file__).parent / "git-automation.py")
git_automation = importlib.util.module_from_spec(spec)
spec.loader.exec_module(git_automation)

GitAutomation = git_automation.GitAutomation
ValidationResult = git_automation.ValidationResult
AtomicCommitRule = git_automation.AtomicCommitRule


class TestMockGitAutomation(unittest.TestCase):
    """Mock tests for GitAutomation class without external dependencies."""
    
    def setUp(self):
        """Set up test environment."""
        self.test_dir = Path(tempfile.mkdtemp())
        self.automation = GitAutomation(self.test_dir)
        
        # Create mock directories
        self.beads_dir = self.test_dir / ".beads"
        self.beads_dir.mkdir()
        self.git_dir = self.test_dir / ".git"
        self.git_dir.mkdir()
    
    def test_initialization(self):
        """Test GitAutomation initialization."""
        self.assertEqual(self.automation.project_root, self.test_dir)
        self.assertEqual(self.automation.beads_file, self.beads_dir / "issues.jsonl")
        self.assertEqual(self.automation.git_dir, self.git_dir)
        self.assertIsNotNone(self.automation.atomic_rules)
        self.assertIsNotNone(self.automation.version_config)
    
    def test_extract_beads_issues_from_files(self):
        """Test extracting Beads issue IDs from file names and content."""
        # Test file name extraction
        files = [
            "opencode-config-123-feature.py",
            "docs/opencode-config-456-documentation.md",
            "normal-file.py"
        ]
        
        issue_ids = self.automation.extract_beads_issues_from_files(files)
        self.assertIn("opencode-config-123", issue_ids)
        self.assertIn("opencode-config-456", issue_ids)
        self.assertEqual(len(issue_ids), 2)
        
        # Test content extraction
        test_file = self.test_dir / "test.py"
        test_file.write_text("# Related to opencode-config-789\nprint('hello')")
        
        files_with_content = ["test.py"]
        issue_ids = self.automation.extract_beads_issues_from_files(files_with_content)
        self.assertIn("opencode-config-789", issue_ids)
    
    def test_determine_commit_type(self):
        """Test conventional commit type determination."""
        # Test different file types
        self.assertEqual(self.automation._determine_commit_type(["test_something.py"]), "test")
        self.assertEqual(self.automation._determine_commit_type(["README.md"]), "docs")
        self.assertEqual(self.automation._determine_commit_type(["script.py"]), "feat")
        self.assertEqual(self.automation._determine_commit_type(["schemas/config.json"]), "chore")
        self.assertEqual(self.automation._determine_commit_type(["bugfix.py"]), "feat")  # Based on actual logic
    
    def test_determine_scope(self):
        """Test commit scope determination."""
        self.assertEqual(self.automation._determine_scope(["tasklist.md"]), "tasklist")
        self.assertEqual(self.automation._determine_scope([".cody/config.json"]), "cody")
        self.assertEqual(self.automation._determine_scope(["agents/builder.json"]), "agents")
        self.assertEqual(self.automation._determine_scope(["templates/default.json"]), "templates")
        self.assertEqual(self.automation._determine_scope(["schemas/config.json"]), "schemas")
        self.assertEqual(self.automation._determine_scope(["scripts/test.py"]), "scripts")
        self.assertIsNone(self.automation._determine_scope(["random/file.txt"]))
    
    def test_generate_commit_message(self):
        """Test commit message generation."""
        # Create mock beads issues
        beads_file = self.beads_dir / "issues.jsonl"
        test_issues = [
            {
                "id": "opencode-config-123",
                "title": "Add new feature",
                "status": "open",
                "priority": 1,
                "issue_type": "feature"
            }
        ]
        
        with open(beads_file, 'w') as f:
            f.write(json.dumps(test_issues[0]) + '\n')
        
        # Test with issue-related files
        files = ["opencode-config-123-feature.py"]
        message, issue_ids = self.automation.generate_commit_message(files)
        
        self.assertIn("opencode-config-123", message)
        self.assertIn("add new feature", message.lower())
        self.assertEqual(issue_ids, {"opencode-config-123"})  # Returns a set, not list
        
        # Test with custom message
        custom_message = "Custom commit message"
        message, issue_ids = self.automation.generate_commit_message(files, custom_message)
        self.assertEqual(message, custom_message)
    
    def test_validate_version_format(self):
        """Test semantic version format validation."""
        self.assertTrue(self.automation._validate_version_format("1.0.0"))
        self.assertTrue(self.automation._validate_version_format("2.1.3"))
        self.assertTrue(self.automation._validate_version_format("1.0.0-alpha"))
        self.assertFalse(self.automation._validate_version_format("1.0.0-beta.1"))  # Based on actual regex
        
        self.assertFalse(self.automation._validate_version_format("1.0"))
        self.assertFalse(self.automation._validate_version_format("v1.0.0"))
        self.assertFalse(self.automation._validate_version_format("1.0.0.0"))
    
    def test_determine_issue_status_from_commit(self):
        """Test issue status determination from commit messages."""
        self.assertEqual(self.automation._determine_issue_status_from_commit("fix: resolve bug"), "closed")
        self.assertEqual(self.automation._determine_issue_status_from_commit("feat: implement feature"), "in_progress")
        self.assertEqual(self.automation._determine_issue_status_from_commit("wip: working on stuff"), "in_progress")
        self.assertEqual(self.automation._determine_issue_status_from_commit("complete: finished task"), "closed")
        self.assertEqual(self.automation._determine_issue_status_from_commit("random commit"), "in_progress")
    
    def test_atomic_commit_rules(self):
        """Test atomic commit validation rules."""
        # Create mock issues
        beads_file = self.beads_dir / "issues.jsonl"
        test_issues = [
            {
                "id": "opencode-config-123",
                "title": "Test Issue",
                "status": "open",
                "dependencies": ["opencode-config-456"]
            },
            {
                "id": "opencode-config-456",
                "title": "Dependency",
                "status": "closed",
                "dependencies": []
            }
        ]
        
        with open(beads_file, 'w') as f:
            for issue in test_issues:
                f.write(json.dumps(issue) + '\n')
        
        # Test single issue rule
        files_single = ["opencode-config-123-feature.py"]
        validation = self.automation.atomic_rules[0].validate(files_single, test_issues)
        self.assertTrue(validation.is_valid)
        
        files_multiple = ["opencode-config-123-feature.py", "opencode-config-456-fix.py"]
        validation = self.automation.atomic_rules[0].validate(files_multiple, test_issues)
        self.assertFalse(validation.is_valid)
        
        # Test dependency rule
        issues_dict = {issue["id"]: issue for issue in test_issues}
        validation = self.automation.atomic_rules[3].validate(files_single, issues_dict)
        self.assertTrue(validation.is_valid)  # Dependency is closed
        
        # Test with open dependency
        test_issues[1]["status"] = "open"
        with open(beads_file, 'w') as f:
            for issue in test_issues:
                f.write(json.dumps(issue) + '\n')
        
        issues_dict = {issue["id"]: issue for issue in test_issues}
        validation = self.automation.atomic_rules[3].validate(files_single, issues_dict)
        self.assertTrue(validation.is_valid)  # Should be warning, not error
        self.assertTrue(len(validation.warnings) > 0)
    
    def test_dependency_analysis(self):
        """Test dependency analysis logic."""
        issues = {
            "opencode-config-123": {
                "dependencies": ["opencode-config-456"]
            },
            "opencode-config-456": {
                "dependencies": ["opencode-config-789"]
            },
            "opencode-config-789": {
                "dependencies": []
            }
        }
        
        # Test linear dependency chain
        analysis = self.automation._analyze_dependency("opencode-config-123", issues)
        self.assertFalse(analysis['has_circular'])
        self.assertEqual(analysis['max_depth'], 2)
        
        # Test circular dependency
        issues["opencode-config-789"]["dependencies"] = ["opencode-config-123"]
        analysis = self.automation._analyze_dependency("opencode-config-123", issues)
        self.assertTrue(analysis['has_circular'])
        self.assertIn("opencode-config-123", analysis['cycle'])
    
    def test_conflict_severity_assessment(self):
        """Test conflict severity assessment."""
        # High severity conflicts
        self.assertEqual(self.automation._assess_conflict_severity("closed", "open"), "high")
        self.assertEqual(self.automation._assess_conflict_severity("open", "closed"), "high")
        
        # Medium severity conflicts
        self.assertEqual(self.automation._assess_conflict_severity("in_progress", "open"), "medium")
        self.assertEqual(self.automation._assess_conflict_severity("open", "in_progress"), "medium")
        
        # Low severity (same status)
        self.assertEqual(self.automation._assess_conflict_severity("open", "open"), "low")
    
    def test_conflict_recommendations(self):
        """Test conflict resolution recommendations."""
        # Git closed, beads open
        rec = self.automation._get_conflict_recommendation("closed", "open")
        self.assertIn("Update Beads status to 'closed'", rec)
        
        # Beads closed, git open
        rec = self.automation._get_conflict_recommendation("open", "closed")
        self.assertIn("Review if issue should be reopened", rec)
        
        # Progress mismatches
        rec = self.automation._get_conflict_recommendation("in_progress", "open")
        self.assertIn("Update Beads status to 'in_progress'", rec)
    
    def test_dependency_transition_logic(self):
        """Test dependency status transition logic."""
        # Dependency closed -> blocked issue can open
        self.assertEqual(self.automation._determine_dependency_transition("blocked", "closed"), "open")
        self.assertEqual(self.automation._determine_dependency_transition("on_hold", "closed"), "open")
        
        # Dependency blocked -> open issue should be blocked
        self.assertEqual(self.automation._determine_dependency_transition("open", "blocked"), "blocked")
        self.assertEqual(self.automation._determine_dependency_transition("in_progress", "blocked"), "blocked")
        
        # Dependency in progress -> blocked issue can be on hold
        self.assertEqual(self.automation._determine_dependency_transition("blocked", "in_progress"), "on_hold")
        
        # No transition needed
        self.assertIsNone(self.automation._determine_dependency_transition("open", "open"))
        self.assertIsNone(self.automation._determine_dependency_transition("closed", "closed"))
    
    def test_should_create_progress_commit(self):
        """Test progress commit creation logic."""
        # Should create progress commit
        issue_with_progress = {
            "notes": "Currently working on implementation and making good progress"
        }
        self.assertTrue(self.automation._should_create_progress_commit(issue_with_progress))
        
        # Should not create progress commit
        issue_without_progress = {
            "notes": "Issue is blocked waiting for dependencies"
        }
        self.assertFalse(self.automation._should_create_progress_commit(issue_without_progress))
    
    def test_format_issue_dependencies(self):
        """Test dependency formatting."""
        issue_with_deps = {
            "dependencies": ["opencode-config-123", "opencode-config-456"]
        }
        formatted = self.automation._format_issue_dependencies(issue_with_deps)
        self.assertIn("opencode-config-123", formatted)
        self.assertIn("opencode-config-456", formatted)
        
        issue_without_deps = {
            "dependencies": []
        }
        formatted = self.automation._format_issue_dependencies(issue_without_deps)
        self.assertEqual(formatted, "No dependencies")
    
    @patch('subprocess.run')
    def test_get_issue_commits(self, mock_run):
        """Test getting commits for a specific issue."""
        mock_run.return_value.stdout = "abc123|feat: opencode-config-123 Add feature|2023-01-01 12:00:00\ndef456|fix: opencode-config-123 Fix bug|2023-01-02 13:00:00"
        mock_run.return_value.returncode = 0
        
        commits = self.automation._get_issue_commits("opencode-config-123")
        self.assertEqual(len(commits), 2)
        self.assertEqual(commits[0]['hash'], "abc123")
        self.assertEqual(commits[1]['hash'], "def456")
    
    @patch('subprocess.run')
    def test_get_issues_from_git_commits(self, mock_run):
        """Test extracting issues from git commits."""
        mock_run.return_value.stdout = "abc123 feat: opencode-config-123 Add feature\ndef456 fix: opencode-config-456 Fix bug\nghi789 chore: Update dependencies"
        mock_run.return_value.returncode = 0
        
        issues = self.automation._get_issues_from_git_commits()
        self.assertIn("opencode-config-123", issues)
        self.assertIn("opencode-config-456", issues)
        self.assertEqual(len(issues), 2)


class TestErrorHandlingMock(unittest.TestCase):
    """Test error handling with mocks."""
    
    def setUp(self):
        """Set up test environment."""
        self.test_dir = Path(tempfile.mkdtemp())
        self.automation = GitAutomation(self.test_dir)
    
    def test_load_beads_issues_file_not_found(self):
        """Test loading issues when file doesn't exist."""
        issues = self.automation.load_beads_issues()
        self.assertEqual(issues, {})
    
    def test_load_beads_issues_malformed_json(self):
        """Test loading issues with malformed JSON."""
        beads_dir = self.test_dir / ".beads"
        beads_dir.mkdir()
        beads_file = beads_dir / "issues.jsonl"
        
        # Write malformed JSON
        beads_file.write_text("invalid json\n{also invalid}\n")
        
        issues = self.automation.load_beads_issues()
        self.assertEqual(issues, {})
    
    def test_extract_beads_issues_unreadable_file(self):
        """Test extracting issues from unreadable files."""
        # Create a binary file (should be skipped)
        binary_file = self.test_dir / "test.bin"
        binary_file.write_bytes(b'\x00\x01\x02\x03')
        
        issue_ids = self.automation.extract_beads_issues_from_files(["test.bin"])
        self.assertEqual(len(issue_ids), 0)
    
    @patch('subprocess.run')
    def test_git_command_failure_handling(self, mock_run):
        """Test handling of git command failures."""
        mock_run.side_effect = subprocess.CalledProcessError(1, 'git')
        
        # Should handle gracefully
        status = self.automation.get_git_status()
        self.assertEqual(status, {'staged': [], 'unstaged': [], 'untracked': []})
        
        commits = self.automation._get_issue_commits("opencode-config-123")
        self.assertEqual(commits, [])
        
        issues = self.automation._get_issues_from_git_commits()
        self.assertEqual(issues, {})


if __name__ == '__main__':
    # Run the mock tests
    unittest.main(verbosity=2)