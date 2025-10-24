#!/usr/bin/env python3
"""
Environment template system for opencode-config.

This module provides template-based configuration customization for different
development environments and use cases.
"""

import json
import sys
import os
from pathlib import Path
from typing import Dict, Any, List, Optional
import argparse

# Add parent directory to path to import opencode_config
sys.path.insert(0, str(Path(__file__).parent.parent))

from opencode_config.validator import ConfigValidator


class EnvironmentTemplate:
    """Environment template for configuration customization."""
    
    def __init__(self, template_dir: Optional[Path] = None, project_root: Optional[Path] = None):
        """Initialize template system.
        
        Args:
            template_dir: Directory containing template files
            project_root: Project root directory for global config detection
        """
        self.template_dir = template_dir or Path(__file__).parent.parent / "templates"
        self.validator = ConfigValidator()
        # self.config_loader = ConfigLoader(project_root)  # TODO: Fix import later
        self.templates = self._load_templates()
    
    def _load_templates(self) -> Dict[str, Dict[str, Any]]:
        """Load all environment templates."""
        templates = {}
        if not self.template_dir.exists():
            return templates
        
        for template_file in self.template_dir.glob("*.json"):
            try:
                with open(template_file, 'r') as f:
                    template = json.load(f)
                    templates[template_file.stem] = template
            except Exception as e:
                print(f"Warning: Failed to load template {template_file}: {e}")
        
        return templates
    
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
    
    def _detect_conflicts(self, existing: Dict[str, Any], template: Dict[str, Any]) -> List[str]:
        """Detect conflicts between existing and template configurations."""
        conflicts = []
        
        for key, template_value in template.items():
            if key in existing:
                existing_value = existing[key]
                if existing_value != template_value:
                    conflicts.append(f"{key}: {existing_value} → {template_value}")
        
        return conflicts
    
    def _apply_merge_strategy(self, file_path: Path, template_content: Dict[str, Any], 
                              strategy: str) -> Dict[str, Any]:
        """Apply merge strategy to combine existing and template content."""
        existing_content = self._load_json_file(file_path) or {}
        
        if strategy == "replace":
            return template_content
        elif strategy == "append":
            # Only add new keys, don't overwrite existing ones
            result = existing_content.copy()
            for key, value in template_content.items():
                if key not in result:
                    result[key] = value
            return result
        elif strategy == "merge":
            # Deep merge, template takes precedence
            return self._deep_merge(existing_content, template_content)
        else:
            return template_content
    
    def _deep_merge(self, base: Dict[str, Any], override: Dict[str, Any]) -> Dict[str, Any]:
        """Deep merge two dictionaries."""
        result = base.copy()
        
        for key, value in override.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = self._deep_merge(result[key], value)
            else:
                result[key] = value
        
        return result
        
        for template_file in self.template_dir.glob("*.json"):
            try:
                with open(template_file, 'r') as f:
                    template = json.load(f)
                    templates[template_file.stem] = template
            except Exception as e:
                print(f"Warning: Failed to load template {template_file}: {e}")
        
        return templates
    
    def list_templates(self) -> List[str]:
        """List available environment templates."""
        return list(self.templates.keys())
    
    def get_template(self, name: str) -> Optional[Dict[str, Any]]:
        """Get a specific environment template."""
        return self.templates.get(name)
    
    def apply_template(self, template_name: str, output_dir: Path, 
                       force: bool = False, merge_strategy: str = "append") -> Dict[str, Any]:
        """Apply an environment template to output directory.
        
        Args:
            template_name: Name of template to apply
            output_dir: Directory where configuration will be generated
            force: Force overwrite existing configurations
            merge_strategy: How to handle conflicts ("append", "replace", "merge")
            
        Returns:
            Result with success status and details
        """
        result = {
            "success": False,
            "errors": [],
            "warnings": [],
            "files_created": [],
            "conflicts_detected": []
        }
        
        template = self.get_template(template_name)
        if not template:
            result["errors"].append(f"Template not found: {template_name}")
            return result
        
        # Create output directory (skip if output_dir is actually a file)
        if not output_dir.exists() or output_dir.is_dir():
            output_dir.mkdir(parents=True, exist_ok=True)
        
        # Check for conflicts with existing global config
        if "configurations" in template:
            for config_path, template_content in template["configurations"].items():
                # Handle absolute paths (like opencode.json in project root)
                if config_path.startswith("/"):
                    file_path = Path(config_path)
                else:
                    file_path = output_dir / config_path
                
                # Check if file exists and detect conflicts
                if file_path.exists():
                    existing_content = self._load_json_file(file_path)
                    if existing_content:
                        conflicts = self._detect_conflicts(existing_content, template_content)
                        if conflicts:
                            result["conflicts_detected"].extend([
                                f"{config_path}: {', '.join(conflicts)}"
                            ])
                            
                            if not force:
                                result["errors"].append(
                                    f"Conflicts detected in {config_path}. Use --force to overwrite."
                                )
                                continue
                
                # Apply template with merge strategy
                final_content = self._apply_merge_strategy(
                    file_path, template_content, merge_strategy
                )
                
                # Create parent directories
                file_path.parent.mkdir(parents=True, exist_ok=True)
                
                # Write configuration file
                try:
                    with open(file_path, 'w') as f:
                        json.dump(final_content, f, indent=2)
                    result["files_created"].append(str(file_path))
                except Exception as e:
                    result["errors"].append(f"Failed to write {file_path}: {e}")
        
        # Validate generated configurations
        if result["files_created"]:
            validation_result = self.validator.validate_path(output_dir)
            if not validation_result["valid"]:
                result["errors"].extend(validation_result["errors"])
            result["warnings"].extend(validation_result["warnings"])
        
        result["success"] = len(result["errors"]) == 0
        return result
    
    def create_template(self, name: str, description: str, 
                       config_dir: Path) -> Dict[str, Any]:
        """Create a new environment template from existing configurations.
        
        Args:
            name: Template name
            description: Template description
            config_dir: Directory containing configuration files
            
        Returns:
            Result with success status
        """
        result = {
            "success": False,
            "errors": [],
            "template_path": None
        }
        
        if not config_dir.exists():
            result["errors"].append(f"Configuration directory not found: {config_dir}")
            return result
        
        # Create template structure
        template = {
            "name": name,
            "description": description,
            "version": "1.0.0",
            "configurations": {}
        }
        
        # Add configuration files
        for config_file in config_dir.rglob("*.json"):
            if config_file.is_file():
                try:
                    with open(config_file, 'r') as f:
                        config_content = json.load(f)
                    
                    # Calculate relative path from config_dir
                    rel_path = config_file.relative_to(config_dir)
                    template["configurations"][str(rel_path)] = config_content
                    
                except Exception as e:
                    result["errors"].append(f"Failed to read {config_file}: {e}")
        
        if result["errors"]:
            return result
        
        # Write template file
        template_file = self.template_dir / f"{name}.json"
        try:
            self.template_dir.mkdir(parents=True, exist_ok=True)
            with open(template_file, 'w') as f:
                json.dump(template, f, indent=2)
            result["template_path"] = str(template_file)
            result["success"] = True
        except Exception as e:
            result["errors"].append(f"Failed to write template: {e}")
        
        return result


def main():
    """Command-line interface for environment templates."""
    parser = argparse.ArgumentParser(description="Environment template system")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # List templates
    list_parser = subparsers.add_parser("list", help="List available templates")
    
    # Apply template
    apply_parser = subparsers.add_parser("apply", help="Apply a template")
    apply_parser.add_argument("template", help="Template name")
    apply_parser.add_argument("output", help="Output directory")
    apply_parser.add_argument("--force", action="store_true", 
                           help="Force overwrite existing configurations")
    apply_parser.add_argument("--merge-strategy", choices=["append", "replace", "merge"],
                           default="append", help="How to handle conflicts (default: append)")
    
    # Create template
    create_parser = subparsers.add_parser("create", help="Create a new template")
    create_parser.add_argument("name", help="Template name")
    create_parser.add_argument("description", help="Template description")
    create_parser.add_argument("config_dir", help="Configuration directory")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    template_system = EnvironmentTemplate(project_root=Path.cwd())
    
    if args.command == "list":
        templates = template_system.list_templates()
        if templates:
            print("Available templates:")
            for template in templates:
                template_data = template_system.get_template(template)
                desc = template_data.get("description", "No description")
                print(f"  {template}: {desc}")
        else:
            print("No templates found")
    
    elif args.command == "apply":
        result = template_system.apply_template(
            args.template, Path(args.output), 
            force=args.force, merge_strategy=args.merge_strategy
        )
        if result["success"]:
            print(f"✅ Template '{args.template}' applied successfully")
            print(f"Files created: {len(result['files_created'])}")
            for file_path in result["files_created"]:
                print(f"  - {file_path}")
            if result["conflicts_detected"]:
                print(f"⚠️  Conflicts detected and resolved:")
                for conflict in result["conflicts_detected"]:
                    print(f"    - {conflict}")
            if result["warnings"]:
                print("Warnings:")
                for warning in result["warnings"]:
                    print(f"  - {warning}")
        else:
            print(f"❌ Failed to apply template '{args.template}'")
            for error in result["errors"]:
                print(f"  - {error}")
            if result["conflicts_detected"]:
                print(f"💡 Conflicts detected (use --force to overwrite):")
                for conflict in result["conflicts_detected"]:
                    print(f"    - {conflict}")
            sys.exit(1)
    
    elif args.command == "create":
        result = template_system.create_template(
            args.name, args.description, Path(args.config_dir)
        )
        if result["success"]:
            print(f"✅ Template '{args.name}' created successfully")
            print(f"Template file: {result['template_path']}")
        else:
            print(f"❌ Failed to create template '{args.name}'")
            for error in result["errors"]:
                print(f"  - {error}")
            sys.exit(1)


if __name__ == "__main__":
    main()