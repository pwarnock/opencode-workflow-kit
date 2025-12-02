#!/usr/bin/env python3
"""
Sync monitoring and alerting
Checks sync health and sends alerts on failures
"""

import json
import time
from datetime import datetime, timedelta
from pathlib import Path
import subprocess
import sys

def check_sync_health():
    """Check if sync system is healthy"""
    project_root = Path.cwd()
    state_file = project_root / ".beads-cody-sync-state.json"
    log_file = project_root / ".beads-cody-sync.log"
    
    issues = []
    
    # Check if sync state exists
    if not state_file.exists():
        issues.append("Sync state file not found - sync never run?")
        return False, issues
    
    # Check last sync time
    try:
        with open(state_file, 'r') as f:
            state = json.load(f)
        
        last_sync = state.get("last_sync")
        if last_sync:
            last_sync_time = datetime.fromisoformat(last_sync)
            if datetime.now() - last_sync_time > timedelta(hours=24):
                issues.append(f"Last sync was {datetime.now() - last_sync_time} ago")
        else:
            issues.append("No last sync timestamp found")
            
    except (json.JSONDecodeError, ValueError) as e:
        issues.append(f"Invalid sync state: {e}")
    
    # Check for recent errors in log
    if log_file.exists():
        try:
            with open(log_file, 'r') as f:
                lines = f.readlines()
            
            recent_errors = []
            cutoff = datetime.now() - timedelta(hours=1)
            
            for line in lines[-100:]:  # Check last 100 lines
                if "ERROR" in line:
                    try:
                        timestamp_str = line.split(" - ")[0]
                        timestamp = datetime.strptime(timestamp_str, "%Y-%m-%d %H:%M:%S,%f")
                        if timestamp > cutoff:
                            recent_errors.append(line.strip())
                    except ValueError:
                        continue
            
            if recent_errors:
                issues.extend(recent_errors[:3])  # Limit to 3 most recent errors
                
        except OSError:
            issues.append("Cannot read sync log file")
    
    return len(issues) == 0, issues

def main():
    """Main monitoring entry point"""
    healthy, issues = check_sync_health()
    
    if healthy:
        print("✅ Sync system is healthy")
        sys.exit(0)
    else:
        print("❌ Sync system issues detected:")
        for issue in issues:
            print(f"  - {issue}")
        sys.exit(1)

if __name__ == "__main__":
    main()
