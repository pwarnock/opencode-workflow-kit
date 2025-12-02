#!/bin/bash
# Stop event-driven integration system

set -e

echo "🛑 Stopping Cody-Beads event-driven integration system..."

# Stop event processor
if command -v pm2 &> /dev/null; then
    echo "📝 Stopping event processor..."
    pm2 stop cody-beads-event-processor
    pm2 delete cody-beads-event-processor
    echo "✅ Event processor stopped"
else
    echo "⚠️  PM2 not found - no processes to stop"
fi

# Optional: Clean up remaining processes
pkill -f "event-processor.py" || true

echo "✅ Event-driven integration system stopped"