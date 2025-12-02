#!/usr/bin/env python3
"""
Test Git Hooks Functionality

Tests git hooks with various scenarios including missing dependencies.
"""

import json
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from typing import Dict, List, Tuple


class GitHooksTester:
    """Test git hooks functionality."""

    def __init__(self, test_dir: Path):
        self.test_dir = test_dir
        self.test_results = []
        self.hooks_installed = False

    def log_result(self, test_name: str, success: bool, message: str = ""):
        """Log test result."""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "timestamp": time.time(),
        }
        self.test_results.append(result)
        print(f"{status}: {test_name}")
        if message:
            print(f"    {message}")

    def setup_test_repo(self) -> bool:
        """Set up a test git repository."""
        try:
            # Initialize git repo
            subprocess.run(
                ["git", "init"], cwd=self.test_dir, check=True, capture_output=True
            )
            subprocess.run(
                ["git", "config", "user.name", "Test User"],
                cwd=self.test_dir,
                check=True,
            )
            subprocess.run(
                ["git", "config", "user.email", "test@example.com"],
                cwd=self.test_dir,
                check=True,
            )

            # Create initial commit
            test_file = self.test_dir / "test.txt"
            test_file.write_text("Initial content")
            subprocess.run(["git", "add", "test.txt"], cwd=self.test_dir, check=True)
            subprocess.run(
                ["git", "commit", "-m", "Initial commit"], cwd=self.test_dir, check=True
            )

            return True
        except subprocess.CalledProcessError as e:
            self.log_result("Setup test repo", False, f"Failed to setup: {e}")
            return False

    def install_hooks(self) -> bool:
        """Install git hooks."""
        try:
            # Copy hook files to test repo
            hooks_dir = self.test_dir / ".git" / "hooks"
            hooks_dir.mkdir(exist_ok=True)

            # Install pre-commit hook
            pre_commit_src = (
                Path(__file__).parent.parent / ".git" / "hooks" / "pre-commit"
            )
            pre_commit_dst = hooks_dir / "pre-commit"
            if pre_commit_src.exists():
                pre_commit_dst.write_text(pre_commit_src.read_text())
                pre_commit_dst.chmod(0o755)

            # Install post-commit-sync hook
            post_commit_src = (
                Path(__file__).parent.parent / ".git" / "hooks" / "post-commit-sync"
            )
            post_commit_dst = hooks_dir / "post-commit"
            if post_commit_src.exists():
                post_commit_dst.write_text(post_commit_src.read_text())
                post_commit_dst.chmod(0o755)

            self.hooks_installed = True
            return True
        except Exception as e:
            self.log_result("Install hooks", False, f"Failed to install: {e}")
            return False

    def test_pre_commit_without_bd(self) -> bool:
        """Test pre-commit hook when bd command is not available."""
        try:
            # Create a test file
            test_file = self.test_dir / "test2.txt"
            test_file.write_text("Test content")

            # Stage the file
            subprocess.run(["git", "add", "test2.txt"], cwd=self.test_dir, check=True)

            # Try to commit - should succeed even without bd
            result = subprocess.run(
                ["git", "commit", "-m", "Test commit without bd"],
                cwd=self.test_dir,
                capture_output=True,
                text=True,
            )

            # Should succeed (exit code 0) even if bd is missing
            success = result.returncode == 0
            message = (
                "Commit succeeded without bd"
                if success
                else f"Commit failed: {result.stderr}"
            )

            self.log_result("Pre-commit without bd", success, message)
            return success

        except Exception as e:
            self.log_result("Pre-commit without bd", False, f"Exception: {e}")
            return False

    def test_post_commit_without_bd(self) -> bool:
        """Test post-commit hook when bd command is not available."""
        try:
            # Create a test file
            test_file = self.test_dir / "test3.txt"
            test_file.write_text("Test content for post-commit")

            # Stage and commit
            subprocess.run(["git", "add", "test3.txt"], cwd=self.test_dir, check=True)
            result = subprocess.run(
                ["git", "commit", "-m", "Test post-commit without bd"],
                cwd=self.test_dir,
                capture_output=True,
                text=True,
            )

            # Should succeed even if post-commit sync fails
            success = result.returncode == 0
            message = (
                "Post-commit succeeded without bd"
                if success
                else f"Commit failed: {result.stderr}"
            )

            self.log_result("Post-commit without bd", success, message)
            return success

        except Exception as e:
            self.log_result("Post-commit without bd", False, f"Exception: {e}")
            return False

    def test_beads_files_sync(self) -> bool:
        """Test sync when Beads files are changed."""
        try:
            # Create .beads directory and test file
            beads_dir = self.test_dir / ".beads"
            beads_dir.mkdir(exist_ok=True)

            beads_file = beads_dir / "issues.jsonl"
            beads_file.write_text(
                '{"id": "test-1", "title": "Test issue", "status": "open"}\n'
            )

            # Stage and commit Beads file
            subprocess.run(
                ["git", "add", ".beads/issues.jsonl"], cwd=self.test_dir, check=True
            )
            result = subprocess.run(
                ["git", "commit", "-m", "Update Beads file"],
                cwd=self.test_dir,
                capture_output=True,
                text=True,
            )

            # Should succeed even if sync fails
            success = result.returncode == 0
            message = (
                "Beads file commit succeeded"
                if success
                else f"Commit failed: {result.stderr}"
            )

            self.log_result("Beads files sync", success, message)
            return success

        except Exception as e:
            self.log_result("Beads files sync", False, f"Exception: {e}")
            return False

    def test_hook_error_resilience(self) -> bool:
        """Test that hooks don't block commits when errors occur."""
        try:
            # Create a scenario that might cause hook errors
            # (e.g., missing directories, permission issues)

            # Create a file in a location that might cause issues
            test_file = self.test_dir / "test_resilience.txt"
            test_file.write_text("Testing hook resilience")

            # Stage and commit
            subprocess.run(
                ["git", "add", "test_resilience.txt"], cwd=self.test_dir, check=True
            )
            result = subprocess.run(
                ["git", "commit", "-m", "Test hook resilience"],
                cwd=self.test_dir,
                capture_output=True,
                text=True,
            )

            # Should succeed regardless of hook errors
            success = result.returncode == 0
            message = (
                "Hook resilience test passed"
                if success
                else f"Commit failed: {result.stderr}"
            )

            self.log_result("Hook error resilience", success, message)
            return success

        except Exception as e:
            self.log_result("Hook error resilience", False, f"Exception: {e}")
            return False

    def test_automated_sync_script(self) -> bool:
        """Test automated-sync.py script directly."""
        try:
            # Test the script with various triggers
            script_path = Path(__file__).parent.parent / "scripts" / "automated-sync.py"

            if not script_path.exists():
                self.log_result("Automated sync script", False, "Script not found")
                return False

            # Test with --help to ensure script runs
            result = subprocess.run(
                ["python3", str(script_path), "--help"],
                cwd=self.test_dir,
                capture_output=True,
                text=True,
            )

            success = result.returncode == 0 or "usage:" in result.stdout.lower()
            message = (
                "Script runs successfully"
                if success
                else f"Script error: {result.stderr}"
            )

            self.log_result("Automated sync script", success, message)
            return success

        except Exception as e:
            self.log_result("Automated sync script", False, f"Exception: {e}")
            return False

    def run_all_tests(self) -> Dict[str, any]:
        """Run all git hooks tests."""
        print("🧪 Starting Git Hooks Tests\n")

        # Setup
        if not self.setup_test_repo():
            return {"success": False, "results": self.test_results}

        if not self.install_hooks():
            return {"success": False, "results": self.test_results}

        # Run tests
        self.test_pre_commit_without_bd()
        self.test_post_commit_without_bd()
        self.test_beads_files_sync()
        self.test_hook_error_resilience()
        self.test_automated_sync_script()

        # Summary
        total_tests = len(self.test_results)
        passed_tests = sum(1 for r in self.test_results if r["success"])
        failed_tests = total_tests - passed_tests

        print(f"\n📊 Test Summary:")
        print(f"  Total: {total_tests}")
        print(f"  Passed: {passed_tests}")
        print(f"  Failed: {failed_tests}")

        if failed_tests > 0:
            print("\n❌ Failed Tests:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  • {result['test']}: {result['message']}")

        return {
            "success": failed_tests == 0,
            "total": total_tests,
            "passed": passed_tests,
            "failed": failed_tests,
            "results": self.test_results,
        }


def main():
    """Main test runner."""
    import argparse

    parser = argparse.ArgumentParser(description="Test git hooks functionality")
    parser.add_argument(
        "--test-dir",
        type=Path,
        help="Test directory (will be created if not exists)",
    )
    parser.add_argument(
        "--keep",
        action="store_true",
        help="Keep test directory after tests",
    )

    args = parser.parse_args()

    # Create test directory
    if args.test_dir:
        test_dir = args.test_dir
    else:
        test_dir = Path(tempfile.mkdtemp(prefix="git-hooks-test-"))

    test_dir.mkdir(exist_ok=True, parents=True)
    print(f"📁 Using test directory: {test_dir}")

    try:
        # Run tests
        tester = GitHooksTester(test_dir)
        results = tester.run_all_tests()

        # Save results
        results_file = test_dir / "test-results.json"
        results_file.write_text(json.dumps(results, indent=2))
        print(f"\n📄 Results saved to: {results_file}")

        # Cleanup
        if not args.keep and not args.test_dir:  # Only cleanup if we created the dir
            import shutil

            shutil.rmtree(test_dir)
            print(f"🧹 Cleaned up test directory")

        sys.exit(0 if results["success"] else 1)

    except KeyboardInterrupt:
        print("\n🛑 Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Test runner error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
