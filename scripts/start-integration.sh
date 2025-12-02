#!/bin/bash
# Start the event-driven integration system

set -e

echo "🚀 Starting Cody-Beads event-driven integration system..."

# Create necessary directories
mkdir -p .events/{pending,processing,processed,failed}
mkdir -p .pm2/logs

# Check if PM2 is available
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 is not installed. Installing..."
    npm install -g pm2
fi

# Start the event processor
echo "📝 Starting event processor..."
pm2 start ecosystem.config.json

# Show status
echo "📊 System status:"
pm2 status

echo "✅ Event-driven integration system started"
echo "📝 Events will be processed from .events/pending/"
echo "📊 Monitor with: pm2 logs cody-beads-event-processor"
echo "🛑 Stop with: ./scripts/stop-integration.sh"