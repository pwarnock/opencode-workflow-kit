#!/usr/bin/env python3
"""
PM2 Migration Script for Beads Daemon
Migrates from existing background daemon to PM2-managed foreground daemon
"""

import json
import subprocess
import sys
import time
from pathlib import Path
from typing import Dict, Optional


class PM2Migrator:
    """Handle migration from background daemon to PM2"""

    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.beads_dir = project_root / ".beads"
        self.lock_file = self.beads_dir / ".exclusive-lock"
        self.daemon_lock = project_root / "daemon.lock"

    def run_command(
        self, cmd: list, capture_output: bool = True
    ) -> subprocess.CompletedProcess:
        """Run command with error handling"""
        try:
            return subprocess.run(
                cmd, capture_output=capture_output, text=True, timeout=30
            )
        except subprocess.TimeoutExpired:
            return subprocess.CompletedProcess(cmd, 1, "", "Command timed out")

    def check_current_state(self) -> Dict:
        """Analyze current daemon state"""
        state = {
            "old_daemon_running": False,
            "old_daemon_pid": None,
            "old_daemon_version": None,
            "pm2_daemon_running": False,
            "lock_files_exist": False,
            "version_mismatch": False,
        }

        # Check for old background daemon
        result = self.run_command(["bd", "daemon", "--status"])
        if result.returncode == 0:
            state["old_daemon_running"] = True
            # Extract PID from output if available
            if "PID" in result.stdout:
                for line in result.stdout.split("\n"):
                    if "PID" in line:
                        try:
                            parts = line.split(":")
                            if len(parts) >= 2:
                                state["old_daemon_pid"] = int(parts[1].strip())
                        except (ValueError, IndexError):
                            pass

        # Check daemon lock file
        if self.daemon_lock.exists():
            state["lock_files_exist"] = True
            try:
                with open(self.daemon_lock, "r") as f:
                    lock_data = json.load(f)
                    state["old_daemon_version"] = lock_data.get("version")
            except (json.JSONDecodeError, IOError):
                pass

        # Check PM2 status
        result = self.run_command(["pm2", "jlist"])
        if result.returncode == 0:
            try:
                processes = json.loads(result.stdout)
                beads_process = next(
                    (p for p in processes if p["name"] == "beads-daemon"), None
                )
                if beads_process:
                    state["pm2_daemon_running"] = True
            except json.JSONDecodeError:
                pass

        # Check for version mismatch
        bd_version = self.run_command(["bd", "--version"])
        if bd_version.returncode == 0:
            current_version = bd_version.stdout.strip()
            if (
                state["old_daemon_version"]
                and state["old_daemon_version"] != current_version
            ):
                state["version_mismatch"] = True

        return state

    def stop_old_daemon(self) -> Dict:
        """Stop existing background daemon"""
        result = {"stopped": False, "method": None, "error": None}

        # Try bd daemon --stop first
        stop_result = self.run_command(["bd", "daemon", "--stop"])
        if stop_result.returncode == 0:
            result["stopped"] = True
            result["method"] = "bd_stop"
        else:
            # Try killing by PID if we have it
            state = self.check_current_state()
            if state["old_daemon_pid"]:
                try:
                    kill_result = self.run_command(
                        ["kill", str(state["old_daemon_pid"])]
                    )
                    if kill_result.returncode == 0:
                        result["stopped"] = True
                        result["method"] = "kill_pid"
                except FileNotFoundError:
                    pass

            # Fallback: try bd daemons killall
            if not result["stopped"]:
                killall_result = self.run_command(["bd", "daemons", "killall"])
                if killall_result.returncode == 0:
                    result["stopped"] = True
                    result["method"] = "killall"

        if not result["stopped"]:
            result["error"] = "Failed to stop old daemon"

        return result

    def cleanup_lock_files(self) -> Dict:
        """Clean up old lock files"""
        cleanup_result = {
            "daemon_lock_removed": False,
            "exclusive_lock_removed": False,
            "errors": [],
        }

        # Remove daemon.lock
        if self.daemon_lock.exists():
            try:
                self.daemon_lock.unlink()
                cleanup_result["daemon_lock_removed"] = True
            except OSError as e:
                cleanup_result["errors"].append(f"Failed to remove daemon.lock: {e}")

        # Remove .exclusive-lock
        if self.lock_file.exists():
            try:
                self.lock_file.unlink()
                cleanup_result["exclusive_lock_removed"] = True
            except OSError as e:
                cleanup_result["errors"].append(
                    f"Failed to remove .exclusive-lock: {e}"
                )

        return cleanup_result

    def start_pm2_daemon(self) -> Dict:
        """Start daemon via PM2"""
        # Check if ecosystem.config.cjs exists
        ecosystem_config = self.project_root / "ecosystem.config.cjs"
        if not ecosystem_config.exists():
            return {"started": False, "error": "ecosystem.config.cjs not found"}

        # Start with PM2
        result = self.run_command(["pm2", "start", str(ecosystem_config)])
        if result.returncode != 0:
            return {"started": False, "error": result.stderr}

        # Wait and verify
        time.sleep(3)

        # Check PM2 status
        jlist_result = self.run_command(["pm2", "jlist"])
        if jlist_result.returncode == 0:
            try:
                processes = json.loads(jlist_result.stdout)
                beads_process = next(
                    (p for p in processes if p["name"] == "beads-daemon"), None
                )
                if beads_process:
                    return {"started": True, "pid": beads_process.get("pid")}
            except json.JSONDecodeError:
                pass

        return {"started": False, "error": "Failed to verify PM2 daemon startup"}

    def verify_migration(self) -> Dict:
        """Verify migration was successful"""
        verification = {
            "old_daemon_stopped": True,
            "pm2_daemon_running": False,
            "beads_responsive": False,
            "sync_working": False,
            "overall_success": False,
        }

        # Check old daemon is stopped
        result = self.run_command(["bd", "daemon", "--status"])
        if "not running" in result.stdout.lower() or result.returncode != 0:
            verification["old_daemon_stopped"] = True

        # Check PM2 daemon is running
        jlist_result = self.run_command(["pm2", "jlist"])
        if jlist_result.returncode == 0:
            try:
                processes = json.loads(jlist_result.stdout)
                beads_process = next(
                    (p for p in processes if p["name"] == "beads-daemon"), None
                )
                if beads_process:
                    verification["pm2_daemon_running"] = True
            except json.JSONDecodeError:
                pass

        # Check Beads responsiveness
        ready_result = self.run_command(["bd", "ready", "--json"])
        if ready_result.returncode == 0:
            verification["beads_responsive"] = True

        # Check sync is working
        sync_result = self.run_command(["bd", "sync"])
        if sync_result.returncode == 0:
            verification["sync_working"] = True

        verification["overall_success"] = all(
            [
                verification["old_daemon_stopped"],
                verification["pm2_daemon_running"],
                verification["beads_responsive"],
                verification["sync_working"],
            ]
        )

        return verification

    def migrate(self, force: bool = False) -> Dict:
        """Perform full migration"""
        migration_report = {
            "timestamp": time.time(),
            "steps": {},
            "success": False,
            "errors": [],
        }

        print("🔄 Starting PM2 migration for Beads daemon...")

        # Step 1: Analyze current state
        print("📊 Analyzing current daemon state...")
        current_state = self.check_current_state()
        migration_report["steps"]["analysis"] = current_state

        if (
            not current_state["old_daemon_running"]
            and not current_state["pm2_daemon_running"]
        ):
            print("ℹ️  No daemon running - clean setup")
            migration_report["steps"]["cleanup"] = self.cleanup_lock_files()
        elif current_state["pm2_daemon_running"]:
            print("ℹ️  PM2 daemon already running")
            migration_report["steps"]["already_pm2"] = {"status": "already_running"}
        else:
            # Step 2: Stop old daemon
            if current_state["old_daemon_running"]:
                print("🛑 Stopping old background daemon...")
                stop_result = self.stop_old_daemon()
                migration_report["steps"]["stop_old"] = stop_result

                if not stop_result["stopped"]:
                    if not force:
                        migration_report["errors"].append(
                            "Failed to stop old daemon. Use --force to continue anyway."
                        )
                        return migration_report
                    else:
                        migration_report["errors"].append(
                            "Failed to stop old daemon, but continuing with --force"
                        )

            # Step 3: Cleanup lock files
            print("🧹 Cleaning up lock files...")
            cleanup_result = self.cleanup_lock_files()
            migration_report["steps"]["cleanup"] = cleanup_result

            # Step 4: Start PM2 daemon
            print("🚀 Starting PM2-managed daemon...")
            start_result = self.start_pm2_daemon()
            migration_report["steps"]["start_pm2"] = start_result

            if not start_result["started"]:
                migration_report["errors"].append(
                    f"Failed to start PM2 daemon: {start_result.get('error', 'Unknown')}"
                )
                return migration_report

        # Step 5: Verify migration
        print("✅ Verifying migration...")
        verification = self.verify_migration()
        migration_report["steps"]["verification"] = verification
        migration_report["success"] = verification["overall_success"]

        if migration_report["success"]:
            print("🎉 Migration completed successfully!")
            print(
                f"   PM2 daemon PID: {verification.get('pm2_daemon_running', 'Unknown')}"
            )
            print("   Beads is responsive and sync is working")
        else:
            print("❌ Migration verification failed")
            migration_report["errors"].append("Migration verification failed")

        return migration_report


def main():
    """CLI interface"""
    force = "--force" in sys.argv
    dry_run = "--dry-run" in sys.argv

    project_root = Path.cwd()
    migrator = PM2Migrator(project_root)

    if dry_run:
        print("🔍 Dry run - analyzing current state only...")
        state = migrator.check_current_state()
        print(json.dumps(state, indent=2))
        return

    migration_report = migrator.migrate(force=force)

    # Save migration report
    report_file = project_root / ".beads" / "pm2-migration-report.json"
    with open(report_file, "w") as f:
        json.dump(migration_report, f, indent=2)

    print(f"\n📄 Migration report saved to: {report_file}")

    if migration_report["success"]:
        sys.exit(0)
    else:
        print("\n❌ Migration failed with errors:")
        for error in migration_report["errors"]:
            print(f"   - {error}")
        sys.exit(1)


if __name__ == "__main__":
    main()
