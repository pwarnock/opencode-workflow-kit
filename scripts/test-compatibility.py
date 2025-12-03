#!/usr/bin/env python3
"""
Test cross-platform compatibility of configurations.
"""

import sys
import os
import json
from pathlib import Path

# Add parent directory and packages directory to path to import opencode_config
script_dir = Path(__file__).parent
repo_root = script_dir.parent
packages_dir = repo_root / 'packages'

# Try multiple paths for module resolution
for path_candidate in [
    str(packages_dir),  # When running from repo root
    str(repo_root),     # When running from repo root
    str(script_dir),    # Current script directory
    '.',                # Current working directory
]:
    if path_candidate not in sys.path:
        sys.path.insert(0, path_candidate)

try:
    from opencode_config.compatibility import CompatibilityTester
    from opencode_config.validator import ConfigValidator
except ImportError as e:
    print(f"Import error: {e}")
    print("Please install the package with: uv pip install -e .")
    sys.exit(1)

def main():
    """Main test function."""
    print("=== OpenCode Config Enhanced Compatibility Tests ===")
    
    tester = CompatibilityTester()
    result = tester.test_all()
    
    # Print detailed results
    print(f"\n📊 Test Summary:")
    print(f"  Platform: {result['summary']['platform']} ({result['summary']['architecture']})")
    print(f"  Python: {result['summary']['python_version']}")
    print(f"  Duration: {result['summary']['duration_seconds']:.2f}s")
    print(f"  Tests Run: {result['coverage']['total_tests']}")
    
    print(f"\n🎯 Coverage:")
    print(f"  Test Categories: {', '.join(result['coverage']['test_categories'])}")
    print(f"  Config Types: {', '.join(result['coverage']['config_types_tested'])}")
    
    # Print individual test results
    print(f"\n📋 Test Results:")
    for test_name, test_result in result["tests_run"]:
        status = "✅ PASS" if test_result["passed"] else "❌ FAIL"
        print(f"  {test_name}: {status}")
        if not test_result["passed"] and test_result.get("issues"):
            for issue in test_result["issues"][:3]:  # Show first 3 issues
                print(f"    - {issue}")
            if len(test_result["issues"]) > 3:
                print(f"    ... and {len(test_result['issues']) - 3} more issues")
    
    # Performance metrics
    if result.get("performance") and any(result["performance"].values()):
        print(f"\n⚡ Performance:")
        perf = result["performance"]
        if perf.get("config_load_time"):
            print(f"  Config Load Time: {perf['config_load_time']:.3f}s")
        if perf.get("validation_time"):
            print(f"  Validation Time: {perf['validation_time']:.3f}s")
        if perf.get("memory_usage"):
            print(f"  Memory Usage: {perf['memory_usage']:.1f}MB")
    
    if result["compatible"]:
        print(f"\n✅ All compatibility tests passed!")
        return True
    else:
        print(f"\n❌ Compatibility tests failed!")
        print(f"Issues found: {len(result['issues'])}")
        for issue in result["issues"][:5]:  # Show first 5 issues
            print(f"  - {issue}")
        if len(result["issues"]) > 5:
            print(f"  ... and {len(result['issues']) - 5} more issues")
        return False

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)