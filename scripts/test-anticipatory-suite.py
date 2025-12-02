#!/usr/bin/env python3
"""
Anticipatory Testing Suite

Unified test runner for anticipatory testing of external system integration.
Prevents silent breakage as bd and Cody PBT evolve.
"""

import json
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional


class AnticipatoryTestRunner:
    """Unified runner for anticipatory testing."""

    def __init__(self, project_root: Path = None):
        """Initialize test runner."""
        self.project_root = project_root or Path.cwd()
        self.scripts_dir = self.project_root / "scripts"
        self.results_dir = self.project_root / "test-results"
        self.results_dir.mkdir(exist_ok=True)

        self.test_suites = {
            "integration_contracts": {
                "script": "test-integration-contracts.py",
                "description": "External system contract validation",
                "critical": True,
            },
            "silent_failure_detection": {
                "script": "test-silent-failures.py",
                "description": "Silent failure detection and prevention",
                "critical": True,
            },
            # "version_compatibility": {
            #     "script": "test-version-compatibility.py",
            #     "description": "Version compatibility matrix testing",
            #     "critical": False,  # To be implemented
            # },
            # "integration_resilience": {
            #     "script": "test-integration-resilience.py",
            #     "description": "Integration resilience and recovery testing",
            #     "critical": False,  # To be implemented
            # },
        }

        self.results = {
            "timestamp": datetime.now().isoformat(),
            "test_type": "anticipatory_testing",
            "project_root": str(self.project_root),
            "suites": {},
            "summary": {
                "total_suites": 0,
                "run_suites": 0,
                "passed_suites": 0,
                "failed_suites": 0,
                "critical_failures": 0,
                "total_tests": 0,
                "total_failures": 0,
                "total_errors": 0,
                "overall_success": False,
            },
        }

    def run_suite(
        self, suite_name: str, suite_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Run a single test suite."""
        script_path = self.scripts_dir / suite_config["script"]

        if not script_path.exists():
            return {
                "suite_name": suite_name,
                "success": False,
                "error": f"Test script not found: {script_path}",
                "tests_run": 0,
                "failures": 0,
                "errors": 1,
                "critical": suite_config["critical"],
            }

        print(f"\n🧪 Running {suite_name}")
        print(f"   Description: {suite_config['description']}")
        print(f"   Critical: {suite_config['critical']}")
        print(f"   Script: {suite_config['script']}")

        try:
            # Run test suite
            start_time = time.time()
            result = subprocess.run(
                ["python3", str(script_path)],
                cwd=self.project_root,
                capture_output=True,
                text=True,
                timeout=300,  # 5 minute timeout per suite
            )
            end_time = time.time()

            # Parse results from JSON output if available
            suite_results = self._parse_suite_output(result.stdout, suite_name)
            suite_results.update(
                {
                    "suite_name": suite_name,
                    "success": result.returncode == 0,
                    "duration_seconds": end_time - start_time,
                    "critical": suite_config["critical"],
                    "stdout": result.stdout,
                    "stderr": result.stderr,
                }
            )

            if result.returncode != 0:
                suite_results["errors"] += 1
                if result.stderr:
                    suite_results["error_details"] = result.stderr

            return suite_results

        except subprocess.TimeoutExpired:
            return {
                "suite_name": suite_name,
                "success": False,
                "error": f"Test suite timed out after 5 minutes",
                "tests_run": 0,
                "failures": 0,
                "errors": 1,
                "critical": suite_config["critical"],
                "duration_seconds": 300,
            }
        except Exception as e:
            return {
                "suite_name": suite_name,
                "success": False,
                "error": f"Failed to run test suite: {e}",
                "tests_run": 0,
                "failures": 0,
                "errors": 1,
                "critical": suite_config["critical"],
                "duration_seconds": 0,
            }

    def _parse_suite_output(self, stdout: str, suite_name: str) -> Dict[str, Any]:
        """Parse test suite output for results."""
        try:
            # Look for JSON results in output
            lines = stdout.strip().split("\n")
            for line in reversed(lines):  # Look from end
                if line.startswith("{") and line.endswith("}"):
                    return json.loads(line)
        except (json.JSONDecodeError, Exception):
            pass

        # Fallback: parse from text output
        return {
            "tests_run": 0,
            "failures": 0,
            "errors": 0,
            "success_rate": 0,
            "parsed_output": False,
        }

    def run_all_suites(self, critical_only: bool = False) -> Dict[str, Any]:
        """Run all test suites."""
        print("🚀 Starting Anticipatory Testing Suite")
        print("=" * 60)
        print(f"📅 Started at: {self.results['timestamp']}")
        print(f"📁 Project root: {self.project_root}")

        # Filter suites if critical_only
        suites_to_run = self.test_suites
        if critical_only:
            suites_to_run = {
                name: config
                for name, config in self.test_suites.items()
                if config.get("critical", False)
            }
            print(f"⚠️  Running critical suites only: {list(suites_to_run.keys())}")

        self.results["summary"]["total_suites"] = len(suites_to_run)

        # Run each suite
        for suite_name, suite_config in suites_to_run.items():
            self.results["summary"]["run_suites"] += 1

            suite_result = self.run_suite(suite_name, suite_config)
            self.results["suites"][suite_name] = suite_result

            # Update summary
            if suite_result["success"]:
                self.results["summary"]["passed_suites"] += 1
                print(f"✅ {suite_name}: PASSED")
            else:
                self.results["summary"]["failed_suites"] += 1
                if suite_result.get("critical", False):
                    self.results["summary"]["critical_failures"] += 1
                print(f"❌ {suite_name}: FAILED")
                if "error" in suite_result:
                    print(f"   Error: {suite_result['error']}")

            # Update test counts
            self.results["summary"]["total_tests"] += suite_result.get("tests_run", 0)
            self.results["summary"]["total_failures"] += suite_result.get("failures", 0)
            self.results["summary"]["total_errors"] += suite_result.get("errors", 0)

        # Calculate overall success
        self.results["summary"]["overall_success"] = (
            self.results["summary"]["failed_suites"] == 0
            and self.results["summary"]["critical_failures"] == 0
        )

        # Print summary
        self._print_summary()

        # Save results
        self._save_results()

        return self.results

    def _print_summary(self):
        """Print test summary."""
        summary = self.results["summary"]

        print(f"\n📊 Anticipatory Testing Summary")
        print("=" * 40)
        print(
            f"📈 Overall Success: {'✅ PASS' if summary['overall_success'] else '❌ FAIL'}"
        )
        print(f"🧪 Suites Run: {summary['run_suites']}/{summary['total_suites']}")
        print(f"✅ Passed: {summary['passed_suites']}")
        print(f"❌ Failed: {summary['failed_suites']}")
        print(f"🚨 Critical Failures: {summary['critical_failures']}")
        print(f"🔢 Total Tests: {summary['total_tests']}")
        print(f"💥 Total Failures: {summary['total_failures']}")
        print(f"🐛 Total Errors: {summary['total_errors']}")

        if summary["critical_failures"] > 0:
            print(f"\n🚨 CRITICAL FAILURES DETECTED!")
            print(f"   Integration may break silently with external system changes")
            print(f"   Immediate action required")

        # Print failed suite details
        failed_suites = [
            name
            for name, result in self.results["suites"].items()
            if not result.get("success", False)
        ]

        if failed_suites:
            print(f"\n❌ Failed Suites:")
            for suite_name in failed_suites:
                suite_result = self.results["suites"][suite_name]
                critical_marker = " 🚨" if suite_result.get("critical", False) else ""
                print(f"   • {suite_name}{critical_marker}")
                if "error" in suite_result:
                    print(f"     {suite_result['error']}")

    def _save_results(self):
        """Save test results to file."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        results_file = self.results_dir / f"anticipatory-testing-{timestamp}.json"

        try:
            results_file.write_text(json.dumps(self.results, indent=2))
            print(f"\n📄 Results saved to: {results_file}")

            # Also save latest results
            latest_file = self.results_dir / "latest-anticipatory-testing.json"
            latest_file.write_text(json.dumps(self.results, indent=2))

        except Exception as e:
            print(f"\n⚠️  Failed to save results: {e}")

    def generate_breakage_alert(self) -> Optional[Dict[str, Any]]:
        """Generate breakage alert if critical failures detected."""
        if self.results["summary"]["critical_failures"] == 0:
            return None

        alert = {
            "timestamp": datetime.now().isoformat(),
            "alert_type": "integration_breakage",
            "severity": "critical",
            "title": "🚨 Integration Breakage Detected",
            "summary": f"{self.results['summary']['critical_failures']} critical test suite(s) failed",
            "impact": "Integration with external systems may break silently",
            "immediate_actions": [
                "Review failed test suites",
                "Check external system versions",
                "Run: python3 scripts/test-integration-contracts.py",
                "Run: python3 scripts/test-silent-failures.py",
            ],
            "investigation_steps": [
                "Check bd command availability: bd --version",
                "Check Cody PBT structure: ls -la .cody/",
                "Review git hooks: ls -la .git/hooks/",
                "Check integration logs: cat .cody-beads-integration.log",
            ],
            "failed_suites": [
                name
                for name, result in self.results["suites"].items()
                if not result.get("success", False) and result.get("critical", False)
            ],
        }

        # Save alert
        alert_file = (
            self.results_dir
            / f"breakage-alert-{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        )
        alert_file.write_text(json.dumps(alert, indent=2))

        print(f"\n🚨 BREAKAGE ALERT SAVED: {alert_file}")
        return alert

    def check_external_system_health(self) -> Dict[str, Any]:
        """Check health of external systems."""
        health = {
            "timestamp": datetime.now().isoformat(),
            "systems": {},
            "overall_health": "unknown",
        }

        # Check Beads health
        try:
            bd_result = subprocess.run(
                ["bd", "--version"],
                capture_output=True,
                text=True,
                timeout=10,
            )
            if bd_result.returncode == 0:
                health["systems"]["beads"] = {
                    "available": True,
                    "version": bd_result.stdout.strip(),
                    "status": "healthy",
                }
            else:
                health["systems"]["beads"] = {
                    "available": False,
                    "error": bd_result.stderr,
                    "status": "unhealthy",
                }
        except (subprocess.TimeoutExpired, FileNotFoundError, Exception) as e:
            health["systems"]["beads"] = {
                "available": False,
                "error": str(e),
                "status": "unhealthy",
            }

        # Check Cody PBT health
        cody_indicators = [
            self.project_root / ".cody" / "project" / "build" / "feature-backlog.md",
            self.project_root / ".cody" / "config" / "commands",
            self.project_root / ".cody" / "project" / "plan",
        ]

        cody_available = any(indicator.exists() for indicator in cody_indicators)
        if cody_available:
            health["systems"]["cody"] = {
                "available": True,
                "indicators_found": [
                    str(indicator.name)
                    for indicator in cody_indicators
                    if indicator.exists()
                ],
                "status": "healthy",
            }
        else:
            health["systems"]["cody"] = {
                "available": False,
                "indicators_found": [],
                "status": "unhealthy",
            }

        # Determine overall health
        system_statuses = [system["status"] for system in health["systems"].values()]
        if all(status == "healthy" for status in system_statuses):
            health["overall_health"] = "healthy"
        elif any(status == "unhealthy" for status in system_statuses):
            health["overall_health"] = "degraded"
        else:
            health["overall_health"] = "unknown"

        return health


def main():
    """Main CLI interface."""
    import argparse

    parser = argparse.ArgumentParser(
        description="Anticipatory Testing Suite for External System Integration",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                           # Run all test suites
  %(prog)s --critical-only            # Run only critical suites
  %(prog)s --health-check              # Check external system health
  %(prog)s --suite integration_contracts  # Run specific suite

Critical Suites:
  • integration_contracts     - External system contract validation
  • silent_failure_detection - Silent failure detection and prevention

All Suites:
  • integration_contracts     - External system contract validation
  • silent_failure_detection - Silent failure detection and prevention  
  • version_compatibility    - Version compatibility matrix testing
  • integration_resilience  - Integration resilience and recovery testing

This suite prevents silent breakage as bd and Cody PBT evolve.
        """,
    )

    parser.add_argument(
        "--critical-only",
        action="store_true",
        help="Run only critical test suites (contracts + silent failures)",
    )
    parser.add_argument(
        "--suite",
        choices=list(AnticipatoryTestRunner(Path.cwd()).test_suites.keys()),
        help="Run specific test suite",
    )
    parser.add_argument(
        "--health-check",
        action="store_true",
        help="Check external system health only",
    )
    parser.add_argument(
        "--project-root",
        type=Path,
        default=Path.cwd(),
        help="Project root directory (default: current directory)",
    )

    args = parser.parse_args()

    runner = AnticipatoryTestRunner(args.project_root)

    if args.health_check:
        health = runner.check_external_system_health()
        print(json.dumps(health, indent=2))
        return 0 if health["overall_health"] == "healthy" else 1

    elif args.suite:
        # Run specific suite
        suite_config = runner.test_suites[args.suite]
        result = runner.run_suite(args.suite, suite_config)
        runner.results["suites"][args.suite] = result
        runner.results["summary"] = {
            "total_suites": 1,
            "run_suites": 1,
            "passed_suites": 1 if result["success"] else 0,
            "failed_suites": 0 if result["success"] else 1,
            "critical_failures": 1
            if not result["success"] and result.get("critical")
            else 0,
            "total_tests": result.get("tests_run", 0),
            "total_failures": result.get("failures", 0),
            "total_errors": result.get("errors", 0),
            "overall_success": result["success"],
        }
        runner._print_summary()
        runner._save_results()

        # Generate alert if critical failure
        if not result["success"] and result.get("critical"):
            runner.generate_breakage_alert()

        return 0 if result["success"] else 1

    else:
        # Run all suites
        results = runner.run_all_suites(critical_only=args.critical_only)

        # Generate breakage alert if critical failures
        alert = runner.generate_breakage_alert()
        if alert:
            print(f"\n🚨 INTEGRATION BREAKAGE ALERT GENERATED")
            print(f"   Immediate action required to prevent silent failures")

        return 0 if results["summary"]["overall_success"] else 1


if __name__ == "__main__":
    sys.exit(main())
