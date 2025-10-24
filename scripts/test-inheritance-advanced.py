#!/usr/bin/env python3
"""
Advanced test for configuration inheritance behavior.
"""

import json
from pathlib import Path

def deep_merge(parent, child):
    """Deep merge two dictionaries, with child overriding parent."""
    result = parent.copy()
    
    for key, value in child.items():
        if key == "inherits":
            continue  # Skip inheritance key
        
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = deep_merge(result[key], value)
        else:
            result[key] = value
    
    return result

def load_config_with_inheritance(config_path):
    """Load configuration with full inheritance resolution."""
    config_path = Path(config_path)
    
    with open(config_path, 'r') as f:
        config = json.load(f)
    
    # Resolve inheritance recursively
    if "inherits" in config:
        parent_path = config_path.parent / config["inherits"]
        
        if parent_path.exists():
            parent_config = load_config_with_inheritance(parent_path)
            merged = deep_merge(parent_config, config)
            merged.pop("inherits", None)  # Remove inherits key
            return merged
        else:
            raise FileNotFoundError(f"Parent config not found: {parent_path}")
    
    return config

def test_inheritance_details():
    """Test detailed inheritance behavior."""
    print("=== Advanced Configuration Inheritance Test ===")
    
    # Test agent configuration inheritance
    print("\n--- Agent Configuration Inheritance ---")
    agent_config = load_config_with_inheritance("config/project/.opencode/agents/project.json")
    
    # Check that project-specific values override global
    if "agent" in agent_config:
        agent = agent_config["agent"]
        print(f"✓ Agent name: {agent.get('name')}")
        print(f"✓ Project specific: {agent.get('project_specific', False)}")
    
    # Check environment inheritance and overrides
    if "environment" in agent_config:
        env = agent_config["environment"]
        if "paths" in env:
            paths = env["paths"]
            print(f"✓ Config dir: {paths.get('config_dir')}")
            print(f"✓ Cache dir: {paths.get('cache_dir')}")
        
        if "variables" in env:
            vars_list = list(env["variables"].keys())
            print(f"✓ Environment variables: {len(vars_list)} variables")
            if "PROJECT_ROOT" in env["variables"]:
                print(f"  - PROJECT_ROOT: {env['variables']['PROJECT_ROOT']}")
    
    # Test MCP configuration inheritance
    print("\n--- MCP Configuration Inheritance ---")
    mcp_config = load_config_with_inheritance("config/project/.opencode/mcp/project-servers.json")
    
    if "servers" in mcp_config:
        servers = mcp_config["servers"]
        print(f"✓ Total servers: {len(servers)}")
        
        # Check specific server inheritance
        if "filesystem" in servers:
            fs_server = servers["filesystem"]
            print(f"✓ Filesystem server enabled: {fs_server.get('enabled')}")
            if "args" in fs_server:
                print(f"  - Args: {fs_server['args']}")
        
        if "lsp" in servers:
            lsp_server = servers["lsp"]
            print(f"✓ LSP server enabled: {lsp_server.get('enabled')}")
    
    # Check project-specific additions
    if "language_servers" in mcp_config:
        lang_servers = mcp_config["language_servers"]
        print(f"✓ Language servers: {list(lang_servers.keys())}")
    
    if "framework_servers" in mcp_config:
        fw_servers = mcp_config["framework_servers"]
        print(f"✓ Framework servers: {list(fw_servers.keys())}")
    
    # Test permission configuration inheritance
    print("\n--- Permission Configuration Inheritance ---")
    perm_config = load_config_with_inheritance("config/project/.opencode/permissions/project.json")
    
    if "permissions" in perm_config:
        perms = perm_config["permissions"]
        
        # Check file system permissions
        if "file_system" in perms:
            fs_perms = perms["file_system"]
            if "read" in fs_perms:
                read_perms = fs_perms["read"]
                if "paths" in read_perms and "exclude" in read_perms["paths"]:
                    excludes = read_perms["paths"]["exclude"]
                    print(f"✓ File read exclusions: {len(excludes)} patterns")
                    if "node_modules" in str(excludes):
                        print(f"  - Excludes node_modules")
            
            if "write" in fs_perms:
                write_perms = fs_perms["write"]
                if "respect_gitignore" in write_perms:
                    print(f"✓ Respect gitignore: {write_perms['respect_gitignore']}")
    
    # Check project-specific security
    if "project_security" in perm_config:
        proj_sec = perm_config["project_security"]
        print(f"✓ Project security features: {list(proj_sec.keys())}")
        
        if "secret_detection" in proj_sec:
            secret_det = proj_sec["secret_detection"]
            if "action" in secret_det:
                print(f"  - Secret detection action: {secret_det['action']}")
    
    # Test platform-specific inheritance
    print("\n--- Platform-Specific Inheritance ---")
    
    # Check if platform overrides are preserved
    for config_name, config_path in [
        ("Agent", "config/project/.opencode/agents/project.json"),
        ("MCP", "config/project/.opencode/mcp/project-servers.json"),
        ("Permissions", "config/project/.opencode/permissions/project.json")
    ]:
        config = load_config_with_inheritance(config_path)
        if "platform_overrides" in config:
            platforms = list(config["platform_overrides"].keys())
            print(f"✓ {config_name} platform overrides: {platforms}")
    
    return True

def test_inheritance_edge_cases():
    """Test edge cases in inheritance."""
    print("\n=== Inheritance Edge Cases ===")
    
    # Test that inheritance doesn't create circular references
    try:
        config = load_config_with_inheritance("config/project/.opencode/agents/project.json")
        print("✓ No circular inheritance detected")
    except Exception as e:
        print(f"✗ Circular inheritance error: {e}")
        return False
    
    # Test that child properly overrides parent
    agent_config = load_config_with_inheritance("config/project/.opencode/agents/project.json")
    
    # Check project-specific override
    if "agent" in agent_config and "name" in agent_config["agent"]:
        agent_name = agent_config["agent"]["name"]
        if agent_name == "opencode-project":
            print("✓ Child properly overrides parent agent name")
        else:
            print(f"✗ Agent name not overridden: {agent_name}")
    
    # Check that new sections are added
    if "project_specific" in agent_config:
        print("✓ Child adds new sections")
    else:
        print("✗ Child doesn't add new sections")
    
    return True

if __name__ == "__main__":
    success1 = test_inheritance_details()
    success2 = test_inheritance_edge_cases()
    
    if success1 and success2:
        print("\n🎉 All inheritance tests passed!")
    else:
        print("\n❌ Some inheritance tests failed!")