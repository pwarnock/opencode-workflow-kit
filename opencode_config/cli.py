"""Command line interface for opencode-config."""

import argparse
import json
import subprocess
import sys
from pathlib import Path

from .validator import ConfigValidator
from .compatibility import CompatibilityTester


def handle_version_add(args):
    """Handle version add command with :cody integration."""
    version_number = args.version_number
    version_name = args.version_name
    features = args.features
    
    if not version_number or not version_name:
        print("❌ --version-number and --version-name are required")
        sys.exit(1)
    
    if not features:
        print("❌ --features description is required")
        sys.exit(1)
    
    # Create version folder structure
    version_folder = Path(f"versions/{version_number}-{version_name}")
    version_folder.mkdir(parents=True, exist_ok=True)
    
    # Create version metadata
    version_data = {
        "version": f"{version_number}-{version_name}",
        "number": version_number,
        "name": version_name,
        "features": features,
        "created_at": "2025-10-24T10:00:00-07:00",
        "status": "planned"
    }
    
    version_file = version_folder / "version.json"
    with open(version_file, 'w') as f:
        json.dump(version_data, f, indent=2)
    
    print(f"✅ Version {version_number}-{version_name} created")
    print(f"📁 Folder: {version_folder}")
    
    # Ask if user wants to start working on this version
    response = input("Do you want to start working on this version? (y/n): ")
    if response.lower() in ['y', 'yes']:
        # Execute :cody version build command
        try:
            cody_cmd = [":cody", "version", "build", f"{version_number}-{version_name}"]
            subprocess.run(cody_cmd, check=True)
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to execute :cody version build: {e}")
            sys.exit(1)
        except FileNotFoundError:
            print("⚠️  :cody command not found. You can run it manually:")
            print(f"   :cody version build {version_number}-{version_name}")


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="OpenCode Config - Configuration management tool"
    )
    parser.add_argument(
        "command",
        choices=["validate", "test", "setup", "version", "agent"],
        help="Command to run"
    )
    parser.add_argument(
        "path_or_action",
        nargs="?",
        default="config/",
        help="Path to configuration file or directory, or action for version command"
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Verbose output"
    )
    parser.add_argument(
        "--version-name",
        help="Version name for version add command"
    )
    parser.add_argument(
        "--version-number",
        help="Version number for version add command"
    )
    parser.add_argument(
        "--features",
        help="Features description for version add command"
    )
    parser.add_argument(
        "--agent-name",
        help="Agent name for agent create command"
    )
    parser.add_argument(
        "--agent-type",
        help="Agent type for agent create command"
    )
    parser.add_argument(
        "--agent-tools",
        help="Comma-separated list of tools for agent"
    )
    
    args = parser.parse_args()
    
    if args.command == "version":
        if args.path_or_action == "add":
            return handle_version_add(args)
        else:
            print("❌ Unknown version action. Use 'add'")
            sys.exit(1)
    
    if args.command == "validate":
        validator = ConfigValidator()
        result = validator.validate_path(Path(args.path_or_action))
        
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