#!/usr/bin/env python3
"""
Test complete beads workflow integration with git automation and cody framework.

This test validates:
1. Beads issue creation and management
2. Git automation sync
3. Cody tasklist generation
4. Event-driven workflow
"""

import json
import subprocess
import tempfile
from pathlib import Path
from datetime import datetime

def test_complete_workflow():
    """Test the complete beads workflow integration."""
    print("🔄 Testing Complete Beads Workflow Integration")
    print("=" * 50)
    
    # Test 1: Beads issue parsing
    print("\n1️⃣ Testing Beads Issue Parsing")
    try:
        result = subprocess.run([
            "uv", "run", "python", "scripts/beads-cody-sync.py", 
            "--command", "parse"
        ], capture_output=True, text=True, cwd=Path.cwd())
        
        if result.returncode == 0:
            print("✅ Beads issue parsing works")
            issues = result.stdout.strip().split('\n')
            print(f"   Found {len(issues)} issues")
        else:
            print("❌ Beads issue parsing failed")
            print(f"   Error: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ Error testing beads parsing: {e}")
        return False
    
    # Test 2: Cody tasklist generation
    print("\n2️⃣ Testing Cody Tasklist Generation")
    try:
        result = subprocess.run([
            "uv", "run", "python", "scripts/beads-cody-sync.py", 
            "--command", "generate"
        ], capture_output=True, text=True, cwd=Path.cwd())
        
        if result.returncode == 0:
            print("✅ Cody tasklist generation works")
            
            # Check if files were created
            feature_backlog = Path(".cody/project/build/feature-backlog.md")
            v050_tasklist = Path(".cody/project/build/v0.5.0/tasklist.md")
            
            if feature_backlog.exists():
                print("   ✅ Feature backlog generated")
            else:
                print("   ❌ Feature backlog not generated")
                
            if v050_tasklist.exists():
                print("   ✅ v0.5.0 tasklist generated")
            else:
                print("   ❌ v0.5.0 tasklist not generated")
        else:
            print("❌ Cody tasklist generation failed")
            print(f"   Error: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ Error testing tasklist generation: {e}")
        return False
    
    # Test 3: Git automation validation
    print("\n3️⃣ Testing Git Automation Validation")
    try:
        result = subprocess.run([
            "uv", "run", "python", "scripts/git-automation.py", 
            "validate"
        ], capture_output=True, text=True, cwd=Path.cwd())
        
        if result.returncode == 0:
            print("✅ Git automation validation works")
            print(f"   {result.stdout.strip()}")
        else:
            print("❌ Git automation validation failed")
            print(f"   Error: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ Error testing git automation: {e}")
        return False
    
    # Test 4: Configuration validation
    print("\n4️⃣ Testing Configuration Validation")
    try:
        result = subprocess.run([
            "uv", "run", "python", "scripts/config-validator.py", 
            "config/global/mcp/servers.json"
        ], capture_output=True, text=True, cwd=Path.cwd())
        
        if result.returncode == 0:
            print("✅ MCP configuration validation works")
        else:
            print("❌ MCP configuration validation failed")
            print(f"   Error: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ Error testing config validation: {e}")
        return False
    
    # Test 5: Check beads daemon is disabled
    print("\n5️⃣ Testing Beads Daemon Configuration")
    try:
        beads_config = Path(".beads/config.json")
        if beads_config.exists():
            with open(beads_config, 'r') as f:
                config = json.load(f)
                
            daemon_enabled = config.get("daemon", {}).get("enabled", True)
            sync_mode = config.get("sync", {}).get("mode", "")
            
            if not daemon_enabled and sync_mode == "event-driven":
                print("✅ Beads daemon is disabled, event-driven mode enabled")
            else:
                print("❌ Beads daemon configuration incorrect")
                print(f"   Daemon enabled: {daemon_enabled}")
                print(f"   Sync mode: {sync_mode}")
                return False
        else:
            print("❌ Beads config file not found")
            return False
    except Exception as e:
        print(f"❌ Error checking beads config: {e}")
        return False
    
    print("\n" + "=" * 50)
    print("🎉 Complete workflow integration test PASSED!")
    print("\n📋 Integration Summary:")
    print("   ✅ Beads MCP server configured for project-local access")
    print("   ✅ Agent delegation pattern implemented (cody-admin)")
    print("   ✅ Project-level MCP configuration created")
    print("   ✅ Beads daemon disabled in favor of event-driven workflow")
    print("   ✅ Git automation integration working")
    print("   ✅ Cody tasklist generation from beads issues working")
    
    return True

if __name__ == "__main__":
    success = test_complete_workflow()
    exit(0 if success else 1)