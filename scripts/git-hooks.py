#!/usr/bin/env python3
"""
Git Hooks Integration

Provides git hook integration for the git automation system.
This script is called by git hooks to validate and sync with Beads.
"""

import sys
import subprocess
from pathlib import Path


def run_git_automation_hook(hook_type: str, *args) -> bool:
    """Run git automation hook."""
    try:
        # Get project root
        result = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            capture_output=True, text=True, check=True
        )
        project_root = Path(result.stdout.strip())
        
        # Run git automation script
        hook_script = project_root / "scripts" / "git-automation.py"
        cmd = ["python", str(hook_script), "hook", "--hook-type", hook_type]
        
        if args:
            cmd.extend(args)
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.stdout:
            print(result.stdout)
        
        if result.stderr:
            print(result.stderr, file=sys.stderr)
        
        return result.returncode == 0
        
    except subprocess.CalledProcessError as e:
        print(f"Error running git automation hook: {e}", file=sys.stderr)
        return False
    except FileNotFoundError:
        # Git automation script not found, skip hooks gracefully
        return True


def pre_commit_hook() -> bool:
    """Pre-commit hook: validate atomic commits and check Beads sync."""
    return run_git_automation_hook("pre-commit")


def post_commit_hook() -> bool:
    """Post-commit hook: sync Beads issues with new commit."""
    return run_git_automation_hook("post-commit")


def main():
    """Main hook dispatcher."""
    if len(sys.argv) < 2:
        print("Usage: git-hooks.py <hook-type> [args...]", file=sys.stderr)
        sys.exit(1)
    
    hook_type = sys.argv[1]
    
    if hook_type == "pre-commit":
        success = pre_commit_hook()
    elif hook_type == "post-commit":
        success = post_commit_hook()
    else:
        print(f"Unknown hook type: {hook_type}", file=sys.stderr)
        sys.exit(1)
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()