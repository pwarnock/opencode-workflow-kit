#!/usr/bin/env python3
"""
Event-driven integration processor
Replaces complex hook system with event-driven architecture
"""

import asyncio
import json
import os
import shutil
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any

# Import adapter directly
sys.path.append(str(Path(__file__).parent))
try:
    from cody_beads_adapter import CodyBeadsAdapter
except ImportError:
    # Fallback if adapter not available
    CodyBeadsAdapter = None


class EventProcessor:
    """Processes git hook events asynchronously"""

    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.events_dir = project_root / ".events"
        self.pending_dir = self.events_dir / "pending"
        self.processing_dir = self.events_dir / "processing"
        self.processed_dir = self.events_dir / "processed"
        self.failed_dir = self.events_dir / "failed"

        # Create directories
        for dir_path in [
            self.events_dir,
            self.pending_dir,
            self.processing_dir,
            self.processed_dir,
            self.failed_dir,
        ]:
            dir_path.mkdir(exist_ok=True)

        # State tracking
        self.processed_events = set()
        self.running = True

        # Integration adapter
        self.adapter = CodyBeadsAdapter(project_root) if CodyBeadsAdapter else None

        # Logging
        self.log_file = project_root / ".events-processor.log"

    def _log(self, message: str, level: str = "INFO"):
        """Log to processor log file"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] [{level}] {message}"

        try:
            with open(self.log_file, "a") as f:
                f.write(log_entry + "\n")
        except OSError:
            pass  # Silent fail if logging not possible

        # Also output to stdout for visibility
        print(log_entry)

    def _load_event(self, event_file: Path) -> Optional[Dict[str, Any]]:
        """Load and validate event JSON"""
        try:
            with open(event_file, "r") as f:
                event = json.load(f)

            # Basic validation
            required_fields = ["id", "type", "timestamp", "data", "metadata"]
            for field in required_fields:
                if field not in event:
                    self._log(
                        f"Invalid event {event_file.name}: missing field {field}",
                        "ERROR",
                    )
                    return None

            return event
        except (json.JSONDecodeError, IOError) as e:
            self._log(f"Failed to load event {event_file.name}: {e}", "ERROR")
            return None

    def _move_event(self, event_file: Path, destination_dir: Path):
        """Move event file to destination directory"""
        try:
            shutil.move(str(event_file), str(destination_dir / event_file.name))
        except Exception as e:
            self._log(f"Failed to move event {event_file.name}: {e}", "ERROR")

    async def _process_single_event(self, event: Dict[str, Any]) -> bool:
        """Process a single event"""
        event_type = event.get("type")
        event_data = event.get("data", {})

        try:
            if event_type == "pre-commit":
                return await self._handle_pre_commit(event_data)
            elif event_type == "post-commit":
                return await self._handle_post_commit(event_data)
            elif event_type == "post-merge":
                return await self._handle_post_merge(event_data)
            elif event_type == "post-checkout":
                return await self._handle_post_checkout(event_data)
            else:
                self._log(f"Unknown event type: {event_type}", "WARNING")
                return True  # Don't fail for unknown events

        except Exception as e:
            self._log(f"Error processing event {event.get('id')}: {e}", "ERROR")
            return False

    async def _handle_pre_commit(self, event_data: Dict[str, Any]) -> bool:
        """Handle pre-commit event"""
        self._log(f"Processing pre-commit event")

        if not self.adapter:
            self._log("Adapter not available - skipping pre-commit integration")
            return True

        # Use existing adapter logic but without git command recursion
        success_count = 0
        total_operations = 0

        # Cody pre-commit operations
        if self.adapter.cody_available:
            total_operations += 1
            if self._handle_cody_pre_commit_safe(event_data):
                success_count += 1

        # Beads pre-commit operations (delegate to bd hooks)
        if self.adapter.beads_available:
            total_operations += 1
            success_count += 1  # Assume success for now
            self._log("Beads pre-commit delegated to native bd hooks")

        self._log(
            f"Pre-commit completed: {success_count}/{total_operations} operations"
        )
        return True

    async def _handle_post_commit(self, event_data: Dict[str, Any]) -> bool:
        """Handle post-commit event"""
        commit_hash = event_data.get("commit_hash", "unknown")
        self._log(f"Processing post-commit event: {commit_hash}")

        if not self.adapter:
            self._log("Adapter not available - skipping post-commit integration")
            return True

        # Use existing adapter logic
        return self.adapter.handle_post_commit(commit_hash)

    async def _handle_post_merge(self, event_data: Dict[str, Any]) -> bool:
        """Handle post-merge event"""
        self._log("Processing post-merge event")

        if not self.adapter:
            self._log("Adapter not available - skipping post-merge integration")
            return True

        return self.adapter.handle_post_merge()

    async def _handle_post_checkout(self, event_data: Dict[str, Any]) -> bool:
        """Handle post-checkout event"""
        self._log("Processing post-checkout event")

        if not self.adapter:
            self._log("Adapter not available - skipping post-checkout integration")
            return True

        return self.adapter.handle_post_checkout()

    def _handle_cody_pre_commit_safe(self, event_data: Dict[str, Any]) -> bool:
        """Handle Cody pre-commit without git commands"""
        changed_files = event_data.get("changed_files", [])
        cody_files = [f for f in changed_files if f.startswith(".cody/")]

        if cody_files:
            self._log(f"Cody files staged: {', '.join(cody_files)}")
            # Could add Cody-specific validation here
            return True
        else:
            self._log("No Cody files staged - skipping Cody pre-commit validation")
            return True

    async def _scan_and_process_events(self):
        """Scan for new events and process them"""
        # Get all pending event files
        event_files = list(self.pending_dir.glob("*.json"))

        if not event_files:
            return  # No events to process

        self._log(f"Found {len(event_files)} events to process")

        for event_file in event_files:
            if event_file.name in self.processed_events:
                continue  # Skip already processed

            # Move to processing directory
            self._move_event(event_file, self.processing_dir)
            processing_file = self.processing_dir / event_file.name

            # Load and process event
            event = self._load_event(processing_file)
            if not event:
                self._move_event(processing_file, self.failed_dir)
                continue

            # Process the event
            success = await self._process_single_event(event)

            # Move to appropriate directory
            if success:
                self._move_event(processing_file, self.processed_dir)
                self.processed_events.add(event_file.name)
                self._log(f"Successfully processed event: {event.get('id')}")
            else:
                self._move_event(processing_file, self.failed_dir)
                self._log(f"Failed to process event: {event.get('id')}", "ERROR")

    async def run(self):
        """Main event processing loop"""
        self._log("Event processor started")

        try:
            while self.running:
                await self._scan_and_process_events()
                await asyncio.sleep(2)  # Scan every 2 seconds

        except KeyboardInterrupt:
            self._log("Event processor stopped by user")
        except Exception as e:
            self._log(f"Event processor error: {e}", "ERROR")
        finally:
            self._log("Event processor shutdown")

    def stop(self):
        """Stop the event processor"""
        self.running = False


async def main():
    """Main entry point"""
    project_root = Path.cwd()

    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        # Test mode - process existing events and exit
        processor = EventProcessor(project_root)
        await processor._scan_and_process_events()
        print("Test processing completed")
        return

    # Normal mode - run continuous loop
    processor = EventProcessor(project_root)

    try:
        await processor.run()
    except KeyboardInterrupt:
        processor.stop()


if __name__ == "__main__":
    asyncio.run(main())
