#!/usr/bin/env python3
"""
Simple test for configuration inheritance.
"""

import json
from pathlib import Path

def load_config_with_inheritance(config_path):
    """Load configuration with inheritance resolution."""
    config_path = Path(config_path)
    
    with open(config_path, 'r') as f:
        config = json.load(f)
    
    # Resolve inheritance
    if "inherits" in config:
        parent_path = config_path.parent / config["inherits"]
        print(f"Loading parent: {parent_path}")
        
        if parent_path.exists():
            with open(parent_path, 'r') as f:
                parent_config = json.load(f)
            
            # Simple merge (child overrides parent)
            merged = parent_config.copy()
            merged.update(config)
            merged.pop("inherits", None)  # Remove inherits key
            
            print(f"Inheritance resolved for {config_path.name}")
            return merged
        else:
            print(f"Parent not found: {parent_path}")
            return config
    
    return config

def test_inheritance():
    """Test inheritance for all project configurations."""
    print("=== Configuration Inheritance Test ===")
    
    project_configs = [
        "config/project/.opencode/agents/project.json",
        "config/project/.opencode/mcp/project-servers.json",
        "config/project/.opencode/permissions/project.json"
    ]
    
    for config_file in project_configs:
        print(f"\n--- Testing {config_file} ---")
        
        if not Path(config_file).exists():
            print(f"  ✗ File not found")
            continue
        
        try:
            # Load original
            with open(config_file, 'r') as f:
                original = json.load(f)
            
            print(f"  Original keys: {list(original.keys())}")
            
            if "inherits" in original:
                print(f"  Inherits from: {original['inherits']}")
                
                # Load with inheritance
                resolved = load_config_with_inheritance(config_file)
                print(f"  Resolved keys: {list(resolved.keys())}")
                
                # Show some differences
                if "agent" in resolved:
                    print(f"  Agent name: {resolved['agent'].get('name', 'N/A')}")
                
                if "servers" in resolved:
                    print(f"  Server count: {len(resolved['servers'])}")
                
                if "permissions" in resolved:
                    print(f"  Has permissions: {type(resolved['permissions']).__name__}")
                
                print(f"  ✓ Inheritance successful")
            else:
                print(f"  ℹ No inheritance")
        
        except Exception as e:
            print(f"  ✗ Error: {e}")

if __name__ == "__main__":
    test_inheritance()