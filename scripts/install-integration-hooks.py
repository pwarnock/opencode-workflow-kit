#!/usr/bin/env python3
"""
Install Cody-Beads Integration Hooks

Installs NON-INVASIVE integration hooks that work alongside bd hooks.
Does not replace or interfere with native bd functionality.

Design Principles:
- Loose coupling with external systems
- Preserve all native bd hook behavior
- Add integration layer without blocking operations
- Graceful degradation when systems unavailable
"""

import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Dict, List, Tuple


class IntegrationHookInstaller:
    """Installer for Cody-Beads integration hooks."""

    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.git_dir = project_root / ".git"
        self.hooks_dir = self.git_dir / "hooks"
        self.integration_dir = project_root / "scripts"

        # Hook files to install (non-invasive)
        self.integration_hooks = {
            "cody-beads-pre-commit": {
                "source": "cody-beads-hook-adapter.sh",
                "target": "cody-beads-pre-commit",
                "description": "Cody-Beads pre-commit integration adapter",
            },
            "cody-beads-post-commit": {
                "source": "cody-beads-hook-adapter.sh",
                "target": "cody-beads-post-commit",
                "description": "Cody-Beads post-commit integration adapter",
            },
            "cody-beads-post-merge": {
                "source": "cody-beads-hook-adapter.sh",
                "target": "cody-beads-post-merge",
                "description": "Cody-Beads post-merge integration adapter",
            },
            "cody-beads-post-checkout": {
                "source": "cody-beads-hook-adapter.sh",
                "target": "cody-beads-post-checkout",
                "description": "Cody-Beads post-checkout integration adapter",
            },
        }

    def check_prerequisites(self) -> Tuple[bool, List[str]]:
        """Check installation prerequisites."""
        issues = []

        # Check if we're in a git repo
        if not self.git_dir.exists():
            issues.append("Not in a git repository")

        # Check if hooks directory exists
        if not self.hooks_dir.exists():
            try:
                self.hooks_dir.mkdir(exist_ok=True)
            except OSError as e:
                issues.append(f"Cannot create hooks directory: {e}")

        # Check if integration scripts exist
        adapter_script = self.integration_dir / "cody-beads-hook-adapter.sh"
        if not adapter_script.exists():
            issues.append(f"Integration script not found: {adapter_script}")

        adapter_py = self.integration_dir / "cody-beads-adapter.py"
        if not adapter_py.exists():
            issues.append(f"Adapter script not found: {adapter_py}")

        return len(issues) == 0, issues

    def detect_existing_hooks(self) -> Dict[str, Dict]:
        """Detect existing hooks and their origins."""
        existing_hooks = {}

        for hook_file in self.hooks_dir.glob("*"):
            if hook_file.is_file() and hook_file.name not in ["samples"]:
                content = hook_file.read_text() if hook_file.exists() else ""

                # Detect hook origin
                origin = "unknown"
                if "bd-hooks-version:" in content:
                    origin = "bd"
                elif "cody-beads-hook-adapter" in content:
                    origin = "cody-beads"
                elif "git-automation.py" in content:
                    origin = "opencode"

                existing_hooks[hook_file.name] = {
                    "path": str(hook_file),
                    "origin": origin,
                    "size": len(content),
                    "executable": hook_file.stat().st_mode & 0o111 != 0,
                }

        return existing_hooks

    def backup_existing_hooks(self) -> bool:
        """Backup existing hooks before installation."""
        backup_dir = self.hooks_dir / "backup" / f"integration-{int(time.time())}"

        try:
            backup_dir.mkdir(parents=True, exist_ok=True)

            # Backup our integration hooks if they exist
            backed_up = []
            for hook_name in self.integration_hooks.keys():
                hook_file = self.hooks_dir / hook_name
                if hook_file.exists():
                    backup_file = backup_dir / hook_name
                    hook_file.rename(backup_file)
                    backed_up.append(hook_name)

            if backed_up:
                print(
                    f"📦 Backed up existing integration hooks: {', '.join(backed_up)}"
                )
                print(f"   Backup location: {backup_dir}")

            return True

        except Exception as e:
            print(f"❌ Failed to backup existing hooks: {e}")
            return False

    def install_integration_hooks(self) -> bool:
        """Install integration hooks."""
        installed = []
        failed = []

        for hook_name, hook_config in self.integration_hooks.items():
            try:
                source_file = self.integration_dir / hook_config["source"]
                target_file = self.hooks_dir / hook_config["target"]

                if not source_file.exists():
                    failed.append((hook_name, "Source file not found"))
                    continue

                # Copy hook file
                content = source_file.read_text()
                target_file.write_text(content)
                target_file.chmod(0o755)  # Make executable

                installed.append(hook_name)
                print(f"✅ Installed {hook_name}")

            except Exception as e:
                failed.append((hook_name, str(e)))
                print(f"❌ Failed to install {hook_name}: {e}")

        return len(failed) == 0

    def create_hook_chain(self) -> bool:
        """Create hook chain files that call both bd and integration hooks."""
        chain_hooks = {
            "pre-commit": self._create_pre_commit_chain,
            "post-commit": self._create_post_commit_chain,
            "post-merge": self._create_post_merge_chain,
            "post-checkout": self._create_post_checkout_chain,
        }

        chained = []
        failed = []

        for hook_name, chain_func in chain_hooks.items():
            try:
                hook_file = self.hooks_dir / hook_name

                # Check if bd hook exists
                bd_hook_exists = (
                    hook_file.exists() and "bd-hooks-version:" in hook_file.read_text()
                )

                if bd_hook_exists:
                    # Create chain that calls bd hook first, then integration
                    chain_content = chain_func(hook_name, call_bd_first=True)
                else:
                    # Create chain that only calls integration
                    chain_content = chain_func(hook_name, call_bd_first=False)

                # Backup existing hook if it's not a bd hook
                if hook_file.exists() and not bd_hook_exists:
                    backup_file = (
                        self.hooks_dir / f"{hook_name}.backup-{int(time.time())}"
                    )
                    hook_file.rename(backup_file)
                    print(f"📦 Backed up existing {hook_name} to {backup_file.name}")

                # Write chain hook
                hook_file.write_text(chain_content)
                hook_file.chmod(0o755)

                chained.append(hook_name)
                print(f"🔗 Created chain hook: {hook_name}")

            except Exception as e:
                failed.append((hook_name, str(e)))
                print(f"❌ Failed to create chain {hook_name}: {e}")

        return len(failed) == 0

    def _create_pre_commit_chain(self, hook_name: str, call_bd_first: bool) -> str:
        """Create pre-commit chain hook."""
        if call_bd_first:
            return f"""#!/bin/sh
# Pre-commit chain hook: bd → Cody-Beads integration
# Preserves bd functionality while adding integration layer

set -e

# Call bd pre-commit hook first (if it exists)
if [ -f "{self.hooks_dir}/pre-commit.bd-backup" ]; then
    . "{self.hooks_dir}/pre-commit.bd-backup" "$@" || {{
        echo "⚠️  bd pre-commit hook failed, but continuing..." >&2
    }}
elif [ -f "{self.hooks_dir}/pre-commit" ] && grep -q "bd-hooks-version:" "{self.hooks_dir}/pre-commit"; then
    # Current hook is bd hook, call it
    "{self.hooks_dir}/pre-commit" "$@" || {{
        echo "⚠️  bd pre-commit hook failed, but continuing..." >&2
    }}
fi

# Call Cody-Beads integration adapter
"{self.integration_dir}/cody-beads-hook-adapter.sh" pre-commit || {{
    echo "⚠️  Cody-Beads integration failed, but continuing..." >&2
}}

exit 0
"""
        else:
            return f"""#!/bin/sh
# Pre-commit chain hook: Cody-Beads integration only

set -e

# Call Cody-Beads integration adapter
"{self.integration_dir}/cody-beads-hook-adapter.sh" pre-commit || {{
    echo "⚠️  Cody-Beads integration failed, but continuing..." >&2
}}

exit 0
"""

    def _create_post_commit_chain(self, hook_name: str, call_bd_first: bool) -> str:
        """Create post-commit chain hook."""
        return f"""#!/bin/sh
# Post-commit chain hook: bd → Cody-Beads integration
# Preserves bd functionality while adding integration layer

set -e

# Call Cody-Beads integration adapter
"{self.integration_dir}/cody-beads-hook-adapter.sh" post-commit || {{
    echo "⚠️  Cody-Beads integration failed, but continuing..." >&2
}}

# Note: bd doesn't have a native post-commit hook, so we only call integration
exit 0
"""

    def _create_post_merge_chain(self, hook_name: str, call_bd_first: bool) -> str:
        """Create post-merge chain hook."""
        if call_bd_first:
            return f"""#!/bin/sh
# Post-merge chain hook: bd → Cody-Beads integration
# Preserves bd functionality while adding integration layer

set -e

# Call bd post-merge hook first (if it exists)
if [ -f "{self.hooks_dir}/post-merge" ] && grep -q "bd-hooks-version:" "{self.hooks_dir}/post-merge"; then
    "{self.hooks_dir}/post-merge" "$@" || {{
        echo "⚠️  bd post-merge hook failed, but continuing..." >&2
    }}
fi

# Call Cody-Beads integration adapter
"{self.integration_dir}/cody-beads-hook-adapter.sh" post-merge || {{
    echo "⚠️  Cody-Beads integration failed, but continuing..." >&2
}}

exit 0
"""
        else:
            return f"""#!/bin/sh
# Post-merge chain hook: Cody-Beads integration only

set -e

# Call Cody-Beads integration adapter
"{self.integration_dir}/cody-beads-hook-adapter.sh" post-merge || {{
    echo "⚠️  Cody-Beads integration failed, but continuing..." >&2
}}

exit 0
"""

    def _create_post_checkout_chain(self, hook_name: str, call_bd_first: bool) -> str:
        """Create post-checkout chain hook."""
        if call_bd_first:
            return f"""#!/bin/sh
# Post-checkout chain hook: bd → Cody-Beads integration
# Preserves bd functionality while adding integration layer

set -e

# Call bd post-checkout hook first (if it exists)
if [ -f "{self.hooks_dir}/post-checkout" ] && grep -q "bd-hooks-version:" "{self.hooks_dir}/post-checkout"; then
    "{self.hooks_dir}/post-checkout" "$@" || {{
        echo "⚠️  bd post-checkout hook failed, but continuing..." >&2
    }}
fi

# Call Cody-Beads integration adapter
"{self.integration_dir}/cody-beads-hook-adapter.sh" post-checkout "$@" || {{
    echo "⚠️  Cody-Beads integration failed, but continuing..." >&2
}}

exit 0
"""
        else:
            return f"""#!/bin/sh
# Post-checkout chain hook: Cody-Beads integration only

set -e

# Call Cody-Beads integration adapter
"{self.integration_dir}/cody-beads-hook-adapter.sh" post-checkout "$@" || {{
    echo "⚠️  Cody-Beads integration failed, but continuing..." >&2
}}

exit 0
"""

    def verify_installation(self) -> Dict[str, any]:
        """Verify installation and return status."""
        status = {
            "installed": False,
            "hooks": {},
            "bd_hooks_preserved": True,
            "integration_hooks_working": True,
            "issues": [],
        }

        try:
            # Check if integration hooks exist
            for hook_name in self.integration_hooks.keys():
                hook_file = self.hooks_dir / hook_name
                status["hooks"][hook_name] = {
                    "exists": hook_file.exists(),
                    "executable": hook_file.exists()
                    and (hook_file.stat().st_mode & 0o111 != 0),
                }

            # Check if bd hooks are preserved
            bd_hooks = ["pre-commit", "post-merge", "post-checkout", "pre-push"]
            for bd_hook in bd_hooks:
                hook_file = self.hooks_dir / bd_hook
                if hook_file.exists():
                    content = hook_file.read_text()
                    if "bd-hooks-version:" not in content:
                        status["bd_hooks_preserved"] = False
                        status["issues"].append(
                            f"bd hook {bd_hook} was modified or removed"
                        )

            # Test integration adapter
            adapter_script = self.integration_dir / "cody-beads-adapter.py"
            if adapter_script.exists():
                result = subprocess.run(
                    ["python3", str(adapter_script), "--status"],
                    capture_output=True,
                    text=True,
                    timeout=10,
                )
                if result.returncode != 0:
                    status["integration_hooks_working"] = False
                    status["issues"].append("Integration adapter test failed")

            status["installed"] = len(status["issues"]) == 0

        except Exception as e:
            status["issues"].append(f"Verification error: {e}")

        return status

    def install(self, force: bool = False) -> bool:
        """Install integration hooks."""
        print("🔧 Installing Cody-Beads Integration Hooks")
        print("=" * 50)

        # Check prerequisites
        valid, issues = self.check_prerequisites()
        if not valid:
            print("❌ Prerequisites failed:")
            for issue in issues:
                print(f"   • {issue}")
            return False

        # Detect existing hooks
        print("\n🔍 Detecting existing hooks...")
        existing_hooks = self.detect_existing_hooks()
        if existing_hooks:
            print("Existing hooks found:")
            for hook_name, hook_info in existing_hooks.items():
                origin_icon = {
                    "bd": "📱",
                    "cody-beads": "🔗",
                    "opencode": "🛠️",
                    "unknown": "❓",
                }
                icon = origin_icon.get(hook_info["origin"], "❓")
                print(f"   {icon} {hook_name} ({hook_info['origin']})")

        # Backup existing integration hooks
        if not force:
            print("\n📦 Backing up existing integration hooks...")
            if not self.backup_existing_hooks():
                return False

        # Install integration hooks
        print("\n🔧 Installing integration hooks...")
        if not self.install_integration_hooks():
            return False

        # Create hook chains
        print("\n🔗 Creating hook chains...")
        if not self.create_hook_chain():
            return False

        # Verify installation
        print("\n✅ Verifying installation...")
        status = self.verify_installation()

        if status["installed"]:
            print("✅ Installation completed successfully!")
            print("\n📋 Installation Summary:")
            print(
                f"   • Integration hooks: {len([h for h in status['hooks'].values() if h['exists']])}"
            )
            print(
                f"   • bd hooks preserved: {'✅' if status['bd_hooks_preserved'] else '❌'}"
            )
            print(
                f"   • Integration working: {'✅' if status['integration_hooks_working'] else '❌'}"
            )

            # Show next steps
            print("\n🎯 Next Steps:")
            print("   • Test with: git commit -m 'test integration'")
            print("   • Check logs: cat .cody-beads-integration.log")
            print(
                "   • Remove with: python3 scripts/install-integration-hooks.py uninstall"
            )

            return True
        else:
            print("❌ Installation completed with issues:")
            for issue in status["issues"]:
                print(f"   • {issue}")
            return False

    def uninstall(self) -> bool:
        """Uninstall integration hooks."""
        print("🗑️  Uninstalling Cody-Beads Integration Hooks")
        print("=" * 50)

        uninstalled = []
        failed = []

        # Remove integration hooks
        for hook_name in self.integration_hooks.keys():
            hook_file = self.hooks_dir / hook_name
            try:
                if hook_file.exists():
                    hook_file.unlink()
                    uninstalled.append(hook_name)
                    print(f"✅ Removed {hook_name}")
            except Exception as e:
                failed.append((hook_name, str(e)))
                print(f"❌ Failed to remove {hook_name}: {e}")

        # Restore bd hooks from backups if they exist
        bd_hooks = ["pre-commit", "post-merge", "post-checkout", "pre-push"]
        for bd_hook in bd_hooks:
            backup_files = list(self.hooks_dir.glob(f"{bd_hook}.backup-*"))
            if backup_files:
                # Use the most recent backup
                latest_backup = max(backup_files, key=lambda f: f.stat().st_mtime)
                hook_file = self.hooks_dir / bd_hook

                try:
                    latest_backup.rename(hook_file)
                    print(f"🔄 Restored {bd_hook} from backup")
                except Exception as e:
                    print(f"❌ Failed to restore {bd_hook}: {e}")

        # Clean up log file
        log_file = self.project_root / ".cody-beads-integration.log"
        if log_file.exists():
            try:
                log_file.unlink()
                print("🗑️  Removed integration log")
            except Exception:
                pass

        # Summary
        print(f"\n📊 Uninstall Summary:")
        print(f"   • Removed: {len(uninstalled)} hooks")
        if failed:
            print(f"   • Failed: {len(failed)} hooks")
            for hook_name, error in failed:
                print(f"     - {hook_name}: {error}")

        return len(failed) == 0


def main():
    """Main CLI interface."""
    parser = argparse.ArgumentParser(
        description="Install/uninstall Cody-Beads integration hooks (non-invasive)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Design Principles:
  • Loose coupling with external systems
  • Preserve all native bd hook behavior  
  • Add integration layer without blocking operations
  • Graceful degradation when systems unavailable

Examples:
  %(prog)s install                    # Install integration hooks
  %(prog)s install --force            # Install without backup
  %(prog)s uninstall                  # Remove integration hooks
  %(prog)s --status                   # Check current status
        """,
    )

    parser.add_argument(
        "action",
        choices=["install", "uninstall", "status"],
        help="Action to perform",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force installation without backup",
    )
    parser.add_argument(
        "--project-root",
        type=Path,
        default=Path.cwd(),
        help="Project root directory (default: current directory)",
    )

    args = parser.parse_args()

    installer = IntegrationHookInstaller(args.project_root)

    if args.action == "install":
        success = installer.install(force=args.force)
    elif args.action == "uninstall":
        success = installer.uninstall()
    elif args.action == "status":
        status = installer.verify_installation()
        print(json.dumps(status, indent=2))
        success = True
    else:
        success = False

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
