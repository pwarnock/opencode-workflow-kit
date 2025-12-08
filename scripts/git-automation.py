#!/usr/bin/env python3
"""
Git Automation Script

Provides git workflow automation with Beads integration and atomic commit validation.
Used by git-automation subagent for automated commit management.
"""

import json
import re
import subprocess
import sys
import time
import threading
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Tuple, Optional, Set, NamedTuple


class ValidationResult(NamedTuple):
    """Validation result with warnings and errors."""

    is_valid: bool
    warnings: List[str]
    errors: List[str]


class AtomicCommitRule:
    """Atomic commit validation rule."""

    def __init__(self, name: str, description: str, validator_func):
        self.name = name
        self.description = description
        self.validator_func = validator_func

    def validate(self, files: List[str], issues: Dict[str, Dict]) -> ValidationResult:
        """Run validation rule."""
        return self.validator_func(files, issues)


class GitAutomation:
    """Enhanced git automation with real-time Beads integration."""

    def __init__(self, project_root: Optional[Path] = None):
        self.project_root = project_root or Path.cwd()
        self.beads_file = self.project_root / ".beads" / "issues.jsonl"
        self.git_dir = self.project_root / ".git"

        # Initialize configuration
        self.version_config = {
            "enabled": True,
            "branch_prefix": "version/",
            "auto_merge": False,
            "require_pr": True,
        }

        # Initialize atomic commit rules
        self.atomic_rules = self._initialize_atomic_rules()

    def get_git_status(self) -> Dict[str, List[str]]:
        """Get current git status."""
        try:
            result = subprocess.run(
                ["git", "status", "--porcelain"],
                capture_output=True,
                text=True,
                check=True,
            )

            staged = []
            unstaged = []
            untracked = []

            for line in result.stdout.strip().split("\n"):
                if not line:
                    continue

                status = line[:2]
                file_path = line[3:]

                if status[0] in ["A", "M", "D", "R", "C"]:
                    staged.append(file_path)
                if status[1] in ["M", "D"]:
                    unstaged.append(file_path)
                if status == "??":
                    untracked.append(file_path)

            return {"staged": staged, "unstaged": unstaged, "untracked": untracked}
        except subprocess.CalledProcessError:
            return {"staged": [], "unstaged": [], "untracked": []}

    def stage_files(self, files: List[str]) -> bool:
        """Stage specific files."""
        try:
            subprocess.run(["git", "add"] + files, check=True, capture_output=True)
            return True
        except subprocess.CalledProcessError as e:
            print(f"Error staging files: {e.stderr}")
            return False

    def create_commit(self, message: str) -> bool:
        """Create commit with message."""
        try:
            subprocess.run(
                ["git", "commit", "-m", message], check=True, capture_output=True
            )
            return True
        except subprocess.CalledProcessError as e:
            print(f"Error creating commit: {e.stderr}")
            return False

    def extract_beads_issues_from_files(self, files: List[str]) -> Set[str]:
        """Extract Beads issue IDs from file names and content."""
        issue_ids = set()
        issue_pattern = r"opencode-config-(\d+)"

        for file_path in files:
            # Check file name
            match = re.search(issue_pattern, file_path)
            if match:
                issue_ids.add(f"opencode-config-{match.group(1)}")
                continue

            # Check file content
            full_path = self.project_root / file_path
            if full_path.exists() and full_path.suffix in [
                ".md",
                ".py",
                ".json",
                ".yml",
                ".yaml",
            ]:
                try:
                    with open(full_path, "r", encoding="utf-8") as f:
                        content = f.read()
                        matches = re.findall(issue_pattern, content)
                        for match in matches:
                            issue_ids.add(f"opencode-config-{match}")
                except Exception:
                    pass  # Skip files that can't be read as text

        return issue_ids

    def load_beads_issues(self) -> Dict[str, Dict]:
        """Load Beads issues from JSONL file."""
        issues = {}
        if not self.beads_file.exists():
            return issues

        try:
            with open(self.beads_file, "r") as f:
                for line in f:
                    if line.strip():
                        issue = json.loads(line)
                        issues[issue["id"]] = issue
        except Exception as e:
            print(f"Warning: Could not read Beads issues: {e}")

        return issues

    def generate_commit_message(
        self, files: List[str], custom_message: Optional[str] = None
    ) -> Tuple[str, List[str]]:
        """Generate intelligent commit message."""
        if custom_message:
            return custom_message, []

        issues = self.load_beads_issues()
        issue_ids = self.extract_beads_issues_from_files(files)

        if not issue_ids:
            return "chore: Update project files", []

        # Get issue details
        related_issues = []
        for issue_id in issue_ids:
            if issue_id in issues:
                issue = issues[issue_id]
                related_issues.append(
                    {
                        "id": issue_id,
                        "title": issue["title"],
                        "type": issue.get("issue_type", "task"),
                        "priority": issue.get("priority", 2),
                    }
                )

        # Determine commit type and scope
        commit_type = self._determine_commit_type(files)
        scope = self._determine_scope(files)

        # Generate message
        if len(related_issues) == 1:
            issue = related_issues[0]
            title = issue["title"].lower()

            if scope:
                commit_msg = f"{commit_type}({scope}): {issue['id']} {title}"
            else:
                commit_msg = f"{commit_type}: {issue['id']} {title}"
        else:
            # Multiple issues
            issue_refs = ", ".join(issue_ids)
            if scope:
                commit_msg = f"{commit_type}({scope}): Multiple issues - {issue_refs}"
            else:
                commit_msg = f"{commit_type}: Multiple issues - {issue_refs}"

        # Add body with issue details
        if len(related_issues) > 1:
            body_lines = ["Related issues:"]
            for issue in related_issues:
                body_lines.append(f"- {issue['id']}: {issue['title']}")
            commit_msg += f"\n\n" + "\n".join(body_lines)

        return commit_msg, issue_ids

    def _determine_commit_type(self, files: List[str]) -> str:
        """Determine conventional commit type."""
        if any("test" in f for f in files):
            return "test"
        elif any("README.md" in f or "docs/" in f for f in files):
            return "docs"
        elif any(".py" in f and "test" not in f for f in files):
            return "feat"
        elif any("schemas/" in f for f in files):
            return "chore"
        elif any("fix" in f or "bug" in f for f in files):
            return "fix"
        else:
            return "feat"

    def _determine_scope(self, files: List[str]) -> Optional[str]:
        """Determine commit scope."""
        if any("tasklist.md" in f for f in files):
            return "tasklist"
        elif any(".cody/" in f for f in files):
            return "cody"
        elif any("agents/" in f for f in files):
            return "agents"
        elif any("templates/" in f for f in files):
            return "templates"
        elif any("schemas/" in f for f in files):
            return "schemas"
        elif any("scripts/" in f for f in files):
            return "scripts"
        return None

    def _initialize_atomic_rules(self) -> List[AtomicCommitRule]:
        """Initialize atomic commit validation rules."""
        rules = []

        # Rule: Single issue per commit
        def single_issue_rule(
            files: List[str], issues: Dict[str, Dict]
        ) -> ValidationResult:
            issue_ids = self.extract_beads_issues_from_files(files)
            if len(issue_ids) > 1:
                return ValidationResult(
                    is_valid=False,
                    warnings=[],
                    errors=[
                        f"Multiple issues detected: {', '.join(issue_ids)}. Atomic commits should address one issue at a time."
                    ],
                )
            return ValidationResult(is_valid=True, warnings=[], errors=[])

        # Rule: No unrelated change types
        def unrelated_changes_rule(
            files: List[str], issues: Dict[str, Dict]
        ) -> ValidationResult:
            change_types = {
                "tasklist": any("tasklist.md" in f for f in files),
                "code": any(".py" in f for f in files),
                "config": any(".json" in f and "issues.jsonl" not in f for f in files),
                "docs": any("docs/" in f or "README.md" in f for f in files),
                "test": any("test" in f for f in files),
            }

            active_types = [k for k, v in change_types.items() if v]

            if len(active_types) > 2:  # Allow code + test combination
                return ValidationResult(
                    is_valid=False,
                    warnings=[],
                    errors=[
                        f"Unrelated change types detected: {', '.join(active_types)}. Consider splitting into separate commits."
                    ],
                )
            return ValidationResult(is_valid=True, warnings=[], errors=[])

        # Rule: No version mixing
        def version_mixing_rule(
            files: List[str], issues: Dict[str, Dict]
        ) -> ValidationResult:
            versions = set()
            for f in files:
                match = re.search(r"v(\d+\.\d+\.\d+)/", f)
                if match:
                    versions.add(match.group(1))

            if len(versions) > 1:
                return ValidationResult(
                    is_valid=False,
                    warnings=[],
                    errors=[
                        f"Changes span multiple versions: {', '.join(sorted(versions))}. Each commit should target a single version."
                    ],
                )
            return ValidationResult(is_valid=True, warnings=[], errors=[])

        # Rule: Issue dependency validation
        def dependency_rule(
            files: List[str], issues: Dict[str, Dict]
        ) -> ValidationResult:
            issue_ids = self.extract_beads_issues_from_files(files)
            warnings = []

            for issue_id in issue_ids:
                if issue_id in issues:
                    issue = issues[issue_id]
                    deps = issue.get("dependencies", [])

                    for dep in deps:
                        if dep in issues:
                            dep_issue = issues[dep]
                            if dep_issue.get("status") != "closed":
                                warnings.append(
                                    f"Issue {issue_id} depends on unclosed issue {dep}"
                                )

            return ValidationResult(is_valid=True, warnings=warnings, errors=[])

        rules.extend(
            [
                AtomicCommitRule(
                    "single_issue", "One issue per commit", single_issue_rule
                ),
                AtomicCommitRule(
                    "unrelated_changes",
                    "No unrelated change types",
                    unrelated_changes_rule,
                ),
                AtomicCommitRule(
                    "version_mixing", "No version mixing", version_mixing_rule
                ),
                AtomicCommitRule("dependencies", "Issue dependencies", dependency_rule),
            ]
        )

        return rules

    def validate_atomic_commit(
        self, files: List[str], strict: bool = True
    ) -> ValidationResult:
        """Enhanced atomic commit validation with configurable strictness."""
        issues = self.load_beads_issues()
        all_warnings = []
        all_errors = []
        is_valid = True

        for rule in self.atomic_rules:
            result = rule.validate(files, issues)

            if not result.is_valid:
                if strict:
                    is_valid = False
                    all_errors.extend(result.errors)
                else:
                    # In non-strict mode, treat errors as warnings
                    all_warnings.extend(result.errors)

            all_warnings.extend(result.warnings)

        return ValidationResult(
            is_valid=is_valid, warnings=all_warnings, errors=all_errors
        )

    def update_beads_status(
        self,
        issue_ids: List[str],
        status: str = "in_progress",
        notes: Optional[str] = None,
    ) -> bool:
        """Update Beads issue status with retry logic."""
        max_retries = 3
        for attempt in range(max_retries):
            try:
                for issue_id in issue_ids:
                    cmd = ["bd", "update", issue_id, "--status", status, "--json"]
                    if notes:
                        cmd.extend(["--notes", notes])

                    result = subprocess.run(
                        cmd, check=True, capture_output=True, text=True
                    )

                    # Verify the update was successful
                    updated_issue = json.loads(result.stdout)
                    # bd command returns a list, get the first item
                    if isinstance(updated_issue, list):
                        updated_issue = updated_issue[0]
                    if updated_issue.get("status") != status:
                        raise subprocess.CalledProcessError(
                            1, cmd, f"Status update verification failed"
                        )

                return True
            except subprocess.CalledProcessError as e:
                if attempt == max_retries - 1:
                    print(
                        f"Error updating Beads status after {max_retries} attempts: {e.stderr}"
                    )
                    return False
                time.sleep(1)  # Wait before retry
        return False

    def sync_beads_with_commit(self, commit_hash: str, files: List[str]) -> bool:
        """Real-time sync: Update Beads issues when commit is created."""
        issue_ids = list(self.extract_beads_issues_from_files(files))

        if not issue_ids:
            return True

        # Get commit details for notes
        try:
            result = subprocess.run(
                ["git", "log", "--format=%s", "-n", "1", commit_hash],
                capture_output=True,
                text=True,
                check=True,
            )
            commit_message = result.stdout.strip()
        except subprocess.CalledProcessError:
            commit_message = "Unknown commit"

        notes = f"Committed in {commit_hash[:8]}: {commit_message[:100]}"

        return self.update_beads_status(issue_ids, "in_progress", notes)

    def check_beads_sync_status(self) -> Dict[str, bool]:
        """Check if Beads issues are in sync with git state."""
        issues = self.load_beads_issues()
        sync_status = {}

        # Get recent commits (last 10)
        try:
            result = subprocess.run(
                ["git", "log", "--format=%H", "-n", "10"],
                capture_output=True,
                text=True,
                check=True,
            )
            recent_commits = result.stdout.strip().split("\n")
        except subprocess.CalledProcessError:
            return sync_status

        for commit_hash in recent_commits:
            if not commit_hash:
                continue

            # Get files changed in this commit
            try:
                result = subprocess.run(
                    ["git", "show", "--name-only", "--format=", commit_hash],
                    capture_output=True,
                    text=True,
                    check=True,
                )
                files = result.stdout.strip().split("\n")
                issue_ids = self.extract_beads_issues_from_files(files)

                for issue_id in issue_ids:
                    if issue_id in issues:
                        issue = issues[issue_id]
                        # Check if issue notes contain this commit
                        notes = issue.get("notes", "")
                        if commit_hash[:8] in notes:
                            sync_status[issue_id] = True
                        else:
                            sync_status[issue_id] = False
            except subprocess.CalledProcessError:
                continue

        return sync_status

    def auto_sync_beads_issues(self) -> Dict[str, str]:
        """Automatically sync out-of-sync Beads issues."""
        sync_status = self.check_beads_sync_status()
        results = {}

        for issue_id, is_synced in sync_status.items():
            if not is_synced:
                # Find the most recent commit for this issue
                try:
                    result = subprocess.run(
                        ["git", "log", "--grep", issue_id, "--format=%H", "-n", "1"],
                        capture_output=True,
                        text=True,
                        check=True,
                    )
                    commit_hash = result.stdout.strip()

                    if commit_hash:
                        # Get commit details
                        result = subprocess.run(
                            ["git", "log", "--format=%s", "-n", "1", commit_hash],
                            capture_output=True,
                            text=True,
                            check=True,
                        )
                        commit_message = result.stdout.strip()

                        notes = f"Auto-synced from {commit_hash[:8]}: {commit_message[:100]}"

                        if self.update_beads_status([issue_id], "in_progress", notes):
                            results[issue_id] = "synced"
                        else:
                            results[issue_id] = "failed"
                    else:
                        results[issue_id] = "no_commit_found"
                except subprocess.CalledProcessError:
                    results[issue_id] = "failed"

        return results

    def enforce_atomic_commit(self, files: List[str]) -> bool:
        """Enforce atomic commit rules - block if validation fails."""
        validation = self.validate_atomic_commit(files, strict=True)

        if not validation.is_valid:
            print("❌ Atomic commit validation failed!")
            print("\nErrors:")
            for error in validation.errors:
                print(f"  • {error}")

            if validation.warnings:
                print("\nWarnings:")
                for warning in validation.warnings:
                    print(f"  ⚠️  {warning}")

            print("\nTo bypass enforcement, use --no-validate flag")
            return False

        if validation.warnings:
            print("⚠️  Atomic commit warnings:")
            for warning in validation.warnings:
                print(f"  • {warning}")

        return True

    def run_pre_commit_hook(self, files: Optional[List[str]] = None) -> bool:
        """Pre-commit hook validation."""
        if files is None:
            status = self.get_git_status()
            files = status["staged"]

        if not files:
            return True  # Nothing to validate

        print("🔍 Running pre-commit validation...")

        # Atomic commit validation
        if not self.enforce_atomic_commit(files):
            return False

        # Beads sync check
        sync_status = self.check_beads_sync_status()
        out_of_sync = [
            issue_id for issue_id, synced in sync_status.items() if not synced
        ]

        if out_of_sync:
            print(
                f"⚠️  {len(out_of_sync)} Beads issues out of sync: {', '.join(out_of_sync)}"
            )
            try:
                response = input("Auto-sync these issues? (y/N): ")
                if response.lower() in ["y", "yes"]:
                    sync_results = self.auto_sync_beads_issues()
                    synced = [k for k, v in sync_results.items() if v == "synced"]
                    if synced:
                        print(f"✅ Synced {len(synced)} issues")
            except EOFError:
                # Non-interactive mode, just warn
                print(
                    "Note: Run with --auto-sync to automatically sync in non-interactive mode"
                )

        print("✅ Pre-commit validation passed")
        return True

    def run_post_commit_hook(self) -> bool:
        """Post-commit hook actions."""
        try:
            # Get latest commit hash
            result = subprocess.run(
                ["git", "rev-parse", "HEAD"], capture_output=True, text=True, check=True
            )
            commit_hash = result.stdout.strip()

            # Get files changed in latest commit
            result = subprocess.run(
                ["git", "show", "--name-only", "--format=", commit_hash],
                capture_output=True,
                text=True,
                check=True,
            )
            files = result.stdout.strip().split("\n")

            print("🔄 Running post-commit sync...")

            # Sync with Beads
            if self.sync_beads_with_commit(commit_hash, files):
                print("✅ Beads issues updated")
            else:
                print("⚠️  Failed to update some Beads issues")

            return True

        except subprocess.CalledProcessError as e:
            print(f"Error in post-commit hook: {e}")
            return False

    def detect_completed_tasks(self, since_minutes: int = 30) -> List[Dict]:
        """Detect tasks that were recently completed and need committing."""
        completed_tasks = []
        issues = self.load_beads_issues()
        cutoff_time = datetime.now() - timedelta(minutes=since_minutes)

        for issue_id, issue in issues.items():
            # Check if issue was recently closed
            if issue.get("status") == "closed":
                updated_str = issue.get("updated_at", "")
                if updated_str:
                    try:
                        # Parse the datetime string - handle the format from Beads
                        # Format: 2025-10-24T09:51:17.560238-07:00
                        if "." in updated_str and "-" in updated_str[-6:]:
                            # Split timezone and datetime parts
                            datetime_part = updated_str[:-6]
                            tz_part = updated_str[-6:]
                            updated_at = datetime.fromisoformat(datetime_part)
                        else:
                            # Fallback to simple parsing
                            updated_at = datetime.fromisoformat(
                                updated_str.replace("Z", "")
                            )

                        if updated_at > cutoff_time:
                            # Check if there are uncommitted changes for this issue
                            if self._has_uncommitted_changes_for_issue(issue_id):
                                completed_tasks.append(
                                    {
                                        "issue_id": issue_id,
                                        "issue": issue,
                                        "completion_time": updated_at,
                                        "has_changes": True,
                                    }
                                )
                    except (ValueError, TypeError) as e:
                        # Skip if we can't parse the datetime
                        print(
                            f"Warning: Could not parse datetime for {issue_id}: {updated_str}"
                        )
                        continue

        return completed_tasks

    def _has_uncommitted_changes_for_issue(self, issue_id: str) -> bool:
        """Check if there are uncommitted changes for a specific issue."""
        status = self.get_git_status()
        all_files = status["staged"] + status["unstaged"] + status["untracked"]

        # Filter files related to this issue
        issue_files = []
        for file_path in all_files:
            if issue_id in file_path:
                issue_files.append(file_path)
                continue

            # Check file content for issue reference
            full_path = self.project_root / file_path
            if full_path.exists() and full_path.suffix in [
                ".md",
                ".py",
                ".json",
                ".yml",
                ".yaml",
            ]:
                try:
                    with open(full_path, "r", encoding="utf-8") as f:
                        content = f.read()
                        if issue_id in content:
                            issue_files.append(file_path)
                except Exception:
                    pass

        return len(issue_files) > 0

    def get_files_for_issue(self, issue_id: str) -> List[str]:
        """Get all files that are related to a specific issue."""
        status = self.get_git_status()
        all_files = status["staged"] + status["unstaged"] + status["untracked"]
        issue_files = []

        for file_path in all_files:
            # Check file name
            if issue_id in file_path:
                issue_files.append(file_path)
                continue

            # Check file content for issue reference
            full_path = self.project_root / file_path
            if full_path.exists() and full_path.suffix in [
                ".md",
                ".py",
                ".json",
                ".yml",
                ".yaml",
            ]:
                try:
                    with open(full_path, "r", encoding="utf-8") as f:
                        content = f.read()
                        if issue_id in content:
                            issue_files.append(file_path)
                except Exception:
                    pass

        return issue_files

    def auto_commit_task(
        self,
        issue_id: str,
        status: str = "closed",
        custom_message: Optional[str] = None,
        validate: bool = True,
        dry_run: bool = False,
    ) -> Dict[str, any]:
        """Auto-commit work for a specific task."""
        result = {
            "success": False,
            "commit_hash": None,
            "message": None,
            "files_committed": [],
            "warnings": [],
            "errors": [],
        }

        try:
            # Get files for this issue
            files = self.get_files_for_issue(issue_id)

            if not files:
                result["errors"].append(f"No files found for issue {issue_id}")
                return result

            # Validate files if requested
            if validate:
                validation = self.validate_atomic_commit(files, strict=True)
                if not validation.is_valid:
                    result["errors"].extend(validation.errors)
                    result["warnings"].extend(validation.warnings)
                    return result
                result["warnings"].extend(validation.warnings)

            # Stage files
            if not dry_run:
                if not self.stage_files(files):
                    result["errors"].append("Failed to stage files")
                    return result

            # Generate commit message
            issues = self.load_beads_issues()
            issue = issues.get(issue_id, {})

            if custom_message:
                commit_message = custom_message
            else:
                commit_message, _ = self.generate_commit_message(files, None)
                # Enhance with completion context
                if status == "closed":
                    commit_message = commit_message.replace("feat", "feat").replace(
                        "fix", "fix"
                    )
                    if not any(
                        keyword in commit_message.lower()
                        for keyword in ["complete", "finish", "resolve"]
                    ):
                        commit_message = commit_message.replace(
                            f"{issue_id}", f"{issue_id} completed"
                        )

            result["message"] = commit_message
            result["files_committed"] = files

            if dry_run:
                result["success"] = True
                result["warnings"].append("Dry run - no actual commit made")
                return result

            # Create commit
            if not self.create_commit(commit_message):
                result["errors"].append("Failed to create commit")
                return result

            # Get commit hash
            try:
                commit_result = subprocess.run(
                    ["git", "rev-parse", "HEAD"],
                    capture_output=True,
                    text=True,
                    check=True,
                )
                result["commit_hash"] = commit_result.stdout.strip()
            except subprocess.CalledProcessError:
                pass

            # Update Beads status
            if status:
                notes = f"Auto-committed in {result['commit_hash'][:8] if result['commit_hash'] else 'unknown'}"
                if not self.update_beads_status([issue_id], status, notes):
                    result["warnings"].append(
                        f"Failed to update Beads status for {issue_id}"
                    )

            result["success"] = True

        except Exception as e:
            result["errors"].append(f"Auto-commit failed: {str(e)}")

        return result

    def monitor_task_completion(
        self, interval: int = 30, max_duration: int = 3600
    ) -> None:
        """Monitor for task completion and auto-commit."""
        start_time = time.time()

        def check_and_commit():
            while time.time() - start_time < max_duration:
                try:
                    completed_tasks = self.detect_completed_tasks(
                        since_minutes=interval // 60
                    )

                    for task_info in completed_tasks:
                        issue_id = task_info["issue_id"]
                        print(f"🎯 Detected completed task: {issue_id}")

                        # Auto-commit the task
                        result = self.auto_commit_task(issue_id, status="closed")

                        if result["success"]:
                            print(f"✅ Auto-committed {issue_id}: {result['message']}")
                        else:
                            print(
                                f"❌ Failed to auto-commit {issue_id}: {result['errors']}"
                            )

                    time.sleep(interval)

                except KeyboardInterrupt:
                    print("🛑 Stopping task completion monitor")
                    break
                except Exception as e:
                    print(f"⚠️  Monitor error: {e}")
                    time.sleep(interval)

        # Run in background thread
        monitor_thread = threading.Thread(target=check_and_commit, daemon=True)
        monitor_thread.start()
        print(
            f"👀 Started task completion monitor (interval: {interval}s, max duration: {max_duration}s)"
        )

        return monitor_thread

    def validate_auto_commit_safety(self, files: List[str]) -> Tuple[bool, List[str]]:
        """Validate that auto-commit is safe for the given files."""
        warnings = []

        # Check file count
        if len(files) > 50:
            warnings.append(
                f"Large number of files ({len(files)}) - review before committing"
            )

        # Check for excluded patterns
        exclude_patterns = [
            "*.tmp",
            "*.log",
            "node_modules/",
            "venv/",
            "__pycache__/",
            ".git/",
            ".beads/",
        ]
        for file_path in files:
            for pattern in exclude_patterns:
                if pattern.replace("*", "") in file_path:
                    warnings.append(f"Excluded file pattern detected: {file_path}")
                    break

        # Check for sensitive files
        sensitive_extensions = [".key", ".pem", ".p12", ".pfx"]
        for file_path in files:
            if any(file_path.endswith(ext) for ext in sensitive_extensions):
                warnings.append(f"Sensitive file detected: {file_path}")

        # Check working tree cleanliness
        status = self.get_git_status()
        if status["unstaged"]:
            warnings.append(
                f"Unstaged changes detected: {len(status['unstaged'])} files"
            )

        return len(warnings) == 0, warnings

    def manage_branches(self, action: str, version: Optional[str] = None) -> bool:
        """Enhanced version-based branch management."""
        try:
            if action == "create":
                if not version:
                    print("Error: --version required for branch creation")
                    return False

                branch_name = f"version/{version}"

                # Check if branch already exists
                result = subprocess.run(
                    ["git", "branch", "--list", branch_name],
                    capture_output=True,
                    text=True,
                )
                if result.stdout.strip():
                    print(f"Branch {branch_name} already exists")
                    return False

                subprocess.run(["git", "checkout", "-b", branch_name], check=True)
                print(f"Created branch: {branch_name}")

                # Create corresponding Beads issue if it doesn't exist
                issue_id = f"opencode-config-{int(time.time())}"
                try:
                    subprocess.run(
                        [
                            "bd",
                            "create",
                            f"Version {version} development",
                            "-t",
                            "epic",
                            "-p",
                            "1",
                            "--json",
                        ],
                        check=True,
                        capture_output=True,
                    )
                    print(f"Created Beads issue for version {version}")
                except subprocess.CalledProcessError:
                    print(
                        "Note: Could not create Beads issue (bd command may not be available)"
                    )

            elif action == "merge":
                if not version:
                    print("Error: --version required for branch merge")
                    return False

                branch_name = f"version/{version}"

                # Validate branch exists
                result = subprocess.run(
                    ["git", "branch", "--list", branch_name],
                    capture_output=True,
                    text=True,
                )
                if not result.stdout.strip():
                    print(f"Branch {branch_name} does not exist")
                    return False

                # Switch to develop (or main if develop doesn't exist)
                try:
                    subprocess.run(["git", "checkout", "develop"], check=True)
                except subprocess.CalledProcessError:
                    subprocess.run(["git", "checkout", "main"], check=True)

                # Merge with validation
                subprocess.run(["git", "merge", branch_name, "--no-ff"], check=True)
                print(f"Merged {branch_name} into current branch")

                # Tag the merge
                tag_name = f"v{version}"
                subprocess.run(["git", "tag", tag_name], check=True)
                print(f"Created tag: {tag_name}")

            elif action == "list":
                result = subprocess.run(
                    ["git", "branch", "-a"], capture_output=True, text=True, check=True
                )
                version_branches = []
                for line in result.stdout.split("\n"):
                    if "version/" in line:
                        version_branches.append(line.strip())

                if version_branches:
                    print("Version branches:")
                    for branch in version_branches:
                        print(f"  {branch}")
                else:
                    print("No version branches found")

            return True

        except subprocess.CalledProcessError as e:
            print(f"Error managing branches: {e.stderr}")
            return False

    # Missing Methods Implementation

    def _validate_version_format(self, version: str) -> bool:
        """Validate semantic version format."""
        import re

        pattern = r"^\d+\.\d+\.\d+(-[a-zA-Z0-9-]+)?$"
        return bool(re.match(pattern, version))

    def _determine_issue_status_from_commit(self, commit_message: str) -> str:
        """Determine issue status from commit message."""
        message_lower = commit_message.lower()

        # Check for completion indicators (past tense or explicit completion)
        completion_keywords = [
            "fix",
            "fixed",
            "fixes",
            "resolved",
            "complete",
            "completed",
            "implemented",
            "added",
            "removed",
            "finished",
            "done",
        ]

        if any(keyword in message_lower for keyword in completion_keywords):
            return "closed"

        # Check for progress indicators (present tense, ongoing work)
        progress_keywords = [
            "implement",
            "start",
            "begin",
            "add",
            "remove",
            "update",
            "refactor",
            "improve",
            "enhance",
            "create",
            "build",
            "wip",
            "working",
        ]

        if any(keyword in message_lower for keyword in progress_keywords):
            return "in_progress"

        # Default to in_progress for any non-trivial commit
        return "in_progress"

    def _get_issues_from_git_commits(self) -> Dict[str, str]:
        """Extract issues from git commits."""
        try:
            result = subprocess.run(
                ["git", "log", "--oneline", "-50"],
                capture_output=True,
                text=True,
                check=True,
            )

            issues = {}
            for line in result.stdout.strip().split("\n"):
                if not line:
                    continue

                # Extract issue IDs from commit messages (support both formats)
                issue_matches = re.findall(r"(owk-[a-z0-9]+|opencode-config-\d+)", line)
                for issue_id in issue_matches:
                    if issue_id not in issues:
                        issues[issue_id] = self._determine_issue_status_from_commit(
                            line
                        )

            return issues
        except subprocess.CalledProcessError:
            return {}

    def _get_issue_commits(self, issue_id: str) -> List[Dict]:
        """Get commits for a specific issue."""
        try:
            result = subprocess.run(
                ["git", "log", "--oneline", "--grep", issue_id, "-10"],
                capture_output=True,
                text=True,
                check=True,
            )

            commits = []
            for line in result.stdout.strip().split("\n"):
                if not line:
                    continue

                # Handle both space-separated and pipe-separated formats
                if "|" in line:
                    parts = line.split("|", 2)  # hash|message|date
                    if len(parts) >= 2:
                        commit_hash = parts[0]
                        message = parts[1]
                else:
                    parts = line.split(" ", 1)
                    if len(parts) >= 2:
                        commit_hash = parts[0]
                        message = parts[1]
                    else:
                        continue

                commits.append(
                    {
                        "hash": commit_hash,
                        "message": message,
                        "status": self._determine_issue_status_from_commit(message),
                    }
                )

            return commits
        except subprocess.CalledProcessError:
            return []

    def _get_last_commit_for_issue(self, issue_id: str) -> Optional[Dict]:
        """Get the last commit for a specific issue."""
        commits = self._get_issue_commits(issue_id)
        return commits[0] if commits else None

    def _assess_conflict_severity(self, git_status: str, beads_status: str) -> str:
        """Assess conflict severity between git and beads states."""
        # High severity: closed vs open (critical disagreement)
        if (git_status == "closed" and beads_status in ["open", "in_progress"]) or (
            beads_status == "closed" and git_status in ["open", "in_progress"]
        ):
            return "high"

        # Medium severity: progress state mismatches
        if (git_status == "in_progress" and beads_status == "open") or (
            git_status == "open" and beads_status == "in_progress"
        ):
            return "medium"

        # Low severity: same status or minor differences
        return "low"

    def _get_conflict_recommendation(self, git_status: str, beads_status: str) -> str:
        """Get recommendation for resolving sync conflicts."""
        if git_status == "closed" and beads_status in ["open", "in_progress"]:
            return f"Update Beads status to 'closed' to match git commit state"

        if beads_status == "closed" and git_status in ["open", "in_progress"]:
            return f"Review if issue should be reopened in Beads or if additional commits are needed"

        if git_status == "in_progress" and beads_status == "open":
            return f"Update Beads status to 'in_progress' to reflect active work"

        if beads_status == "in_progress" and git_status == "open":
            return (
                f"Consider creating a progress commit or update Beads status to 'open'"
            )

        return f"Manual review needed: git={git_status}, beads={beads_status}"

    def _determine_dependency_transition(
        self, current_status: str, dependency_status: str
    ) -> Optional[str]:
        """Determine status transition based on dependency changes."""
        # If dependency is closed, dependent can be opened
        if dependency_status == "closed":
            if current_status in ["blocked", "on_hold"]:
                return "open"
            return None

        # If dependency is blocked, dependent should be blocked
        if dependency_status == "blocked":
            if current_status in ["open", "in_progress"]:
                return "blocked"
            return None

        # If dependency is in progress, blocked issues can be on hold
        if dependency_status == "in_progress":
            if current_status == "blocked":
                return "on_hold"
            return None

        # No transition needed
        return None

    def _analyze_dependency(self, issue_id: str, issues: Dict[str, Dict]) -> Dict:
        """Analyze dependency relationships for an issue."""
        visited = set()
        recursion_stack = set()
        max_depth = 0
        has_circular = False
        cycle = []

        def dfs(current_id: str, depth: int = 0) -> bool:
            nonlocal max_depth, has_circular, cycle

            if current_id in recursion_stack:
                has_circular = True
                cycle = list(recursion_stack) + [current_id]
                return True

            if current_id in visited or current_id not in issues:
                return False

            visited.add(current_id)
            recursion_stack.add(current_id)
            max_depth = max(max_depth, depth)

            for dep_id in issues[current_id].get("dependencies", []):
                if dfs(dep_id, depth + 1):
                    return True

            recursion_stack.remove(current_id)
            return False

        dfs(issue_id)

        return {
            "has_circular": has_circular,
            "cycle": cycle,
            "max_depth": max_depth,
            "dependencies": issues.get(issue_id, {}).get("dependencies", []),
        }

    def _format_issue_dependencies(self, issue: Dict) -> str:
        """Format issue dependencies for display."""
        deps = issue.get("dependencies", [])

        if not deps:
            return "No dependencies"

        # Load issues to get dependency details
        all_issues = self.load_beads_issues()
        formatted_deps = []

        for dep_id in deps:
            if dep_id in all_issues:
                dep_issue = all_issues[dep_id]
                status = dep_issue.get("status", "unknown")
                title = dep_issue.get("title", "Unknown")
                formatted_deps.append(f"- {dep_id}: {title} ({status})")
            else:
                formatted_deps.append(f"- {dep_id}: (orphaned dependency)")

        return "\n".join(formatted_deps)

    def _should_create_progress_commit(self, issue: Dict) -> bool:
        """Determine if a progress commit should be created."""
        notes = issue.get("notes", "").lower()

        # Keywords that indicate meaningful progress
        progress_keywords = [
            "working on",
            "implementing",
            "progress",
            "making good",
            "completed",
            "finished",
            "resolved",
            "fixed",
            "added",
        ]

        # Keywords that indicate no meaningful progress
        no_progress_keywords = [
            "blocked",
            "waiting",
            "on hold",
            "stuck",
            "need help",
            "investigating",
            "researching",
        ]

        # Check for progress indicators
        has_progress = any(keyword in notes for keyword in progress_keywords)
        has_no_progress = any(keyword in notes for keyword in no_progress_keywords)

        return has_progress and not has_no_progress

    def _detect_sync_conflicts(self) -> List[Dict]:
        """Detect conflicts between git and Beads states."""
        conflicts = []
        issues = self.load_beads_issues()
        git_issues = self._get_issues_from_git_commits()

        for issue_id, issue in issues.items():
            beads_status = issue.get("status", "open")
            git_status = git_issues.get(issue_id, "open")

            if beads_status != git_status:
                severity = self._assess_conflict_severity(git_status, beads_status)
                recommendation = self._get_conflict_recommendation(
                    git_status, beads_status
                )

                conflicts.append(
                    {
                        "issue_id": issue_id,
                        "type": "status_mismatch",
                        "git_status": git_status,
                        "beads_status": beads_status,
                        "severity": severity,
                        "recommendation": recommendation,
                        "last_git_commit": self._get_last_commit_for_issue(issue_id),
                    }
                )

        return conflicts


def main():
    """Enhanced CLI interface."""
    import argparse

    parser = argparse.ArgumentParser(
        description="Enhanced git automation with real-time Beads integration"
    )
    parser.add_argument(
        "action",
        choices=[
            "commit",
            "validate",
            "sync",
            "branch",
            "hook",
            "check-sync",
            "auto-commit",
            "detect-completion",
            "commit-task",
        ],
    )
    parser.add_argument("--files", nargs="+", help="Files to operate on")
    parser.add_argument("--message", help="Custom commit message")
    parser.add_argument("--dry-run", action="store_true", help="Show what would happen")
    parser.add_argument("--issue-ids", nargs="+", help="Specific issue IDs to sync")
    parser.add_argument("--version", help="Version for branch operations")
    parser.add_argument("--no-validate", action="store_true", help="Skip validation")
    parser.add_argument(
        "--strict", action="store_true", default=True, help="Strict validation mode"
    )
    parser.add_argument(
        "--hook-type", choices=["pre-commit", "post-commit"], help="Hook type to run"
    )
    parser.add_argument(
        "--auto-sync", action="store_true", help="Auto-sync out-of-sync issues"
    )
    parser.add_argument(
        "--force", action="store_true", help="Force action even if validation fails"
    )
    parser.add_argument("--issue-id", help="Specific issue ID for task operations")
    parser.add_argument(
        "--status",
        choices=["in_progress", "closed"],
        default="closed",
        help="Status to set after commit",
    )
    parser.add_argument(
        "--watch", action="store_true", help="Continuously watch for task completion"
    )
    parser.add_argument(
        "--interval", type=int, default=30, help="Watch interval in seconds"
    )
    parser.add_argument(
        "--since", default="30m", help="Time window for completion detection"
    )

    args = parser.parse_args()

    automation = GitAutomation()

    if args.action == "commit":
        # Stage files if specified
        if args.files:
            if not automation.stage_files(args.files):
                sys.exit(1)
            staged_files = args.files
        else:
            status = automation.get_git_status()
            staged_files = status["staged"]

        if not staged_files:
            print("No staged files found.")
            sys.exit(1)

        print(f"Staged files: {', '.join(staged_files)}")

        # Validate if not skipped
        if not args.no_validate:
            if not automation.enforce_atomic_commit(staged_files):
                print("Commit cancelled due to validation failures.")
                sys.exit(1)

        # Generate commit message
        commit_message, issue_ids = automation.generate_commit_message(
            staged_files, args.message
        )
        print(f"\n📝 Commit message:")
        print(commit_message)

        if args.dry_run:
            print("\n🔍 Dry run - not committing.")
            return

        # Create commit
        if automation.create_commit(commit_message):
            print("✅ Commit created successfully!")

            # Update Beads issues
            if issue_ids:
                print(f"📊 Updating {len(issue_ids)} related Beads issues...")
                if automation.update_beads_status(
                    issue_ids, "in_progress", "Committed changes"
                ):
                    print("✅ Beads issues updated.")
                else:
                    print("⚠️  Failed to update some Beads issues.")
        else:
            print("❌ Failed to create commit.")
            sys.exit(1)

    elif args.action == "validate":
        if args.files:
            files = args.files
        else:
            status = automation.get_git_status()
            files = status["staged"]

        if not files:
            print("No files to validate.")
            return

        validation = automation.validate_atomic_commit(files, strict=args.strict)

        if validation.errors:
            print("❌ Validation errors:")
            for error in validation.errors:
                print(f"  • {error}")

        if validation.warnings:
            print("⚠️  Validation warnings:")
            for warning in validation.warnings:
                print(f"  • {warning}")

        if validation.is_valid:
            print("✅ Files pass atomic commit validation.")
        else:
            print("❌ Validation failed.")
            sys.exit(1)

    elif args.action == "sync":
        if args.issue_ids:
            issue_ids = args.issue_ids
        else:
            # Get issues from recent commits
            status = automation.get_git_status()
            issue_ids = list(
                automation.extract_beads_issues_from_files(
                    status["staged"] + status["unstaged"]
                )
            )

        if not issue_ids:
            print("No Beads issues found to sync.")
            return

        print(f"Syncing {len(issue_ids)} issues...")
        if automation.update_beads_status(
            issue_ids, "in_progress", "Git sync operation"
        ):
            print("✅ Issues synced successfully.")
        else:
            print("❌ Failed to sync issues.")
            sys.exit(1)

    elif args.action == "hook":
        if not args.hook_type:
            print("Error: --hook-type required for hook action")
            sys.exit(1)

        if args.hook_type == "pre-commit":
            success = automation.run_pre_commit_hook(args.files)
        elif args.hook_type == "post-commit":
            success = automation.run_post_commit_hook()

        if not success:
            sys.exit(1)

    elif args.action == "check-sync":
        print("Checking Beads sync status...")
        sync_status = automation.check_beads_sync_status()

        if not sync_status:
            print("No issues found to check.")
            return

        synced_count = sum(1 for synced in sync_status.values() if synced)
        total_count = len(sync_status)

        print(f"Sync status: {synced_count}/{total_count} issues synced")

        out_of_sync = [
            issue_id for issue_id, synced in sync_status.items() if not synced
        ]
        if out_of_sync:
            print(f"Out of sync: {', '.join(out_of_sync)}")

            if args.auto_sync:
                print("Auto-syncing out-of-sync issues...")
                sync_results = automation.auto_sync_beads_issues()

                for issue_id, result in sync_results.items():
                    status_icon = "✅" if result == "synced" else "❌"
                    print(f"  {status_icon} {issue_id}: {result}")
        else:
            print("✅ All issues are in sync")

    elif args.action == "branch":
        if not automation.manage_branches(args.action, args.version):
            sys.exit(1)

    elif args.action == "auto-commit":
        print("🤖 Starting auto-commit process...")

        # Get completed tasks
        since_minutes = 30  # Default
        if args.since:
            # Parse time string (e.g., "5m", "1h", "30m")
            if args.since.endswith("m"):
                since_minutes = int(args.since[:-1])
            elif args.since.endswith("h"):
                since_minutes = int(args.since[:-1]) * 60

        completed_tasks = automation.detect_completed_tasks(since_minutes)

        if not completed_tasks:
            print("✅ No recently completed tasks found.")
            return

        print(f"📋 Found {len(completed_tasks)} recently completed tasks:")
        for task in completed_tasks:
            print(f"  • {task['issue_id']}: {task['issue']['title']}")

        if args.dry_run:
            print("\n🔍 Dry run - would commit these tasks:")
            for task in completed_tasks:
                result = automation.auto_commit_task(
                    task["issue_id"], status="closed", dry_run=True
                )
                print(f"  • {task['issue_id']}: {result['message']}")
            return

        # Auto-commit each task
        success_count = 0
        for task in completed_tasks:
            print(f"\n🎯 Committing {task['issue_id']}...")
            result = automation.auto_commit_task(
                task["issue_id"],
                status="closed",
                validate=not args.no_validate,
                force=args.force,
            )

            if result["success"]:
                print(f"✅ {task['issue_id']}: {result['message']}")
                success_count += 1
            else:
                print(f"❌ {task['issue_id']}: {', '.join(result['errors'])}")
                if result["warnings"]:
                    print(f"⚠️  Warnings: {', '.join(result['warnings'])}")

        print(
            f"\n📊 Auto-commit complete: {success_count}/{len(completed_tasks)} tasks committed"
        )

    elif args.action == "detect-completion":
        print("🔍 Detecting completed tasks...")

        # Parse time window
        since_minutes = 30
        if args.since:
            if args.since.endswith("m"):
                since_minutes = int(args.since[:-1])
            elif args.since.endswith("h"):
                since_minutes = int(args.since[:-1]) * 60

        completed_tasks = automation.detect_completed_tasks(since_minutes)

        if not completed_tasks:
            print("✅ No recently completed tasks found.")
            return

        print(
            f"\n📋 Found {len(completed_tasks)} completed tasks in the last {since_minutes} minutes:"
        )
        for task in completed_tasks:
            issue = task["issue"]
            completion_time = task["completion_time"].strftime("%Y-%m-%d %H:%M:%S")
            has_changes = "📝" if task["has_changes"] else "✅"
            print(f"  {has_changes} {task['issue_id']}: {issue['title']}")
            print(f"      Completed: {completion_time}")
            print(f"      Type: {issue.get('issue_type', 'task')}")
            print(f"      Priority: {issue.get('priority', 2)}")

            # Show related files
            files = automation.get_files_for_issue(task["issue_id"])
            if files:
                print(f"      Files: {', '.join(files[:5])}")
                if len(files) > 5:
                    print(f"            ... and {len(files) - 5} more")
            print()

    elif args.action == "commit-task":
        if not args.issue_id:
            print("❌ Error: --issue-id required for commit-task action")
            sys.exit(1)

        print(f"🎯 Committing task {args.issue_id}...")

        result = automation.auto_commit_task(
            args.issue_id,
            status=args.status,
            validate=not args.no_validate,
            dry_run=args.dry_run,
        )

        if result["success"]:
            print(f"✅ Task committed successfully!")
            print(f"📝 Message: {result['message']}")
            print(f"📁 Files: {', '.join(result['files_committed'])}")
            if result["commit_hash"]:
                print(f"🔗 Commit: {result['commit_hash']}")

            if result["warnings"]:
                print("⚠️  Warnings:")
                for warning in result["warnings"]:
                    print(f"  • {warning}")
        else:
            print("❌ Task commit failed!")
            print("Errors:")
            for error in result["errors"]:
                print(f"  • {error}")
            if result["warnings"]:
                print("Warnings:")
                for warning in result["warnings"]:
                    print(f"  • {warning}")
            sys.exit(1)

    elif args.action == "watch":
        print("👀 Starting task completion monitor...")
        print("Press Ctrl+C to stop monitoring")

        monitor_thread = automation.monitor_task_completion(
            interval=args.interval,
            max_duration=3600,  # 1 hour max
        )

        try:
            monitor_thread.join()
        except KeyboardInterrupt:
            print("\n🛑 Monitoring stopped by user")


if __name__ == "__main__":
    main()
