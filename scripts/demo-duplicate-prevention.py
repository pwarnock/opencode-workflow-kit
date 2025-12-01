#!/usr/bin/env python3
"""
Comprehensive demo of duplicate prevention system.
Shows real-world usage scenarios and effectiveness.
"""

import subprocess
import json
import sys
import os
import tempfile
from pathlib import Path

# Import the duplicate prevention system
exec(open("duplicate-prevention.py").read())


def demo_section(title):
    """Print demo section header."""
    print(f"\n{'=' * 60}")
    print(f"🎯 {title}")
    print("=" * 60)


def demo_single_issue_check():
    """Demo checking single issue for duplicates."""
    demo_section("Single Issue Duplicate Check")

    preventer = DuplicatePreventer()

    # Test case 1: No duplicates
    print("📝 Testing issue with no duplicates...")
    result1 = preventer.check_duplicate(
        "Implement quantum encryption for secure communications"
    )
    print(
        f"Result: {'✅ No duplicates' if not result1['is_duplicate'] else '❌ Duplicates found'}"
    )
    print(f"Issues checked: {result1['total_issues_checked']}")

    # Test case 2: With duplicates
    print(f"\n📝 Testing issue with duplicates...")
    result2 = preventer.check_duplicate("Create comprehensive integration test suite")
    print(
        f"Result: {'✅ No duplicates' if not result2['is_duplicate'] else '❌ Duplicates found'}"
    )

    if result2["is_duplicate"]:
        print(f"Found {len(result2['duplicates'])} potential duplicates:")
        for dup in result2["duplicates"][:3]:  # Show top 3
            print(f"  • {dup['id']}: {dup['title']}")
            print(
                f"    Similarity: {dup['similarity']:.1%}, Keywords: {dup['keyword_overlap']:.1%}"
            )


def demo_similarity_analysis():
    """Demo similarity analysis between different titles."""
    demo_section("Similarity Analysis Demo")

    preventer = DuplicatePreventer()

    test_cases = [
        (
            "Implement automated cleanup with retention policies",
            "Implement automated cleanup with aggressive retention policies",
        ),
        (
            "Implement advanced multi-agent coordination with swarm intelligence",
            "Implement advanced multi-agent coordination with swarm intelligence patterns",
        ),
        (
            "Create comprehensive integration test suite",
            "Add comprehensive unit test suite",
        ),
        ("Implement Agent Mail integration", "Add email notification system"),
    ]

    for title1, title2 in test_cases:
        similarity = preventer.calculate_similarity(title1, title2)
        keyword_overlap = preventer.check_keyword_overlap(title1, title2)

        print(f"\n📊 Comparing:")
        print(f"  A: {title1}")
        print(f"  B: {title2}")
        print(f"  Similarity: {similarity:.1%}")
        print(f"  Keyword Overlap: {keyword_overlap:.1%}")

        is_duplicate = similarity >= 0.80 or keyword_overlap >= 0.6
        print(f"  Result: {'🚨 DUPLICATE' if is_duplicate else '✅ UNIQUE'}")


def demo_batch_processing():
    """Demo batch processing of multiple issues."""
    demo_section("Batch Processing Demo")

    # Create test batch file
    test_issues = [
        "Implement Agent Mail integration for multi-agent coordination",
        "Create comprehensive integration test suite",  # Should find duplicate
        "Implement automated cleanup with retention policies",
        "Add quantum encryption for secure communications",
        "Implement worktree support for parallel development",
        "Create comprehensive unit test suite",  # Should find duplicate
    ]

    with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".txt") as f:
        for issue in test_issues:
            f.write(issue + "\n")
        temp_file = f.name

    try:
        preventer = DuplicatePreventer()
        result = preventer.process_batch_file(temp_file, dry_run=True)

        print(f"📋 Batch Processing Results:")
        print(f"Total issues: {result['total_issues']}")
        print(f"Duplicates found: {result['duplicates_found']}")
        print(f"Dry run: {result['dry_run']}")

        if result["duplicates_found"] > 0:
            print(f"\n⚠️  Issues with duplicates:")
            for item in result["results"]:
                if item["check_result"]["is_duplicate"]:
                    print(f"  • {item['title']}")
                    for dup in item["check_result"]["duplicates"][:2]:
                        print(
                            f"    → {dup['id']}: {dup['title']} ({dup['similarity']:.1%})"
                        )

    finally:
        os.unlink(temp_file)


def demo_all_issues_check():
    """Demo checking all issues for duplicates."""
    demo_section("All Issues Duplicate Check")

    preventer = DuplicatePreventer()
    result = preventer.check_all_issues()

    print(f"📊 Current Backlog Analysis:")
    print(f"Total open issues: {result['total_issues']}")
    print(f"Duplicate groups found: {len(result['duplicate_groups'])}")

    if result["has_duplicates"]:
        print(f"\n🔄 Duplicate Groups:")
        for i, group in enumerate(result["duplicate_groups"][:5], 1):  # Show top 5
            print(f"{i}. {group['primary']['id']}: {group['primary']['title']}")
            for dup in group["duplicates"]:
                print(f"   ⚠️  {dup['id']}: {dup['title']} ({dup['similarity']:.1%})")

        if len(result["duplicate_groups"]) > 5:
            print(f"... and {len(result['duplicate_groups']) - 5} more groups")
    else:
        print("✅ No duplicates found in current backlog!")


def demo_threshold_comparison():
    """Demo different similarity thresholds."""
    demo_section("Threshold Comparison Demo")

    test_title = "Create comprehensive integration test suite"
    thresholds = [0.90, 0.80, 0.70, 0.50]

    print(f"🎯 Testing issue: {test_title}")
    print(f"📏 Results with different thresholds:")

    for threshold in thresholds:
        preventer = DuplicatePreventer(similarity_threshold=threshold)
        result = preventer.check_duplicate(test_title)

        print(f"  {threshold:.0f}: {len(result['duplicates'])} duplicates found")
        if result["duplicates"]:
            for dup in result["duplicates"][:2]:
                print(f"       • {dup['id']} ({dup['similarity']:.1%})")


def demo_keyword_analysis():
    """Demo keyword extraction and analysis."""
    demo_section("Keyword Analysis Demo")

    preventer = DuplicatePreventer()

    test_titles = [
        "Implement advanced multi-agent coordination with swarm intelligence",
        "Create comprehensive integration test suite",
        "Add automated cleanup with aggressive retention policies",
        "Implement worktree support for parallel development workflows",
    ]

    for title in test_titles:
        keywords = preventer.extract_keywords(title)
        print(f"\n📝 Title: {title}")
        print(f"🔑 Keywords: {', '.join(sorted(keywords))}")


def main():
    """Run comprehensive demo."""
    print("🚀 Duplicate Prevention System - Comprehensive Demo")
    print("This demo shows the system's ability to detect and prevent duplicate issues")

    # Set environment variable to avoid daemon warnings
    os.environ["BEADS_NO_DAEMON"] = "1"

    # Run all demo sections
    demo_single_issue_check()
    demo_similarity_analysis()
    demo_keyword_analysis()
    demo_batch_processing()
    demo_all_issues_check()
    demo_threshold_comparison()

    # Final summary
    demo_section("Demo Summary")
    print("✅ Features Demonstrated:")
    print("  • Single issue duplicate checking")
    print("  • Similarity and keyword analysis")
    print("  • Batch processing with dry-run")
    print("  • Comprehensive backlog analysis")
    print("  • Configurable similarity thresholds")
    print("  • Keyword extraction and matching")

    print(f"\n🎯 Key Benefits:")
    print("  • Prevents duplicate issue creation")
    print("  • Reduces backlog clutter")
    print("  • Improves issue quality and clarity")
    print("  • Saves time on duplicate resolution")
    print("  • Configurable detection sensitivity")

    print(f"\n📖 Usage Examples:")
    print(f'  python3 scripts/duplicate-prevention.py "Issue Title" --interactive')
    print(f"  python3 scripts/duplicate-prevention.py --check-all --fail-on-duplicates")
    print(f"  python3 scripts/duplicate-prevention.py --batch issues.txt --dry-run")


if __name__ == "__main__":
    main()
