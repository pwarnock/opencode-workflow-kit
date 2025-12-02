#!/usr/bin/env python3
"""
Cody-Beads Integration Adapter

Loose coupling integration layer that adapts to both Cody PBT and Beads
without controlling either system. Non-invasive and resilient.

Design Principles:
- Adapter pattern for external system integration
- Graceful degradation when systems unavailable
- Never block git operations
- Preserve native functionality of both systems
"""

import argparse
import json
import os
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any


class CodyBeadsAdapter:
    """Loose coupling adapter for Cody-Beads integration."""

    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.log_file = project_root / ".cody-beads-integration.log"

        # System availability (detected at runtime)
        self.beads_available = False
        self.cody_available = False

        # Configuration
        self.timeout_seconds = 30
        self.non_blocking = True

        # Detect system availability
        self._detect_systems()

    def _log(self, message: str, level: str = "INFO"):
        """Log to integration log file."""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] [{level}] {message}"

        try:
            with open(self.log_file, "a") as f:
                f.write(log_entry + "\n")
        except OSError:
            # Silently fail if logging not possible
            pass

    def _detect_systems(self):
        """Detect available external systems."""
        # Check Beads availability
        self.beads_available = self._check_command_available("bd", ["--version"])
        if self.beads_available:
            self._log("Beads (bd) system detected and available")
        else:
            self._log("Beads (bd) system not available - will skip Beads operations")

        # Check Cody PBT availability
        self.cody_available = self._check_cody_availability()
        if self.cody_available:
            self._log("Cody PBT system detected and available")
        else:
            self._log("Cody PBT system not available - will skip Cody operations")

    def _check_command_available(self, command: str, args: List[str] = None) -> bool:
        """Check if command is available without failing."""
        try:
            cmd = [command] + (args or [])
            result = subprocess.run(
                cmd, check=True, capture_output=True, timeout=5, cwd=self.project_root
            )
            return True
        except (
            subprocess.CalledProcessError,
            FileNotFoundError,
            subprocess.TimeoutExpired,
        ):
            return False

    def _check_cody_availability(self) -> bool:
        """Check if Cody PBT system is available."""
        cody_indicators = [
            self.project_root / ".cody" / "project" / "build" / "feature-backlog.md",
            self.project_root / ".cody" / "config" / "commands",
            self.project_root / ".cody" / "project" / "plan",
        ]

        return any(indicator.exists() for indicator in cody_indicators)

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
            if field not in issue:
                raise AssertionError(
                    f"Missing required field '{field}' on line {line_num}"
                )

        # Validate field types and formats
        if not isinstance(issue["id"], str):
            raise AssertionError(f"Field 'id' must be string on line {line_num}")
        if not isinstance(issue["title"], str):
            raise AssertionError(f"Field 'title' must be string on line {line_num}")
        if not isinstance(issue["status"], str):
            raise AssertionError(f"Field 'status' must be string on line {line_num}")
        if not isinstance(issue["priority"], int):
            raise AssertionError(f"Field 'priority' must be int on line {line_num}")
        if not isinstance(issue["issue_type"], str):
            raise AssertionError(
                f"Field 'issue_type' must be string on line {line_num}"
            )

        # Validate allowed values
        allowed_statuses = ["open", "in_progress", "closed"]
        if issue["status"] not in allowed_statuses:
            raise AssertionError(
                f"Invalid status '{issue['status']}' on line {line_num}"
            )

        allowed_types = ["bug", "feature", "task", "epic", "chore"]
        if issue["issue_type"] not in allowed_types:
            raise AssertionError(
                f"Invalid issue_type '{issue['issue_type']}' on line {line_num}"
            )

        allowed_priorities = [0, 1, 2, 3, 4]
        if issue["priority"] not in allowed_priorities:
            raise AssertionError(
                f"Invalid priority '{issue['priority']}' on line {line_num}"
            )

        # Validate ISO8601 timestamps
        import re

        iso_pattern = r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d+[-+]\d{2}:\d{2}"
        if not re.match(iso_pattern, issue["created_at"]):
            raise AssertionError(f"Invalid created_at format on line {line_num}")
        if not re.match(iso_pattern, issue["updated_at"]):
            raise AssertionError(f"Invalid updated_at format on line {line_num}")

    def _run_external_command(
        self, cmd: List[str], timeout: Optional[int] = None, capture_output: bool = True
    ) -> Tuple[bool, str, str]:
        """Run external command with timeout and error handling."""
        timeout = timeout or self.timeout_seconds

        try:
            # Disable git hooks when running from within hooks to prevent infinite recursion
            env = os.environ.copy()
            if cmd[0] == "git":
                env["GIT_HOOKS_DISABLED"] = "1"
                env["GIT_NO_HOOKS"] = "1"

            result = subprocess.run(
                cmd,
                timeout=timeout,
                capture_output=capture_output,
                text=True,
                cwd=self.project_root,
                env=env,
            )

            success = result.returncode == 0
            stdout = result.stdout if capture_output else ""
            stderr = result.stderr if capture_output else ""

            return success, stdout, stderr

        except subprocess.TimeoutExpired:
            error_msg = f"Command timed out after {timeout}s: {' '.join(cmd)}"
            self._log(error_msg, "ERROR")
            return False, "", error_msg

        except Exception as e:
            error_msg = f"Command failed: {' '.join(cmd)} - {e}"
            self._log(error_msg, "ERROR")
            return False, "", error_msg

    def handle_pre_commit(self, commit_hash: str = "") -> bool:
        """Handle pre-commit integration - non-blocking."""
        self._log(
            f"Pre-commit integration started (commit: {commit_hash or 'unknown'})"
        )

        success_count = 0
        total_operations = 0

        # Cody pre-commit operations
        if self.cody_available:
            total_operations += 1
            if self._handle_cody_pre_commit():
                success_count += 1

        # Beads pre-commit operations (delegate to bd hooks)
        if self.beads_available:
            total_operations += 1
            # Beads handles its own pre-commit via native hooks
            # We just acknowledge and don't interfere
            success_count += 1
            self._log("Beads pre-commit delegated to native bd hooks")

        self._log(
            f"Pre-commit integration completed: {success_count}/{total_operations} operations"
        )
        return True  # Always succeed - never block commits

    def _handle_cody_pre_commit(self) -> bool:
        """Handle Cody pre-commit operations."""
        try:
            # Check if Cody files are staged and need validation
            # Disable hooks to prevent infinite recursion
            env = os.environ.copy()
            env["GIT_HOOKS_DISABLED"] = "1"
            env["GIT_NO_HOOKS"] = "1"

            result = subprocess.run(
                ["git", "diff", "--cached", "--name-only"],
                capture_output=True,
                text=True,
                cwd=self.project_root,
                timeout=10,
                env=env,
            )

            staged_files = result.stdout.strip().split("\n")
            cody_files = [f for f in staged_files if f.startswith(".cody/")]

            if cody_files:
                self._log(f"Cody files staged for commit: {', '.join(cody_files)}")
                # Could add Cody-specific validation here
                # For now, just acknowledge and succeed
                return True
            else:
                self._log("No Cody files staged - skipping Cody pre-commit validation")
                return True

        except Exception as e:
            self._log(f"Cody pre-commit error: {e}", "WARNING")
            return True  # Don't fail commits

    def handle_post_commit(self, commit_hash: str) -> bool:
        """Handle post-commit integration - non-blocking."""
        self._log(f"Post-commit integration started (commit: {commit_hash})")

        success_count = 0
        total_operations = 0

        # Check if Beads files changed
        beads_changed = self._did_beads_files_change(commit_hash)

        # Check if Cody files changed
        cody_changed = self._did_cody_files_change(commit_hash)

        # Run sync operations based on changes
        if beads_changed and self.cody_available:
            total_operations += 1
            if self._sync_beads_to_cody(commit_hash):
                success_count += 1

        if cody_changed and self.beads_available:
            total_operations += 1
            if self._sync_cody_to_beads(commit_hash):
                success_count += 1

        # If no relevant changes, that's still success
        if total_operations == 0:
            self._log("No relevant changes detected for integration")
            return True

        self._log(
            f"Post-commit integration completed: {success_count}/{total_operations} operations"
        )
        return True  # Always succeed - never block

    def handle_post_merge(self) -> bool:
        """Handle post-merge integration - non-blocking."""
        self._log("Post-merge integration started")

        # Delegate to native systems, just log the event
        if self.beads_available:
            self._log("Beads post-merge delegated to native bd hooks")

        if self.cody_available:
            self._log("Cody post-merge delegated to native Cody system")

        return True

    def handle_post_checkout(self) -> bool:
        """Handle post-checkout integration - non-blocking."""
        self._log("Post-checkout integration started")

        # Delegate to native systems, just log the event
        if self.beads_available:
            self._log("Beads post-checkout delegated to native bd hooks")

        if self.cody_available:
            self._log("Cody post-checkout delegated to native Cody system")

        return True

    def _did_beads_files_change(self, commit_hash: str) -> bool:
        """Check if Beads files changed in given commit."""
        try:
            # Disable hooks to prevent infinite recursion
            env = os.environ.copy()
            env["GIT_HOOKS_DISABLED"] = "1"
            env["GIT_NO_HOOKS"] = "1"

            result = subprocess.run(
                ["git", "show", "--name-only", "--format=", commit_hash],
                capture_output=True,
                text=True,
                cwd=self.project_root,
                timeout=10,
                env=env,
            )

            changed_files = result.stdout.strip().split("\n")
            beads_files = [f for f in changed_files if f.startswith(".beads/")]

            if beads_files:
                self._log(f"Beads files changed: {', '.join(beads_files)}")
                return True

            return False

        except Exception as e:
            self._log(f"Failed to check Beads file changes: {e}", "ERROR")
            return False

    def _did_cody_files_change(self, commit_hash: str) -> bool:
        """Check if Cody files changed in given commit."""
        try:
            # Disable hooks to prevent infinite recursion
            env = os.environ.copy()
            env["GIT_HOOKS_DISABLED"] = "1"
            env["GIT_NO_HOOKS"] = "1"

            result = subprocess.run(
                ["git", "show", "--name-only", "--format=", commit_hash],
                capture_output=True,
                text=True,
                cwd=self.project_root,
                timeout=10,
                env=env,
            )

            changed_files = result.stdout.strip().split("\n")
            cody_files = [f for f in changed_files if f.startswith(".cody/")]

            if cody_files:
                self._log(f"Cody files changed: {', '.join(cody_files)}")
                return True

            return False

        except Exception as e:
            self._log(f"Failed to check Cody file changes: {e}", "ERROR")
            return False

    def _sync_beads_to_cody(self, commit_hash: str) -> bool:
        """Sync Beads changes to Cody - adapter pattern."""
        if not self.cody_available:
            self._log("Cody not available - skipping Beads→Cody sync")
            return True  # Not a failure, just not applicable

        try:
            # Use existing sync script as adapter
            success, stdout, stderr = self._run_external_command(
                [
                    "python3",
                    "scripts/beads-cody-sync.py",
                    "--command=sync",
                    "--direction=beads-to-cody",
                    "--commit",
                    commit_hash,
                ]
            )

            if success:
                self._log("Beads→Cody sync completed successfully")
                return True
            else:
                self._log(f"Beads→Cody sync failed: {stderr}", "WARNING")
                return False

        except Exception as e:
            self._log(f"Beads→Cody sync error: {e}", "ERROR")
            return False

    def _sync_cody_to_beads(self, commit_hash: str) -> bool:
        """Sync Cody changes to Beads - adapter pattern."""
        if not self.beads_available:
            self._log("Beads not available - skipping Cody→Beads sync")
            return True  # Not a failure, just not applicable

        try:
            # Use existing sync script as adapter
            success, stdout, stderr = self._run_external_command(
                [
                    "python3",
                    "scripts/beads-cody-sync.py",
                    "--command=sync",
                    "--direction=cody-to-beads",
                    "--commit",
                    commit_hash,
                ]
            )

            if success:
                self._log("Cody→Beads sync completed successfully")
                return True
            else:
                self._log(f"Cody→Beads sync failed: {stderr}", "WARNING")
                return False

        except Exception as e:
            self._log(f"Cody→Beads sync error: {e}", "ERROR")
            return False

    def get_system_status(self) -> Dict[str, Any]:
        """Get current system availability status."""
        return {
            "timestamp": datetime.now().isoformat(),
            "beads_available": self.beads_available,
            "cody_available": self.cody_available,
            "project_root": str(self.project_root),
            "integration_version": "1.0.0",
        }


def main():
    """Main CLI interface."""
    parser = argparse.ArgumentParser(
        description="Cody-Beads Integration Adapter (Loose Coupling)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s --trigger=pre-commit
  %(prog)s --trigger=post-commit --commit=abc123
  %(prog)s --trigger=post-merge --non-blocking
  %(prog)s --status

Design Principles:
  • Adapter pattern for external system integration
  • Graceful degradation when systems unavailable  
  • Never block git operations
  • Preserve native functionality of both systems
        """,
    )

    parser.add_argument(
        "--trigger",
        choices=["pre-commit", "post-commit", "post-merge", "post-checkout"],
        required=True,
        help="Git trigger that invoked this adapter",
    )
    parser.add_argument(
        "--commit",
        help="Commit hash (for post-commit operations)",
    )
    parser.add_argument(
        "--non-blocking",
        action="store_true",
        default=True,
        help="Run in non-blocking mode (default: True)",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=30,
        help="Timeout for external commands in seconds (default: 30)",
    )
    parser.add_argument(
        "--status",
        action="store_true",
        help="Show system availability status",
    )

    args = parser.parse_args()

    # Initialize adapter
    project_root = Path.cwd()
    adapter = CodyBeadsAdapter(project_root)
    adapter.timeout_seconds = args.timeout
    adapter.non_blocking = args.non_blocking

    # Handle status request
    if args.status:
        status = adapter.get_system_status()
        print(json.dumps(status, indent=2))
        return 0

    # Handle git triggers
    success = True

    try:
        if args.trigger == "pre-commit":
            success = adapter.handle_pre_commit(args.commit or "")
        elif args.trigger == "post-commit":
            if not args.commit:
                # Try to get current commit
                try:
                    # Disable hooks to prevent infinite recursion
                    env = os.environ.copy()
                    env["GIT_HOOKS_DISABLED"] = "1"
                    env["GIT_NO_HOOKS"] = "1"

                    result = subprocess.run(
                        ["git", "rev-parse", "HEAD"],
                        capture_output=True,
                        text=True,
                        timeout=5,
                        env=env,
                    )
                    args.commit = result.stdout.strip()
                except Exception:
                    args.commit = "unknown"
            success = adapter.handle_post_commit(args.commit)
        elif args.trigger == "post-merge":
            success = adapter.handle_post_merge()
        elif args.trigger == "post-checkout":
            success = adapter.handle_post_checkout()

    except KeyboardInterrupt:
        adapter._log("Integration interrupted by user", "WARNING")
        success = True  # Don't fail git operations
    except Exception as e:
        adapter._log(f"Integration error: {e}", "ERROR")
        success = True  # Don't fail git operations

    # Always exit successfully - never block git operations
    return 0


if __name__ == "__main__":
    sys.exit(main())
