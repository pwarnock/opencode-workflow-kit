#!/bin/bash
# Check status of event-driven integration system

set -e

echo "📊 Cody-Beads Event-Driven Integration Status"
echo "=========================================="

# Check PM2 status
if command -v pm2 &> /dev/null; then
    echo "📝 PM2 Status:"
    pm2 status cody-beads-event-processor
    echo ""
    
    echo "📊 Recent Logs:"
    pm2 logs cody-beads-event-processor --lines 10 --nostream
else
    echo "❌ PM2 is not installed"
fi

# Check event directories
echo ""
echo "📁 Event Directory Status:"
if [ -d ".events" ]; then
    echo "  Pending events: $(find .events/pending -name "*.json" 2>/dev/null | wc -l)"
    echo "  Processing events: $(find .events/processing -name "*.json" 2>/dev/null | wc -l)"
    echo "  Processed events: $(find .events/processed -name "*.json" 2>/dev/null | wc -l)"
    echo "  Failed events: $(find .events/failed -name "*.json" 2>/dev/null | wc -l)"
else
    echo "  ❌ Events directory not found"
fi

# Check recent processor logs
echo ""
if [ -f ".events-processor.log" ]; then
    echo "📝 Recent Processor Activity:"
    tail -10 .events-processor.log
else
    echo "  ❌ Processor log not found"
fi