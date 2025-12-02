#!/usr/bin/env python3
"""
PM2-Beads Integration Manager
Enhanced daemon management with PM2 integration and health monitoring
"""

import json
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple


class PM2BeadsManager:
    """Enhanced daemon management with PM2 integration"""

    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.beads_dir = project_root / ".beads"
        self.pm2_config = project_root / "ecosystem.config.cjs"

    def run_command(
        self, cmd: List[str], capture_output: bool = True
    ) -> subprocess.CompletedProcess:
        """Run command with error handling"""
        try:
            result = subprocess.run(
                cmd, capture_output=capture_output, text=True, timeout=30
            )
            return result
        except subprocess.TimeoutExpired:
            return subprocess.CompletedProcess(cmd, 1, "", "Command timed out")
        except FileNotFoundError:
            return subprocess.CompletedProcess(
                cmd, 1, "", f"Command not found: {cmd[0]}"
            )

    def check_pm2_status(self) -> Dict:
        """Check PM2 daemon status"""
        result = self.run_command(["pm2", "jlist"])
        if result.returncode != 0:
            return {"error": result.stderr, "running": False}

        try:
            processes = json.loads(result.stdout)
            beads_process = next(
                (p for p in processes if p["name"] == "beads-daemon"), None
            )

            if beads_process:
                return {
                    "running": True,
                    "pid": beads_process.get("pid"),
                    "status": beads_process.get("pm2_env", {}).get("status"),
                    "uptime": beads_process.get("pm2_env", {}).get("pm_uptime"),
                    "memory": beads_process.get("monit", {}).get("memory"),
                    "cpu": beads_process.get("monit", {}).get("cpu"),
                }
            else:
                return {"running": False, "message": "beads-daemon not found in PM2"}
        except json.JSONDecodeError:
            return {"error": "Failed to parse PM2 output", "running": False}

    def check_beads_health(self) -> Dict:
        """Check Beads daemon health"""
        result = self.run_command(["bd", "daemons", "health"])
        if result.returncode != 0:
            return {"error": result.stderr, "healthy": False}

        # Parse bd daemons health output
        health_info = {"healthy": True, "output": result.stdout}

        # Check for version mismatches
        if "version mismatch" in result.stdout.lower():
            health_info["healthy"] = False
            health_info["version_mismatch"] = True

        return health_info

    def start_daemon(self) -> Dict:
        """Start Beads daemon via PM2"""
        if not self.pm2_config.exists():
            return {"error": "ecosystem.config.js not found", "success": False}

        # Stop existing daemon first
        self.stop_daemon()

        # Start with PM2
        result = self.run_command(["pm2", "start", str(self.pm2_config)])
        if result.returncode != 0:
            return {"error": result.stderr, "success": False}

        # Wait a moment and check status
        time.sleep(2)
        status = self.check_pm2_status()

        if status.get("running"):
            return {"success": True, "pid": status.get("pid")}
        else:
            return {"error": "Failed to start daemon", "success": False}

    def stop_daemon(self) -> Dict:
        """Stop Beads daemon"""
        # Try PM2 first
        pm2_result = self.run_command(["pm2", "stop", "beads-daemon"])

        # Also try native bd stop
        bd_result = self.run_command(["bd", "daemon", "--stop"])

        return {
            "pm2_stopped": pm2_result.returncode == 0,
            "bd_stopped": bd_result.returncode == 0,
            "success": pm2_result.returncode == 0 or bd_result.returncode == 0,
        }

    def restart_daemon(self) -> Dict:
        """Restart Beads daemon"""
        stop_result = self.stop_daemon()
        if not stop_result.get("success"):
            return {"error": "Failed to stop daemon", "success": False}

        time.sleep(1)
        return self.start_daemon()

    def get_daemon_logs(self, lines: int = 50) -> Dict:
        """Get daemon logs from both PM2 and Beads"""
        pm2_logs = self.run_command(
            ["pm2", "logs", "beads-daemon", "--lines", str(lines)]
        )
        bd_logs = self.run_command(
            ["bd", "daemons", "logs", str(self.project_root), "--n", str(lines)]
        )

        return {
            "pm2_logs": pm2_logs.stdout
            if pm2_logs.returncode == 0
            else pm2_logs.stderr,
            "bd_logs": bd_logs.stdout if bd_logs.returncode == 0 else bd_logs.stderr,
            "pm2_success": pm2_logs.returncode == 0,
            "bd_success": bd_logs.returncode == 0,
        }

    def comprehensive_health_check(self) -> Dict:
        """Perform comprehensive health check"""
        health_report = {
            "timestamp": datetime.now().isoformat(),
            "pm2_status": self.check_pm2_status(),
            "beads_health": self.check_beads_health(),
            "project_structure": self._check_project_structure(),
            "version_info": self._get_version_info(),
        }

        # Overall health assessment
        health_report["overall_healthy"] = (
            health_report["pm2_status"].get("running", False)
            and health_report["beads_health"].get("healthy", False)
            and health_report["project_structure"]["valid"]
        )

        return health_report

    def _check_project_structure(self) -> Dict:
        """Check project structure validity"""
        checks = {
            "beads_dir_exists": self.beads_dir.exists(),
            "pm2_config_exists": self.pm2_config.exists(),
            "package_json_exists": (self.project_root / "package.json").exists(),
            "beads_db_exists": (self.beads_dir / "beads.db").exists(),
            "beads_jsonl_exists": (self.beads_dir / "issues.jsonl").exists(),
        }

        checks["valid"] = all(checks.values())
        return checks

    def _get_version_info(self) -> Dict:
        """Get version information"""
        bd_version = self.run_command(["bd", "--version"])
        pm2_version = self.run_command(["pm2", "--version"])

        return {
            "bd_version": bd_version.stdout.strip()
            if bd_version.returncode == 0
            else "unknown",
            "pm2_version": pm2_version.stdout.strip()
            if pm2_version.returncode == 0
            else "unknown",
        }


def main():
    """CLI interface"""
    if len(sys.argv) < 2:
        print("Usage: python pm2-beads-manager.py <command> [options]")
        print("Commands: start, stop, restart, status, health, logs")
        sys.exit(1)

    command = sys.argv[1]
    project_root = Path.cwd()
    manager = PM2BeadsManager(project_root)

    if command == "start":
        result = manager.start_daemon()
        print(json.dumps(result, indent=2))

    elif command == "stop":
        result = manager.stop_daemon()
        print(json.dumps(result, indent=2))

    elif command == "restart":
        result = manager.restart_daemon()
        print(json.dumps(result, indent=2))

    elif command == "status":
        result = manager.check_pm2_status()
        print(json.dumps(result, indent=2))

    elif command == "health":
        result = manager.comprehensive_health_check()
        print(json.dumps(result, indent=2))

    elif command == "logs":
        lines = int(sys.argv[2]) if len(sys.argv) > 2 else 50
        result = manager.get_daemon_logs(lines)
        print(json.dumps(result, indent=2))

    else:
        print(f"Unknown command: {command}")
        sys.exit(1)


if __name__ == "__main__":
    main()
