#!/usr/bin/env python3
"""
Test cross-platform compatibility of configurations.
"""

import sys
import os
import json
from pathlib import Path

# Add parent directory to path to import opencode_config
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from opencode_config.compatibility import CompatibilityTester
    from opencode_config.validator import ConfigValidator
except ImportError as e:
    print(f"Import error: {e}")
    print("Please install the package with: uv pip install -e .")
    sys.exit(1)

def main():
    """Main test function."""
    print("=== OpenCode Config Compatibility Tests ===")
    
    tester = CompatibilityTester()
    result = tester.test_all()
    
    if result["compatible"]:
        print("\n✅ All compatibility tests passed!")
        print(f"Tests run: {len(result['tests_run'])}")
        return True
    else:
        print("\n❌ Compatibility tests failed!")
        print("Issues found:")
        for issue in result["issues"]:
            print(f"  - {issue}")
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