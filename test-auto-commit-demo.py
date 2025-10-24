#!/usr/bin/env python3
"""
Demo script to test auto-commit functionality
"""

import subprocess
import sys
from pathlib import Path

def run_command(cmd, description):
    """Run a command and show results"""
    print(f"\n🔧 {description}")
    print(f"Command: {' '.join(cmd)}")
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        print("✅ Success:")
        print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print("❌ Error:")
        print(e.stderr)
        return False

def main():
    """Demo the auto-commit workflow"""
    print("🚀 Auto-Commit Workflow Demo")
    print("=" * 50)
    
    # Test 1: Detect completion
    run_command([
        "uv", "run", "python", "scripts/git-automation.py", 
        "detect-completion", "--since", "24h"
    ], "Detect completed tasks in last 24 hours")
    
    # Test 2: Show git status
    run_command([
        "uv", "run", "python", "scripts/git-automation.py", 
        "validate"
    ], "Validate current changes")
    
    # Test 3: Show available commands
    print("\n📚 Available Auto-Commit Commands:")
    print("1. detect-completion --since [time]  # Find recently completed tasks")
    print("2. auto-commit --dry-run --since [time]  # Auto-commit completed tasks")
    print("3. commit-task --issue-id [ID] --dry-run  # Commit specific task")
    print("4. commit-task --issue-id [ID] --status closed  # Commit and close task")
    
    print("\n💡 Usage Examples:")
    print("# Detect tasks completed in last hour:")
    print("uv run python scripts/git-automation.py detect-completion --since 1h")
    print()
    print("# Auto-commit completed tasks (dry run):")
    print("uv run python scripts/git-automation.py auto-commit --dry-run")
    print()
    print("# Commit specific task:")
    print("uv run python scripts/git-automation.py commit-task --issue-id opencode-config-13")

if __name__ == "__main__":
    main()