#!/usr/bin/env python3
"""
Enhanced Health Check System for Liaison Toolkit
Supports parallel execution, git-based caching, and structured JSON output
"""

import argparse
import concurrent.futures
import json
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional


class HealthChecker:
    def __init__(self, cache_dir: str = "/tmp/liaison-health", parallel: bool = True):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.parallel = parallel

    def get_cache_key(self) -> str:
        """Get cache key based on git state"""
        try:
            git_hash = subprocess.run(
                ["git", "rev-parse", "HEAD"], capture_output=True, text=True, check=True
            ).stdout.strip()
        except (subprocess.CalledProcessError, FileNotFoundError):
            git_hash = "no-git"

        try:
            timestamp = subprocess.run(
                ["git", "log", "-1", "--format=%ct"],
                capture_output=True,
                text=True,
                check=True,
            ).stdout.strip()
        except (subprocess.CalledProcessError, FileNotFoundError):
            timestamp = str(int(time.time()))

        return f"health-{git_hash}-{timestamp}"

    def is_cache_valid(self) -> bool:
        """Check if cache is valid (5 minutes)"""
        cache_file = self.cache_dir / f"{self.get_cache_key()}.json"
        if not cache_file.exists():
            return False

        # Check if file is less than 5 minutes old
        file_age = time.time() - cache_file.stat().st_mtime
        return file_age < 300  # 5 minutes

    def get_cached_result(self) -> Optional[Dict[str, Any]]:
        """Get cached health result"""
        cache_file = self.cache_dir / f"{self.get_cache_key()}.json"
        if cache_file.exists():
            try:
                with open(cache_file) as f:
                    return json.load(f)  # type: ignore[no-any-return]
            except (json.JSONDecodeError, OSError):
                pass
        return None

    def cache_result(self, result: Dict[str, Any]) -> None:
        """Cache health result"""
        cache_file = self.cache_dir / f"{self.get_cache_key()}.json"
        try:
            with open(cache_file, "w") as f:
                json.dump(result, f, indent=2)
        except OSError:
            pass

    def run_command(
        self, cmd: List[str], capture_output: bool = True
    ) -> subprocess.CompletedProcess:
        """Run command safely"""
        try:
            return subprocess.run(
                cmd, capture_output=capture_output, text=True, timeout=10
            )
        except (subprocess.TimeoutExpired, FileNotFoundError):
            return subprocess.CompletedProcess(
                cmd, 1, "", "Command not found or timeout"
            )

    def check_core(self) -> Dict[str, Any]:
        """Check core environment (Python, Node, Bun, UV)"""
        result: Dict[str, Any] = {
            "component": "core",
            "status": "healthy",
            "score": 100,
            "details": {},
            "issues": [],
        }

        # Check Python
        python_result = self.run_command(["python3", "--version"])
        if python_result.returncode == 0:
            result["details"]["python"] = {
                "status": "healthy",
                "version": python_result.stdout.strip(),
            }
        else:
            result["details"]["python"] = {
                "status": "unhealthy",
                "error": "Python not found",
            }
            result["issues"].append("Python not found")
            result["score"] -= 25

        # Check UV
        uv_result = self.run_command(["uv", "--version"])
        if uv_result.returncode == 0:
            result["details"]["uv"] = {
                "status": "healthy",
                "version": uv_result.stdout.strip(),
            }
        else:
            result["details"]["uv"] = {"status": "unhealthy", "error": "UV not found"}
            result["issues"].append("UV not found")
            result["score"] -= 25

        # Check Node.js
        node_result = self.run_command(["node", "--version"])
        if node_result.returncode == 0:
            result["details"]["node"] = {
                "status": "healthy",
                "version": node_result.stdout.strip(),
            }
        else:
            result["details"]["node"] = {
                "status": "unhealthy",
                "error": "Node.js not found",
            }
            result["issues"].append("Node.js not found")
            result["score"] -= 25

        # Check Bun
        bun_result = self.run_command(["bun", "--version"])
        if bun_result.returncode == 0:
            result["details"]["bun"] = {
                "status": "healthy",
                "version": bun_result.stdout.strip(),
            }
        else:
            result["details"]["bun"] = {"status": "unhealthy", "error": "Bun not found"}
            result["issues"].append("Bun not found")
            result["score"] -= 25

        return result

    def check_dependencies(self) -> Dict[str, Any]:
        """Check dependencies and build tools"""
        result: Dict[str, Any] = {
            "component": "dependencies",
            "status": "healthy",
            "score": 100,
            "details": {},
            "issues": [],
        }

        # Check TypeScript
        tsc_result = self.run_command(["npx", "tsc", "--version"])
        if tsc_result.returncode == 0:
            result["details"]["typescript"] = {
                "status": "healthy",
                "version": tsc_result.stdout.strip(),
            }
        else:
            result["details"]["typescript"] = {
                "status": "unhealthy",
                "error": "TypeScript not available",
            }
            result["issues"].append("TypeScript not available")
            result["score"] -= 20

        # Check package.json dependencies
        if Path("package.json").exists():
            if (
                Path("bun").exists()
                or self.run_command(["bun", "--version"]).returncode == 0
            ):
                # Try dry-run install
                install_result = self.run_command(["bun", "install", "--dry-run"])
                if install_result.returncode == 0:
                    result["details"]["package_deps"] = {
                        "status": "healthy",
                        "message": "Dependencies OK",
                    }
                else:
                    result["details"]["package_deps"] = {
                        "status": "unhealthy",
                        "error": "Package dependencies may be broken",
                    }
                    result["issues"].append("Package dependencies may be broken")
                    result["score"] -= 30
            else:
                result["details"]["package_deps"] = {
                    "status": "unhealthy",
                    "error": "Bun not available for package check",
                }
                result["issues"].append("Bun not available for package check")
                result["score"] -= 20
        else:
            result["details"]["package_deps"] = {
                "status": "unhealthy",
                "error": "package.json not found",
            }
            result["issues"].append("package.json not found")
            result["score"] -= 20

        # Check Python dependencies
        if Path("pyproject.toml").exists():
            if self.run_command(["uv", "--version"]).returncode == 0:
                check_result = self.run_command(["uv", "pip", "check"])
                if check_result.returncode == 0:
                    result["details"]["python_deps"] = {
                        "status": "healthy",
                        "message": "Python dependencies OK",
                    }
                else:
                    result["details"]["python_deps"] = {
                        "status": "unhealthy",
                        "error": "Python dependencies may be broken",
                    }
                    result["issues"].append("Python dependencies may be broken")
                    result["score"] -= 30
            else:
                result["details"]["python_deps"] = {
                    "status": "unhealthy",
                    "error": "UV not available for Python check",
                }
                result["issues"].append("UV not available for Python check")
                result["score"] -= 20
        else:
            result["details"]["python_deps"] = {
                "status": "unknown",
                "message": "No Python project",
            }

        return result

    def check_sync(self) -> Dict[str, Any]:
        """Check sync status and Beads integration"""
        result: Dict[str, Any] = {
            "component": "sync",
            "status": "healthy",
            "score": 100,
            "details": {},
            "issues": [],
        }

        # Check sync state file
        sync_file = Path(".beads-cody-sync-state.json")
        if sync_file.exists():
            try:
                with open(sync_file) as f:
                    sync_data = json.load(f)

                last_sync = sync_data.get("last_sync", "unknown")
                last_success = sync_data.get("last_refresh_success", False)

                result["details"]["last_sync"] = last_sync
                result["details"]["last_success"] = last_success

                if last_success:
                    result["details"]["sync_status"] = "healthy"
                else:
                    result["details"]["sync_status"] = "unhealthy"
                    result["issues"].append("Last sync failed")
                    result["score"] -= 40

                # Check sync age (warn if > 2 hours)
                try:
                    sync_time = datetime.fromisoformat(last_sync.replace("Z", "+00:00"))
                    age_hours = (
                        datetime.now(sync_time.tzinfo) - sync_time
                    ).total_seconds() / 3600
                    if age_hours > 2:
                        result["issues"].append(f"Sync is {int(age_hours)} hours old")
                        result["score"] -= 20
                except (ValueError, TypeError):
                    pass

            except (json.JSONDecodeError, OSError):
                result["details"]["sync_status"] = "unhealthy"
                result["details"]["error"] = "Invalid sync state file"
                result["issues"].append("Invalid sync state file")
                result["score"] -= 50
        else:
            result["details"]["sync_status"] = "unknown"
            result["details"]["error"] = "No sync state file"
            result["issues"].append("No sync state file found")
            result["score"] -= 50

        # Check Beads availability
        beads_result = self.run_command(["bd", "--version"])
        if beads_result.returncode == 0:
            result["details"]["beads"] = {
                "status": "healthy",
                "message": "Beads available",
            }
        else:
            # Try via bun x
            bun_beads_result = self.run_command(["bun", "x", "bd", "--version"])
            if bun_beads_result.returncode == 0:
                result["details"]["beads"] = {
                    "status": "healthy",
                    "message": "Beads available via bun x",
                }
            else:
                result["details"]["beads"] = {
                    "status": "unhealthy",
                    "error": "Beads not available",
                }
                result["issues"].append("Beads not available")
                result["score"] -= 30

        return result

    def check_config(self) -> Dict[str, Any]:
        """Check configuration files"""
        result: Dict[str, Any] = {
            "component": "config",
            "status": "healthy",
            "score": 100,
            "details": {},
            "issues": [],
        }

        # Check justfile
        if Path("justfile").exists():
            just_result = self.run_command(["just", "--version"])
            if just_result.returncode == 0:
                result["details"]["justfile"] = {
                    "status": "healthy",
                    "message": "justfile found",
                }
            else:
                result["details"]["justfile"] = {
                    "status": "degraded",
                    "error": "Just not installed",
                }
                result["issues"].append("Just not installed")
                result["score"] -= 20
        else:
            result["details"]["justfile"] = {
                "status": "unhealthy",
                "error": "justfile not found",
            }
            result["issues"].append("justfile not found")
            result["score"] -= 30

        return result

    def check_coordinator(self) -> Dict[str, Any]:
        """Check liaison coordinator health"""
        result: Dict[str, Any] = {
            "component": "coordinator",
            "status": "healthy",
            "score": 100,
            "details": {},
            "issues": [],
        }

        # Check if coordinator binary exists
        coordinator_path = Path("packages/liaison-coordinator/bin/liaison.js")
        if coordinator_path.exists():
            # Try to call coordinator health endpoint
            health_result = self.run_command(
                ["node", str(coordinator_path), "health", "--format=json"]
            )

            if health_result.returncode == 0:
                try:
                    # Parse the coordinator output (it has extra text before JSON)
                    output_lines = health_result.stdout.strip().split("\n")
                    json_line = None
                    for line in output_lines:
                        if line.strip().startswith("{"):
                            json_line = line.strip()
                            break

                    if json_line:
                        coordinator_data = json.loads(json_line)
                        coordinator_status = coordinator_data.get("overall", "healthy")
                        result["details"]["coordinator_health"] = coordinator_status
                        result["details"]["coordinator_data"] = coordinator_data

                        if coordinator_status != "healthy":
                            result["issues"].append(
                                f"Coordinator reports {coordinator_status}"
                            )
                            result["score"] -= 30
                    else:
                        result["details"]["coordinator_health"] = "unhealthy"
                        result["details"]["error"] = (
                            "No JSON found in coordinator response"
                        )
                        result["issues"].append("No JSON found in coordinator response")
                        result["score"] -= 50

                except json.JSONDecodeError as e:
                    result["details"]["coordinator_health"] = "unhealthy"
                    result["details"]["error"] = f"JSON decode error: {str(e)}"
                    result["details"]["raw_output"] = health_result.stdout
                    result["issues"].append("Invalid coordinator response")
                    result["score"] -= 50
            else:
                result["details"]["coordinator_health"] = "unhealthy"
                result["details"]["error"] = "Health check failed"
                result["details"]["stderr"] = health_result.stderr
                result["issues"].append("Coordinator health check failed")
                result["score"] -= 50
        else:
            result["details"]["coordinator_health"] = "unhealthy"
            result["details"]["error"] = "Coordinator binary not found"
            result["issues"].append("Coordinator binary not found")
            result["score"] -= 100

        return result

    def calculate_overall_status(
        self, components: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Calculate overall health status"""
        failed_components = sum(1 for c in components if c.get("status") == "unhealthy")
        total_components = len(components)
        total_score = sum(c.get("score", 0) for c in components)
        avg_score = total_score // total_components if total_components > 0 else 0

        # Apply failure thresholds
        if failed_components == 0:
            overall_status = "healthy"
        elif failed_components <= 2:
            overall_status = "degraded"
        else:
            overall_status = "unhealthy"

        # Collect all issues and recommendations
        all_issues: List[str] = []
        for component in components:
            all_issues.extend(component.get("issues", []))

        recommendations: List[str] = []
        if failed_components > 0:
            recommendations.append("Check failed components for resolution steps")
        if avg_score < 80:
            recommendations.append(
                "Consider running setup commands to improve system health"
            )

        return {
            "timestamp": datetime.now().isoformat(),
            "git_commit": self.run_command(["git", "rev-parse", "HEAD"]).stdout.strip()
            if Path(".git").exists()
            else "no-git",
            "overall": overall_status,
            "score": avg_score,
            "execution": {
                "mode": "parallel" if self.parallel else "sequential",
                "duration_ms": 0,  # Will be set by caller
                "cache_hit": False,
            },
            "components": {c["component"]: c for c in components},
            "issues": all_issues,
            "recommendations": recommendations,
            "metadata": {
                "components_checked": total_components,
                "failed_components": failed_components,
                "cache_dir": str(self.cache_dir),
            },
        }

    def run_health_check(self, component: str = "all") -> Dict[str, Any]:
        """Run health check for specified component(s)"""
        # Check cache first
        if component == "all" and self.is_cache_valid():
            cached = self.get_cached_result()
            if cached:
                cached["execution"]["cache_hit"] = True
                return cached

        # Determine which checks to run
        checks = []
        if component == "all":
            checks = [
                self.check_core,
                self.check_dependencies,
                self.check_sync,
                self.check_config,
                self.check_coordinator,
            ]
        elif component == "core":
            checks = [self.check_core]
        elif component == "deps":
            checks = [self.check_dependencies]
        elif component == "sync":
            checks = [self.check_sync]
        elif component == "config":
            checks = [self.check_config]
        elif component == "coordinator":
            checks = [self.check_coordinator]
        else:
            raise ValueError(f"Unknown component: {component}")

        # Run checks
        if self.parallel and len(checks) > 1:
            with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
                components = list(executor.map(lambda check: check(), checks))
        else:
            components = [check() for check in checks]

        # Calculate overall status
        result = self.calculate_overall_status(components)

        # Cache result
        if component == "all":
            self.cache_result(result)

        return result


def main() -> None:
    parser = argparse.ArgumentParser(description="Enhanced Health Check System")
    parser.add_argument(
        "--parallel", action="store_true", default=True, help="Run checks in parallel"
    )
    parser.add_argument(
        "--sequential", action="store_true", help="Run checks sequentially"
    )
    parser.add_argument(
        "--format", choices=["json", "text"], default="json", help="Output format"
    )
    parser.add_argument(
        "--component",
        choices=["all", "core", "deps", "sync", "config", "coordinator"],
        default="all",
        help="Check specific component",
    )
    parser.add_argument(
        "--cache-dir", default="/tmp/liaison-health", help="Cache directory"
    )
    parser.add_argument("--verbose", action="store_true", help="Show detailed output")

    args = parser.parse_args()

    # Handle sequential flag
    if args.sequential:
        args.parallel = False

    # Create health checker
    checker = HealthChecker(cache_dir=args.cache_dir, parallel=args.parallel)

    # Run health check
    start_time = time.time()
    result = checker.run_health_check(args.component)
    duration_ms = int((time.time() - start_time) * 1000)
    result["execution"]["duration_ms"] = duration_ms

    # Output result
    if args.format == "json":
        print(json.dumps(result, indent=2))
    else:
        # Text format
        print("🏥 Health Check Results")
        print(f"Overall Status: {result['overall']}")
        print(f"Health Score: {result['score']}/100")
        print(f"Duration: {duration_ms}ms")

        if args.verbose:
            print("\nComponent Details:")
            for name, component in result["components"].items():
                print(f"  {name}: {component['status']} ({component['score']}/100)")

    # Exit with appropriate code
    sys.exit(0 if result["overall"] == "healthy" else 1)


if __name__ == "__main__":
    main()
