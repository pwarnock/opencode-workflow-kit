#!/usr/bin/env python3
"""
Cross-platform path normalization utilities for opencode configurations.

This module provides utilities for normalizing paths across different operating systems,
handling environment variable expansion, and ensuring consistent path handling.
"""

import os
import sys
import re
import platform
from pathlib import Path, PurePath
from typing import Union, Optional, List, Dict, Any
import json


class PathNormalizer:
    """Cross-platform path normalization utilities."""
    
    def __init__(self):
        self.system = platform.system().lower()
        self.home_dir = Path.home()
        self.temp_dir = Path(os.environ.get('TMPDIR', os.environ.get('TEMP', '/tmp')))
        
        # Platform-specific path patterns
        self.platform_patterns = {
            'windows': {
                'env_vars': [
                    r'%([^%]+)%',
                    r'\$\{([^}]+)\}',
                    r'\$([A-Z_][A-Z0-9_]*)'
                ],
                'path_sep': '\\',
                'path_sep_alt': '/',
                'drive_pattern': r'^[A-Za-z]:',
                'unc_pattern': r'^\\\\[^\\]+\\[^\\]+'
            },
            'darwin': {
                'env_vars': [
                    r'\$\{([^}]+)\}',
                    r'\$([A-Z_][A-Z0-9_]*)'
                ],
                'path_sep': '/',
                'home_prefix': '~',
                'applications': '/Applications',
                'library': '~/Library'
            },
            'linux': {
                'env_vars': [
                    r'\$\{([^}]+)\}',
                    r'\$([A-Z_][A-Z0-9_]*)'
                ],
                'path_sep': '/',
                'home_prefix': '~',
                'config_base': '~/.config'
            }
        }
    
    def normalize_path(self, path: Union[str, Path]) -> Path:
        """
        Normalize a path for the current platform.
        
        Args:
            path: The path to normalize
            
        Returns:
            Normalized Path object
        """
        if isinstance(path, Path):
            path = str(path)
        
        # Expand environment variables
        path = self._expand_env_vars(path)
        
        # Handle user home expansion
        path = self._expand_user(path)
        
        # Convert to Path object and resolve
        normalized = Path(path)
        
        # Handle platform-specific normalization
        if self.system == 'windows':
            normalized = self._normalize_windows_path(normalized)
        else:
            normalized = self._normalize_unix_path(normalized)
        
        return normalized.resolve()
    
    def _expand_env_vars(self, path: str) -> str:
        """Expand environment variables in a path."""
        patterns = self.platform_patterns.get(self.system, {}).get('env_vars', [])
        
        for pattern in patterns:
            def replace_var(match):
                var_name = match.group(1) if match.groups() else match.group(0)
                return os.environ.get(var_name, match.group(0))
            
            path = re.sub(pattern, replace_var, path)
        
        # Also handle standard os.path.expandvars
        return os.path.expandvars(path)
    
    def _expand_user(self, path: str) -> str:
        """Expand user home directory (~) in paths."""
        if self.system in ['darwin', 'linux']:
            return os.path.expanduser(path)
        elif self.system == 'windows':
            # Handle Windows user paths
            if path.startswith('~'):
                return str(self.home_dir) + path[1:]
            return path
        return path
    
    def _normalize_windows_path(self, path: Path) -> Path:
        """Normalize Windows-specific paths."""
        path_str = str(path)
        
        # Handle forward slashes in Windows paths
        path_str = path_str.replace('/', '\\')
        
        # Handle UNC paths
        if re.match(r'^\\\\', path_str):
            return Path(path_str)
        
        # Handle drive letters
        if re.match(r'^[A-Za-z]:', path_str):
            return Path(path_str)
        
        # Handle relative paths
        return Path(path_str)
    
    def _normalize_unix_path(self, path: Path) -> Path:
        """Normalize Unix-like paths (macOS, Linux)."""
        path_str = str(path)
        
        # Ensure forward slashes
        path_str = path_str.replace('\\', '/')
        
        return Path(path_str)
    
    def get_platform_config_dir(self) -> Path:
        """Get platform-specific configuration directory."""
        if self.system == 'windows':
            return Path(os.environ.get('APPDATA', self.home_dir / 'AppData' / 'Roaming')) / 'opencode'
        elif self.system == 'darwin':
            return Path.home() / 'Library' / 'Application Support' / 'opencode'
        else:  # Linux
            config_dir = os.environ.get('XDG_CONFIG_HOME')
            if config_dir:
                return Path(config_dir) / 'opencode'
            return Path.home() / '.config' / 'opencode'
    
    def get_platform_cache_dir(self) -> Path:
        """Get platform-specific cache directory."""
        if self.system == 'windows':
            return Path(os.environ.get('LOCALAPPDATA', self.home_dir / 'AppData' / 'Local')) / 'opencode' / 'cache'
        elif self.system == 'darwin':
            return Path.home() / 'Library' / 'Caches' / 'opencode'
        else:  # Linux
            cache_dir = os.environ.get('XDG_CACHE_HOME')
            if cache_dir:
                return Path(cache_dir) / 'opencode'
            return Path.home() / '.cache' / 'opencode'
    
    def get_platform_temp_dir(self) -> Path:
        """Get platform-specific temporary directory."""
        if self.system == 'windows':
            return Path(os.environ.get('TEMP', 'C:\\temp')) / 'opencode'
        else:
            temp_dir = os.environ.get('TMPDIR', '/tmp')
            return Path(temp_dir) / 'opencode'
    
    def is_absolute_path(self, path: Union[str, Path]) -> bool:
        """Check if a path is absolute for the current platform."""
        if isinstance(path, Path):
            path = str(path)
        
        if self.system == 'windows':
            # Check for drive letter or UNC path
            return bool(re.match(r'^[A-Za-z]:|^\\\\', path))
        else:
            # Unix-like systems
            return path.startswith('/')
    
    def make_relative_to_project(self, path: Union[str, Path], project_root: Union[str, Path]) -> Path:
        """Make a path relative to the project root."""
        path = self.normalize_path(path)
        root = self.normalize_path(project_root)
        
        try:
            return path.relative_to(root)
        except ValueError:
            # Path is not relative to project root
            return path
    
    def find_project_root(self, start_path: Optional[Union[str, Path]] = None) -> Optional[Path]:
        """Find the project root by looking for common project indicators."""
        if start_path is None:
            start_path = Path.cwd()
        else:
            start_path = self.normalize_path(start_path)
        
        # Common project indicators
        indicators = [
            '.git',
            'package.json',
            'Cargo.toml',
            'go.mod',
            'pyproject.toml',
            'pom.xml',
            'Gemfile',
            'composer.json',
            '.opencode'
        ]
        
        current = start_path
        while current != current.parent:
            for indicator in indicators:
                if (current / indicator).exists():
                    return current
            current = current.parent
        
        # Check root directory
        for indicator in indicators:
            if (current / indicator).exists():
                return current
        
        return None
    
    def normalize_config_paths(self, config: Dict[str, Any], base_path: Optional[Path] = None) -> Dict[str, Any]:
        """
        Normalize all paths in a configuration dictionary.
        
        Args:
            config: Configuration dictionary
            base_path: Base path for relative paths
            
        Returns:
            Configuration with normalized paths
        """
        if base_path is None:
            base_path = Path.cwd()
        
        def normalize_value(value: Any, key: str = '') -> Any:
            if isinstance(value, str):
                # Check if this looks like a path
                if self._is_path_like(value, key):
                    try:
                        normalized = self.normalize_path(value)
                        # If it's a relative path, make it relative to base_path
                        if not self.is_absolute_path(value):
                            normalized = base_path / normalized
                        return str(normalized)
                    except Exception:
                        return value
                return value
            elif isinstance(value, dict):
                return {k: normalize_value(v, k) for k, v in value.items()}
            elif isinstance(value, list):
                return [normalize_value(item, key) for item in value]
            else:
                return value
        
        return normalize_value(config)
    
    def _is_path_like(self, value: str, key: str = '') -> bool:
        """Check if a string value looks like a path."""
        path_indicators = [
            '/', '\\', '~', '.',  # Path separators and indicators
            'path', 'dir', 'file',  # Common key names
            'config', 'cache', 'temp', 'log'  # Common directory types
        ]
        
        # Check if the value contains path indicators
        if any(indicator in value for indicator in ['/', '\\', '~']):
            return True
        
        # Check if the key suggests it's a path
        key_lower = key.lower()
        if any(indicator in key_lower for indicator in path_indicators):
            return True
        
        # Check for common file extensions
        if re.search(r'\.[a-zA-Z0-9]+$', value):
            return True
        
        return False
    
    def get_cross_platform_command(self, commands: Dict[str, List[str]]) -> List[str]:
        """
        Get the appropriate command for the current platform.
        
        Args:
            commands: Dictionary mapping platforms to command lists
            
        Returns:
            Command list for the current platform
        """
        # Try exact platform match
        if self.system in commands:
            return commands[self.system]
        
        # Try fallback
        if 'fallback' in commands:
            return commands['fallback']
        
        # Try common alternatives
        alternatives = {
            'windows': ['win32', 'win'],
            'darwin': ['macos', 'mac'],
            'linux': ['unix', 'posix']
        }
        
        for alt in alternatives.get(self.system, []):
            if alt in commands:
                return commands[alt]
        
        raise ValueError(f"No command found for platform {self.system}")
    
    def validate_path(self, path: Union[str, Path], 
                     must_exist: bool = False,
                     must_be_file: bool = False,
                     must_be_dir: bool = False,
                     create_if_missing: bool = False) -> bool:
        """
        Validate a path against various constraints.
        
        Args:
            path: Path to validate
            must_exist: Path must exist
            must_be_file: Path must be a file
            must_be_dir: Path must be a directory
            create_if_missing: Create path if it doesn't exist
            
        Returns:
            True if path is valid
        """
        try:
            normalized = self.normalize_path(path)
        except Exception:
            return False
        
        if must_exist and not normalized.exists():
            if create_if_missing:
                if must_be_dir:
                    normalized.mkdir(parents=True, exist_ok=True)
                elif must_be_file:
                    normalized.parent.mkdir(parents=True, exist_ok=True)
                    normalized.touch()
                else:
                    normalized.parent.mkdir(parents=True, exist_ok=True)
            else:
                return False
        
        if must_be_file and normalized.exists() and not normalized.is_file():
            return False
        
        if must_be_dir and normalized.exists() and not normalized.is_dir():
            return False
        
        return True


def main():
    """Example usage of path normalization utilities."""
    normalizer = PathNormalizer()
    
    print(f"System: {normalizer.system}")
    print(f"Home: {normalizer.home_dir}")
    print(f"Config dir: {normalizer.get_platform_config_dir()}")
    print(f"Cache dir: {normalizer.get_platform_cache_dir()}")
    print(f"Temp dir: {normalizer.get_platform_temp_dir()}")
    
    # Example path normalization
    test_paths = [
        "~/Documents/test.txt",
        "$HOME/Documents/test.txt",
        "%USERPROFILE%/Documents/test.txt",
        "./relative/path",
        "C:\\Windows\\System32",
        "/usr/local/bin"
    ]
    
    print("\nPath normalization examples:")
    for path in test_paths:
        try:
            normalized = normalizer.normalize_path(path)
            print(f"  {path} -> {normalized}")
        except Exception as e:
            print(f"  {path} -> Error: {e}")


if __name__ == "__main__":
    main()