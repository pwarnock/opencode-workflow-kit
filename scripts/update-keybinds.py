#!/usr/bin/env python3
"""
Update OpenCode configuration with custom keybinds
"""

import json
import sys
from pathlib import Path


def update_opencode_keybinds():
    """Add custom keybinds to the installed OpenCode configuration"""
    
    # Get the installed config path
    config_path = Path.home() / ".config" / "opencode" / "opencode.json"
    
    if not config_path.exists():
        print(f"❌ OpenCode config not found at: {config_path}")
        return False
    
    # Load current config
    try:
        with open(config_path, 'r') as f:
            config = json.load(f)
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON in config: {e}")
        return False
    
    # Add keybinds
    keybinds = {
        "session_child_cycle_reverse": "ctrl+left",
        "session_child_cycle": "ctrl+right"
    }
    
    config["keybinds"] = keybinds
    
    # Write updated config
    try:
        with open(config_path, 'w') as f:
            json.dump(config, f, indent=2)
        print(f"✅ Updated keybinds in: {config_path}")
        print(f"📋 Added keybinds: {keybinds}")
        return True
    except Exception as e:
        print(f"❌ Failed to update config: {e}")
        return False


if __name__ == "__main__":
    if update_opencode_keybinds():
        print("🔄 Restart OpenCode to apply keybind changes")
    else:
        sys.exit(1)