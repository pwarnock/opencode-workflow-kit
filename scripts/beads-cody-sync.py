#!/usr/bin/env python3
"""
Beads-Cody Integration System

This module provides bidirectional synchronization between Beads issue tracking
and Cody task management systems. Beads serves as the source of truth while
Cody tasklists provide visualization and workflow management.

Architecture:
- Beads (source of truth) → JSONL format
- Cody tasklists (visualization) → Markdown format
- Bidirectional sync with conflict resolution
"""

import json
import os
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, asdict
import argparse
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@dataclass
class BeadsIssue:
    """Represents a Beads issue with all relevant fields."""
    id: str
    title: str
    description: str
    notes: str
    status: str
    priority: int
    issue_type: str
    created_at: str
    updated_at: str
    closed_at: Optional[str] = None
    dependencies: List[Dict[str, Any]] = None
    
    def __post_init__(self):
        if self.dependencies is None:
            self.dependencies = []


@dataclass
class CodyTask:
    """Represents a Cody task with phase and version information."""
    id: str
    title: str
    description: str
    phase: str
    version: str
    status: str  # 🔴, 🟡, 🟢
    priority: str  # High, Medium, Low
    dependencies: List[str]
    assigned_to: str = "AGENT"
    
    def to_markdown_row(self) -> str:
        """Convert task to markdown table row format."""
        return f"| {self.id} | {self.title} | {self.description} | {', '.join(self.dependencies) if self.dependencies else 'None'} | {self.status} | {self.assigned_to} |"


class BeadsParser:
    """Parser for Beads JSONL format."""
    
    def __init__(self, beads_file: Path):
        self.beads_file = beads_file
        
    def parse_issues(self) -> List[BeadsIssue]:
        """Parse all issues from Beads JSONL file."""
        issues = []
        
        if not self.beads_file.exists():
            logger.warning(f"Beads file not found: {self.beads_file}")
            return issues
            
        try:
            with open(self.beads_file, 'r', encoding='utf-8') as f:
                for line_num, line in enumerate(f, 1):
                    line = line.strip()
                    if not line:
                        continue
                        
                    try:
                        data = json.loads(line)
                        # Handle optional fields
                        if 'notes' not in data:
                            data['notes'] = ""
                        if 'dependencies' not in data:
                            data['dependencies'] = []
                        if 'closed_at' not in data:
                            data['closed_at'] = None
                        issue = BeadsIssue(**data)
                        issues.append(issue)
                    except json.JSONDecodeError as e:
                        logger.error(f"Invalid JSON on line {line_num}: {e}")
                    except Exception as e:
                        logger.error(f"Error parsing issue on line {line_num}: {e}")
                        
        except Exception as e:
            logger.error(f"Error reading beads file: {e}")
            
        logger.info(f"Parsed {len(issues)} issues from {self.beads_file}")
        return issues
    
    def get_open_issues(self) -> List[BeadsIssue]:
        """Get only open (non-closed) issues."""
        all_issues = self.parse_issues()
        return [issue for issue in all_issues if issue.status != "closed"]
    
    def get_issues_by_type(self, issue_type: str) -> List[BeadsIssue]:
        """Get issues filtered by type."""
        all_issues = self.parse_issues()
        return [issue for issue in all_issues if issue.issue_type == issue_type]


class CodyTasklistGenerator:
    """Generate Cody tasklists from Beads issues."""
    
    def __init__(self, cody_build_dir: Path):
        self.cody_build_dir = cody_build_dir
        self.feature_backlog_file = cody_build_dir / "feature-backlog.md"
        
    def status_to_emoji(self, beads_status: str) -> str:
        """Convert Beads status to Cody emoji."""
        status_mapping = {
            "open": "🔴",
            "in_progress": "🟡", 
            "closed": "🟢"
        }
        return status_mapping.get(beads_status, "🔴")
    
    def priority_to_level(self, beads_priority: int) -> str:
        """Convert Beads priority (0-4) to Cody level."""
        if beads_priority <= 1:
            return "High"
        elif beads_priority == 2:
            return "Medium"
        else:
            return "Low"
    
    def extract_version_from_issue(self, issue: BeadsIssue) -> Optional[str]:
        """Extract version information from issue title or description."""
        # Manual mapping for specific issues
        version_mapping = {
            "opencode-config-25": "v0.5.0",
            "opencode-config-26": "v0.5.0", 
            "opencode-config-27": "v0.5.0",
            "opencode-config-28": "v0.5.0",
            "opencode-config-29": "v0.5.0",
            "opencode-config-30": "v0.5.0",
            "opencode-config-31": "v0.5.0",
            "opencode-config-32": "v0.5.0"
        }
        
        if issue.id in version_mapping:
            return version_mapping[issue.id]
        
        # Look for version patterns like "v0.5.0" or "version 0.5.0"
        version_patterns = [
            r'v(\d+\.\d+\.\d+)',
            r'version\s+(\d+\.\d+\.\d+)',
            r'v(\d+\.\d+)',
            r'version\s+(\d+\.\d+)'
        ]
        
        text = f"{issue.title} {issue.description} {issue.notes}"
        
        for pattern in version_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return f"v{match.group(1)}"
                
        return None
    
    def extract_phase_from_issue(self, issue: BeadsIssue) -> Optional[str]:
        """Extract phase information from issue."""
        # Look for phase patterns
        phase_patterns = [
            r'phase\s+(\d+)',
            r'Phase\s+(\d+)',
            r'phase\s+(\w+)',
            r'Phase\s+(\w+)'
        ]
        
        text = f"{issue.title} {issue.description} {issue.notes}"
        
        for pattern in phase_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return f"Phase {match.group(1)}"
                
        return "Phase 1"  # Default phase
    
    def group_issues_by_version(self, issues: List[BeadsIssue]) -> Dict[str, List[BeadsIssue]]:
        """Group issues by version."""
        version_groups = {}
        backlog_issues = []
        
        for issue in issues:
            version = self.extract_version_from_issue(issue)
            if version:
                if version not in version_groups:
                    version_groups[version] = []
                version_groups[version].append(issue)
            else:
                backlog_issues.append(issue)
                
        # Add backlog if there are issues without versions
        if backlog_issues:
            version_groups["Backlog"] = backlog_issues
            
        return version_groups
    
    def generate_tasklist_for_version(self, version: str, issues: List[BeadsIssue]) -> str:
        """Generate tasklist markdown for a specific version."""
        # Group issues by phase
        phase_groups = {}
        for issue in issues:
            phase = self.extract_phase_from_issue(issue)
            if phase not in phase_groups:
                phase_groups[phase] = []
            phase_groups[phase].append(issue)
        
        # Sort phases
        sorted_phases = sorted(phase_groups.keys(), key=self._sort_phase_key)
        
        # Generate markdown
        lines = [
            f"# Version Tasklist – **{version}**",
            "This document outlines all the tasks to work on to delivery this particular version, grouped by phases.",
            "",
            "| Status |      |",
            "|--------|------|",
            "| 🔴 | Not Started |",
            "| 🟡 | In Progress |",
            "| 🟢 | Completed |",
            ""
        ]
        
        # Add progress summary
        total_tasks = len(issues)
        completed_tasks = len([i for i in issues if i.status == "closed"])
        lines.extend([
            f"## **Progress Summary**",
            f"**Overall Progress**: {completed_tasks}/{total_tasks} tasks complete ({int(completed_tasks/total_tasks*100) if total_tasks > 0 else 0}%)",
            ""
        ])
        
        # Add phase sections
        for phase in sorted_phases:
            phase_issues = phase_groups[phase]
            phase_completed = len([i for i in phase_issues if i.status == "closed"])
            phase_total = len(phase_issues)
            
            lines.extend([
                f"## **{phase}**",
                "",
                "| ID  | Task             | Description                             | Dependencies | Status | Assigned To |",
                "|-----|------------------|-----------------------------------------|-------------|----------|--------|"
            ])
            
            for issue in sorted(phase_issues, key=lambda x: x.priority):
                task = self._convert_issue_to_task(issue, version, phase)
                lines.append(task.to_markdown_row())
                
            lines.append("")
        
        return "\n".join(lines)
    
    def _sort_phase_key(self, phase: str) -> int:
        """Sort phases by number."""
        match = re.search(r'(\d+)', phase)
        return int(match.group(1)) if match else 999
    
    def _convert_issue_to_task(self, issue: BeadsIssue, version: str, phase: str) -> CodyTask:
        """Convert Beads issue to Cody task."""
        # Extract dependencies
        dependencies = []
        if issue.dependencies:
            for dep in issue.dependencies:
                if 'depends_on_id' in dep:
                    dependencies.append(dep['depends_on_id'])
        
        return CodyTask(
            id=issue.id,
            title=issue.title,
            description=issue.description or issue.notes or "No description",
            phase=phase,
            version=version,
            status=self.status_to_emoji(issue.status),
            priority=self.priority_to_level(issue.priority),
            dependencies=dependencies
        )
    
    def update_feature_backlog(self, issues: List[BeadsIssue]):
        """Update the feature-backlog.md file with current issues."""
        version_groups = self.group_issues_by_version(issues)
        
        lines = [
            "# Feature Backlog",
            "",
            "This document lists features and enhancements derived from the plan. It is a living document that will evolve throughout the project. It is grouped by version, with the Backlog tracking all features not added to a version yet.  It is used to create versions to work on.",
            "",
            "",
            "",
            "| Status |  | Priority |  |",
            "|--------|-------------|---------|-------------|",
            "| 🔴 | Not Started | High | High priority items |",
            "| 🟡 | In Progress | Medium | Medium priority items |",
            "| 🟢 | Completed | Low | Low priority items |",
            "",
            ""
        ]
        
        # Add backlog section first
        if "Backlog" in version_groups:
            lines.extend([
                "## Backlog",
                "",
                "| ID  | Feature             | Description                               | Priority | Status |",
                "|-----|---------------------|-------------------------------------------|----------|--------|"
            ])
            
            for issue in sorted(version_groups["Backlog"], key=lambda x: x.priority):
                status_emoji = self.status_to_emoji(issue.status)
                priority_level = self.priority_to_level(issue.priority)
                lines.append(f"| {issue.id} | {issue.title} | {issue.description or issue.notes or 'No description'} | {priority_level} | {status_emoji} |")
            
            lines.append("")
            del version_groups["Backlog"]
        
        # Add version sections
        for version in sorted(version_groups.keys(), reverse=True):
            version_issues = version_groups[version]
            completed_count = len([i for i in version_issues if i.status == "closed"])
            status_emoji = "🟢" if completed_count == len(version_issues) else "🔴"
            
            lines.extend([
                f"## {version} - {status_emoji} {'Completed' if completed_count == len(version_issues) else 'Not Started'}",
                f"{self._get_version_description(version)}",
                "",
                "| ID  | Feature                 | Description                              | Priority | Status |",
                "|-----|-------------------------|------------------------------------------|----------|--------|"
            ])
            
            for issue in sorted(version_issues, key=lambda x: x.priority):
                status_emoji = self.status_to_emoji(issue.status)
                priority_level = self.priority_to_level(issue.priority)
                lines.append(f"| {issue.id} | {issue.title} | {issue.description or issue.notes or 'No description'} | {priority_level} | {status_emoji} |")
            
            lines.append("")
        
        # Write to file
        self.feature_backlog_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.feature_backlog_file, 'w', encoding='utf-8') as f:
            f.write("\n".join(lines))
        
        logger.info(f"Updated feature backlog: {self.feature_backlog_file}")
    
    def _get_version_description(self, version: str) -> str:
        """Get description for a version."""
        # This could be enhanced to read from version design docs
        descriptions = {
            "v0.5.0": "Task tracking and workflow automation integration.",
            "v0.4.0": "Library documentation research and environment management.",
            "v0.3.0": "Comprehensive testing and validation framework.",
            "v0.2.0": "Enhanced documentation and installation experience.",
            "v0.1.0": "Initial repository setup with basic structure and core configuration files."
        }
        return descriptions.get(version, f"Features and enhancements for {version}.")


class BeadsCodySync:
    """Main synchronization orchestrator."""
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.beads_file = project_root / ".beads" / "issues.jsonl"
        self.cody_build_dir = project_root / ".cody" / "project" / "build"
        
        self.parser = BeadsParser(self.beads_file)
        self.generator = CodyTasklistGenerator(self.cody_build_dir)
    
    def generate_cody_tasklists(self):
        """Generate Cody tasklists from Beads issues."""
        logger.info("Starting Cody tasklist generation from Beads issues...")
        
        # Parse all issues
        all_issues = self.parser.parse_issues()
        open_issues = self.parser.get_open_issues()
        
        logger.info(f"Found {len(all_issues)} total issues, {len(open_issues)} open")
        
        # Update feature backlog
        self.generator.update_feature_backlog(all_issues)
        
        # Generate tasklists for versions that have directories
        version_groups = self.generator.group_issues_by_version(open_issues)
        
        for version, issues in version_groups.items():
            if version == "Backlog":
                continue
                
            version_dir = self.cody_build_dir / version
            if version_dir.exists():
                tasklist_file = version_dir / "tasklist.md"
                tasklist_content = self.generator.generate_tasklist_for_version(version, issues)
                
                with open(tasklist_file, 'w', encoding='utf-8') as f:
                    f.write(tasklist_content)
                
                logger.info(f"Generated tasklist for {version}: {tasklist_file}")
        
        logger.info("Cody tasklist generation completed!")
    
    def sync_bidirectional(self):
        """Perform bidirectional synchronization (placeholder for future implementation)."""
        logger.info("Bidirectional synchronization not yet implemented")
        # This will be implemented in Phase 2


def main():
    """Main CLI interface."""
    parser = argparse.ArgumentParser(description="Beads-Cody Integration System")
    parser.add_argument("--project-root", type=Path, default=Path.cwd(),
                       help="Project root directory (default: current directory)")
    parser.add_argument("--command", choices=["generate", "sync", "parse"], 
                       default="generate", help="Command to execute")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose logging")
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    sync = BeadsCodySync(args.project_root)
    
    if args.command == "generate":
        sync.generate_cody_tasklists()
    elif args.command == "sync":
        sync.sync_bidirectional()
    elif args.command == "parse":
        issues = sync.parser.parse_issues()
        for issue in issues:
            print(f"{issue.id}: {issue.title} ({issue.status})")


if __name__ == "__main__":
    main()