#!/usr/bin/env python3
"""
Test script for beads MCP integration v0.5.0

Validates:
1. Beads MCP server configuration
2. Agent delegation pattern
3. Project-level MCP configuration
4. Event-driven workflow (daemon disabled)
5. Git-automation integration
"""

import json
import sys
from pathlib import Path
from typing import Dict, List, Tuple

def test_beads_mcp_config() -> Tuple[bool, List[str]]:
    """Test beads MCP server configuration in global config."""
    errors = []
    
    try:
        global_mcp_file = Path("config/global/mcp/servers.json")
        if not global_mcp_file.exists():
            errors.append("Global MCP servers config not found")
            return False, errors
            
        with open(global_mcp_file, 'r') as f:
            config = json.load(f)
            
        if "beads" not in config.get("servers", {}):
            errors.append("Beads server not configured in global MCP")
            return False, errors
            
        beads_config = config["servers"]["beads"]
        
        # Check project-local configuration
        if "--project-local" not in beads_config.get("args", []):
            errors.append("Beads server missing --project-local argument")
            
        # Check daemon disabled
        if "--no-daemon" not in beads_config.get("args", []):
            errors.append("Beads server missing --no-daemon argument")
            
        # Check event-driven workflow
        if beads_config.get("env", {}).get("BEADS_SYNC_MODE") != "event-driven":
            errors.append("Beads server not configured for event-driven sync")
            
        # Check project-local data directory
        if beads_config.get("env", {}).get("BEADS_DATA_DIR") != "./.beads":
            errors.append("Beads server not configured for project-local data directory")
            
    except Exception as e:
        errors.append(f"Error reading global MCP config: {e}")
        
    return len(errors) == 0, errors


def test_project_mcp_config() -> Tuple[bool, List[str]]:
    """Test project-level MCP configuration."""
    errors = []
    
    try:
        project_mcp_file = Path("config/project/mcp-servers.json")
        if not project_mcp_file.exists():
            errors.append("Project MCP servers config not found")
            return False, errors
            
        with open(project_mcp_file, 'r') as f:
            config = json.load(f)
            
        # Check inheritance from global
        if not config.get("inheritFromGlobal", False):
            errors.append("Project MCP config not inheriting from global")
            
        # Check beads server configuration
        if "beads" not in config.get("servers", {}):
            errors.append("Beads server not configured in project MCP")
            return False, errors
            
        beads_config = config["servers"]["beads"]
        
        # Check integration settings
        integration = beads_config.get("integration", {})
        if not integration.get("git_automation", {}).get("enabled", False):
            errors.append("Git automation integration not enabled")
            
        if not integration.get("cody_framework", {}).get("enabled", False):
            errors.append("Cody framework integration not enabled")
            
    except Exception as e:
        errors.append(f"Error reading project MCP config: {e}")
        
    return len(errors) == 0, errors


def test_agent_delegation_config() -> Tuple[bool, List[str]]:
    """Test agent delegation pattern configuration."""
    errors = []
    
    try:
        cody_admin_file = Path("agents/cody-admin.json")
        if not cody_admin_file.exists():
            errors.append("Cody admin agent config not found")
            return False, errors
            
        with open(cody_admin_file, 'r') as f:
            config = json.load(f)
            
        # Check beads MCP tools
        tools = config.get("tools", {})
        required_tools = [
            "mcp__beads__create_issue",
            "mcp__beads__update_issue",
            "mcp__beads__list_issues",
            "mcp__beads__get_ready_issues",
            "mcp__beads__close_issue"
        ]
        
        for tool in required_tools:
            if not tools.get(tool, False):
                errors.append(f"Cody admin missing {tool} tool")
                
        # Check delegation patterns
        delegation = config.get("delegation_patterns", {})
        if "beads_operations" not in delegation:
            errors.append("Beads operations delegation pattern not configured")
            
    except Exception as e:
        errors.append(f"Error reading cody admin config: {e}")
        
    return len(errors) == 0, errors


def test_beads_daemon_disabled() -> Tuple[bool, List[str]]:
    """Test that beads daemon is disabled in favor of event-driven workflow."""
    errors = []
    
    try:
        beads_config_file = Path(".beads/config.json")
        if not beads_config_file.exists():
            errors.append("Beads config file not found")
            return False, errors
            
        with open(beads_config_file, 'r') as f:
            config = json.load(f)
            
        # Check daemon disabled
        daemon_config = config.get("daemon", {})
        if daemon_config.get("enabled", True):
            errors.append("Beads daemon is enabled - should be disabled")
            
        if daemon_config.get("mode") != "event-driven":
            errors.append("Beads daemon mode not set to event-driven")
            
        # Check event-driven sync
        sync_config = config.get("sync", {})
        if sync_config.get("mode") != "event-driven":
            errors.append("Sync mode not set to event-driven")
            
    except Exception as e:
        errors.append(f"Error reading beads config: {e}")
        
    return len(errors) == 0, errors


def test_git_automation_integration() -> Tuple[bool, List[str]]:
    """Test git automation integration with beads."""
    errors = []
    
    try:
        # Check if beads-cody-sync script exists and works
        sync_script = Path("scripts/beads-cody-sync.py")
        if not sync_script.exists():
            errors.append("Beads-Cody sync script not found")
            return False, errors
            
        # Check if git automation script exists
        git_script = Path("scripts/git-automation.py")
        if not git_script.exists():
            errors.append("Git automation script not found")
            return False, errors
            
        # Check if beads data exists
        beads_file = Path(".beads/issues.jsonl")
        if not beads_file.exists():
            errors.append("Beads issues file not found")
            return False, errors
            
    except Exception as e:
        errors.append(f"Error checking git automation integration: {e}")
        
    return len(errors) == 0, errors


def main():
    """Run all integration tests."""
    print("🧪 Testing Beads MCP Integration v0.5.0")
    print("=" * 50)
    
    tests = [
        ("Beads MCP Server Configuration", test_beads_mcp_config),
        ("Project MCP Configuration", test_project_mcp_config),
        ("Agent Delegation Pattern", test_agent_delegation_config),
        ("Beads Daemon Disabled", test_beads_daemon_disabled),
        ("Git Automation Integration", test_git_automation_integration)
    ]
    
    all_passed = True
    
    for test_name, test_func in tests:
        print(f"\n🔍 {test_name}")
        passed, errors = test_func()
        
        if passed:
            print("✅ PASSED")
        else:
            print("❌ FAILED")
            all_passed = False
            for error in errors:
                print(f"   - {error}")
    
    print("\n" + "=" * 50)
    if all_passed:
        print("🎉 All tests passed! Beads MCP integration is ready.")
        return 0
    else:
        print("💥 Some tests failed. Please fix the issues above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())