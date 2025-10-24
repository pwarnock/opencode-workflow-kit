#!/usr/bin/env python3
"""
Install Git Hooks

Installs git hooks for the git automation system.
"""

import os
import sys
from pathlib import Path


def install_hooks():
    """Install git hooks in the .git/hooks directory."""
    project_root = Path.cwd()
    git_dir = project_root / ".git"
    hooks_dir = git_dir / "hooks"
    
    if not git_dir.exists():
        print("Error: Not in a git repository")
        return False
    
    if not hooks_dir.exists():
        hooks_dir.mkdir(exist_ok=True)
    
    # Hook scripts to install
    hooks = {
        "pre-commit": """#!/bin/sh
# Pre-commit hook for atomic commit validation
python scripts/git-hooks.py pre-commit "$@"
""",
        "post-commit": """#!/bin/sh
# Post-commit hook for Beads synchronization
python scripts/git-hooks.py post-commit "$@"
"""
    }
    
    installed = []
    failed = []
    
    for hook_name, hook_content in hooks.items():
        hook_file = hooks_dir / hook_name
        
        try:
            # Backup existing hook if it exists
            if hook_file.exists():
                backup_file = hooks_dir / f"{hook_name}.backup"
                hook_file.rename(backup_file)
                print(f"Backed up existing {hook_name} hook to {backup_file}")
            
            # Write new hook
            hook_file.write_text(hook_content)
            hook_file.chmod(0o755)  # Make executable
            
            installed.append(hook_name)
            print(f"✅ Installed {hook_name} hook")
            
        except Exception as e:
            failed.append((hook_name, str(e)))
            print(f"❌ Failed to install {hook_name} hook: {e}")
    
    # Summary
    print(f"\nHook installation complete:")
    print(f"  ✅ Installed: {len(installed)} hooks")
    if failed:
        print(f"  ❌ Failed: {len(failed)} hooks")
        for hook_name, error in failed:
            print(f"    - {hook_name}: {error}")
    
    return len(failed) == 0


def uninstall_hooks():
    """Uninstall git hooks and restore backups if they exist."""
    project_root = Path.cwd()
    hooks_dir = project_root / ".git" / "hooks"
    
    if not hooks_dir.exists():
        print("Error: .git/hooks directory not found")
        return False
    
    hooks = ["pre-commit", "post-commit"]
    uninstalled = []
    failed = []
    
    for hook_name in hooks:
        hook_file = hooks_dir / hook_name
        backup_file = hooks_dir / f"{hook_name}.backup"
        
        try:
            # Remove installed hook
            if hook_file.exists():
                hook_file.unlink()
                uninstalled.append(hook_name)
                print(f"Removed {hook_name} hook")
            
            # Restore backup if it exists
            if backup_file.exists():
                backup_file.rename(hook_file)
                print(f"Restored backup of {hook_name} hook")
                
        except Exception as e:
            failed.append((hook_name, str(e)))
            print(f"Failed to uninstall {hook_name} hook: {e}")
    
    # Summary
    print(f"\nHook uninstallation complete:")
    print(f"  ✅ Uninstalled: {len(uninstalled)} hooks")
    if failed:
        print(f"  ❌ Failed: {len(failed)} hooks")
    
    return len(failed) == 0


def main():
    """Main CLI interface."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Install/uninstall git hooks for automation")
    parser.add_argument("action", choices=["install", "uninstall"], help="Action to perform")
    
    args = parser.parse_args()
    
    if args.action == "install":
        success = install_hooks()
    elif args.action == "uninstall":
        success = uninstall_hooks()
    else:
        print("Invalid action")
        sys.exit(1)
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()