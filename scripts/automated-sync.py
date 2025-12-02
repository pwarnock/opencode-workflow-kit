#!/usr/bin/env python3
"""
Automated Beads-Cody Sync System
Runs automatically via git hooks, file watchers, and CI/CD
Failsafe with rollback and conflict detection
"""

import json
import os
import subprocess
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import hashlib
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.FileHandler(".beads-cody-sync.log"), logging.StreamHandler()],
)
logger = logging.getLogger(__name__)


class AutomatedSync:
    """Failsafe automated sync between Beads and Cody"""

    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.beads_file = project_root / ".beads" / "issues.jsonl"
        self.cody_backlog = (
            project_root / ".cody" / "project" / "build" / "feature-backlog.md"
        )
        self.state_file = project_root / ".beads-cody-sync-state.json"
        self.lock_file = project_root / ".beads-cody-sync.lock"

    def acquire_lock(self, timeout: int = 300) -> bool:
        """Acquire exclusive lock for sync operation"""
        if self.lock_file.exists():
            # Check if lock is stale (older than timeout)
            try:
                lock_time = self.lock_file.stat().st_mtime
                if time.time() - lock_time > timeout:
                    logger.warning("Removing stale lock file")
                    self.lock_file.unlink()
                else:
                    logger.info("Sync already in progress, skipping")
                    return False
            except OSError:
                pass

        try:
            self.lock_file.write_text(f"{datetime.now().isoformat()}\n")
            return True
        except OSError as e:
            logger.error(f"Failed to acquire lock: {e}")
            return False

    def release_lock(self):
        """Release sync lock"""
        try:
            if self.lock_file.exists():
                self.lock_file.unlink()
        except OSError as e:
            logger.error(f"Failed to release lock: {e}")

    def get_file_hash(self, file_path: Path) -> str:
        """Get SHA256 hash of file for change detection"""
        if not file_path.exists():
            return ""

        try:
            with open(file_path, "rb") as f:
                return hashlib.sha256(f.read()).hexdigest()
        except OSError as e:
            logger.error(f"Failed to hash {file_path}: {e}")
            return ""

    def load_state(self) -> Dict:
        """Load previous sync state"""
        if self.state_file.exists():
            try:
                with open(self.state_file, "r") as f:
                    return json.load(f)
            except (json.JSONDecodeError, OSError) as e:
                logger.error(f"Failed to load state: {e}")

        return {
            "last_sync": None,
            "beads_hash": "",
            "cody_hash": "",
            "last_sync_commit": "",
            "conflicts_resolved": [],
        }

    def save_state(self, state: Dict):
        """Save sync state"""
        try:
            with open(self.state_file, "w") as f:
                json.dump(state, f, indent=2)
        except OSError as e:
            logger.error(f"Failed to save state: {e}")

    def detect_changes(self) -> Tuple[bool, bool]:
        """Detect if Beads or Cody files have changed"""
        state = self.load_state()

        current_beads_hash = self.get_file_hash(self.beads_file)
        current_cody_hash = self.get_file_hash(self.cody_backlog)

        beads_changed = current_beads_hash != state["beads_hash"]
        cody_changed = current_cody_hash != state["cody_hash"]

        logger.info(f"Change detection: Beads={beads_changed}, Cody={cody_changed}")
        return beads_changed, cody_changed

    def validate_sync_preconditions(self) -> Tuple[bool, str]:
        """Validate that sync can proceed safely"""
        # Check if we're in a git repo
        try:
            subprocess.run(
                ["git", "rev-parse", "--git-dir"],
                check=True,
                capture_output=True,
                cwd=self.project_root,
            )
        except subprocess.CalledProcessError:
            return False, "Not in a git repository"

        # Check if there are uncommitted changes
        result = subprocess.run(
            ["git", "status", "--porcelain"],
            capture_output=True,
            text=True,
            cwd=self.project_root,
        )
        if result.stdout.strip():
            return False, "Uncommitted changes detected"

        # Check if Beads is available
        try:
            subprocess.run(["bd", "--version"], check=True, capture_output=True)
        except (subprocess.CalledProcessError, FileNotFoundError):
            return False, "Beads (bd) command not available"

        return True, "Validation passed"

    def run_sync_with_rollback(self) -> Tuple[bool, str]:
        """Run sync with automatic rollback on failure"""
        # Get current commit for rollback
        try:
            current_commit = subprocess.check_output(
                ["git", "rev-parse", "HEAD"], cwd=self.project_root, text=True
            ).strip()
        except subprocess.CalledProcessError as e:
            return False, f"Failed to get current commit: {e}"

        # Create backup of current state
        backup_state = self.load_state()
        backup_files = {}

        # Backup critical files
        for file_path in [self.cody_backlog]:
            if file_path.exists():
                backup_files[file_path] = file_path.read_text()

        try:
            # Run the actual sync
            result = subprocess.run(
                [
                    "python3",
                    "scripts/beads-cody-sync.py",
                    "--command=sync",
                    "--verbose",
                ],
                cwd=self.project_root,
                capture_output=True,
                text=True,
            )

            if result.returncode != 0:
                raise Exception(f"Sync failed: {result.stderr}")

            # Validate sync results
            validation_ok, validation_msg = self.validate_sync_results()
            if not validation_ok:
                raise Exception(f"Sync validation failed: {validation_msg}")

            return True, "Sync completed successfully"

        except Exception as e:
            logger.error(f"Sync failed, attempting rollback: {e}")

            # Rollback file changes
            for file_path, content in backup_files.items():
                try:
                    file_path.write_text(content)
                except OSError as rollback_error:
                    logger.error(f"Failed to rollback {file_path}: {rollback_error}")

            # Rollback state
            self.save_state(backup_state)

            return False, f"Sync failed and rolled back: {e}"

    def validate_sync_results(self) -> Tuple[bool, str]:
        """Validate that sync produced sensible results"""
        # Check that Cody files exist and are not empty
        if not self.cody_backlog.exists():
            return False, "Cody feature-backlog.md not created"

        if self.cody_backlog.stat().st_size == 0:
            return False, "Cody feature-backlog.md is empty"

        # Check that the file contains expected structure
        content = self.cody_backlog.read_text()
        if "## Backlog" not in content or "|" not in content:
            return False, "Cody feature-backlog.md appears malformed"

        # Validate that Beads file is still valid JSONL
        try:
            with open(self.beads_file, "r") as f:
                lines = f.readlines()
                for i, line in enumerate(lines, 1):
                    if line.strip():
                        json.loads(line)
        except (json.JSONDecodeError, OSError) as e:
            return False, f"Beads file validation failed: {e}"

        return True, "Validation passed"

    def auto_commit_sync_changes(self, message: str) -> bool:
        """Automatically commit sync changes if safe"""
        try:
            # Check what changed
            result = subprocess.run(
                ["git", "status", "--porcelain"],
                capture_output=True,
                text=True,
                cwd=self.project_root,
            )

            if not result.stdout.strip():
                logger.info("No changes to commit")
                return True

            # Add only sync-related files
            sync_files = [
                str(self.cody_backlog.relative_to(self.project_root)),
                ".beads-cody-sync-state.json",
            ]

            for sync_file in sync_files:
                if Path(self.project_root / sync_file).exists():
                    subprocess.run(
                        ["git", "add", sync_file], cwd=self.project_root, check=True
                    )

            # Commit with standardized message
            subprocess.run(
                ["git", "commit", "-m", f"auto-sync: {message}"],
                cwd=self.project_root,
                check=True,
            )

            logger.info(f"Auto-committed sync changes: {message}")
            return True

        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to auto-commit sync changes: {e}")
            return False

    def run_automated_sync(self, trigger: str = "auto") -> Tuple[bool, str]:
        """Main automated sync entry point"""
        logger.info(f"Starting automated sync (trigger: {trigger})")

        # Acquire lock
        if not self.acquire_lock():
            return False, "Sync already in progress"

        try:
            # Validate preconditions
            valid, msg = self.validate_sync_preconditions()
            if not valid:
                return False, f"Preconditions failed: {msg}"

            # Check if sync is needed
            beads_changed, cody_changed = self.detect_changes()
            if not beads_changed and not cody_changed:
                logger.info("No changes detected, skipping sync")
                return True, "No sync needed"

            # Run sync with rollback
            success, msg = self.run_sync_with_rollback()
            if not success:
                return False, msg

            # Update state
            state = self.load_state()
            state["last_sync"] = datetime.now().isoformat()
            state["beads_hash"] = self.get_file_hash(self.beads_file)
            state["cody_hash"] = self.get_file_hash(self.cody_backlog)

            # Get current commit
            try:
                result = subprocess.check_output(
                    ["git", "rev-parse", "HEAD"], cwd=self.project_root, text=True
                ).strip()
                state["last_sync_commit"] = result
            except subprocess.CalledProcessError:
                pass

            self.save_state(state)

            # Auto-commit if safe
            if trigger in ["pre-commit", "ci"]:
                self.auto_commit_sync_changes(f"Automated sync ({trigger})")

            logger.info(f"Automated sync completed successfully")
            return True, "Sync completed"

        finally:
            self.release_lock()


def main():
    """CLI entry point for automated sync"""
    import argparse

    parser = argparse.ArgumentParser(description="Automated Beads-Cody Sync")
    parser.add_argument(
        "--project-root", type=Path, default=Path.cwd(), help="Project root directory"
    )
    parser.add_argument(
        "--trigger",
        default="manual",
        choices=["manual", "pre-commit", "post-commit", "ci", "watcher"],
        help="What triggered the sync",
    )
    parser.add_argument(
        "--force", action="store_true", help="Force sync even if no changes detected"
    )

    args = parser.parse_args()

    sync = AutomatedSync(args.project_root)

    if args.force:
        # Force sync by bypassing change detection
        success, msg = sync.run_sync_with_rollback()
    else:
        success, msg = sync.run_automated_sync(args.trigger)

    if success:
        print(f"✅ {msg}")
        exit(0)
    else:
        print(f"❌ {msg}")
        exit(1)


if __name__ == "__main__":
    main()
