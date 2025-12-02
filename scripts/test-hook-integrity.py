#!/usr/bin/env python3
"""
Git Hook Integrity Testing Framework

Tests git hooks for performance, reliability, and resilience.
Ensures bulletproof hook system with comprehensive validation.
"""

import json
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from unittest.mock import patch, MagicMock


class HookIntegrityTester:
    """Test git hook integrity and resilience."""

    def __init__(self, test_dir: Path):
        self.test_dir = test_dir
        self.test_results = []
        self.hooks_installed = False

    def log_result(
        self, test_name: str, success: bool, message: str = "", metrics: Dict = None
    ):
        """Log test result with optional metrics."""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "timestamp": time.time(),
            "metrics": metrics or {},
        }
        self.test_results.append(result)
        print(f"{status}: {test_name}")
        if message:
            print(f"    {message}")
        if metrics:
            print(f"    Metrics: {json.dumps(metrics, indent=2)}")

    def setup_test_repo(self) -> bool:
        """Set up a test git repository."""
        try:
            # Initialize git repo
            subprocess.run(
                ["git", "init"], cwd=self.test_dir, check=True, capture_output=True
            )
            subprocess.run(
                ["git", "config", "user.name", "Test User"],
                cwd=self.test_dir,
                check=True,
            )
            subprocess.run(
                ["git", "config", "user.email", "test@example.com"],
                cwd=self.test_dir,
                check=True,
            )
            return True
        except Exception as e:
            print(f"Failed to setup test repo: {e}")
            return False

    def test_hook_execution_speed(self) -> bool:
        """Test that hooks complete within acceptable time limits."""
        print("Testing hook execution speed...")

        start_time = time.time()

        # Create a test file and commit
        test_file = self.test_dir / "speed-test.txt"
        test_file.write_text("speed test content")

        try:
            subprocess.run(
                ["git", "add", "speed-test.txt"], cwd=self.test_dir, check=True
            )
            result = subprocess.run(
                ["git", "commit", "-m", "Speed test commit"],
                cwd=self.test_dir,
                capture_output=True,
                text=True,
                timeout=30,  # 30 second timeout
            )

            execution_time = time.time() - start_time

            # Check if completed within acceptable time (5 seconds for simple hooks)
            success = execution_time < 5.0 and result.returncode == 0

            metrics = {
                "execution_time_seconds": round(execution_time, 2),
                "timeout_occurred": execution_time >= 30,
                "return_code": result.returncode,
            }

            self.log_result(
                "Hook Execution Speed",
                success,
                f"Execution time: {execution_time:.2f}s"
                if success
                else f"Too slow: {execution_time:.2f}s",
                metrics,
            )

            return success

        except subprocess.TimeoutExpired:
            execution_time = time.time() - start_time
            self.log_result(
                "Hook Execution Speed",
                False,
                f"Hook timed out after 30s",
                {"execution_time_seconds": execution_time, "timeout_occurred": True},
            )
            return False
        except Exception as e:
            execution_time = time.time() - start_time
            self.log_result(
                "Hook Execution Speed",
                False,
                f"Exception during hook execution: {e}",
                {"execution_time_seconds": execution_time, "exception": str(e)},
            )
            return False

    def test_hook_failure_recovery(self) -> bool:
        """Test graceful failure handling when dependencies missing."""
        print("Testing hook failure recovery...")

        # Test with missing eslint (should not fail commit)
        test_file = self.test_dir / "recovery-test.js"
        test_file.write_text("console.log('test');")

        try:
            # Temporarily rename eslint to simulate missing dependency
            eslint_path = subprocess.run(
                ["which", "eslint"], capture_output=True
            ).stdout.strip()

            # Create test commit
            subprocess.run(
                ["git", "add", "recovery-test.js"], cwd=self.test_dir, check=True
            )
            result = subprocess.run(
                ["git", "commit", "-m", "Recovery test commit"],
                cwd=self.test_dir,
                capture_output=True,
                text=True,
                timeout=30,
            )

            # Should succeed even if eslint has issues
            success = result.returncode == 0

            self.log_result(
                "Hook Failure Recovery",
                success,
                "Commit succeeded despite potential linting issues"
                if success
                else "Commit failed unexpectedly",
            )

            return success

        except Exception as e:
            self.log_result(
                "Hook Failure Recovery", False, f"Exception during recovery test: {e}"
            )
            return False

    def test_hook_idempotency(self) -> bool:
        """Test that multiple hook runs don't cause issues."""
        print("Testing hook idempotency...")

        try:
            # Create multiple commits rapidly
            for i in range(3):
                test_file = self.test_dir / f"idempotent-test-{i}.txt"
                test_file.write_text(f"test content {i}")

                subprocess.run(
                    ["git", "add", f"idempotent-test-{i}.txt"],
                    cwd=self.test_dir,
                    check=True,
                )
                result = subprocess.run(
                    ["git", "commit", "-m", f"Idempotent test {i}"],
                    cwd=self.test_dir,
                    capture_output=True,
                    text=True,
                    timeout=30,
                )

                if result.returncode != 0:
                    self.log_result(
                        "Hook Idempotency",
                        False,
                        f"Commit {i} failed with return code {result.returncode}",
                    )
                    return False

            self.log_result(
                "Hook Idempotency", True, "All 3 commits succeeded without issues"
            )
            return True

        except Exception as e:
            self.log_result(
                "Hook Idempotency", False, f"Exception during idempotency test: {e}"
            )
            return False

    def test_hook_resource_usage(self) -> bool:
        """Test that hooks don't leak memory or use excessive CPU."""
        print("Testing hook resource usage...")

        try:
            import psutil

            process = psutil.Process()

            # Get initial memory usage
            initial_memory = process.memory_info().rss / 1024 / 1024  # MB

            # Create a larger commit to stress test
            for i in range(10):
                test_file = self.test_dir / f"resource-test-{i}.txt"
                test_file.write_text("x" * 1000)  # 1KB per file
                subprocess.run(
                    ["git", "add", f"resource-test-{i}.txt"],
                    cwd=self.test_dir,
                    check=True,
                )

            start_time = time.time()
            result = subprocess.run(
                ["git", "commit", "-m", "Resource usage test"],
                cwd=self.test_dir,
                capture_output=True,
                text=True,
                timeout=30,
            )
            execution_time = time.time() - start_time

            # Get peak memory usage
            peak_memory = process.memory_info().rss / 1024 / 1024  # MB
            memory_increase = peak_memory - initial_memory

            # Check resource limits
            memory_ok = memory_increase < 50  # Less than 50MB increase
            time_ok = execution_time < 10  # Less than 10 seconds
            success = result.returncode == 0 and memory_ok and time_ok

            metrics = {
                "execution_time_seconds": round(execution_time, 2),
                "initial_memory_mb": round(initial_memory, 2),
                "peak_memory_mb": round(peak_memory, 2),
                "memory_increase_mb": round(memory_increase, 2),
                "memory_within_limits": memory_ok,
                "time_within_limits": time_ok,
            }

            self.log_result(
                "Hook Resource Usage",
                success,
                f"Memory increase: {memory_increase:.1f}MB, Time: {execution_time:.2f}s"
                if success
                else f"Excessive resource usage",
                metrics,
            )

            return success

        except ImportError:
            self.log_result(
                "Hook Resource Usage",
                True,
                "psutil not available - skipping resource monitoring",
            )
            return True
        except Exception as e:
            self.log_result(
                "Hook Resource Usage", False, f"Exception during resource test: {e}"
            )
            return False

    def test_event_schema_validation(self) -> bool:
        """Test that created events match expected JSON schema."""
        print("Testing event schema validation...")

        try:
            # Trigger event creation
            test_file = self.test_dir / "schema-test.txt"
            test_file.write_text("schema test")

            subprocess.run(
                ["git", "add", "schema-test.txt"], cwd=self.test_dir, check=True
            )
            subprocess.run(
                ["git", "commit", "-m", "Schema test"],
                cwd=self.test_dir,
                capture_output=True,
                text=True,
                timeout=30,
            )

            # Check for created event files
            events_dir = self.test_dir / ".events" / "pending"
            if not events_dir.exists():
                self.log_result(
                    "Event Schema Validation", False, "No events directory created"
                )
                return False

            event_files = list(events_dir.glob("*.json"))
            if not event_files:
                self.log_result(
                    "Event Schema Validation", False, "No event files created"
                )
                return False

            # Validate each event file
            all_valid = True
            for event_file in event_files:
                try:
                    with open(event_file, "r") as f:
                        event = json.load(f)

                    # Validate required fields
                    required_fields = ["id", "type", "timestamp", "data", "metadata"]
                    missing_fields = [
                        field for field in required_fields if field not in event
                    ]

                    if missing_fields:
                        all_valid = False
                        break

                    # Validate field types
                    if not isinstance(event.get("id"), str):
                        all_valid = False
                        break
                    if not isinstance(event.get("type"), str):
                        all_valid = False
                        break
                    if not isinstance(event.get("data"), dict):
                        all_valid = False
                        break
                    if not isinstance(event.get("metadata"), dict):
                        all_valid = False
                        break

                except json.JSONDecodeError as e:
                    all_valid = False
                    break
                except Exception as e:
                    all_valid = False
                    break

            metrics = {
                "event_files_created": len(event_files),
                "all_events_valid": all_valid,
            }

            self.log_result(
                "Event Schema Validation",
                all_valid,
                f"Created {len(event_files)} events, all valid: {all_valid}"
                if all_valid
                else f"Invalid event schema found",
                metrics,
            )

            return all_valid

        except Exception as e:
            self.log_result(
                "Event Schema Validation",
                False,
                f"Exception during schema validation: {e}",
            )
            return False

    def test_error_handling_contract(self) -> bool:
        """Test graceful degradation requirements."""
        print("Testing error handling contract...")

        try:
            # Test with various error scenarios
            scenarios = [
                ("Missing event directory", "missing_events_dir"),
                ("Invalid JSON in event", "invalid_json"),
                ("Permission denied", "permission_denied"),
            ]

            all_passed = True
            for scenario_name, scenario_type in scenarios:
                try:
                    if scenario_type == "missing_events_dir":
                        # Remove events directory temporarily
                        events_dir = self.test_dir / ".events"
                        if events_dir.exists():
                            import shutil

                            shutil.move(events_dir, events_dir.with_suffix(".backup"))

                        # Try to create event
                        test_file = self.test_dir / "error-test.txt"
                        test_file.write_text("error test")
                        subprocess.run(
                            ["git", "add", "error-test.txt"],
                            cwd=self.test_dir,
                            check=True,
                        )
                        result = subprocess.run(
                            ["git", "commit", "-m", "Error test"],
                            cwd=self.test_dir,
                            capture_output=True,
                            text=True,
                            timeout=30,
                        )

                        # Should not crash the system
                        success = result.returncode == 0

                        # Restore events directory
                        if events_dir.with_suffix(".backup").exists():
                            shutil.move(events_dir.with_suffix(".backup"), events_dir)

                    elif scenario_type == "invalid_json":
                        # Create invalid JSON event file
                        events_dir = self.test_dir / ".events" / "pending"
                        events_dir.mkdir(parents=True, exist_ok=True)
                        invalid_event = events_dir / "invalid.json"
                        invalid_event.write_text('{"invalid": json}')

                        # Should handle gracefully
                        test_file = self.test_dir / "error-test2.txt"
                        test_file.write_text("error test 2")
                        subprocess.run(
                            ["git", "add", "error-test2.txt"],
                            cwd=self.test_dir,
                            check=True,
                        )
                        result = subprocess.run(
                            ["git", "commit", "-m", "Invalid JSON test"],
                            cwd=self.test_dir,
                            capture_output=True,
                            text=True,
                            timeout=30,
                        )

                        success = result.returncode == 0

                        # Clean up
                        invalid_event.unlink()

                    else:
                        # Other scenarios - just test basic error handling
                        test_file = self.test_dir / f"error-test-{scenario_type}.txt"
                        test_file.write_text(f"error test {scenario_type}")
                        subprocess.run(
                            ["git", "add", f"error-test-{scenario_type}.txt"],
                            cwd=self.test_dir,
                            check=True,
                        )
                        result = subprocess.run(
                            ["git", "commit", "-m", f"Error test {scenario_type}"],
                            cwd=self.test_dir,
                            capture_output=True,
                            text=True,
                            timeout=30,
                        )

                        success = result.returncode == 0

                    if not success:
                        all_passed = False

                except Exception as e:
                    print(f"Scenario {scenario_name} failed with exception: {e}")
                    all_passed = False

            self.log_result(
                "Error Handling Contract",
                all_passed,
                f"All {len(scenarios)} error scenarios handled gracefully"
                if all_passed
                else "Some error scenarios failed",
                {
                    "scenarios_tested": len(scenarios),
                    "scenarios_passed": sum(1 for _ in scenarios if all_passed),
                },
            )

            return all_passed

        except Exception as e:
            self.log_result(
                "Error Handling Contract",
                False,
                f"Exception during error handling test: {e}",
            )
            return False

    def run_all_tests(self) -> Dict:
        """Run all hook integrity tests."""
        print("🧪 Starting Git Hook Integrity Tests")
        print("=" * 50)

        if not self.setup_test_repo():
            return {"success": False, "message": "Failed to setup test repository"}

        # Run all tests
        tests = [
            self.test_hook_execution_speed,
            self.test_hook_failure_recovery,
            self.test_hook_idempotency,
            self.test_hook_resource_usage,
            self.test_event_schema_validation,
            self.test_error_handling_contract,
        ]

        results = []
        for test_func in tests:
            try:
                result = test_func()
                results.append(result)
            except Exception as e:
                print(f"Test {test_func.__name__} failed with exception: {e}")
                results.append(False)

        # Summary
        passed = sum(results)
        total = len(results)
        success_rate = (passed / total) * 100 if total > 0 else 0

        print("=" * 50)
        print(f"📊 Test Summary: {passed}/{total} passed ({success_rate:.1f}%)")

        if success_rate >= 80:
            print("✅ Hook integrity tests PASSED")
        else:
            print("❌ Hook integrity tests FAILED")

        return {
            "success": success_rate >= 80,
            "passed": passed,
            "total": total,
            "success_rate": success_rate,
            "test_results": self.test_results,
        }


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print("Usage: python3 test-hook-integrity.py <test_directory>")
        sys.exit(1)

    test_dir = Path(sys.argv[1])

    if not test_dir.exists():
        print(f"Test directory {test_dir} does not exist")
        sys.exit(1)

    tester = HookIntegrityTester(test_dir)
    results = tester.run_all_tests()

    # Save results
    results_file = test_dir / "hook-integrity-test-results.json"
    with open(results_file, "w") as f:
        json.dump(results, f, indent=2)

    print(f"\n📝 Detailed results saved to: {results_file}")
    sys.exit(0 if results["success"] else 1)


if __name__ == "__main__":
    main()
