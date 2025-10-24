#!/usr/bin/env python3
"""
Uninstall :cody integration from OpenCode.

This script removes the :cody command templates and subagent configurations
from the user's OpenCode configuration directory.
"""

import argparse
import json
import sys
from pathlib import Path


def get_opencode_config_dir():
    """Get the OpenCode configuration directory."""
    config_dir = Path.home() / ".config" / "opencode"
    if not config_dir.exists():
        config_dir = Path.home() / ".opencode"
    return config_dir


def remove_commands(opencode_dir):
    """Remove :cody command templates."""
    commands_dir = opencode_dir / "command"
    
    if not commands_dir.exists():
        print("ℹ️  No commands directory found")
        return True
    
    cody_commands = ["plan.md", "build.md", "version-add.md", "version-build.md", "refresh.md"]
    removed = []
    
    for cmd_file in cody_commands:
        cmd_path = commands_dir / cmd_file
        if cmd_path.exists():
            cmd_path.unlink()
            removed.append(cmd_file)
            print(f"✅ Removed command: {cmd_file}")
    
    return removed


def remove_agents(opencode_dir):
    """Remove :cody subagent configurations."""
    agents_dir = opencode_dir / "agent"
    
    if not agents_dir.exists():
        print("ℹ️  No agents directory found")
        return True
    
    cody_agents = ["cody-planner.json", "cody-builder.json", "cody-version-manager.json", 
                  "cody-admin.json", "cody-general.json"]
    removed = []
    
    for agent_file in cody_agents:
        agent_path = agents_dir / agent_file
        if agent_path.exists():
            agent_path.unlink()
            removed.append(agent_file)
            print(f"✅ Removed agent: {agent_file}")
    
    return removed


def cleanup_opencode_config(opencode_dir):
    """Remove :cody agents from opencode.json."""
    config_file = opencode_dir / "opencode.json"
    
    if not config_file.exists():
        print("ℹ️  No OpenCode configuration file found")
        return True
    
    try:
        with open(config_file, 'r') as f:
            config = json.load(f)
    except json.JSONDecodeError:
        print(f"❌ Invalid JSON in {config_file}")
        return False
    
    if "agent" not in config:
        print("ℹ️  No agent section in configuration")
        return True
    
    # Remove cody agents
    cody_agents = [name for name in config["agent"] if name.startswith("cody-")]
    removed = []
    for agent_name in cody_agents:
        del config["agent"][agent_name]
        removed.append(agent_name)
        print(f"✅ Removed agent from config: {agent_name}")
    
    # Clean up empty agent section
    if not config["agent"]:
        del config["agent"]
        print("✅ Removed empty agent section")
    
    # Write updated config
    with open(config_file, 'w') as f:
        json.dump(config, f, indent=2)
    
    print(f"✅ Updated OpenCode configuration: {config_file}")
    return removed


def main():
    """Main uninstallation function."""
    parser = argparse.ArgumentParser(description="Uninstall :cody integration from OpenCode")
    parser.add_argument("--config-dir", help="OpenCode configuration directory")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be removed without removing")
    
    args = parser.parse_args()
    
    # Get OpenCode config directory
    if args.config_dir:
        opencode_dir = Path(args.config_dir)
    else:
        opencode_dir = get_opencode_config_dir()
    
    print(f"📁 OpenCode configuration directory: {opencode_dir}")
    
    if args.dry_run:
        print("🔍 Dry run - showing what would be removed:")
        
        commands_dir = opencode_dir / "commands"
        if commands_dir.exists():
cody_commands = ["cody.md"]
            existing_commands = [cmd for cmd in cody_commands if (commands_dir / cmd).exists()]
            if existing_commands:
                print(f"Commands to remove: {', '.join(existing_commands)}")
        
        agents_dir = opencode_dir / "agent"
        if agents_dir.exists():
            cody_agents = ["cody-planner.json", "cody-builder.json", "cody-version-manager.json", 
                          "cody-admin.json", "cody-general.json"]
            existing_agents = [agent for agent in cody_agents if (agents_dir / agent).exists()]
            if existing_agents:
                print(f"Agents to remove: {', '.join(existing_agents)}")
        
        config_file = opencode_dir / "opencode.json"
        if config_file.exists():
            try:
                with open(config_file, 'r') as f:
                    config = json.load(f)
                    if "agent" in config:
                        cody_agents = [name for name in config["agent"] if name.startswith("cody-")]
                        if cody_agents:
                            print(f"Config agents to remove: {', '.join(cody_agents)}")
            except json.JSONDecodeError:
                pass
        
        return
    
    if not opencode_dir.exists():
        print("❌ OpenCode configuration directory not found")
        sys.exit(1)
    
    # Remove components
    print("🗑️  Uninstalling :cody integration...")
    
    commands_removed = remove_commands(opencode_dir)
    agents_removed = remove_agents(opencode_dir)
    config_cleaned = cleanup_opencode_config(opencode_dir)
    
    if commands_removed is False or agents_removed is False or config_cleaned is False:
        print("❌ Uninstallation failed")
        sys.exit(1)
    
    print("\n🎉 :cody integration uninstalled successfully!")
    print("\n💡 Note: You may need to restart OpenCode for changes to take effect")


if __name__ == "__main__":
    main()