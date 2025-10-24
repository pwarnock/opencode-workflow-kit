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
        
        # Initialize atomic commit rules
        self.atomic_rules = self._initialize_atomic_rules()
        
    def get_git_status(self) -> Dict[str, List[str]]:
        """Get current git status."""
        try:
            result = subprocess.run(
                ["git", "status", "--porcelain"],
                capture_output=True, text=True, check=True
            )
            
            staged = []
            unstaged = []
            untracked = []
            
            for line in result.stdout.strip().split('\n'):
                if not line:
                    continue
                    
                status = line[:2]
                file_path = line[3:]
                
                if status[0] in ['A', 'M', 'D', 'R', 'C']:
                    staged.append(file_path)
                if status[1] in ['M', 'D']:
                    unstaged.append(file_path)
                if status == '??':
                    untracked.append(file_path)
            
            return {
                'staged': staged,
                'unstaged': unstaged,
                'untracked': untracked
            }
        except subprocess.CalledProcessError:
            return {'staged': [], 'unstaged': [], 'untracked': []}
    
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
            subprocess.run(["git", "commit", "-m", message], check=True, capture_output=True)
            return True
        except subprocess.CalledProcessError as e:
            print(f"Error creating commit: {e.stderr}")
            return False
    
    def extract_beads_issues_from_files(self, files: List[str]) -> Set[str]:
        """Extract Beads issue IDs from file names and content."""
        issue_ids = set()
        issue_pattern = r'opencode-config-(\d+)'
        
        for file_path in files:
            # Check file name
            match = re.search(issue_pattern, file_path)
            if match:
                issue_ids.add(f"opencode-config-{match.group(1)}")
                continue
            
            # Check file content
            full_path = self.project_root / file_path
            if full_path.exists() and full_path.suffix in ['.md', '.py', '.json', '.yml', '.yaml']:
                try:
                    with open(full_path, 'r', encoding='utf-8') as f:
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
            with open(self.beads_file, 'r') as f:
                for line in f:
                    if line.strip():
                        issue = json.loads(line)
                        issues[issue['id']] = issue
        except Exception as e:
            print(f"Warning: Could not read Beads issues: {e}")
            
        return issues
    
    def generate_commit_message(self, files: List[str], custom_message: Optional[str] = None) -> Tuple[str, List[str]]:
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
                related_issues.append({
                    'id': issue_id,
                    'title': issue['title'],
                    'type': issue.get('issue_type', 'task'),
                    'priority': issue.get('priority', 2)
                })
        
        # Determine commit type and scope
        commit_type = self._determine_commit_type(files)
        scope = self._determine_scope(files)
        
        # Generate message
        if len(related_issues) == 1:
            issue = related_issues[0]
            title = issue['title'].lower()
            
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
        if any('test' in f for f in files):
            return "test"
        elif any('README.md' in f or 'docs/' in f for f in files):
            return "docs"
        elif any('.py' in f and 'test' not in f for f in files):
            return "feat"
        elif any('schemas/' in f for f in files):
            return "chore"
        elif any('fix' in f or 'bug' in f for f in files):
            return "fix"
        else:
            return "feat"
    
    def _determine_scope(self, files: List[str]) -> Optional[str]:
        """Determine commit scope."""
        if any('tasklist.md' in f for f in files):
            return "tasklist"
        elif any('.cody/' in f for f in files):
            return "cody"
        elif any('agents/' in f for f in files):
            return "agents"
        elif any('templates/' in f for f in files):
            return "templates"
        elif any('schemas/' in f for f in files):
            return "schemas"
        elif any('scripts/' in f for f in files):
            return "scripts"
        return None
    
    def _initialize_atomic_rules(self) -> List[AtomicCommitRule]:
        """Initialize atomic commit validation rules."""
        rules = []
        
        # Rule: Single issue per commit
        def single_issue_rule(files: List[str], issues: Dict[str, Dict]) -> ValidationResult:
            issue_ids = self.extract_beads_issues_from_files(files)
            if len(issue_ids) > 1:
                return ValidationResult(
                    is_valid=False,
                    warnings=[],
                    errors=[f"Multiple issues detected: {', '.join(issue_ids)}. Atomic commits should address one issue at a time."]
                )
            return ValidationResult(is_valid=True, warnings=[], errors=[])
        
        # Rule: No unrelated change types
        def unrelated_changes_rule(files: List[str], issues: Dict[str, Dict]) -> ValidationResult:
            change_types = {
                'tasklist': any('tasklist.md' in f for f in files),
                'code': any('.py' in f for f in files),
                'config': any('.json' in f and 'issues.jsonl' not in f for f in files),
                'docs': any('docs/' in f or 'README.md' in f for f in files),
                'test': any('test' in f for f in files)
            }
            
            active_types = [k for k, v in change_types.items() if v]
            
            if len(active_types) > 2:  # Allow code + test combination
                return ValidationResult(
                    is_valid=False,
                    warnings=[],
                    errors=[f"Unrelated change types detected: {', '.join(active_types)}. Consider splitting into separate commits."]
                )
            return ValidationResult(is_valid=True, warnings=[], errors=[])
        
        # Rule: No version mixing
        def version_mixing_rule(files: List[str], issues: Dict[str, Dict]) -> ValidationResult:
            versions = set()
            for f in files:
                match = re.search(r'v(\d+\.\d+\.\d+)/', f)
                if match:
                    versions.add(match.group(1))
            
            if len(versions) > 1:
                return ValidationResult(
                    is_valid=False,
                    warnings=[],
                    errors=[f"Changes span multiple versions: {', '.join(sorted(versions))}. Each commit should target a single version."]
                )
            return ValidationResult(is_valid=True, warnings=[], errors=[])
        
        # Rule: Issue dependency validation
        def dependency_rule(files: List[str], issues: Dict[str, Dict]) -> ValidationResult:
            issue_ids = self.extract_beads_issues_from_files(files)
            warnings = []
            
            for issue_id in issue_ids:
                if issue_id in issues:
                    issue = issues[issue_id]
                    deps = issue.get('dependencies', [])
                    
                    for dep in deps:
                        if dep in issues:
                            dep_issue = issues[dep]
                            if dep_issue.get('status') != 'closed':
                                warnings.append(f"Issue {issue_id} depends on unclosed issue {dep}")
            
            return ValidationResult(is_valid=True, warnings=warnings, errors=[])
        
        rules.extend([
            AtomicCommitRule("single_issue", "One issue per commit", single_issue_rule),
            AtomicCommitRule("unrelated_changes", "No unrelated change types", unrelated_changes_rule),
            AtomicCommitRule("version_mixing", "No version mixing", version_mixing_rule),
            AtomicCommitRule("dependencies", "Issue dependencies", dependency_rule)
        ])
        
        return rules
    
    def validate_atomic_commit(self, files: List[str], strict: bool = True) -> ValidationResult:
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
        
        return ValidationResult(is_valid=is_valid, warnings=all_warnings, errors=all_errors)
    
    def update_beads_status(self, issue_ids: List[str], status: str = "in_progress", notes: Optional[str] = None) -> bool:
        """Update Beads issue status with retry logic."""
        max_retries = 3
        for attempt in range(max_retries):
            try:
                for issue_id in issue_ids:
                    cmd = ["bd", "update", issue_id, "--status", status, "--json"]
                    if notes:
                        cmd.extend(["--notes", notes])
                    
                    result = subprocess.run(cmd, check=True, capture_output=True, text=True)
                    
                    # Verify the update was successful
                    updated_issue = json.loads(result.stdout)
                    if updated_issue.get('status') != status:
                        raise subprocess.CalledProcessError(1, cmd, f"Status update verification failed")
                
                return True
            except subprocess.CalledProcessError as e:
                if attempt == max_retries - 1:
                    print(f"Error updating Beads status after {max_retries} attempts: {e.stderr}")
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
                capture_output=True, text=True, check=True
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
                capture_output=True, text=True, check=True
            )
            recent_commits = result.stdout.strip().split('\n')
        except subprocess.CalledProcessError:
            return sync_status
        
        for commit_hash in recent_commits:
            if not commit_hash:
                continue
                
            # Get files changed in this commit
            try:
                result = subprocess.run(
                    ["git", "show", "--name-only", "--format=", commit_hash],
                    capture_output=True, text=True, check=True
                )
                files = result.stdout.strip().split('\n')
                issue_ids = self.extract_beads_issues_from_files(files)
                
                for issue_id in issue_ids:
                    if issue_id in issues:
                        issue = issues[issue_id]
                        # Check if issue notes contain this commit
                        notes = issue.get('notes', '')
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
                        capture_output=True, text=True, check=True
                    )
                    commit_hash = result.stdout.strip()
                    
                    if commit_hash:
                        # Get commit details
                        result = subprocess.run(
                            ["git", "log", "--format=%s", "-n", "1", commit_hash],
                            capture_output=True, text=True, check=True
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
            files = status['staged']
        
        if not files:
            return True  # Nothing to validate
        
        print("🔍 Running pre-commit validation...")
        
        # Atomic commit validation
        if not self.enforce_atomic_commit(files):
            return False
        
        # Beads sync check
        sync_status = self.check_beads_sync_status()
        out_of_sync = [issue_id for issue_id, synced in sync_status.items() if not synced]
        
        if out_of_sync:
            print(f"⚠️  {len(out_of_sync)} Beads issues out of sync: {', '.join(out_of_sync)}")
            try:
                response = input("Auto-sync these issues? (y/N): ")
                if response.lower() in ['y', 'yes']:
                    sync_results = self.auto_sync_beads_issues()
                    synced = [k for k, v in sync_results.items() if v == "synced"]
                    if synced:
                        print(f"✅ Synced {len(synced)} issues")
            except EOFError:
                # Non-interactive mode, just warn
                print("Note: Run with --auto-sync to automatically sync in non-interactive mode")
        
        print("✅ Pre-commit validation passed")
        return True
    
    def run_post_commit_hook(self) -> bool:
        """Post-commit hook actions."""
        try:
            # Get latest commit hash
            result = subprocess.run(
                ["git", "rev-parse", "HEAD"],
                capture_output=True, text=True, check=True
            )
            commit_hash = result.stdout.strip()
            
            # Get files changed in latest commit
            result = subprocess.run(
                ["git", "show", "--name-only", "--format=", commit_hash],
                capture_output=True, text=True, check=True
            )
            files = result.stdout.strip().split('\n')
            
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
                    capture_output=True, text=True
                )
                if result.stdout.strip():
                    print(f"Branch {branch_name} already exists")
                    return False
                
                subprocess.run(["git", "checkout", "-b", branch_name], check=True)
                print(f"Created branch: {branch_name}")
                
                # Create corresponding Beads issue if it doesn't exist
                issue_id = f"opencode-config-{int(time.time())}"
                try:
                    subprocess.run([
                        "bd", "create", f"Version {version} development", 
                        "-t", "epic", "-p", "1",
                        "--json"
                    ], check=True, capture_output=True)
                    print(f"Created Beads issue for version {version}")
                except subprocess.CalledProcessError:
                    print("Note: Could not create Beads issue (bd command may not be available)")
                
            elif action == "merge":
                if not version:
                    print("Error: --version required for branch merge")
                    return False
                
                branch_name = f"version/{version}"
                
                # Validate branch exists
                result = subprocess.run(
                    ["git", "branch", "--list", branch_name],
                    capture_output=True, text=True
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
                    ["git", "branch", "-a"],
                    capture_output=True, text=True, check=True
                )
                version_branches = []
                for line in result.stdout.split('\n'):
                    if 'version/' in line:
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


def main():
    """Enhanced CLI interface."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Enhanced git automation with real-time Beads integration")
    parser.add_argument("action", choices=["commit", "validate", "sync", "branch", "hook", "check-sync"])
    parser.add_argument("--files", nargs="+", help="Files to operate on")
    parser.add_argument("--message", help="Custom commit message")
    parser.add_argument("--dry-run", action="store_true", help="Show what would happen")
    parser.add_argument("--issue-ids", nargs="+", help="Specific issue IDs to sync")
    parser.add_argument("--version", help="Version for branch operations")
    parser.add_argument("--no-validate", action="store_true", help="Skip validation")
    parser.add_argument("--strict", action="store_true", default=True, help="Strict validation mode")
    parser.add_argument("--hook-type", choices=["pre-commit", "post-commit"], help="Hook type to run")
    parser.add_argument("--auto-sync", action="store_true", help="Auto-sync out-of-sync issues")
    
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
            staged_files = status['staged']
        
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
        commit_message, issue_ids = automation.generate_commit_message(staged_files, args.message)
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
                if automation.update_beads_status(issue_ids, "in_progress", "Committed changes"):
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
            files = status['staged']
        
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
            issue_ids = list(automation.extract_beads_issues_from_files(
                status['staged'] + status['unstaged']
            ))
        
        if not issue_ids:
            print("No Beads issues found to sync.")
            return
        
        print(f"Syncing {len(issue_ids)} issues...")
        if automation.update_beads_status(issue_ids, "in_progress", "Git sync operation"):
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
        
        out_of_sync = [issue_id for issue_id, synced in sync_status.items() if not synced]
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


if __name__ == "__main__":
    main()