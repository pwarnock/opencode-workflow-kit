"""Compatibility tester for opencode-config."""

import json
import sys
import platform
from pathlib import Path
from typing import Dict, List, Any, Optional

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
    
    def test_all(self) -> Dict[str, Any]:
        """Run all compatibility tests.
        
        Returns:
            Test results with compatible flag and issues list
        """
        result = {
            "compatible": True,
            "issues": [],
            "tests_run": []
        }
        
        # Test configuration structure
        structure_result = self._test_structure()
        result["tests_run"].append(("structure", structure_result))
        if not structure_result["passed"]:
            result["compatible"] = False
            result["issues"].extend(structure_result["issues"])
        
        # Test schema validation
        validation_result = self._test_validation()
        result["tests_run"].append(("validation", validation_result))
        if not validation_result["passed"]:
            result["compatible"] = False
            result["issues"].extend(validation_result["issues"])
        
        # Test path compatibility
        path_result = self._test_paths()
        result["tests_run"].append(("paths", path_result))
        if not path_result["passed"]:
            result["compatible"] = False
            result["issues"].extend(path_result["issues"])
        
        # Test platform-specific features
        platform_result = self._test_platform_features()
        result["tests_run"].append(("platform", platform_result))
        if not platform_result["passed"]:
            result["compatible"] = False
            result["issues"].extend(platform_result["issues"])
        
        return result
    
    def _test_structure(self) -> Dict[str, Any]:
        """Test configuration directory structure."""
        result = {"passed": True, "issues": []}
        
        required_dirs = [
            self.config_dir / "global",
            self.config_dir / "project",
            Path(__file__).parent.parent / "schemas"
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
            result["issues"].append(f"Configuration directory not found: {self.config_dir}")
            return result
        
        validation_result = self.validator.validate_path(self.config_dir)
        if not validation_result["valid"]:
            result["passed"] = False
            result["issues"].extend([f"Validation error: {error}" for error in validation_result["errors"]])
        
        if validation_result["warnings"]:
            result["issues"].extend([f"Validation warning: {warning}" for warning in validation_result["warnings"]])
        
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
                with open(json_file, 'r') as f:
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
                    issues.append(f"Windows path detected on {current_platform} in {path}: {value}")
            
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
            "Linux": ["linux", "unix"]
        }
        
        if not self.config_dir.exists():
            return result
        
        for json_file in self.config_dir.rglob("*.json"):
            try:
                with open(json_file, 'r') as f:
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