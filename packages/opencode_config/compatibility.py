"""Compatibility tester for opencode-config."""

import json
import platform
import shutil
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from .validator import ConfigValidator


class CompatibilityTester:
    """Tests configuration compatibility across platforms."""

    def __init__(self, config_dir: Optional[Path] = None):
        """Initialize tester.

        Args:
            config_dir: Directory containing configuration files
        """
        self.config_dir = config_dir or Path(__file__).parent.parent / "config"
        self.validator = ConfigValidator()
        self.test_results = []
        self.start_time = datetime.now()

        # Platform detection
        self.current_platform = platform.system()
        self.architecture = platform.machine()
        self.python_version = platform.python_version()

        # Test coverage tracking
        self.coverage = {
            "platforms_tested": set(),
            "config_types_tested": set(),
            "test_categories": set(),
        }

    def test_all(self) -> Dict[str, Any]:
        """Run all compatibility tests.

        Returns:
            Test results with compatible flag and issues list
        """
        self.start_time = datetime.now()
        self.test_results = []

        result = {
            "compatible": True,
            "issues": [],
            "tests_run": [],
            "coverage": {},
            "performance": {},
            "summary": {},
        }

        # Test configuration structure
        structure_result = self._test_structure()
        self.test_results.append(("structure", structure_result))
        self.coverage["test_categories"].add("structure")
        if not structure_result["passed"]:
            result["compatible"] = False
            result["issues"].extend(structure_result["issues"])

        # Test schema validation
        validation_result = self._test_validation()
        self.test_results.append(("validation", validation_result))
        self.coverage["test_categories"].add("validation")
        if not validation_result["passed"]:
            result["compatible"] = False
            result["issues"].extend(validation_result["issues"])

        # Test path compatibility
        path_result = self._test_paths()
        self.test_results.append(("paths", path_result))
        self.coverage["test_categories"].add("paths")
        if not path_result["passed"]:
            result["compatible"] = False
            result["issues"].extend(path_result["issues"])

        # Test platform-specific features
        platform_result = self._test_platform_features()
        self.test_results.append(("platform", platform_result))
        self.coverage["test_categories"].add("platform")
        if not platform_result["passed"]:
            result["compatible"] = False
            result["issues"].extend(platform_result["issues"])

        # Test template system
        template_result = self._test_templates()
        self.test_results.append(("templates", template_result))
        self.coverage["test_categories"].add("templates")
        if not template_result["passed"]:
            result["compatible"] = False
            result["issues"].extend(template_result["issues"])

        # Test installation scenarios
        install_result = self._test_installation_scenarios()
        self.test_results.append(("installation", install_result))
        self.coverage["test_categories"].add("installation")
        if not install_result["passed"]:
            result["compatible"] = False
            result["issues"].extend(install_result["issues"])

        # Performance testing
        performance_result = self._test_performance()
        result["performance"] = performance_result

        # Generate summary
        end_time = datetime.now()
        duration = (end_time - self.start_time).total_seconds()

        result["tests_run"] = self.test_results
        result["coverage"] = {
            "platforms_tested": list(self.coverage["platforms_tested"]),
            "config_types_tested": list(self.coverage["config_types_tested"]),
            "test_categories": list(self.coverage["test_categories"]),
            "total_tests": len(self.test_results),
        }
        result["summary"] = {
            "duration_seconds": duration,
            "platform": self.current_platform,
            "architecture": self.architecture,
            "python_version": self.python_version,
            "timestamp": end_time.isoformat(),
        }

        return result

    def _test_structure(self) -> Dict[str, Any]:
        """Test configuration directory structure."""
        result = {"passed": True, "issues": []}

        required_dirs = [
            self.config_dir / "global",
            self.config_dir / "project",
            Path(__file__).parent.parent.parent / "schemas",
        ]

        for dir_path in required_dirs:
            if not dir_path.exists():
                result["passed"] = False
                result["issues"].append(f"Missing required directory: {dir_path}")
            elif not dir_path.is_dir():
                result["passed"] = False
                result["issues"].append(f"Path is not a directory: {dir_path}")

        return result

    def _test_validation(self) -> Dict[str, Any]:
        """Test schema validation."""
        result = {"passed": True, "issues": []}

        if not self.config_dir.exists():
            result["passed"] = False
            result["issues"].append(
                f"Configuration directory not found: {self.config_dir}"
            )
            return result

        validation_result = self.validator.validate_path(self.config_dir)
        if not validation_result["valid"]:
            result["passed"] = False
            result["issues"].extend(
                [f"Validation error: {error}" for error in validation_result["errors"]]
            )

        if validation_result["warnings"]:
            result["issues"].extend(
                [
                    f"Validation warning: {warning}"
                    for warning in validation_result["warnings"]
                ]
            )

        return result

    def _test_paths(self) -> Dict[str, Any]:
        """Test path compatibility across platforms."""
        result = {"passed": True, "issues": []}

        if not self.config_dir.exists():
            return result

        # Check for Windows-style paths in Unix environments
        current_platform = platform.system()
        for json_file in self.config_dir.rglob("*.json"):
            try:
                with open(json_file) as f:
                    config = json.load(f)

                path_issues = self._check_paths_in_config(config, current_platform)
                result["issues"].extend(path_issues)

            except Exception:
                continue  # Skip files that can't be parsed

        if result["issues"]:
            result["passed"] = False

        return result

    def _check_paths_in_config(self, config: Any, current_platform: str) -> List[str]:
        """Check for path compatibility issues in configuration."""
        issues = []

        def check_value(value, path=""):
            if isinstance(value, str):
                # Skip Windows path checks if we're inside platform_overrides.windows
                if path.startswith("platform_overrides.windows."):
                    return

                # Check for backslashes in paths on Unix
                if current_platform != "Windows" and "\\" in value and "/" in value:
                    issues.append(f"Mixed path separators in {path}: {value}")

                # Check for Windows drive letters on non-Windows
                if current_platform != "Windows" and len(value) > 1 and value[1] == ":":
                    issues.append(
                        f"Windows path detected on {current_platform} in {path}: {value}"
                    )

            elif isinstance(value, dict):
                for key, val in value.items():
                    check_value(val, f"{path}.{key}" if path else key)

            elif isinstance(value, list):
                for i, val in enumerate(value):
                    check_value(val, f"{path}[{i}]")

        check_value(config)
        return issues

    def _test_platform_features(self) -> Dict[str, Any]:
        """Test platform-specific features."""
        result = {"passed": True, "issues": []}

        current_platform = platform.system()

        # Test platform-specific configurations
        platform_configs = {
            "Windows": ["windows", "win32"],
            "Darwin": ["darwin", "macos", "mac"],
            "Linux": ["linux", "unix"],
        }

        if not self.config_dir.exists():
            return result

        for json_file in self.config_dir.rglob("*.json"):
            try:
                with open(json_file) as f:
                    config = json.load(f)

                # Check for platform overrides
                if "platform_overrides" in config:
                    overrides = config["platform_overrides"]

                    # Check if current platform has overrides
                    platform_keys = platform_configs.get(current_platform, [])
                    has_override = any(key in overrides for key in platform_keys)

                    if not has_override and overrides:
                        result["issues"].append(
                            f"No platform override for {current_platform} in {json_file.name}"
                        )

            except Exception:
                continue

        return result

    def _test_templates(self) -> Dict[str, Any]:
        """Test environment template system."""
        result = {"passed": True, "issues": [], "templates_tested": []}

        templates_dir = Path(__file__).parent.parent.parent / "templates"
        if not templates_dir.exists():
            result["issues"].append("Templates directory not found")
            result["passed"] = False
            return result

        for template_file in templates_dir.glob("*.json"):
            try:
                with open(template_file) as f:
                    template = json.load(f)

                # Validate template structure
                required_fields = ["name", "description", "version", "configurations"]
                for field in required_fields:
                    if field not in template:
                        result["passed"] = False
                        result["issues"].append(
                            f"Template {template_file.name} missing required field: {field}"
                        )

                # Validate agent configuration structure
                if (
                    "configurations" in template
                    and "agents/default.json" in template["configurations"]
                ):
                    agent_config = template["configurations"]["agents/default.json"]
                    agent_required = [
                        "name",
                        "description",
                        "agent",
                        "environment",
                        "behavior",
                        "security",
                    ]
                    for field in agent_required:
                        if field not in agent_config:
                            result["passed"] = False
                            result["issues"].append(
                                f"Template {template_file.name} agent config missing field: {field}"
                            )

                # Test template processing
                processed_result = self._test_template_processing(template)
                if not processed_result["passed"]:
                    result["passed"] = False
                    result["issues"].extend(processed_result["issues"])

                result["templates_tested"].append(template_file.name)
                self.coverage["config_types_tested"].add(
                    f"template_{template_file.stem}"
                )

            except Exception as e:
                result["passed"] = False
                result["issues"].append(
                    f"Error processing template {template_file.name}: {e}"
                )

        return result

    def _test_template_processing(self, template: Dict[str, Any]) -> Dict[str, Any]:
        """Test template processing and substitution."""
        result = {"passed": True, "issues": []}

        # Test environment variable substitution
        if "environment" in template:
            env_section = template["environment"]
            if isinstance(env_section, dict):
                for _key, value in env_section.items():
                    if isinstance(value, str) and "${" in value:
                        # Test that environment variables are properly formatted
                        if not value.startswith("${") or not value.endswith("}"):
                            result["passed"] = False
                            result["issues"].append(
                                f"Invalid environment variable format: {value}"
                            )

        return result

    def _test_installation_scenarios(self) -> Dict[str, Any]:
        """Test various installation scenarios."""
        result = {"passed": True, "issues": [], "scenarios_tested": []}

        # Test global installation scenario
        global_result = self._test_global_installation()
        result["scenarios_tested"].append("global")
        if not global_result["passed"]:
            result["passed"] = False
            result["issues"].extend(global_result["issues"])

        # Test project installation scenario
        project_result = self._test_project_installation()
        result["scenarios_tested"].append("project")
        if not project_result["passed"]:
            result["passed"] = False
            result["issues"].extend(project_result["issues"])

        return result

    def _test_global_installation(self) -> Dict[str, Any]:
        """Test global installation scenario."""
        result = {"passed": True, "issues": []}

        # Create temporary directory to simulate global config
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_config = Path(temp_dir) / "opencode"

            try:
                # Copy global configuration
                global_src = self.config_dir / "global"
                if global_src.exists():
                    shutil.copytree(global_src, temp_config)

                    # Validate copied configuration
                    validation_result = self.validator.validate_path(temp_config)
                    if not validation_result["valid"]:
                        result["passed"] = False
                        result["issues"].extend(
                            [
                                f"Global installation validation error: {error}"
                                for error in validation_result["errors"]
                            ]
                        )
                else:
                    result["passed"] = False
                    result["issues"].append("Global configuration directory not found")

            except Exception as e:
                result["passed"] = False
                result["issues"].append(f"Global installation test failed: {e}")

        return result

    def _test_project_installation(self) -> Dict[str, Any]:
        """Test project installation scenario."""
        result = {"passed": True, "issues": []}

        # Create temporary directory to simulate project
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_project = Path(temp_dir) / ".opencode"

            try:
                # Copy project configuration
                project_src = self.config_dir / "project"
                if project_src.exists():
                    shutil.copytree(project_src, temp_project)

                    # Validate copied configuration
                    validation_result = self.validator.validate_path(temp_project)
                    if not validation_result["valid"]:
                        result["passed"] = False
                        result["issues"].extend(
                            [
                                f"Project installation validation error: {error}"
                                for error in validation_result["errors"]
                            ]
                        )
                else:
                    result["passed"] = False
                    result["issues"].append("Project configuration directory not found")

            except Exception as e:
                result["passed"] = False
                result["issues"].append(f"Project installation test failed: {e}")

        return result

    def _test_performance(self) -> Dict[str, Any]:
        """Test performance metrics."""
        result = {"config_load_time": 0, "validation_time": 0, "memory_usage": 0}

        try:
            import time

            import psutil

            process = psutil.Process()

            # Test configuration loading performance
            start_time = time.time()
            if self.config_dir.exists():
                for json_file in self.config_dir.rglob("*.json"):
                    with open(json_file) as f:
                        json.load(f)
            result["config_load_time"] = time.time() - start_time

            # Test validation performance
            start_time = time.time()
            self.validator.validate_path(self.config_dir)
            result["validation_time"] = time.time() - start_time

            # Memory usage
            result["memory_usage"] = process.memory_info().rss / 1024 / 1024  # MB

        except ImportError:
            # psutil not available, skip performance tests
            pass
        except Exception as e:
            result["error"] = str(e)

        return result
