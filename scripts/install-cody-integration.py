#!/usr/bin/env python3
"""
Install :cody integration for OpenCode.

This script installs the :cody command templates and subagent configurations
into the user's OpenCode configuration directory.
"""

import argparse
import json
import shutil
import sys
from pathlib import Path


def get_opencode_config_dir():
    """Get the OpenCode configuration directory."""
    config_dir = Path.home() / ".config" / "opencode"
    if not config_dir.exists():
        config_dir = Path.home() / ".opencode"
    return config_dir


def install_commands(opencode_dir, force=False):
    """Install :cody command templates."""
    commands_dir = opencode_dir / "command"
    commands_dir.mkdir(parents=True, exist_ok=True)
    
    template_commands = Path(__file__).parent.parent / "templates" / "cody-commands"
    
    if not template_commands.exists():
        print(f"❌ Template commands directory not found: {template_commands}")
        return False
    
    installed = []
    for cmd_file in template_commands.glob("*.md"):
        dest_file = commands_dir / cmd_file.name
        
        if dest_file.exists() and not force:
            print(f"⚠️  Command {cmd_file.name} already exists (use --force to overwrite)")
            continue
            
        shutil.copy2(cmd_file, dest_file)
        installed.append(cmd_file.name)
        print(f"✅ Installed command: {cmd_file.name}")
    
    return installed


def install_agents(opencode_dir, force=False):
    """Install :cody agent configurations (both JSON and markdown)."""
    agents_dir = opencode_dir / "agent"
    agents_dir.mkdir(parents=True, exist_ok=True)
    
    template_agents = Path(__file__).parent.parent / "templates" / "agents"
    
    if not template_agents.exists():
        print(f"❌ Template agents directory not found: {template_agents}")
        return False
    
    installed = []
    # Install JSON agents
    for agent_file in template_agents.glob("*.json"):
        dest_file = agents_dir / agent_file.name
        
        if dest_file.exists() and not force:
            print(f"⚠️  Agent {agent_file.name} already exists (use --force to overwrite)")
            continue
            
        shutil.copy2(agent_file, dest_file)
        installed.append(agent_file.name)
        print(f"✅ Installed agent: {agent_file.name}")
    
    # Install markdown agents
    for agent_file in template_agents.glob("*.md"):
        dest_file = agents_dir / agent_file.name
        
        if dest_file.exists() and not force:
            print(f"⚠️  Agent {agent_file.name} already exists (use --force to overwrite)")
            continue
            
        shutil.copy2(agent_file, dest_file)
        installed.append(agent_file.name)
        print(f"✅ Installed agent: {agent_file.name}")
    
    return installed


def install_subagents(opencode_dir, force=False):
    """Install :cody subagent markdown configurations."""
    agents_dir = opencode_dir / "agent"
    agents_dir.mkdir(parents=True, exist_ok=True)
    
    template_subagents = Path(__file__).parent.parent / "templates" / "subagents"
    
    if not template_subagents.exists():
        print(f"❌ Template subagents directory not found: {template_subagents}")
        return False
    
    installed = []
    for subagent_file in template_subagents.glob("*.md"):
        dest_file = agents_dir / subagent_file.name
        
        if dest_file.exists() and not force:
            print(f"⚠️  Subagent {subagent_file.name} already exists (use --force to overwrite)")
            continue
            
        shutil.copy2(subagent_file, dest_file)
        installed.append(subagent_file.name)
        print(f"✅ Installed subagent: {subagent_file.name}")
    
    return installed


def update_opencode_config(opencode_dir, force=False):
    """Update opencode.json to include :cody integration."""
    config_file = opencode_dir / "opencode.json"
    
    # Create default config if it doesn't exist
    if not config_file.exists():
        default_config = {
            "$schema": "https://opencode.ai/config.json",
            "tools": {
                "bash": True,
                "edit": True,
                "write": True,
                "read": True,
                "grep": True,
                "glob": True,
                "list": True,
                "webfetch": True,
                "todowrite": True,
                "todoread": True
            }
        }
    else:
        try:
            with open(config_file, 'r') as f:
                default_config = json.load(f)
        except json.JSONDecodeError:
            print(f"❌ Invalid JSON in {config_file}")
            return False
    
    # Add :cody agents if not present
    if "agent" not in default_config:
        default_config["agent"] = {}
    
    cody_agents = {
        "cody-planner": {
            "description": ":cody planning specialist",
            "mode": "subagent",
            "tools": {
                "read": True,
                "webfetch": True,
                "grep": True,
                "glob": True,
                "list": True,
                "bash": True
            }
        },
        "cody-builder": {
            "description": ":cody build specialist", 
            "mode": "subagent",
            "tools": {
                "read": True,
                "write": True,
                "edit": True,
                "bash": True,
                "webfetch": True,
                "grep": True,
                "glob": True,
                "list": True,
                "todowrite": True,
                "todoread": True
            }
        },
        "cody-version-manager": {
            "description": ":cody version management specialist",
            "mode": "subagent",
            "tools": {
                "read": True,
                "write": True,
                "edit": True,
                "bash": True,
                "grep": True,
                "glob": True,
                "list": True,
                "webfetch": True,
                "todowrite": True,
                "todoread": True
            }
        },
        "cody-admin": {
            "description": ":cody administration specialist",
            "mode": "subagent",
            "tools": {
                "read": True,
                "write": True,
                "edit": True,
                "bash": True,
                "grep": True,
                "glob": True,
                "list": True,
                "webfetch": True
            }
        },
        "cody-general": {
            "description": ":cody guidance specialist",
            "mode": "subagent",
            "tools": {
                "read": True,
                "webfetch": True,
                "grep": True,
                "glob": True,
                "list": True,
                "bash": True
            }
        }
    }
    
    # Merge cody agents
    for agent_name, agent_config in cody_agents.items():
        if agent_name not in default_config["agent"] or force:
            default_config["agent"][agent_name] = agent_config
    
    # Write updated config
    with open(config_file, 'w') as f:
        json.dump(default_config, f, indent=2)
    
    print(f"✅ Updated OpenCode configuration: {config_file}")
    return True


def verify_installation(opencode_dir):
    """Verify the installation was successful."""
    print("\n🔍 Verifying installation...")
    
    commands_dir = opencode_dir / "command"
    agents_dir = opencode_dir / "agent"
    config_file = opencode_dir / "opencode.json"
    
    # Check commands
    expected_commands = ["cody.md"]
    missing_commands = []
    for cmd in expected_commands:
        if not (commands_dir / cmd).exists():
            missing_commands.append(cmd)
    
    # Check agents
    expected_agents = ["cody-planner.json", "cody-builder.json", "cody-version-manager.json", 
                      "cody-admin.json", "cody-general.json", "library-researcher.md"]
    missing_agents = []
    for agent in expected_agents:
        if not (agents_dir / agent).exists():
            missing_agents.append(agent)
    
    # Check config
    config_valid = False
    if config_file.exists():
        try:
            with open(config_file, 'r') as f:
                config = json.load(f)
                if "agent" in config and any("cody-" in name for name in config["agent"]):
                    config_valid = True
        except json.JSONDecodeError:
            pass
    
    # Report results
    if missing_commands:
        print(f"❌ Missing commands: {', '.join(missing_commands)}")
    else:
        print("✅ All commands installed")
    
    if missing_agents:
        print(f"❌ Missing agents: {', '.join(missing_agents)}")
    else:
        print("✅ All agents installed")
    
    if not config_valid:
        print("❌ OpenCode configuration not updated properly")
    else:
        print("✅ OpenCode configuration updated")
    
    return len(missing_commands) == 0 and len(missing_agents) == 0 and config_valid


def main():
    """Main installation function."""
    parser = argparse.ArgumentParser(description="Install :cody integration for OpenCode")
    parser.add_argument("--force", action="store_true", help="Overwrite existing files")
    parser.add_argument("--config-dir", help="OpenCode configuration directory")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be installed without installing")
    
    args = parser.parse_args()
    
    # Get OpenCode config directory
    if args.config_dir:
        opencode_dir = Path(args.config_dir)
    else:
        opencode_dir = get_opencode_config_dir()
    
    print(f"📁 OpenCode configuration directory: {opencode_dir}")
    
    if args.dry_run:
        print("🔍 Dry run - showing what would be installed:")
        template_commands = Path(__file__).parent.parent / "templates" / "cody-commands"
        template_agents = Path(__file__).parent.parent / "templates" / "agents"
        
        print(f"Commands to install from: {template_commands}")
        for cmd_file in template_commands.glob("*.md"):
            print(f"  - {cmd_file.name}")
        
        print(f"Agents to install from: {template_agents}")
        for agent_file in template_agents.glob("*.json"):
            print(f"  - {agent_file.name}")
        for agent_file in template_agents.glob("*.md"):
            print(f"  - {agent_file.name}")
        return
    
    # Create directories
    opencode_dir.mkdir(parents=True, exist_ok=True)
    
    # Install components
    print("🚀 Installing :cody integration...")
    
    commands_installed = install_commands(opencode_dir, args.force)
    agents_installed = install_agents(opencode_dir, args.force)
    config_updated = update_opencode_config(opencode_dir, args.force)
    
    if commands_installed is False or agents_installed is False or config_updated is False:
        print("❌ Installation failed")
        sys.exit(1)
    
    # Verify installation
    if verify_installation(opencode_dir):
        print("\n🎉 :cody integration installed successfully!")
        print("\n📖 Available commands:")
        print("  /cody plan - Execute :cody plan workflow")
        print("  /cody build - Execute :cody build workflow") 
        print("  /cody version add - Add new version")
        print("  /cody version build - Build version")
        print("  /cody refresh - Refresh project state")
        print("\n🤖 Available agents:")
        print("  cody-planner - Planning specialist")
        print("  cody-builder - Build specialist")
        print("  cody-version-manager - Version management")
        print("  cody-admin - Administration")
        print("  cody-general - Guidance and help")
        print("  library-researcher - Library documentation research (subagent)")
        print("\n🔄 IMPORTANT: Restart OpenCode to load new commands and agents!")
    else:
        print("\n⚠️  Installation completed with warnings")
        sys.exit(1)


if __name__ == "__main__":
    main()