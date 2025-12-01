#!/usr/bin/env python3
"""
Clean up duplicate issues by removing newer duplicates and keeping earlier ones.
Based on analysis of exact and semantic duplicates in the backlog.
"""

import subprocess
import json
import sys
import os
from pathlib import Path


def run_bd_command(args, use_json=True):
    """Run bd command and return JSON output."""
    try:
        cmd = ["bd", "--no-daemon"] + args
        if use_json:
            cmd.append("--json")

        result = subprocess.run(cmd, capture_output=True, text=True, check=True)

        if use_json:
            return json.loads(result.stdout)
        return {"stdout": result.stdout, "stderr": result.stderr}

    except subprocess.CalledProcessError as e:
        if use_json:
            return {"error": e.stderr, "returncode": e.returncode}
        return {"error": e.stderr, "returncode": e.returncode, "stdout": e.stdout}
    except json.JSONDecodeError as e:
        return {"error": f"JSON decode error: {e}", "raw_output": result.stdout}
    except Exception as e:
        return {"error": f"Unexpected error: {e}"}


def close_duplicate_issue(
    issue_id, reason="Duplicate issue - closing in favor of earlier version"
):
    """Close a duplicate issue."""
    print(f"🗑️  Closing duplicate {issue_id}: {reason}")
    result = run_bd_command(["close", issue_id, "--reason", reason], use_json=False)

    if "error" in result:
        print(f"❌ Failed to close {issue_id}: {result['error']}")
        return False

    print(f"✅ Successfully closed {issue_id}")
    return True


def main():
    """Main cleanup function."""
    # Set environment variable to avoid daemon warnings
    os.environ["BEADS_NO_DAEMON"] = "1"

    print("🧹 Starting duplicate cleanup process...")

    # Define cleanup plan based on analysis
    # Keep earlier issues, close newer duplicates
    cleanup_plan = [
        # Exact duplicates - keep first, close second
        {
            "keep": "owk-56u",  # Agent Village security and governance framework
            "close": ["owk-17v"],
            "reason": "Exact duplicate - keeping owk-56u (earlier)",
        },
        {
            "keep": "owk-zre",  # Agent Village simulation and testing environment
            "close": ["owk-1z0"],
            "reason": "Exact duplicate - keeping owk-zre (earlier)",
        },
        {
            "keep": "owk-6sd",  # Adaptive learning and knowledge sharing system
            "close": ["owk-ba6"],
            "reason": "Exact duplicate - keeping owk-6sd (earlier)",
        },
        {
            "keep": "owk-t5r",  # Distributed consensus and decision making protocols
            "close": ["owk-sk1"],
            "reason": "Exact duplicate - keeping owk-t5r (earlier)",
        },
        # Semantic duplicates - keep more specific/comprehensive version
        {
            "keep": "owk-dun",  # swarm intelligence patterns (more specific)
            "close": ["owk-oh9"],
            "reason": "Semantic duplicate - keeping owk-dun (more specific with patterns)",
        },
        {
            "keep": "owk-7cn",  # aggressive cleanup (more focused)
            "close": ["owk-idj"],
            "reason": "Semantic duplicate - keeping owk-7cn (more focused aggressive cleanup)",
        },
        {
            "keep": "owk-a0y",  # worktree workflows (more comprehensive)
            "close": ["owk-p6e"],
            "reason": "Semantic duplicate - keeping owk-a0y (more comprehensive workflows)",
        },
        {
            "keep": "owk-au5",  # automated detection (more specific)
            "close": ["owk-h48"],
            "reason": "Semantic duplicate - keeping owk-au5 (more specific automated detection)",
        },
        {
            "keep": "owk-2oh",  # distributed systems (more targeted)
            "close": ["owk-aa5"],
            "reason": "Semantic duplicate - keeping owk-2oh (more targeted distributed systems)",
        },
    ]

    # Get current open issues to verify
    print("📋 Verifying current open issues...")
    open_issues = run_bd_command(["list", "--status", "open"])

    if "error" in open_issues:
        print(f"❌ Failed to get open issues: {open_issues['error']}")
        sys.exit(1)

    open_issue_ids = {issue["id"] for issue in open_issues}

    total_to_close = 0
    successfully_closed = 0

    for item in cleanup_plan:
        print(f"\n🔄 Processing: {item['keep']}")

        # Verify the issue to keep exists and is open
        if item["keep"] not in open_issue_ids:
            print(f"⚠️  Issue {item['keep']} not found in open issues, skipping...")
            continue

        # Close duplicates
        for duplicate_id in item["close"]:
            if duplicate_id not in open_issue_ids:
                print(
                    f"⚠️  Duplicate {duplicate_id} not found in open issues, skipping..."
                )
                continue

            total_to_close += 1
            if close_duplicate_issue(duplicate_id, item["reason"]):
                successfully_closed += 1

    print(f"\n📊 Cleanup Summary:")
    print(f"Total duplicates to close: {total_to_close}")
    print(f"Successfully closed: {successfully_closed}")
    print(f"Failed to close: {total_to_close - successfully_closed}")

    if successfully_closed > 0:
        print(
            f"\n✅ Cleanup completed! Reduced backlog by {successfully_closed} issues."
        )

        # Show updated count
        updated_issues = run_bd_command(["list", "--status", "open"])
        if "error" not in updated_issues:
            print(f"📈 Updated open issues count: {len(updated_issues)}")
    else:
        print(f"\nℹ️  No issues were closed (they may have been already processed)")


if __name__ == "__main__":
    main()
