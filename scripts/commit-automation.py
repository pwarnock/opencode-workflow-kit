#!/usr/bin/env python3
"""
Automated Commit System for OpenCode Config

Provides atomic commit automation with Beads integration,
automatic commit message generation, and validation.
"""

import json
import subprocess
import sys
import re
from pathlib import Path
from typing import List, Dict, Optional, Tuple


class CommitAutomation:
    """Automated commit system with Beads integration."""
    
    def __init__(self, project_root: Optional[Path] = None):
        self.project_root = project_root or Path.cwd()
        self.beads_file = self.project_root / ".beads" / "issues.jsonl"
        
    def get_staged_files(self) -> List[str]:
        """Get list of staged files."""
        try:
            result = subprocess.run(
                ["git", "diff", "--cached", "--name-only"],
                capture_output=True, text=True, check=True
            )
            return result.stdout.strip().split('\n') if result.stdout.strip() else []
        except subprocess.CalledProcessError:
            return []
    
    def get_unstaged_files(self) -> List[str]:
        """Get list of unstaged files."""
        try:
            result = subprocess.run(
                ["git", "diff", "--name-only"],
                capture_output=True, text=True, check=True
            )
            return result.stdout.strip().split('\n') if result.stdout.strip() else []
        except subprocess.CalledProcessError:
            return []
    
    def get_beads_issues(self) -> Dict[str, Dict]:
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
    
    def extract_issue_ids_from_changes(self, files: List[str]) -> List[str]:
        """Extract Beads issue IDs from changed files."""
        issue_ids = set()
        
        # Pattern to match issue IDs in file names and content
        issue_pattern = r'opencode-config-(\d+)'
        
        for file_path in files:
            # Check file name
            match = re.search(issue_pattern, file_path)
            if match:
                issue_ids.add(f"opencode-config-{match.group(1)}")
                continue
                
            # Check file content if it's a text file
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
        
        return list(issue_ids)
    
    def generate_commit_message(self, staged_files: List[str]) -> Tuple[str, List[str]]:
        """Generate commit message based on staged changes and related issues."""
        issues = self.get_beads_issues()
        issue_ids = self.extract_issue_ids_from_changes(staged_files)
        
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
        
        # Categorize changes
        has_tasklists = any('tasklist.md' in f for f in staged_files)
        has_beads = any('issues.jsonl' in f for f in staged_files)
        has_commands = any('.cody/command/' in f for f in staged_files)
        has_agents = any('agents/cody-' in f for f in staged_files)
        has_schemas = any('schemas/' in f for f in staged_files)
        has_docs = any('docs/' in f or 'README.md' in f for f in staged_files)
        has_templates = any('templates/' in f for f in staged_files)
        
        # Generate commit message
        if len(related_issues) == 1:
            issue = related_issues[0]
            prefix = self._get_commit_prefix(issue['type'], staged_files)
            title = issue['title'].lower()
            
            commit_msg = f"{prefix}: {issue_id} {title}"
            
            # Add scope if specific
            scope = self._get_commit_scope(staged_files)
            if scope:
                commit_msg = f"{prefix}({scope}): {issue_id} {title}"
                
        else:
            # Multiple issues - use generic message
            prefix = self._get_commit_prefix('feature', staged_files)
            issue_refs = ", ".join(issue_ids)
            commit_msg = f"{prefix}: Multiple issues - {issue_refs}"
        
        # Add body with issue details
        body_lines = []
        for issue in related_issues:
            body_lines.append(f"- {issue['id']}: {issue['title']}")
        
        if body_lines:
            commit_msg += f"\n\nRelated issues:\n" + "\n".join(body_lines)
        
        return commit_msg, issue_ids
    
    def _get_commit_prefix(self, issue_type: str, files: List[str]) -> str:
        """Get conventional commit prefix based on issue type and files."""
        if any('schemas/' in f for f in files):
            return "chore"
        elif any('README.md' in f or 'docs/' in f for f in files):
            return "docs"
        elif any('.py' in f for f in files):
            return "feat"
        elif any('test' in f for f in files):
            return "test"
        elif issue_type == 'bug':
            return "fix"
        elif issue_type == 'feature':
            return "feat"
        elif issue_type == 'task':
            return "chore"
        else:
            return "feat"
    
    def _get_commit_scope(self, files: List[str]) -> Optional[str]:
        """Get commit scope based on changed files."""
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
    
    def validate_atomic_commit(self, staged_files: List[str]) -> Tuple[bool, List[str]]:
        """Validate that commit is atomic (single logical unit)."""
        warnings = []
        
        # Check for multiple unrelated changes
        has_tasklist_changes = any('tasklist.md' in f for f in staged_files)
        has_code_changes = any('.py' in f for f in staged_files)
        has_config_changes = any('.json' in f and not 'issues.jsonl' in f for f in staged_files)
        
        change_types = sum([has_tasklist_changes, has_code_changes, has_config_changes])
        
        if change_types > 1:
            warnings.append("Multiple types of changes detected - consider splitting into separate commits")
        
        # Check for version mixing
        versions = set()
        for f in staged_files:
            match = re.search(r'v(\d+\.\d+\.\d+)/', f)
            if match:
                versions.add(match.group(1))
        
        if len(versions) > 1:
            warnings.append(f"Changes span multiple versions: {', '.join(versions)}")
        
        return len(warnings) == 0, warnings
    
    def stage_files(self, files: List[str]) -> bool:
        """Stage specific files for commit."""
        try:
            subprocess.run(["git", "add"] + files, check=True)
            return True
        except subprocess.CalledProcessError as e:
            print(f"Error staging files: {e}")
            return False
    
    def create_commit(self, message: str) -> bool:
        """Create commit with generated message."""
        try:
            subprocess.run(["git", "commit", "-m", message], check=True)
            return True
        except subprocess.CalledProcessError as e:
            print(f"Error creating commit: {e}")
            return False
    
    def update_beads_status(self, issue_ids: List[str], status: str = "in_progress") -> bool:
        """Update Beads issue status after commit."""
        try:
            for issue_id in issue_ids:
                subprocess.run([
                    "bd", "update", issue_id, 
                    "--status", status,
                    "--notes", f"Committed changes for {issue_id}",
                    "--json"
                ], check=True)
            return True
        except subprocess.CalledProcessError as e:
            print(f"Error updating Beads status: {e}")
            return False


def main():
    """Main CLI interface."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Automated commit system with Beads integration")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be committed without doing it")
    parser.add_argument("--files", nargs="+", help="Specific files to stage and commit")
    parser.add_argument("--message", help="Override commit message")
    parser.add_argument("--no-validate", action="store_true", help="Skip atomic commit validation")
    
    args = parser.parse_args()
    
    automation = CommitAutomation()
    
    # Stage files if specified
    if args.files:
        if not automation.stage_files(args.files):
            sys.exit(1)
        staged_files = args.files
    else:
        staged_files = automation.get_staged_files()
    
    if not staged_files:
        print("No staged files found. Use --files to specify files or stage files first.")
        sys.exit(1)
    
    print(f"Staged files: {', '.join(staged_files)}")
    
    # Validate atomic commit
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
    if args.message:
        commit_message = args.message
        related_issues = []
    else:
        commit_message, related_issues = automation.generate_commit_message(staged_files)
    
    print(f"\n📝 Commit message:")
    print(commit_message)
    
    if args.dry_run:
        print("\n🔍 Dry run - not committing.")
        return
    
    # Create commit
    if automation.create_commit(commit_message):
        print("✅ Commit created successfully!")
        
        # Update Beads issues
        if related_issues:
            print(f"📊 Updating {len(related_issues)} related Beads issues...")
            if automation.update_beads_status(related_issues):
                print("✅ Beads issues updated.")
            else:
                print("⚠️  Failed to update some Beads issues.")
    else:
        print("❌ Failed to create commit.")
        sys.exit(1)


if __name__ == "__main__":
    main()