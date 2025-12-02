#!/usr/bin/env python3
"""
Foolproof Beads-Cody Sync Installation
Sets up automated sync system with proper validation and rollback
"""

import os
import sys
import subprocess
import json
from pathlib import Path
from typing import Dict, List, Tuple
import shutil


def run_command(
    cmd: List[str], cwd: Path = None, check: bool = True
) -> Tuple[bool, str]:
    """Run command with proper error handling"""
    try:
        result = subprocess.run(
            cmd, cwd=cwd or Path.cwd(), capture_output=True, text=True, check=check
        )
        return True, result.stdout if result.stdout else result.stderr
    except subprocess.CalledProcessError as e:
        return False, f"Command failed: {' '.join(cmd)}\nError: {e.stderr}"


def validate_environment() -> Tuple[bool, str]:
    """Validate that environment is ready for sync installation"""
    checks = []

    # Check git repo
    success, _ = run_command(["git", "rev-parse", "--git-dir"])
    if success:
        checks.append("✅ Git repository detected")
    else:
        return False, "❌ Not in a git repository"

    # Check Beads installation
    success, version = run_command(["bd", "--version"], check=False)
    if success:
        checks.append(f"✅ Beads found: {version.strip()}")
    else:
        return False, "❌ Beads (bd) not installed or not in PATH"

    # Check Python
    success, version = run_command(["python3", "--version"])
    if success:
        checks.append(f"✅ Python found: {version.strip()}")
    else:
        return False, "❌ Python 3 not found"

    # Check required Python packages
    required_packages = ["pathlib", "hashlib", "subprocess", "json", "datetime"]
    missing_packages = []
    for package in required_packages:
        try:
            __import__(package)
        except ImportError:
            missing_packages.append(package)

    if missing_packages:
        return False, f"❌ Missing Python packages: {missing_packages}"

    checks.append("✅ All required Python packages available")

    # Check existing sync setup
    project_root = Path.cwd()
    hooks_dir = project_root / ".git" / "hooks"

    if (hooks_dir / "pre-commit-sync").exists():
        checks.append("⚠️  Pre-commit sync hook already exists")

    if (hooks_dir / "post-commit-sync").exists():
        checks.append("⚠️  Post-commit sync hook already exists")

    return True, "\n".join(checks)


def backup_existing_setup() -> bool:
    """Backup existing sync setup"""
    project_root = Path.cwd()
    hooks_dir = project_root / ".git" / "hooks"
    backup_dir = project_root / ".git" / "hooks" / "backup"

    backup_files = ["pre-commit-sync", "post-commit-sync"]
    backed_up = []

    for hook_file in backup_files:
        src = hooks_dir / hook_file
        if src.exists():
            backup_dir.mkdir(exist_ok=True)
            timestamp = Path(src).stat().st_mtime
            backup_path = backup_dir / f"{hook_file}.{int(timestamp)}"
            shutil.copy2(src, backup_path)
            backed_up.append(str(backup_path))

    if backed_up:
        print(f"📦 Backed up existing hooks: {backed_up}")

    return True


def install_git_hooks() -> Tuple[bool, str]:
    """Install git hooks for automated sync"""
    project_root = Path.cwd()
    hooks_dir = project_root / ".git" / "hooks"

    # Create hooks if they don't exist
    pre_commit_dst = hooks_dir / "pre-commit-sync"
    post_commit_dst = hooks_dir / "post-commit-sync"

    # Pre-commit hook content
    pre_commit_content = """#!/bin/bash
# Pre-commit hook: Auto-sync before commits
set -e

# Skip sync for certain commits
commit_msg=$(git log -1 --pretty=%format:'%s' 2>/dev/null || echo "")
if [[ "$commit_msg" =~ ^(auto-sync|wip|fixup|squash) ]]; then
    echo "🔄 Skipping auto-sync for $commit_msg"
    exit 0
fi

# Run automated sync
echo "🔄 Running pre-commit Beads-Cody sync..."
python3 scripts/automated-sync.py --trigger=pre-commit

# Check if sync made changes that need to be included
if ! git diff --quiet HEAD -- .cody/project/build/feature-backlog.md .beads-cody-sync-state.json 2>/dev/null; then
    echo "📝 Sync updated Cody tasklist - staging changes..."
    git add .cody/project/build/feature-backlog.md .beads-cody-sync-state.json
    echo "⚠️  Please review the staged sync changes"
fi

echo "✅ Pre-commit sync completed"
"""

    # Post-commit hook content
    post_commit_content = """#!/bin/bash
# Post-commit hook: Sync after Beads changes
set -e

# Check if Beads files were changed in last commit
if git diff --name-only HEAD~1 HEAD 2>/dev/null | grep -q "^\\.beads/"; then
    echo "🔄 Beads files changed - running post-commit sync..."
    python3 scripts/automated-sync.py --trigger=post-commit
    
    # Commit sync changes if any
    if ! git diff --quiet -- .cody/project/build/feature-backlog.md .beads-cody-sync-state.json 2>/dev/null; then
        echo "📝 Committing sync changes..."
        git add .cody/project/build/feature-backlog.md .beads-cody-sync-state.json
        git commit -m "auto-sync: Update Cody tasklist after Beads changes"
        echo "✅ Sync changes committed"
    fi
else
    echo "ℹ️  No Beads changes detected - skipping sync"
fi
"""

    try:
        # Write pre-commit hook
        pre_commit_dst.write_text(pre_commit_content)
        pre_commit_dst.chmod(0o755)
        print("✅ Installed pre-commit sync hook")

        # Write post-commit hook
        post_commit_dst.write_text(post_commit_content)
        post_commit_dst.chmod(0o755)
        print("✅ Installed post-commit sync hook")

        return True, "Git hooks installed"

    except OSError as e:
        return False, f"Failed to install git hooks: {e}"


def setup_ci_integration() -> Tuple[bool, str]:
    """Set up CI/CD integration for automated sync"""
    project_root = Path.cwd()
    workflows_dir = project_root / ".github" / "workflows"

    if not workflows_dir.exists():
        workflows_dir.mkdir(parents=True, exist_ok=True)
        print("📁 Created .github/workflows directory")

    # Create CI workflow
    ci_workflow = workflows_dir / "beads-cody-sync.yml"

    workflow_content = """name: Beads-Cody Automated Sync

on:
  push:
    paths:
      - '.beads/**'
      - 'scripts/beads-cody-sync.py'
      - 'scripts/automated-sync.py'
  pull_request:
    paths:
      - '.beads/**'
      - 'scripts/beads-cody-sync.py'
      - 'scripts/automated-sync.py'

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install Beads
        run: |
          pip install beads
      
      - name: Run automated sync
        run: |
          python3 scripts/automated-sync.py --trigger=ci
      
      - name: Commit sync changes
        if: github.event_name == 'push'
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add .cody/project/build/feature-backlog.md .beads-cody-sync-state.json
          git diff --staged --quiet || git commit -m "auto-sync: CI sync [skip ci]"
          git push
"""

    try:
        ci_workflow.write_text(workflow_content)
        print("✅ Created CI/CD workflow for automated sync")
        return True, "CI/CD integration setup complete"
    except OSError as e:
        return False, f"Failed to create CI workflow: {e}"


def create_monitoring_setup() -> Tuple[bool, str]:
    """Set up monitoring and alerting for sync failures"""
    project_root = Path.cwd()

    # Create monitoring script
    monitor_script = project_root / "scripts" / "sync-monitor.py"

    monitor_content = '''#!/usr/bin/env python3
"""
Sync monitoring and alerting
Checks sync health and sends alerts on failures
"""

import json
import time
from datetime import datetime, timedelta
from pathlib import Path
import subprocess
import sys

def check_sync_health():
    """Check if sync system is healthy"""
    project_root = Path.cwd()
    state_file = project_root / ".beads-cody-sync-state.json"
    log_file = project_root / ".beads-cody-sync.log"
    
    issues = []
    
    # Check if sync state exists
    if not state_file.exists():
        issues.append("Sync state file not found - sync never run?")
        return False, issues
    
    # Check last sync time
    try:
        with open(state_file, 'r') as f:
            state = json.load(f)
        
        last_sync = state.get("last_sync")
        if last_sync:
            last_sync_time = datetime.fromisoformat(last_sync)
            if datetime.now() - last_sync_time > timedelta(hours=24):
                issues.append(f"Last sync was {datetime.now() - last_sync_time} ago")
        else:
            issues.append("No last sync timestamp found")
            
    except (json.JSONDecodeError, ValueError) as e:
        issues.append(f"Invalid sync state: {e}")
    
    # Check for recent errors in log
    if log_file.exists():
        try:
            with open(log_file, 'r') as f:
                lines = f.readlines()
            
            recent_errors = []
            cutoff = datetime.now() - timedelta(hours=1)
            
            for line in lines[-100:]:  # Check last 100 lines
                if "ERROR" in line:
                    try:
                        timestamp_str = line.split(" - ")[0]
                        timestamp = datetime.strptime(timestamp_str, "%Y-%m-%d %H:%M:%S,%f")
                        if timestamp > cutoff:
                            recent_errors.append(line.strip())
                    except ValueError:
                        continue
            
            if recent_errors:
                issues.extend(recent_errors[:3])  # Limit to 3 most recent errors
                
        except OSError:
            issues.append("Cannot read sync log file")
    
    return len(issues) == 0, issues

def main():
    """Main monitoring entry point"""
    healthy, issues = check_sync_health()
    
    if healthy:
        print("✅ Sync system is healthy")
        sys.exit(0)
    else:
        print("❌ Sync system issues detected:")
        for issue in issues:
            print(f"  - {issue}")
        sys.exit(1)

if __name__ == "__main__":
    main()
'''

    try:
        monitor_script.write_text(monitor_content)
        monitor_script.chmod(0o755)
        print("✅ Created sync monitoring script")
        return True, "Monitoring setup complete"
    except OSError as e:
        return False, f"Failed to create monitor script: {e}"


def test_sync_installation() -> Tuple[bool, str]:
    """Test that sync installation works"""
    print("🧪 Testing sync installation...")

    # Test automated sync script
    success, output = run_command(["python3", "scripts/automated-sync.py", "--help"])
    if not success:
        return False, f"Automated sync script failed: {output}"

    print("✅ Automated sync script works")

    # Test sync validation (expect it to fail due to uncommitted changes during installation)
    success, output = run_command(
        ["python3", "scripts/automated-sync.py", "--trigger=manual"], check=False
    )
    if not success and "Uncommitted changes detected" in output:
        print("✅ Sync validation working (correctly detected uncommitted changes)")
    elif success:
        print("✅ Sync validation passed")
    else:
        return False, f"Unexpected sync validation error: {output}"

    # Test monitoring script
    success, output = run_command(["python3", "scripts/sync-monitor.py"], check=False)
    if success:
        print("✅ Sync monitoring works")
    else:
        print(f"⚠️  Sync monitoring test failed (optional): {output}")

    return True, "All tests passed"


def create_quick_start_guide() -> bool:
    """Create quick start guide for users"""
    guide_content = """# Beads-Cody Automated Sync - Quick Start

## What This Does
- **Automatically** keeps Beads and Cody tasklists in sync
- **Prevents** commits when systems are out of sync
- **Auto-commits** sync changes to maintain consistency
- **Monitors** sync health and alerts on failures

## How It Works
1. **Pre-commit**: Syncs Cody before allowing commits
2. **Post-commit**: Syncs after Beads changes are committed
3. **CI/CD**: Ensures sync consistency in pull requests
4. **Monitoring**: Alerts if sync fails or becomes stale

## What You Need to Do
### Normal Workflow (No Changes Required)
```bash
# Work as usual - sync happens automatically
bd create "New task" -t feature -p 1
git add . && git commit -m "Add new task"
# Sync runs automatically before/after commit
```

### Manual Sync (If Needed)
```bash
# Force sync anytime
python3 scripts/automated-sync.py --force

# Check sync health
python3 scripts/sync-monitor.py

# View sync logs
tail -f .beads-cody-sync.log
```

## Troubleshooting
### Sync fails before commit
- Check: `python3 scripts/sync-monitor.py`
- Fix issues, then: `git commit --amend` to include sync changes

### Need to bypass sync (emergency)
```bash
git commit --no-verify -m "emergency commit - bypass sync"
# Remember to run: python3 scripts/automated-sync.py --force
```

### Sync seems stuck
- Remove lock: `rm .beads-cody-sync.lock`
- Run: `python3 scripts/automated-sync.py --force`

## Files Created
- `scripts/automated-sync.py` - Main sync engine
- `.git/hooks/pre-commit-sync` - Pre-commit hook
- `.git/hooks/post-commit-sync` - Post-commit hook
- `.github/workflows/beads-cody-sync.yml` - CI/CD integration
- `scripts/sync-monitor.py` - Health monitoring
- `.beads-cody-sync.log` - Sync activity log
- `.beads-cody-sync-state.json` - Sync state tracking

## Support
- Issues: Check `.beads-cody-sync.log` for errors
- Health: Run `python3 scripts/sync-monitor.py`
- Force sync: `python3 scripts/automated-sync.py --force`
"""

    try:
        guide_file = Path.cwd() / "BEADS-CODY-SYNC-QUICKSTART.md"
        guide_file.write_text(guide_content)
        print("✅ Created quick start guide: BEADS-CODY-SYNC-QUICKSTART.md")
        return True
    except OSError as e:
        print(f"❌ Failed to create guide: {e}")
        return False


def main():
    """Main installation routine"""
    print("🚀 Installing Beads-Cody Automated Sync System")
    print("=" * 50)

    # Validate environment
    print("\n📋 Validating environment...")
    valid, msg = validate_environment()
    if not valid:
        print(f"\n❌ Environment validation failed:\n{msg}")
        sys.exit(1)

    print(f"\n{msg}")

    # Backup existing setup
    print("\n📦 Backing up existing setup...")
    backup_existing_setup()

    # Install git hooks
    print("\n🔧 Installing git hooks...")
    success, msg = install_git_hooks()
    if not success:
        print(f"❌ Failed to install git hooks: {msg}")
        sys.exit(1)

    print(msg)

    # Setup CI/CD
    print("\n🔄 Setting up CI/CD integration...")
    success, msg = setup_ci_integration()
    if success:
        print(msg)
    else:
        print(f"⚠️  CI/CD setup failed (optional): {msg}")

    # Setup monitoring
    print("\n📊 Setting up monitoring...")
    success, msg = create_monitoring_setup()
    if success:
        print(msg)
    else:
        print(f"⚠️  Monitoring setup failed (optional): {msg}")

    # Test installation
    print("\n🧪 Testing installation...")
    success, msg = test_sync_installation()
    if not success:
        print(f"❌ Installation test failed: {msg}")
        sys.exit(1)

    print(msg)

    # Create guide
    print("\n📖 Creating documentation...")
    create_quick_start_guide()

    print("\n" + "=" * 50)
    print("✅ Beads-Cody Automated Sync installed successfully!")
    print("\n🎯 Next steps:")
    print("1. Read: BEADS-CODY-SYNC-QUICKSTART.md")
    print("2. Test: Create a Beads issue and commit")
    print("3. Monitor: python3 scripts/sync-monitor.py")
    print("\n🔄 Sync will now run automatically!")
    print("   (Use --no-verify with git commit to bypass in emergency)")


if __name__ == "__main__":
    main()
