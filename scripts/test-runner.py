#!/usr/bin/env python3
"""
Automated test runner for opencode-config across multiple environments.
"""

import sys
import os
import json
import argparse
import subprocess
import tempfile
import shutil
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional

# Add parent directory to path to import opencode_config
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from opencode_config.compatibility import CompatibilityTester
    from opencode_config.validator import ConfigValidator
except ImportError as e:
    print(f"Import error: {e}")
    print("Please install the package with: uv pip install -e .")
    sys.exit(1)


class TestRunner:
    """Automated test runner for cross-platform testing."""
    
    def __init__(self, config_dir: Optional[Path] = None):
        """Initialize test runner.
        
        Args:
            config_dir: Directory containing configuration files
        """
        self.config_dir = config_dir or Path(__file__).parent.parent / "config"
        self.results = []
        self.start_time = datetime.now()
        
    def run_all_tests(self, environments: List[str] = None) -> Dict[str, Any]:
        """Run tests across specified environments.
        
        Args:
            environments: List of environments to test (default: current platform)
            
        Returns:
            Test results summary
        """
        if not environments:
            environments = [self._get_current_environment()]
        
        print(f"🚀 Starting automated test run across {len(environments)} environment(s)")
        print(f"📅 Started at: {self.start_time.isoformat()}")
        
        for env in environments:
            print(f"\n📍 Testing environment: {env}")
            env_result = self._test_environment(env)
            self.results.append(env_result)
        
        # Generate summary
        summary = self._generate_summary()
        self._print_summary(summary)
        
        return summary
    
    def _get_current_environment(self) -> str:
        """Get current environment identifier."""
        import platform
        return f"{platform.system().lower()}-{platform.machine().lower()}"
    
    def _test_environment(self, environment: str) -> Dict[str, Any]:
        """Test a specific environment."""
        env_result = {
            "environment": environment,
            "timestamp": datetime.now().isoformat(),
            "tests": {},
            "success": True,
            "issues": []
        }
        
        try:
            # Run compatibility tests
            print(f"  🧪 Running compatibility tests...")
            tester = CompatibilityTester(self.config_dir)
            compat_result = tester.test_all()
            env_result["tests"]["compatibility"] = compat_result
            
            if not compat_result["compatible"]:
                env_result["success"] = False
                env_result["issues"].extend(compat_result["issues"])
            
            # Run validation tests
            print(f"  ✅ Running validation tests...")
            validator = ConfigValidator()
            valid_result = validator.validate_path(self.config_dir)
            env_result["tests"]["validation"] = valid_result
            
            if not valid_result["valid"]:
                env_result["success"] = False
                env_result["issues"].extend(valid_result["errors"])
            
            # Run template tests
            print(f"  📋 Running template tests...")
            template_result = self._test_templates()
            env_result["tests"]["templates"] = template_result
            
            if not template_result["passed"]:
                env_result["success"] = False
                env_result["issues"].extend(template_result["issues"])
            
            # Run installation tests
            print(f"  📦 Running installation tests...")
            install_result = self._test_installation_scenarios()
            env_result["tests"]["installation"] = install_result
            
            if not install_result["passed"]:
                env_result["success"] = False
                env_result["issues"].extend(install_result["issues"])
            
        except Exception as e:
            env_result["success"] = False
            env_result["issues"].append(f"Environment test failed: {e}")
        
        status = "✅ PASS" if env_result["success"] else "❌ FAIL"
        print(f"  {status} Environment {environment}")
        
        return env_result
    
    def _test_templates(self) -> Dict[str, Any]:
        """Test template functionality."""
        result = {"passed": True, "issues": [], "templates_tested": []}
        
        templates_dir = Path(__file__).parent.parent / "templates"
        if not templates_dir.exists():
            result["issues"].append("Templates directory not found")
            result["passed"] = False
            return result
        
        for template_file in templates_dir.glob("*.json"):
            try:
                # Test template processing
                with tempfile.TemporaryDirectory() as temp_dir:
                    temp_path = Path(temp_dir)
                    
                    # Run environment template script
                    cmd = [
                        sys.executable, 
                        str(Path(__file__).parent / "environment-templates.py"),
                        "apply", 
                        template_file.stem,
                        str(temp_path)
                    ]
                    
                    process_result = subprocess.run(
                        cmd, 
                        capture_output=True, 
                        text=True,
                        timeout=30
                    )
                    
                    if process_result.returncode != 0:
                        result["passed"] = False
                        result["issues"].append(
                            f"Template {template_file.name} processing failed: {process_result.stderr}"
                        )
                    else:
                        result["templates_tested"].append(template_file.name)
                
            except subprocess.TimeoutExpired:
                result["passed"] = False
                result["issues"].append(f"Template {template_file.name} processing timed out")
            except Exception as e:
                result["passed"] = False
                result["issues"].append(f"Template {template_file.name} error: {e}")
        
        return result
    
    def _test_installation_scenarios(self) -> Dict[str, Any]:
        """Test installation scenarios."""
        result = {"passed": True, "issues": [], "scenarios_tested": []}
        
        # Test setup script
        try:
            with tempfile.TemporaryDirectory() as temp_dir:
                temp_path = Path(temp_dir)
                
                # Copy setup script
                setup_script = Path(__file__).parent.parent / "setup.sh"
                if setup_script.exists():
                    setup_dest = temp_path / "setup.sh"
                    shutil.copy2(setup_script, setup_dest)
                    setup_dest.chmod(0o755)
                    
                    # Run setup script in test mode from the original project directory
                    cmd = [str(setup_dest), "--test", "--dry-run"]
                    process_result = subprocess.run(
                        cmd,
                        capture_output=True,
                        text=True,
                        timeout=60,
                        cwd=Path(__file__).parent.parent  # Run from project root
                    )
                    
                    if process_result.returncode != 0:
                        result["passed"] = False
                        result["issues"].append(f"Setup script failed: {process_result.stderr}")
                    else:
                        result["scenarios_tested"].append("setup_script")
                else:
                    result["issues"].append("Setup script not found")
                    result["passed"] = False
                    
        except subprocess.TimeoutExpired:
            result["passed"] = False
            result["issues"].append("Setup script test timed out")
        except Exception as e:
            result["passed"] = False
            result["issues"].append(f"Installation test error: {e}")
        
        return result
    
    def _generate_summary(self) -> Dict[str, Any]:
        """Generate test summary."""
        end_time = datetime.now()
        duration = (end_time - self.start_time).total_seconds()
        
        total_environments = len(self.results)
        successful_environments = sum(1 for r in self.results if r["success"])
        
        summary = {
            "total_environments": total_environments,
            "successful_environments": successful_environments,
            "failed_environments": total_environments - successful_environments,
            "success_rate": successful_environments / total_environments if total_environments > 0 else 0,
            "duration_seconds": duration,
            "start_time": self.start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "results": self.results,
            "overall_success": successful_environments == total_environments
        }
        
        return summary
    
    def _print_summary(self, summary: Dict[str, Any]):
        """Print test summary."""
        print(f"\n{'='*60}")
        print(f"🏁 Test Run Summary")
        print(f"{'='*60}")
        
        print(f"📊 Overall Results:")
        print(f"  Environments Tested: {summary['total_environments']}")
        print(f"  Successful: {summary['successful_environments']}")
        print(f"  Failed: {summary['failed_environments']}")
        print(f"  Success Rate: {summary['success_rate']:.1%}")
        print(f"  Duration: {summary['duration_seconds']:.2f}s")
        
        print(f"\n📋 Environment Details:")
        for result in summary["results"]:
            status = "✅ PASS" if result["success"] else "❌ FAIL"
            print(f"  {result['environment']}: {status}")
            if result["issues"]:
                for issue in result["issues"][:3]:
                    print(f"    - {issue}")
                if len(result["issues"]) > 3:
                    print(f"    ... and {len(result['issues']) - 3} more issues")
        
        overall_status = "✅ ALL TESTS PASSED" if summary["overall_success"] else "❌ SOME TESTS FAILED"
        print(f"\n{overall_status}")
        
        # Save results to file
        results_file = Path(__file__).parent.parent / "test-results.json"
        with open(results_file, 'w') as f:
            json.dump(summary, f, indent=2)
        print(f"\n📄 Detailed results saved to: {results_file}")


def main():
    """Main function."""
    parser = argparse.ArgumentParser(description="Automated test runner for opencode-config")
    parser.add_argument(
        "--environments", 
        nargs="+", 
        help="Environments to test (default: current platform)"
    )
    parser.add_argument(
        "--config-dir",
        type=Path,
        help="Configuration directory to test"
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="Output file for results (default: test-results.json)"
    )
    
    args = parser.parse_args()
    
    runner = TestRunner(args.config_dir)
    result = runner.run_all_tests(args.environments)
    
    sys.exit(0 if result["overall_success"] else 1)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n⚠️  Test run interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Test runner failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)