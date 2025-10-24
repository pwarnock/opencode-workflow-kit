"""Command line interface for opencode-config."""

import argparse
import sys
from pathlib import Path

from .validator import ConfigValidator
from .compatibility import CompatibilityTester


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="OpenCode Config - Configuration management tool"
    )
    parser.add_argument(
        "command",
        choices=["validate", "test", "setup"],
        help="Command to run"
    )
    parser.add_argument(
        "path",
        nargs="?",
        default="config/",
        help="Path to configuration file or directory"
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Verbose output"
    )
    
    args = parser.parse_args()
    
    if args.command == "validate":
        validator = ConfigValidator()
        result = validator.validate_path(Path(args.path))
        
        if result["valid"]:
            print("✅ Configuration is valid")
            if result.get("warnings"):
                print("⚠️  Warnings:")
                for warning in result["warnings"]:
                    print(f"  - {warning}")
            sys.exit(0)
        else:
            print("❌ Configuration is invalid")
            for error in result["errors"]:
                print(f"  - {error}")
            sys.exit(1)
    
    elif args.command == "test":
        tester = CompatibilityTester()
        result = tester.test_all()
        
        if result["compatible"]:
            print("✅ All compatibility tests passed")
            sys.exit(0)
        else:
            print("❌ Compatibility tests failed")
            for issue in result["issues"]:
                print(f"  - {issue}")
            sys.exit(1)
    
    elif args.command == "setup":
        print("🚀 Setting up OpenCode Config...")
        print("Run './setup.sh' for full setup with uv")
        sys.exit(0)


if __name__ == "__main__":
    main()