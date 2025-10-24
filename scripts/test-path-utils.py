#!/usr/bin/env python3
"""
Test path utilities directly.
"""

import sys
import os
from pathlib import Path

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

try:
    import importlib.util
    spec = importlib.util.spec_from_file_location("path_utils", Path(__file__).parent / "path-utils.py")
    path_utils = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(path_utils)
    PathNormalizer = path_utils.PathNormalizer
    
    def test_path_normalizer():
        """Test PathNormalizer functionality."""
        print("=== Path Normalizer Tests ===")
        
        normalizer = PathNormalizer()
        
        print(f"System: {normalizer.system}")
        print(f"Home: {normalizer.home_dir}")
        print(f"Config dir: {normalizer.get_platform_config_dir()}")
        print(f"Cache dir: {normalizer.get_platform_cache_dir()}")
        print(f"Temp dir: {normalizer.get_platform_temp_dir()}")
        
        # Test path normalization
        test_paths = [
            "~/Documents/test.txt",
            "$HOME/Documents/test.txt",
            "./relative/path",
            "/absolute/path"
        ]
        
        print("\n=== Path Normalization ===")
        for path in test_paths:
            try:
                normalized = normalizer.normalize_path(path)
                print(f"  {path} -> {normalized}")
            except Exception as e:
                print(f"  {path} -> Error: {e}")
        
        # Test project root detection
        print("\n=== Project Root Detection ===")
        project_root = normalizer.find_project_root()
        if project_root:
            print(f"  Project root: {project_root}")
        else:
            print("  Project root not found")
        
        # Test cross-platform commands
        print("\n=== Cross-Platform Commands ===")
        commands = {
            "windows": ["cmd", "/c", "echo"],
            "darwin": ["echo"],
            "linux": ["echo"],
            "fallback": ["echo"]
        }
        
        try:
            cmd = normalizer.get_cross_platform_command(commands)
            print(f"  Command for {normalizer.system}: {cmd}")
        except Exception as e:
            print(f"  Error getting command: {e}")
        
        return True
    
    if __name__ == "__main__":
        test_path_normalizer()
        
except ImportError as e:
    print(f"Import error: {e}")
    sys.exit(1)