#!/usr/bin/env python3
"""
Validate :cody integration templates and configurations.

This script validates the :cody command templates and subagent configurations
to ensure they meet quality standards and are properly formatted.
"""

import json
import sys
from pathlib import Path
import re


def validate_command_template(cmd_file):
    """Validate a command template file."""
    errors = []
    warnings = []
    
    try:
        content = cmd_file.read_text()
        
        # Check for frontmatter
        if not content.startswith('---'):
            errors.append("Missing frontmatter")
        else:
            # Extract frontmatter
            frontmatter_end = content.find('---', 3)
            if frontmatter_end == -1:
                errors.append("Unclosed frontmatter")
            else:
                frontmatter = content[3:frontmatter_end]
                
                # Check required frontmatter fields
                if 'command:' not in frontmatter:
                    errors.append("Missing 'command' in frontmatter")
                if 'description:' not in frontmatter:
                    warnings.append("Missing 'description' in frontmatter")
        
        # Check for required sections
        if '## EXECUTE CODY' not in content:
            errors.append("Missing 'EXECUTE CODY' section")
        
        if '### SUBAGENT DELEGATION' not in content:
            warnings.append("Missing 'SUBAGENT DELEGATION' section")
        
        if '### WORKFLOW STEPS' not in content:
            warnings.append("Missing 'WORKFLOW STEPS' section")
        
        # Check for agent configuration
        if '### AGENT CONFIGURATION' not in content:
            warnings.append("Missing 'AGENT CONFIGURATION' section")
        
        # Check for error handling
        if '### ERROR HANDLING' not in content:
            warnings.append("Missing 'ERROR HANDLING' section")
        
        # Validate command format
        command_match = re.search(r'command:\s*["\']([^"\']+)["\']', content)
        if command_match:
            command = command_match.group(1)
            if not command.startswith('/'):
                warnings.append(f"Command '{command}' should start with '/'")
        
    except Exception as e:
        errors.append(f"Error reading file: {e}")
    
    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings
    }


def validate_agent_config(agent_file):
    """Validate an agent configuration file."""
    errors = []
    warnings = []
    
    try:
        config = json.load(agent_file.open())
        
        # Check required fields
        required_fields = ["$schema", "description", "mode", "tools"]
        for field in required_fields:
            if field not in config:
                errors.append(f"Missing required field: {field}")
        
        # Check schema reference
        if "$schema" in config:
            schema = config["$schema"]
            if not schema.startswith("../../schemas/"):
                warnings.append("Schema reference should use relative path '../../schemas/'")
        
        # Check mode
        if "mode" in config and config["mode"] != "subagent":
            warnings.append("Agent mode should be 'subagent'")
        
        # Check tools configuration
        if "tools" in config:
            tools = config["tools"]
            if not isinstance(tools, dict):
                errors.append("Tools configuration must be a dictionary")
            else:
                # Check for essential tools based on agent type
                agent_name = agent_file.stem
                if "planner" in agent_name:
                    essential_tools = ["read", "webfetch", "grep", "glob"]
                    for tool in essential_tools:
                        if tool not in tools or not tools[tool]:
                            warnings.append(f"Planner agent should have '{tool}' tool enabled")
                
                elif "builder" in agent_name:
                    essential_tools = ["read", "write", "edit", "bash"]
                    for tool in essential_tools:
                        if tool not in tools or not tools[tool]:
                            warnings.append(f"Builder agent should have '{tool}' tool enabled")
        
        # Check for specialization section
        if "specialization" not in config:
            warnings.append("Missing 'specialization' section")
        else:
            specialization = config["specialization"]
            if "framework" not in specialization or specialization["framework"] != "cody":
                warnings.append("Specialization should specify framework as 'cody'")
        
        # Check for behavior section
        if "behavior" not in config:
            warnings.append("Missing 'behavior' section")
        
    except json.JSONDecodeError as e:
        errors.append(f"Invalid JSON: {e}")
    except Exception as e:
        errors.append(f"Error reading file: {e}")
    
    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings
    }


def validate_template_structure():
    """Validate the overall template structure."""
    errors = []
    warnings = []
    
    base_dir = Path(__file__).parent.parent
    templates_dir = base_dir / "templates"
    
    # Check required directories
    required_dirs = ["cody-commands", "agents"]
    for dir_name in required_dirs:
        dir_path = templates_dir / dir_name
        if not dir_path.exists():
            errors.append(f"Missing template directory: {dir_name}")
        elif not dir_path.is_dir():
            errors.append(f"Template path is not a directory: {dir_name}")
    
    # Check command templates
    commands_dir = templates_dir / "cody-commands"
    if commands_dir.exists():
        expected_commands = ["plan.md", "build.md", "version-add.md", "version-build.md", "refresh.md"]
        for cmd_file in expected_commands:
            cmd_path = commands_dir / cmd_file
            if not cmd_path.exists():
                warnings.append(f"Missing command template: {cmd_file}")
    
    # Check agent templates
    agents_dir = templates_dir / "agents"
    if agents_dir.exists():
        expected_agents = ["cody-planner.json", "cody-builder.json", "cody-version-manager.json", 
                          "cody-admin.json", "cody-general.json"]
        for agent_file in expected_agents:
            agent_path = agents_dir / agent_file
            if not agent_path.exists():
                warnings.append(f"Missing agent template: {agent_file}")
    
    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings
    }


def main():
    """Main validation function."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Validate :cody integration templates")
    parser.add_argument("--commands-only", action="store_true", help="Validate only command templates")
    parser.add_argument("--agents-only", action="store_true", help="Validate only agent configurations")
    parser.add_argument("--structure-only", action="store_true", help="Validate only template structure")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    
    args = parser.parse_args()
    
    base_dir = Path(__file__).parent.parent
    templates_dir = base_dir / "templates"
    
    total_errors = 0
    total_warnings = 0
    
    print("🔍 Validating :cody integration templates...\n")
    
    # Validate template structure
    if not args.commands_only and not args.agents_only:
        print("📁 Validating template structure...")
        structure_result = validate_template_structure()
        
        if structure_result["valid"]:
            print("✅ Template structure is valid")
        else:
            print("❌ Template structure has issues:")
            for error in structure_result["errors"]:
                print(f"  - {error}")
                total_errors += 1
        
        for warning in structure_result["warnings"]:
            print(f"⚠️  {warning}")
            total_warnings += 1
        
        print()
    
    # Validate command templates
    if not args.agents_only and not args.structure_only:
        print("📋 Validating command templates...")
        commands_dir = templates_dir / "cody-commands"
        
        if commands_dir.exists():
            for cmd_file in commands_dir.glob("*.md"):
                if args.verbose:
                    print(f"  Validating {cmd_file.name}...")
                
                result = validate_command_template(cmd_file)
                
                if result["valid"]:
                    print(f"✅ {cmd_file.name} is valid")
                else:
                    print(f"❌ {cmd_file.name} has errors:")
                    for error in result["errors"]:
                        print(f"    - {error}")
                        total_errors += 1
                
                for warning in result["warnings"]:
                    print(f"⚠️  {cmd_file.name}: {warning}")
                    total_warnings += 1
        else:
            print("❌ Command templates directory not found")
            total_errors += 1
        
        print()
    
    # Validate agent configurations
    if not args.commands_only and not args.structure_only:
        print("🤖 Validating agent configurations...")
        agents_dir = templates_dir / "agents"
        
        if agents_dir.exists():
            for agent_file in agents_dir.glob("*.json"):
                if args.verbose:
                    print(f"  Validating {agent_file.name}...")
                
                result = validate_agent_config(agent_file)
                
                if result["valid"]:
                    print(f"✅ {agent_file.name} is valid")
                else:
                    print(f"❌ {agent_file.name} has errors:")
                    for error in result["errors"]:
                        print(f"    - {error}")
                        total_errors += 1
                
                for warning in result["warnings"]:
                    print(f"⚠️  {agent_file.name}: {warning}")
                    total_warnings += 1
        else:
            print("❌ Agent configurations directory not found")
            total_errors += 1
        
        print()
    
    # Summary
    print("📊 Validation Summary:")
    print(f"  Errors: {total_errors}")
    print(f"  Warnings: {total_warnings}")
    
    if total_errors == 0:
        print("🎉 All templates are valid!")
        return 0
    else:
        print("❌ Validation failed. Please fix the errors above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())