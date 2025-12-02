#!/usr/bin/env python3
"""
Enhanced sync monitoring and alerting with PM2 integration
Checks sync health, daemon status, and sends alerts on failures
"""

import json
import time
from datetime import datetime, timedelta
from pathlib import Path
import subprocess
import sys

# Import PM2 Beads manager
try:
    import pm2_beads_manager

    PM2BeadsManager = pm2_beads_manager.PM2BeadsManager
except ImportError:
    # Fallback if module not available
    PM2BeadsManager = None


def check_sync_health():
    """Check if sync system is healthy using Beads daemon health"""
    project_root = Path.cwd()
    health_file = project_root / ".beads" / "health-report.json"
    log_file = project_root / ".beads" / "pm2.log"

    issues = []

    # Check Beads daemon health directly
    try:
        result = subprocess.run(
            ["bd", "daemons", "health", "--json"],
            capture_output=True,
            text=True,
            timeout=10,
        )

        if result.returncode == 0:
            # Parse health JSON output
            try:
                health_data = json.loads(result.stdout)
                if (
                    health_data.get("healthy", 0) == 1
                    and health_data.get("mismatched", 1) == 0
                    and health_data.get("stale", 1) == 0
                    and health_data.get("unresponsive", 1) == 0
                ):
                    # Daemon is healthy
                    pass
                else:
                    issues.append(f"Beads daemon health issues: {health_data}")
            except json.JSONDecodeError:
                if "healthy" in result.stdout.lower():
                    pass  # Simple string check fallback
                else:
                    issues.append("Beads daemon health issues detected")
        else:
            issues.append("Failed to check Beads daemon health")

    except (subprocess.TimeoutExpired, FileNotFoundError) as e:
        issues.append(f"Cannot check daemon health: {e}")

    # Check for recent PM2 errors in log
    if log_file.exists():
        try:
            with open(log_file, "r") as f:
                lines = f.readlines()

            recent_errors = []
            cutoff = datetime.now() - timedelta(hours=1)

            for line in lines[-50:]:  # Check last 50 lines
                if "ERROR" in line or "error" in line.lower():
                    try:
                        # Simple timestamp extraction
                        parts = line.strip().split()
                        if parts and len(parts) >= 2:
                            timestamp_str = parts[0]
                            # Try different timestamp formats
                            for fmt in ["%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M:%S.%f"]:
                                try:
                                    timestamp = datetime.strptime(timestamp_str, fmt)
                                    if timestamp > cutoff:
                                        recent_errors.append(line.strip())
                                        break
                                except ValueError:
                                    continue
                    except Exception:
                        continue

            if recent_errors:
                issues.extend(recent_errors[:2])  # Limit to 2 most recent errors

        except OSError:
            issues.append("Cannot read PM2 log file")

    return len(issues) == 0, issues


def check_daemon_health():
    """Check PM2 and Beads daemon health using native bd commands"""
    project_root = Path.cwd()

    # Use native bd daemons commands
    try:
        # Check PM2 status
        pm2_result = subprocess.run(
            ["pm2", "jlist"], capture_output=True, text=True, timeout=10
        )
        pm2_running = pm2_result.returncode == 0

        pm2_status = {"running": False}
        if pm2_running:
            try:
                processes = json.loads(pm2_result.stdout)
                beads_process = next(
                    (p for p in processes if p["name"] == "beads-daemon"), None
                )
                if beads_process:
                    pm2_status = {
                        "running": True,
                        "pid": beads_process.get("pid"),
                        "status": beads_process.get("pm2_env", {}).get("status"),
                        "uptime": beads_process.get("pm2_env", {}).get("pm_uptime"),
                    }
            except json.JSONDecodeError:
                pass

        # Check Beads daemon health
        bd_result = subprocess.run(
            ["bd", "daemons", "health", "--json"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        bd_healthy = bd_result.returncode == 0

        bd_health = {
            "healthy": False,
            "output": bd_result.stdout if bd_healthy else bd_result.stderr,
        }
        if bd_healthy and "healthy" in bd_result.stdout.lower():
            bd_health["healthy"] = True

        # Overall assessment
        overall_healthy = pm2_status.get("running", False) and bd_health.get(
            "healthy", False
        )

        return {
            "overall_healthy": overall_healthy,
            "pm2_status": pm2_status,
            "beads_health": bd_health,
            "pm2_available": pm2_running,
        }

    except (subprocess.TimeoutExpired, FileNotFoundError) as e:
        return {
            "overall_healthy": False,
            "pm2_status": {"running": False, "error": str(e)},
            "beads_health": {"healthy": False, "error": str(e)},
            "pm2_available": False,
        }


def enhanced_health_check():
    """Enhanced health check including daemon status"""
    # Original sync health check
    sync_healthy, sync_issues = check_sync_health()

    # Daemon health check
    daemon_health = check_daemon_health()

    # Combined assessment
    overall_healthy = sync_healthy and daemon_health.get("overall_healthy", False)

    health_report = {
        "timestamp": datetime.now().isoformat(),
        "overall_healthy": overall_healthy,
        "sync_health": {"healthy": sync_healthy, "issues": sync_issues},
        "daemon_health": daemon_health,
    }

    return overall_healthy, health_report


def main():
    """Enhanced monitoring entry point"""
    if len(sys.argv) > 1 and sys.argv[1] == "--enhanced":
        # Enhanced mode with daemon health
        healthy, report = enhanced_health_check()

        print(f"📊 Health Check at {report['timestamp']}")
        print(f"Overall Status: {'✅ Healthy' if healthy else '❌ Issues Detected'}")

        if not healthy:
            print("\n🔍 Detailed Issues:")

            # Sync issues
            if not report["sync_health"]["healthy"]:
                print("  Sync Issues:")
                for issue in report["sync_health"]["issues"]:
                    print(f"    - {issue}")

            # Daemon issues
            daemon_healthy = report["daemon_health"].get("overall_healthy", False)
            if not daemon_healthy:
                print("  Daemon Issues:")
                pm2_status = report["daemon_health"].get("pm2_status", {})
                beads_health = report["daemon_health"].get("beads_health", {})

                if not pm2_status.get("running", False):
                    error_msg = pm2_status.get("error", "PM2 daemon not running")
                    print(f"    - PM2 daemon issue: {error_msg}")

                if not beads_health.get("healthy", False):
                    print(
                        f"    - Beads daemon unhealthy: {beads_health.get('error', 'Unknown')}"
                    )

                if beads_health.get("version_mismatch"):
                    print("    - Version mismatch between CLI and daemon")

        # Save health report
        with open(Path.cwd() / ".beads" / "health-report.json", "w") as f:
            json.dump(report, f, indent=2)

        sys.exit(0 if healthy else 1)

    else:
        # Original simple mode
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
