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
    
    def __init__(self, template_dir: Optional[Path] = None):
        """Initialize template system.
        
        Args:
            template_dir: Directory containing template files
        """
        self.template_dir = template_dir or Path(__file__).parent.parent / "templates"
        self.validator = ConfigValidator()
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
    
    def list_templates(self) -> List[str]:
        """List available environment templates."""
        return list(self.templates.keys())
    
    def get_template(self, name: str) -> Optional[Dict[str, Any]]:
        """Get a specific environment template."""
        return self.templates.get(name)
    
    def apply_template(self, template_name: str, output_dir: Path) -> Dict[str, Any]:
        """Apply an environment template to output directory.
        
        Args:
            template_name: Name of template to apply
            output_dir: Directory where configuration will be generated
            
        Returns:
            Result with success status and details
        """
        result = {
            "success": False,
            "errors": [],
            "warnings": [],
            "files_created": []
        }
        
        template = self.get_template(template_name)
        if not template:
            result["errors"].append(f"Template not found: {template_name}")
            return result
        
        # Create output directory
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Apply template configurations
        if "configurations" in template:
            for config_path, config_content in template["configurations"].items():
                file_path = output_dir / config_path
                
                # Create parent directories
                file_path.parent.mkdir(parents=True, exist_ok=True)
                
                # Write configuration file
                try:
                    with open(file_path, 'w') as f:
                        json.dump(config_content, f, indent=2)
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
    
    # Create template
    create_parser = subparsers.add_parser("create", help="Create a new template")
    create_parser.add_argument("name", help="Template name")
    create_parser.add_argument("description", help="Template description")
    create_parser.add_argument("config_dir", help="Configuration directory")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    template_system = EnvironmentTemplate()
    
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
        result = template_system.apply_template(args.template, Path(args.output))
        if result["success"]:
            print(f"✅ Template '{args.template}' applied successfully")
            print(f"Files created: {len(result['files_created'])}")
            for file_path in result["files_created"]:
                print(f"  - {file_path}")
            if result["warnings"]:
                print("Warnings:")
                for warning in result["warnings"]:
                    print(f"  - {warning}")
        else:
            print(f"❌ Failed to apply template '{args.template}'")
            for error in result["errors"]:
                print(f"  - {error}")
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