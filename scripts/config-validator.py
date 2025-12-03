#!/usr/bin/env python3
"""
Configuration validation utilities for opencode configurations.

This module provides JSON Schema validation for configuration files,
including inheritance resolution and cross-platform compatibility checks.
"""

import json
import sys
import os
from pathlib import Path
from typing import Dict, Any, List, Optional, Union
import argparse
import logging

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
    from opencode_config.validator import ConfigValidator
except ImportError as e:
    print(f"Import error: {e}")
    print("Please install the package with: uv pip install -e .")
    sys.exit(1)


def main():
    """Command-line interface for configuration validation."""
    parser = argparse.ArgumentParser(description="Validate opencode configurations")
    parser.add_argument("path", help="Configuration file or directory to validate")
    parser.add_argument("--schema", help="Schema type to validate against")
    parser.add_argument("--schema-dir", help="Schema directory path")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    parser.add_argument("--template", help="Generate configuration template")
    
    args = parser.parse_args()
    
    # Setup logging
    level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(level=level, format='%(levelname)s: %(message)s')
    
    validator = ConfigValidator(
        schemas_dir=Path(args.schema_dir) if args.schema_dir else None
    )
    
    if args.template:
        print("Template generation not yet implemented")
        sys.exit(1)
    
    path = Path(args.path)
    
    if path.is_file():
        result = validator.validate_file(path)
    elif path.is_dir():
        result = validator.validate_path(path)
    else:
        print(f"Error: Path not found: {path}", file=sys.stderr)
        sys.exit(1)
    
    # Print results
    print(f"Validation result: {'PASS' if result['valid'] else 'FAIL'}")
    
    if result.get('errors'):
        print("\nErrors:")
        for error in result['errors']:
            print(f"  - {error}")
    
    if result.get('warnings'):
        print("\nWarnings:")
        for warning in result['warnings']:
            print(f"  - {warning}")
    
    if args.verbose and 'files_validated' in result:
        print(f"\nFiles validated: {result['files_validated']}")
    
    sys.exit(0 if result['valid'] else 1)


if __name__ == "__main__":
    main()