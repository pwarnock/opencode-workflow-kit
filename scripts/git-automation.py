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
from pathlib import Path
from typing import List, Dict, Tuple, Optional, Set


class GitAutomation:
    """Git automation with Beads integration."""
    
    def __init__(self, project_root: Optional[Path] = None):
        self.project_root = project_root or Path.cwd()
        self.beads_file = self.project_root / ".beads" / "issues.jsonl"
        
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
    
    def validate_atomic_commit(self, files: List[str]) -> Tuple[bool, List[str]]:
        """Validate atomic commit principles."""
        warnings = []
        
        # Check for multiple unrelated change types
        has_tasklist = any('tasklist.md' in f for f in files)
        has_code = any('.py' in f for f in files)
        has_config = any('.json' in f and 'issues.jsonl' not in f for f in files)
        has_docs = any('docs/' in f or 'README.md' in f for f in files)
        
        change_types = sum([has_tasklist, has_code, has_config, has_docs])
        
        if change_types > 1:
            warnings.append("Multiple types of changes detected - consider splitting into separate commits")
        
        # Check for version mixing
        versions = set()
        for f in files:
            match = re.search(r'v(\d+\.\d+\.\d+)/', f)
            if match:
                versions.add(match.group(1))
        
        if len(versions) > 1:
            warnings.append(f"Changes span multiple versions: {', '.join(sorted(versions))}")
        
        # Check for issue mixing
        issue_ids = self.extract_beads_issues_from_files(files)
        if len(issue_ids) > 3:
            warnings.append(f"Too many issues in one commit: {len(issue_ids)} (max 3 recommended)")
        
        return len(warnings) == 0, warnings
    
    def update_beads_status(self, issue_ids: List[str], status: str = "in_progress", notes: Optional[str] = None) -> bool:
        """Update Beads issue status."""
        try:
            for issue_id in issue_ids:
                cmd = ["bd", "update", issue_id, "--status", status, "--json"]
                if notes:
                    cmd.extend(["--notes", notes])
                
                subprocess.run(cmd, check=True, capture_output=True)
            return True
        except subprocess.CalledProcessError as e:
            print(f"Error updating Beads status: {e.stderr}")
            return False
    
    def manage_branches(self, action: str, version: Optional[str] = None) -> bool:
        """Manage version-based branches."""
        try:
            if action == "create":
                if not version:
                    print("Error: --version required for branch creation")
                    return False
                
                branch_name = f"version/{version}"
                subprocess.run(["git", "checkout", "-b", branch_name], check=True)
                print(f"Created branch: {branch_name}")
                
            elif action == "merge":
                if not version:
                    print("Error: --version required for branch merge")
                    return False
                
                branch_name = f"version/{version}"
                subprocess.run(["git", "checkout", "develop"], check=True)
                subprocess.run(["git", "merge", branch_name, "--no-ff"], check=True)
                print(f"Merged {branch_name} into develop")
                
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
    """Main CLI interface."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Git automation with Beads integration")
    parser.add_argument("action", choices=["commit", "validate", "sync", "branch"])
    parser.add_argument("--files", nargs="+", help="Files to operate on")
    parser.add_argument("--message", help="Custom commit message")
    parser.add_argument("--dry-run", action="store_true", help="Show what would happen")
    parser.add_argument("--issue-ids", nargs="+", help="Specific issue IDs to sync")
    parser.add_argument("--version", help="Version for branch operations")
    parser.add_argument("--no-validate", action="store_true", help="Skip validation")
    
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
            is_atomic, warnings = automation.validate_atomic_commit(staged_files)
            if warnings:
                print("⚠️  Commit validation warnings:")
                for warning in warnings:
                    print(f"  - {warning}")
                
                if not is_atomic:
                    response = input("Continue anyway? (y/N): ")
                    if response.lower() not in ['y', 'yes']:
                        print("Commit cancelled.")
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
        
        is_atomic, warnings = automation.validate_atomic_commit(files)
        
        if warnings:
            print("⚠️  Validation warnings:")
            for warning in warnings:
                print(f"  - {warning}")
        else:
            print("✅ Files pass atomic commit validation.")
        
        if not is_atomic:
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
    
    elif args.action == "branch":
        if not automation.manage_branches(args.action, args.version):
            sys.exit(1)


if __name__ == "__main__":
    main()