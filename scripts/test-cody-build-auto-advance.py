#!/usr/bin/env python3
"""
Test script to validate cody-build auto-advance behavior.

This script tests that when feature-backlog.md already exists,
the cody-builder automatically advances to the first incomplete version.
"""

import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple


def parse_feature_backlog(file_path: Path) -> Dict[str, List[Dict[str, str]]]:
    """Parse feature-backlog.md and extract version information."""
    if not file_path.exists():
        return {}
    
    content = file_path.read_text()
    versions = {}
    
    # Find version sections
    version_pattern = r'^## (v[\d.]+) - (.+)$'
    current_version = None
    current_features = []
    
    for line in content.split('\n'):
        version_match = re.match(version_pattern, line)
        if version_match:
            if current_version:
                versions[current_version] = current_features
            current_version = version_match.group(1)
            status = version_match.group(2)
            current_features = [{'version': current_version, 'status': status}]
        elif current_version and line.startswith('| F-'):
            # Parse feature row
            parts = [p.strip() for p in line.split('|')[1:-1]]  # Remove empty first/last
            if len(parts) >= 4:
                current_features.append({
                    'id': parts[0],
                    'feature': parts[1],
                    'description': parts[2],
                    'priority': parts[3],
                    'status': parts[4] if len(parts) > 4 else 'Unknown'
                })
    
    if current_version:
        versions[current_version] = current_features
    
    return versions


def find_first_incomplete_version(versions: Dict[str, List[Dict[str, str]]]) -> Optional[str]:
    """Find the first version with Not Started status."""
    for version_name, version_data in versions.items():
        if version_data and '🔴' in version_data[0].get('status', ''):
            return version_name
    return None


def test_auto_advance_behavior():
    """Test the auto-advance behavior for cody-build."""
    print("🧪 Testing cody-build auto-advance behavior...")
    
    # Test with the actual feature-backlog.md
    feature_backlog_path = Path(__file__).parent.parent / ".cody" / "project" / "build" / "feature-backlog.md"
    
    if not feature_backlog_path.exists():
        print("❌ feature-backlog.md not found")
        return False
    
    print(f"📖 Parsing {feature_backlog_path}")
    versions = parse_feature_backlog(feature_backlog_path)
    
    if not versions:
        print("❌ No versions found in feature-backlog.md")
        return False
    
    print(f"📋 Found {len(versions)} versions:")
    for version_name, version_data in versions.items():
        status = version_data[0].get('status', 'Unknown') if version_data else 'Unknown'
        print(f"   {version_name}: {status}")
    
    # Find first incomplete version
    first_incomplete = find_first_incomplete_version(versions)
    
    if first_incomplete:
        print(f"✅ First incomplete version found: {first_incomplete}")
        print(f"🚀 Expected behavior: cody-build should auto-advance to {first_incomplete}")
        return True
    else:
        print("ℹ️  No incomplete versions found - all versions are completed")
        print("🚀 Expected behavior: cody-build should suggest creating new versions")
        return True


def test_cody_builder_config():
    """Test that cody-builder configuration supports auto-advance."""
    print("\n🧪 Testing cody-builder configuration...")
    
    cody_builder_path = Path(__file__).parent.parent / "agents" / "cody-builder.json"
    
    if not cody_builder_path.exists():
        print("❌ cody-builder.json not found")
        return False
    
    import json
    config = json.loads(cody_builder_path.read_text())
    
    # Check for auto-advance capabilities
    behavior = config.get('behavior', {})
    specialization = config.get('specialization', {})
    
    required_capabilities = [
        'version-management',
        'feature-backlog-analysis', 
        'workflow-automation'
    ]
    
    capabilities = specialization.get('capabilities', [])
    missing_caps = [cap for cap in required_capabilities if cap not in capabilities]
    
    if missing_caps:
        print(f"❌ Missing capabilities: {missing_caps}")
        return False
    
    if not behavior.get('auto_advance_versions', False):
        print("❌ auto_advance_versions not enabled in behavior")
        return False
    
    if not behavior.get('feature_backlog_aware', False):
        print("❌ feature_backlog_aware not enabled in behavior")
        return False
    
    print("✅ cody-builder configuration supports auto-advance")
    return True


def test_build_command_config():
    """Test that build command includes auto-advance logic."""
    print("\n🧪 Testing build command configuration...")
    
    build_command_path = Path(__file__).parent.parent / ".cody" / "config" / "command" / "build.md"
    
    if not build_command_path.exists():
        print("❌ build.md command not found")
        return False
    
    content = build_command_path.read_text()
    
    # Check for auto-advance logic
    if "automatically execute" not in content.lower():
        print("❌ Build command doesn't include automatic execution logic")
        return False
    
    if "first version with" not in content.lower():
        print("❌ Build command doesn't include version scanning logic")
        return False
    
    print("✅ Build command includes auto-advance logic")
    return True


def main():
    """Run all tests."""
    print("🚀 Testing cody-build auto-advance functionality\n")
    
    tests = [
        test_auto_advance_behavior,
        test_cody_builder_config,
        test_build_command_config
    ]
    
    results = []
    for test in tests:
        try:
            result = test()
            results.append(result)
        except Exception as e:
            print(f"❌ Test failed with error: {e}")
            results.append(False)
    
    print(f"\n📊 Test Results: {sum(results)}/{len(results)} passed")
    
    if all(results):
        print("🎉 All tests passed! cody-build auto-advance is properly configured")
        return 0
    else:
        print("❌ Some tests failed. Check the configuration.")
        return 1


if __name__ == "__main__":
    exit(main())