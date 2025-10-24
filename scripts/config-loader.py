#!/usr/bin/env python3
"""
OpenCode Configuration Loader

Handles cascading configuration system: project → global → defaults
"""

import json
import os
import sys
from pathlib import Path
from typing import Dict, Any, Optional, List


class ConfigLoader:
    """Loads and merges opencode configurations with cascading inheritance."""
    
    def __init__(self, project_root: Optional[str] = None):
        self.project_root = Path(project_root) if project_root else Path.cwd()
        self.home_dir = Path.home()
        self.global_config_dir = self.home_dir / ".opencode"
        self.project_config_dir = self.project_root / ".opencode"
        
    def load_config(self, config_type: str, config_name: str = "default") -> Dict[str, Any]:
        """
        Load configuration with cascading inheritance.
        
        Args:
            config_type: Type of config ('agents', 'mcp', 'permissions')
            config_name: Name of the configuration file
            
        Returns:
            Merged configuration dictionary
        """
        # Load in order: defaults → global → project
        config = {}
        
        # 1. Load defaults (built-in)
        default_config = self._load_default_config(config_type, config_name)
        if default_config:
            config = self._deep_merge(config, default_config)
        
        # 2. Load global config
        global_config = self._load_global_config(config_type, config_name)
        if global_config:
            config = self._deep_merge(config, global_config)
        
        # 3. Load project config
        project_config = self._load_project_config(config_type, config_name)
        if project_config:
            config = self._deep_merge(config, project_config)
        
        return config
    
    def _load_default_config(self, config_type: str, config_name: str) -> Optional[Dict[str, Any]]:
        """Load built-in default configuration."""
        defaults = {
            "agents": {
                "name": "default",
                "version": "1.0.0",
                "settings": {
                    "maxTokens": 4000,
                    "temperature": 0.7,
                    "timeout": 120000,
                    "tools": {"enabled": ["read", "write", "edit", "bash"], "disabled": []},
                    "permissions": {"read": ["**/*"], "write": ["**/*"], "execute": ["*.sh", "*.py"]}
                }
            },
            "permissions": {
                "name": "default",
                "version": "1.0.0",
                "rules": [
                    {
                        "name": "read-safe-files",
                        "tools": ["read"],
                        "patterns": ["**/*.md", "**/*.txt", "**/*.json"],
                        "action": "allow"
                    }
                ],
                "defaultAction": "deny"
            }
        }
        return defaults.get(config_type)
    
    def _load_global_config(self, config_type: str, config_name: str) -> Optional[Dict[str, Any]]:
        """Load global configuration from ~/.opencode/."""
        config_file = self.global_config_dir / config_type / f"{config_name}.json"
        return self._load_json_file(config_file)
    
    def _load_project_config(self, config_type: str, config_name: str) -> Optional[Dict[str, Any]]:
        """Load project configuration from .opencode/."""
        config_file = self.project_config_dir / config_type / f"{config_name}.json"
        return self._load_json_file(config_file)
    
    def _load_json_file(self, file_path: Path) -> Optional[Dict[str, Any]]:
        """Load JSON file if it exists."""
        if not file_path.exists():
            return None
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            print(f"Warning: Failed to load {file_path}: {e}", file=sys.stderr)
            return None
    
    def _deep_merge(self, base: Dict[str, Any], override: Dict[str, Any]) -> Dict[str, Any]:
        """Deep merge two dictionaries."""
        result = base.copy()
        
        for key, value in override.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = self._deep_merge(result[key], value)
            else:
                result[key] = value
        
        return result
    
    def get_effective_config_paths(self) -> Dict[str, List[str]]:
        """Get the effective configuration search paths."""
        return {
            "project": [str(self.project_config_dir)],
            "global": [str(self.global_config_dir)],
            "defaults": ["built-in"]
        }
    
    def validate_config_structure(self) -> List[str]:
        """Validate configuration structure and return any issues."""
        issues = []
        
        # Check global config directory
        if not self.global_config_dir.exists():
            issues.append(f"Global config directory not found: {self.global_config_dir}")
        
        # Check project config directory
        if self.project_config_dir.exists():
            project_config_file = self.project_config_dir / "config.json"
            if not project_config_file.exists():
                issues.append(f"Project config.json not found: {project_config_file}")
        
        return issues


def main():
    """CLI interface for config loader."""
    import argparse
    
    parser = argparse.ArgumentParser(description="OpenCode Configuration Loader")
    parser.add_argument("--type", required=True, choices=["agents", "mcp", "permissions"],
                       help="Configuration type to load")
    parser.add_argument("--name", default="default", help="Configuration name (default: default)")
    parser.add_argument("--project-root", help="Project root directory (default: current directory)")
    parser.add_argument("--validate", action="store_true", help="Validate configuration structure")
    
    args = parser.parse_args()
    
    loader = ConfigLoader(args.project_root)
    
    if args.validate:
        issues = loader.validate_config_structure()
        if issues:
            print("Configuration issues found:")
            for issue in issues:
                print(f"  - {issue}")
            sys.exit(1)
        else:
            print("Configuration structure is valid.")
            return
    
    config = loader.load_config(args.type, args.name)
    print(json.dumps(config, indent=2))


if __name__ == "__main__":
    main()