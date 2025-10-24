#!/usr/bin/env python3
"""
Test configuration inheritance functionality.
"""

import sys
import os
import json
from pathlib import Path

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

try:
    import importlib.util
    spec = importlib.util.spec_from_file_location("path_utils", Path(__file__).parent / "path-utils.py")
    path_utils = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(path_utils)
    PathNormalizer = path_utils.PathNormalizer
    
    spec2 = importlib.util.spec_from_file_location("config_validator", Path(__file__).parent / "config-validator.py")
    config_validator = importlib.util.module_from_spec(spec2)
    spec2.loader.exec_module(config_validator)
    ConfigValidator = config_validator.ConfigValidator
    
    def test_inheritance():
        """Test configuration inheritance."""
        print("=== Configuration Inheritance Tests ===")
        
        normalizer = PathNormalizer()
        validator = ConfigValidator()
        
        # Test project configurations that inherit from global
        test_configs = [
            "config/project/.opencode/agents/project.json",
            "config/project/.opencode/mcp/project-servers.json",
            "config/project/.opencode/permissions/project.json"
        ]
        
        for config_file in test_configs:
            print(f"\n--- Testing {config_file} ---")
            
            # Load the configuration
            config_path = normalizer.normalize_path(config_file)
            if not config_path.exists():
                print(f"  ✗ Configuration file not found")
                continue
            
            try:
                with open(config_path, 'r') as f:
                    config = json.load(f)
            except Exception as e:
                print(f"  ✗ Failed to load configuration: {e}")
                continue
            
            # Check if it has inheritance
            if "inherits" in config:
                print(f"  ✓ Has inheritance: {config['inherits']}")
                
                # Test inheritance resolution
                try:
                    resolved = validator._resolve_inheritance(config, config_path.parent)
                    print(f"  ✓ Inheritance resolved successfully")
                    
                    # Show some key differences
                    if "agent" in config and "agent" in resolved:
                        print(f"    Agent name: {resolved['agent'].get('name', 'N/A')}")
                    
                    if "servers" in config and "servers" in resolved:
                        print(f"    Servers count: {len(resolved['servers'])}")
                    
                    if "permissions" in config and "permissions" in resolved:
                        print(f"    Permissions structure: inherited")
                    
                except Exception as e:
                    print(f"  ✗ Inheritance resolution failed: {e}")
            else:
                print(f"  ℹ No inheritance defined")
        
        # Test specific inheritance scenarios
        print(f"\n--- Specific Inheritance Tests ---")
        
        # Test agent inheritance
        agent_config = "config/project/.opencode/agents/project.json"
        if Path(agent_config).exists():
            print(f"\nTesting agent inheritance:")
            with open(agent_config, 'r') as f:
                config = json.load(f)
            
            resolved = validator._resolve_inheritance(config, Path(agent_config).parent)
            
            # Check if project-specific values override global
            if "environment" in resolved:
                env = resolved["environment"]
                if "variables" in env:
                    print(f"  ✓ Project variables: {list(env['variables'].keys())}")
                
                if "paths" in env:
                    print(f"  ✓ Project paths: {list(env['paths'].keys())}")
            
            if "project_specific" in resolved:
                print(f"  ✓ Project-specific settings present")
        
        # Test MCP server inheritance
        mcp_config = "config/project/.opencode/mcp/project-servers.json"
        if Path(mcp_config).exists():
            print(f"\nTesting MCP server inheritance:")
            with open(mcp_config, 'r') as f:
                config = json.load(f)
            
            resolved = validator._resolve_inheritance(config, Path(mcp_config).parent)
            
            if "servers" in resolved:
                servers = resolved["servers"]
                print(f"  ✓ Total servers after inheritance: {len(servers)}")
                
                # Check if project overrides are applied
                if "filesystem" in servers:
                    fs_server = servers["filesystem"]
                    if "args" in fs_server:
                        print(f"  ✓ Filesystem server args: {fs_server['args']}")
                
                if "language_servers" in resolved:
                    lang_servers = resolved["language_servers"]
                    print(f"  ✓ Language servers defined: {list(lang_servers.keys())}")
        
        # Test permission inheritance
        perm_config = "config/project/.opencode/permissions/project.json"
        if Path(perm_config).exists():
            print(f"\nTesting permission inheritance:")
            with open(perm_config, 'r') as f:
                config = json.load(f)
            
            resolved = validator._resolve_inheritance(config, Path(perm_config).parent)
            
            if "permissions" in resolved:
                perms = resolved["permissions"]
                
                # Check file system permissions
                if "file_system" in perms:
                    fs_perms = perms["file_system"]
                    if "read" in fs_perms and "paths" in fs_perms["read"]:
                        print(f"  ✓ File system read paths: {len(fs_perms['read']['paths'].get('exclude', []))} exclusions")
                
                # Check project-specific security
                if "project_security" in resolved:
                    proj_sec = resolved["project_security"]
                    print(f"  ✓ Project security settings: {list(proj_sec.keys())}")
        
        return True
    
    if __name__ == "__main__":
        test_inheritance()
        
except ImportError as e:
    print(f"Import error: {e}")
    
    # Fallback basic test
    print("=== Basic Inheritance Test ===")
    
    # Check if configurations have inheritance defined
    configs_with_inheritance = []
    
    for config_file in [
        "config/project/.opencode/agents/project.json",
        "config/project/.opencode/mcp/project-servers.json", 
        "config/project/.opencode/permissions/project.json"
    ]:
        if Path(config_file).exists():
            try:
                with open(config_file, 'r') as f:
                    config = json.load(f)
                if "inherits" in config:
                    configs_with_inheritance.append((config_file, config["inherits"]))
                    print(f"  ✓ {config_file} inherits from {config['inherits']}")
                else:
                    print(f"  ℹ {config_file} has no inheritance")
            except Exception as e:
                print(f"  ✗ {config_file}: {e}")
    
    if configs_with_inheritance:
        print(f"\nFound {len(configs_with_inheritance)} configurations with inheritance")
        for config_file, parent in configs_with_inheritance:
            parent_path = Path(parent)
            if parent_path.exists():
                print(f"  ✓ Parent {parent} exists for {config_file}")
            else:
                print(f"  ✗ Parent {parent} missing for {config_file}")
    else:
        print("No configurations with inheritance found")
    
    sys.exit(0)