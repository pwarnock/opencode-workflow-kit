#!/usr/bin/env python3
"""
Test suite for duplicate prevention system.
Validates similarity detection, keyword matching, and batch processing.
"""

import subprocess
import json
import sys
import os
import tempfile
from pathlib import Path

# Import the class directly from the file
exec(open("duplicate-prevention.py").read())


def run_test(test_name, test_func):
    """Run a single test and report results."""
    try:
        result = test_func()
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
        return result
    except Exception as e:
        print(f"❌ FAIL: {test_name} - Exception: {e}")
        return False


def test_similarity_calculation():
    """Test similarity calculation between strings."""
    preventer = DuplicatePreventer()

    # Test exact match
    similarity = preventer.calculate_similarity("test title", "test title")
    if similarity != 1.0:
        print(f"Expected 1.0 for exact match, got {similarity}")
        return False

    # Test no similarity
    similarity = preventer.calculate_similarity("abc", "xyz")
    if similarity > 0.5:
        print(f"Expected <0.5 for dissimilar strings, got {similarity}")
        return False

    # Test partial similarity
    similarity = preventer.calculate_similarity(
        "Implement advanced multi-agent coordination with swarm intelligence",
        "Implement advanced multi-agent coordination with swarm intelligence patterns",
    )
    if similarity < 0.9:
        print(f"Expected >0.9 for similar strings, got {similarity}")
        return False

    return True


def test_keyword_extraction():
    """Test keyword extraction from text."""
    preventer = DuplicatePreventer()

    keywords = preventer.extract_keywords(
        "Implement advanced multi-agent coordination with swarm intelligence"
    )

    expected_keywords = {
        "implement",
        "advanced",
        "multi",
        "agent",
        "coordination",
        "swarm",
        "intelligence",
    }

    # Check that expected keywords are present
    for keyword in expected_keywords:
        if keyword not in keywords:
            print(f"Missing expected keyword: {keyword}")
            return False

    # Check that stop words are filtered out
    stop_words = {"the", "with", "and", "or", "but", "in", "on", "at", "to", "for"}
    for stop_word in stop_words:
        if stop_word in keywords:
            print(f"Stop word not filtered: {stop_word}")
            return False

    return True


def test_keyword_overlap():
    """Test keyword overlap calculation."""
    preventer = DuplicatePreventer()

    overlap = preventer.check_keyword_overlap(
        "Implement automated cleanup with retention policies",
        "Implement automated cleanup with aggressive retention policies",
    )

    if overlap < 0.7:
        print(f"Expected >0.7 overlap for similar titles, got {overlap}")
        return False

    return True


def test_duplicate_detection():
    """Test duplicate detection with real issues."""
    preventer = DuplicatePreventer()

    # Test with known duplicate pattern
    result = preventer.check_duplicate("Create comprehensive integration test suite")

    if not result["is_duplicate"]:
        print("Expected to find duplicates for test suite issue")
        return False

    if len(result["duplicates"]) == 0:
        print("Expected at least one duplicate found")
        return False

    # Check that duplicates have similarity scores
    for dup in result["duplicates"]:
        if "similarity" not in dup or "keyword_overlap" not in dup:
            print("Duplicate missing similarity scores")
            return False

    return True


def test_batch_processing():
    """Test batch processing functionality."""
    preventer = DuplicatePreventer()

    # Create temporary test file
    test_issues = [
        "Implement Agent Mail integration for multi-agent coordination",
        "Create comprehensive integration test suite",  # Should find duplicate
        "Implement automated cleanup with retention policies",
        "Add new feature for user authentication",
    ]

    with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".txt") as f:
        for issue in test_issues:
            f.write(issue + "\n")
        temp_file = f.name

    try:
        result = preventer.process_batch_file(temp_file, dry_run=True)

        if "error" in result:
            print(f"Batch processing error: {result['error']}")
            return False

        if result["total_issues"] != 4:
            print(f"Expected 4 issues, got {result['total_issues']}")
            return False

        if result["duplicates_found"] == 0:
            print("Expected to find at least one duplicate in batch")
            return False

        return True

    finally:
        os.unlink(temp_file)


def test_check_all_issues():
    """Test checking all issues for duplicates."""
    preventer = DuplicatePreventer()

    result = preventer.check_all_issues()

    if "total_issues" not in result:
        print("Missing total_issues in result")
        return False

    if "duplicate_groups" not in result:
        print("Missing duplicate_groups in result")
        return False

    # Should find at least one duplicate group (test suite issues)
    if not result["has_duplicates"]:
        print("Expected to find duplicates in all issues check")
        return False

    return True


def test_threshold_configuration():
    """Test different similarity thresholds."""
    # Test with high threshold
    preventer_strict = DuplicatePreventer(similarity_threshold=0.95)
    result_strict = preventer_strict.check_duplicate(
        "Create comprehensive integration test suite"
    )

    # Test with low threshold
    preventer_loose = DuplicatePreventer(similarity_threshold=0.50)
    result_loose = preventer_loose.check_duplicate(
        "Create comprehensive integration test suite"
    )

    # Strict should find fewer or equal duplicates than loose
    if len(result_strict["duplicates"]) > len(result_loose["duplicates"]):
        print("Strict threshold found more duplicates than loose threshold")
        return False

    return True


def main():
    """Run all tests."""
    print("🧪 Running Duplicate Prevention System Tests")
    print("=" * 50)

    # Set environment variable to avoid daemon warnings
    os.environ["BEADS_NO_DAEMON"] = "1"

    tests = [
        ("Similarity Calculation", test_similarity_calculation),
        ("Keyword Extraction", test_keyword_extraction),
        ("Keyword Overlap", test_keyword_overlap),
        ("Duplicate Detection", test_duplicate_detection),
        ("Batch Processing", test_batch_processing),
        ("Check All Issues", test_check_all_issues),
        ("Threshold Configuration", test_threshold_configuration),
    ]

    passed = 0
    total = len(tests)

    for test_name, test_func in tests:
        if run_test(test_name, test_func):
            passed += 1

    print("=" * 50)
    print(f"📊 Test Results: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 All tests passed! Duplicate prevention system is working correctly.")
        return 0
    else:
        print(f"⚠️  {total - passed} test(s) failed. Please review the implementation.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
