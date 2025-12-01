#!/usr/bin/env python3
"""
Prevents duplicate issue creation by checking for similar existing issues.
Uses difflib for similarity matching and bd search for existing issue lookup.

Usage:
    python scripts/duplicate-prevention.py "Issue Title" [--interactive]
    python scripts/duplicate-prevention.py --check-all [--fail-on-duplicates]
    python scripts/duplicate-prevention.py --batch issues.txt [--dry-run]
"""

import subprocess
import json
import sys
import argparse
import difflib
import os
from pathlib import Path
from typing import List, Dict, Tuple, Optional, Set


class DuplicatePreventer:
    def __init__(self, similarity_threshold: float = 0.80, bd_command: str = "bd"):
        self.similarity_threshold = similarity_threshold
        self.bd_command = bd_command
        self.keywords_cache = set()

    def run_bd_command(self, args: List[str], use_json: bool = True) -> Dict:
        """Run bd command and return JSON output."""
        try:
            cmd = [self.bd_command, "--no-daemon"] + args
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

    def search_existing_issues(self, query: str) -> List[Dict]:
        """Search existing issues using bd search."""
        result = self.run_bd_command(["search", query])

        if "error" in result:
            print(f"Warning: Search failed: {result['error']}", file=sys.stderr)
            return []

        return result if isinstance(result, list) else []

    def get_all_open_issues(self) -> List[Dict]:
        """Get all open issues."""
        result = self.run_bd_command(["list", "--status", "open"])

        if "error" in result:
            print(
                f"Warning: Failed to get open issues: {result['error']}",
                file=sys.stderr,
            )
            return []

        return result if isinstance(result, list) else []

    def calculate_similarity(self, text1: str, text2: str) -> float:
        """Calculate similarity using difflib SequenceMatcher."""
        return difflib.SequenceMatcher(None, text1.lower(), text2.lower()).ratio()

    def extract_keywords(self, text: str) -> Set[str]:
        """Extract keywords from text for matching."""
        # Simple keyword extraction - can be enhanced
        import re

        words = re.findall(r"\b\w+\b", text.lower())

        # Filter out common words and keep meaningful keywords
        stop_words = {
            "the",
            "a",
            "an",
            "and",
            "or",
            "but",
            "in",
            "on",
            "at",
            "to",
            "for",
            "of",
            "with",
            "by",
            "from",
            "up",
            "about",
            "into",
            "through",
            "during",
            "before",
            "after",
            "above",
            "below",
            "between",
            "among",
            "create",
            "add",
            "feature",
            "system",
            "support",
            "management",
            "this",
            "that",
            "these",
            "those",
            "will",
            "would",
            "could",
            "should",
            "may",
            "might",
            "can",
        }

        keywords = {word for word in words if len(word) > 3 and word not in stop_words}
        return keywords

    def check_keyword_overlap(self, title1: str, title2: str) -> float:
        """Calculate keyword overlap ratio."""
        keywords1 = self.extract_keywords(title1)
        keywords2 = self.extract_keywords(title2)

        if not keywords1 or not keywords2:
            return 0.0

        intersection = keywords1.intersection(keywords2)
        union = keywords1.union(keywords2)

        return len(intersection) / len(union) if union else 0.0

    def check_duplicate(self, title: str, description: str = "") -> Dict:
        """Check for potential duplicates before issue creation."""
        duplicates = []

        # Get all open issues for comprehensive checking
        all_issues = self.get_all_open_issues()

        # Also search for specific keyword matches
        keywords = self.extract_keywords(title)
        search_results = []
        for keyword in keywords:
            search_results.extend(self.search_existing_issues(keyword))

        # Combine and deduplicate results
        all_candidates = {issue["id"]: issue for issue in all_issues}
        for issue in search_results:
            all_candidates[issue["id"]] = issue

        for issue in all_candidates.values():
            # Skip if it's the same issue (if we had an ID)
            if issue.get("title") == title:
                continue

            similarity = self.calculate_similarity(title, issue.get("title", ""))
            keyword_overlap = self.check_keyword_overlap(title, issue.get("title", ""))

            # Consider it a duplicate if similarity is high OR keyword overlap is high
            is_duplicate = (
                similarity >= self.similarity_threshold
                or keyword_overlap >= 0.6  # 60% keyword overlap
                or (similarity >= 0.7 and keyword_overlap >= 0.4)  # Combined threshold
            )

            if is_duplicate:
                duplicates.append(
                    {
                        "id": issue.get("id"),
                        "title": issue.get("title"),
                        "similarity": similarity,
                        "keyword_overlap": keyword_overlap,
                        "priority": issue.get("priority"),
                        "status": issue.get("status"),
                        "description_preview": issue.get("description", "")[:100]
                        + "..."
                        if issue.get("description")
                        else "",
                    }
                )

        # Sort by similarity score (highest first)
        duplicates.sort(key=lambda x: x["similarity"], reverse=True)

        return {
            "title": title,
            "description": description,
            "duplicates": duplicates,
            "is_duplicate": len(duplicates) > 0,
            "total_issues_checked": len(all_candidates),
        }

    def interactive_resolution(self, check_result: Dict) -> bool:
        """Interactive prompt for duplicate resolution."""
        if not check_result["is_duplicate"]:
            print("✅ No duplicates found. Safe to create issue.")
            return True

        print(f"⚠️  Found {len(check_result['duplicates'])} potential duplicate(s):")
        print()

        for i, dup in enumerate(check_result["duplicates"][:5], 1):  # Show top 5
            print(f"{i}. {dup['id']}: {dup['title']}")
            print(
                f"   Similarity: {dup['similarity']:.1%}, Keywords: {dup['keyword_overlap']:.1%}"
            )
            print(f"   Priority: {dup['priority']}, Status: {dup['status']}")
            if dup["description_preview"]:
                print(f"   Description: {dup['description_preview']}")
            print()

        if len(check_result["duplicates"]) > 5:
            print(f"... and {len(check_result['duplicates']) - 5} more")
            print()

        while True:
            response = (
                input("Continue with issue creation? (y/N/view/quit): ").lower().strip()
            )

            if response in ["n", "", "quit"]:
                print("❌ Issue creation cancelled.")
                return False
            elif response == "y":
                print("✅ Proceeding with issue creation.")
                return True
            elif response == "view":
                # Show more details about duplicates
                for dup in check_result["duplicates"]:
                    print(f"\n--- {dup['id']} ---")
                    print(f"Title: {dup['title']}")
                    print(f"Similarity: {dup['similarity']:.1%}")
                    print(
                        f"Description: {dup.get('description_preview', 'No description')}"
                    )
                print()
            else:
                print("Please enter 'y', 'n', 'view', or 'quit'")

    def check_all_issues(self) -> Dict:
        """Check all open issues for duplicates."""
        all_issues = self.get_all_open_issues()
        duplicate_groups = []
        processed = set()

        for issue in all_issues:
            issue_id = issue.get("id")
            if issue_id in processed:
                continue

            # Check this issue against all others
            title = issue.get("title", "")
            duplicates = []

            for other_issue in all_issues:
                other_id = other_issue.get("id")
                if other_id == issue_id or other_id in processed:
                    continue

                similarity = self.calculate_similarity(
                    title, other_issue.get("title", "")
                )
                keyword_overlap = self.check_keyword_overlap(
                    title, other_issue.get("title", "")
                )

                if similarity >= self.similarity_threshold or keyword_overlap >= 0.6:
                    duplicates.append(
                        {
                            "id": other_id,
                            "title": other_issue.get("title"),
                            "similarity": similarity,
                            "keyword_overlap": keyword_overlap,
                        }
                    )

            if duplicates:
                duplicate_groups.append(
                    {
                        "primary": {"id": issue_id, "title": title},
                        "duplicates": duplicates,
                    }
                )

                # Mark all as processed
                processed.add(issue_id)
                for dup in duplicates:
                    processed.add(dup["id"])

        return {
            "total_issues": len(all_issues),
            "duplicate_groups": duplicate_groups,
            "has_duplicates": len(duplicate_groups) > 0,
        }

    def process_batch_file(self, file_path: str, dry_run: bool = False) -> Dict:
        """Process multiple issues from a file."""
        try:
            with open(file_path, "r") as f:
                lines = [line.strip() for line in f if line.strip()]
        except FileNotFoundError:
            return {"error": f"File not found: {file_path}"}

        results = []
        duplicates_found = 0

        for line in lines:
            # Skip comment lines
            if line.startswith("#"):
                continue

            # Simple format: title (or title|description)
            if "|" in line:
                title, description = line.split("|", 1)
            else:
                title = line
                description = ""

            check_result = self.check_duplicate(title.strip(), description.strip())

            if check_result["is_duplicate"]:
                duplicates_found += 1

            results.append(
                {
                    "title": title.strip(),
                    "description": description.strip(),
                    "check_result": check_result,
                }
            )

        return {
            "total_issues": len(results),
            "duplicates_found": duplicates_found,
            "results": results,
            "dry_run": dry_run,
        }


def main():
    parser = argparse.ArgumentParser(description="Prevent duplicate issue creation")
    parser.add_argument("title", nargs="?", help="Issue title to check")
    parser.add_argument("-d", "--description", help="Issue description")
    parser.add_argument(
        "-i",
        "--interactive",
        action="store_true",
        help="Interactive mode for resolving duplicates",
    )
    parser.add_argument(
        "--check-all", action="store_true", help="Check all open issues for duplicates"
    )
    parser.add_argument(
        "--fail-on-duplicates",
        action="store_true",
        help="Exit with error code if duplicates found",
    )
    parser.add_argument("-b", "--batch", help="Process multiple issues from file")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Dry run mode (don't actually create issues)",
    )
    parser.add_argument(
        "--threshold",
        type=float,
        default=0.80,
        help="Similarity threshold (default: 0.80)",
    )
    parser.add_argument(
        "--bd-command", default="bd", help="Path to bd command (default: bd)"
    )

    args = parser.parse_args()

    # Set environment variable to avoid daemon warnings
    os.environ["BEADS_NO_DAEMON"] = "1"

    preventer = DuplicatePreventer(
        similarity_threshold=args.threshold, bd_command=args.bd_command
    )

    if args.check_all:
        print("🔍 Checking all open issues for duplicates...")
        result = preventer.check_all_issues()

        if result["has_duplicates"]:
            print(f"\n❌ Found {len(result['duplicate_groups'])} duplicate groups:")
            for group in result["duplicate_groups"]:
                print(f"\n🔄 {group['primary']['id']}: {group['primary']['title']}")
                for dup in group["duplicates"]:
                    print(
                        f"   ⚠️  {dup['id']}: {dup['title']} ({dup['similarity']:.1%})"
                    )

            if args.fail_on_duplicates:
                sys.exit(1)
        else:
            print(f"✅ No duplicates found among {result['total_issues']} open issues.")

        return

    elif args.batch:
        if not args.batch:
            print("Error: --batch requires a file path", file=sys.stderr)
            sys.exit(1)

        print(f"📋 Processing batch file: {args.batch}")
        result = preventer.process_batch_file(args.batch, args.dry_run)

        if "error" in result:
            print(f"Error: {result['error']}", file=sys.stderr)
            sys.exit(1)

        print(f"\n📊 Batch Results:")
        print(f"Total issues: {result['total_issues']}")
        print(f"Duplicates found: {result['duplicates_found']}")

        if result["duplicates_found"] > 0:
            print(f"\n⚠️  Issues with duplicates:")
            for item in result["results"]:
                if item["check_result"]["is_duplicate"]:
                    print(f"   - {item['title']}")
                    for dup in item["check_result"]["duplicates"][:2]:
                        print(
                            f"     → {dup['id']}: {dup['title']} ({dup['similarity']:.1%})"
                        )

        if args.fail_on_duplicates and result["duplicates_found"] > 0:
            sys.exit(1)

        return

    elif args.title:
        print(f"🔍 Checking for duplicates: {args.title}")
        result = preventer.check_duplicate(args.title, args.description or "")

        if result["is_duplicate"]:
            print(f"\n⚠️  Found {len(result['duplicates'])} potential duplicate(s):")

            for dup in result["duplicates"]:
                print(f"   • {dup['id']}: {dup['title']}")
                print(
                    f"     Similarity: {dup['similarity']:.1%}, Keywords: {dup['keyword_overlap']:.1%}"
                )

            if args.interactive:
                should_create = preventer.interactive_resolution(result)
                sys.exit(0 if should_create else 1)
            else:
                print(f"\n💡 Use --interactive to resolve or modify the title")
                sys.exit(1)
        else:
            print(
                f"✅ No duplicates found. Checked {result['total_issues_checked']} issues."
            )
            print("💡 Safe to create issue with:")
            print(f'   bd create "{args.title}" -t feature -p 1 --json')

    else:
        parser.print_help()
        print("\nExamples:")
        print(
            '  python scripts/duplicate-prevention.py "Implement feature X" --interactive'
        )
        print(
            "  python scripts/duplicate-prevention.py --check-all --fail-on-duplicates"
        )
        print("  python scripts/duplicate-prevention.py --batch issues.txt --dry-run")


if __name__ == "__main__":
    main()
