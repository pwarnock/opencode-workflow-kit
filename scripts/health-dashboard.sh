#!/bin/bash
# Health Monitoring Dashboard for Event-Driven Integration System

set -e

echo "🏥 Cody-Beads Integration System Health Dashboard"
echo "=============================================="

# Function to check PM2 status
check_pm2_status() {
    if command -v pm2 &> /dev/null; then
        echo "📝 PM2 Process Status:"
        pm2 jlist --format=table 2>/dev/null || echo "  PM2 not responding"
        echo ""
    else
        echo "❌ PM2 not installed"
        echo ""
    fi
}

# Function to check event system health
check_event_system() {
    echo "📁 Event System Health:"
    
    if [ -d ".events" ]; then
        pending=$(find .events/pending -name "*.json" 2>/dev/null | wc -l)
        processing=$(find .events/processing -name "*.json" 2>/dev/null | wc -l)
        processed=$(find .events/processed -name "*.json" 2>/dev/null | wc -l)
        failed=$(find .events/failed -name "*.json" 2>/dev/null | wc -l)
        
        echo "  Pending events: $pending"
        echo "  Processing events: $processing"
        echo "  Processed events: $processed"
        echo "  Failed events: $failed"
        
        # Calculate health score
        total=$((pending + processing + processed + failed))
        if [ $total -gt 0 ]; then
            success_rate=$((processed * 100 / total))
            if [ $success_rate -ge 90 ]; then
                health_score="🟢 Excellent"
            elif [ $success_rate -ge 75 ]; then
                health_score="🟡 Good"
            elif [ $success_rate -ge 50 ]; then
                health_score="🟠 Fair"
            else
                health_score="🔴 Poor"
            fi
            echo "  Success rate: ${success_rate}% ($health_score)"
        else
            echo "  No events found"
        fi
    else
        echo "  ❌ Events directory not found"
    fi
    echo ""
}

# Function to check Beads daemon
check_beads_daemon() {
    echo "📊 Beads Daemon Status:"
    
    if [ -f ".beads/daemon.pid" ]; then
        pid=$(cat .beads/daemon.pid 2>/dev/null || echo "unknown")
        if [ "$pid" != "unknown" ] && kill -0 "$pid" 2>/dev/null; then
            echo "  ✅ Running (PID: $pid)"
            
            # Check daemon log for recent activity
            if [ -f ".beads/daemon.log" ]; then
                recent_activity=$(tail -5 .beads/daemon.log | grep -c "Sync completed\|Exported\|Imported" || echo "0")
                echo "  Recent syncs: $recent_activity (last 5 lines)"
            fi
        else
            echo "  ❌ Not running (stale PID)"
        fi
    else
        echo "  ❌ No daemon PID file"
    fi
    echo ""
}

# Function to check Cody PBT status
check_cody_pbt() {
    echo "🏗 Cody PBT Status:"
    
    if [ -d ".cody" ]; then
        if [ -f ".cody/project/plan/feature-backlog.md" ]; then
            echo "  ✅ Feature backlog exists"
            versions=$(grep -c "^## v" .cody/project/plan/feature-backlog.md || echo "0")
            echo "  Versions defined: $versions"
        else
            echo "  ❌ Feature backlog missing"
        fi
        
        if [ -d ".cody/project/versions" ]; then
            active_versions=$(find .cody/project/versions -name "*" -type d | wc -l)
            echo "  Active versions: $active_versions"
        else
            echo "  ❌ No active versions"
        fi
    else
        echo "  ❌ Cody PBT not initialized"
    fi
    echo ""
}

# Function to check git hooks
check_git_hooks() {
    echo "🪝 Git Hooks Status:"
    
    hooks_dir=".git/hooks"
    active_hooks=("pre-commit" "post-commit" "post-merge" "post-checkout")
    
    for hook in "${active_hooks[@]}"; do
        if [ -f "$hooks_dir/$hook" ]; then
            # Check if hook is executable and recent
            if [ -x "$hooks_dir/$hook" ]; then
                echo "  ✅ $hook: Active"
            else
                echo "  ⚠️  $hook: Not executable"
            fi
        else
            echo "  ❌ $hook: Missing"
        fi
    done
    echo ""
}

# Function to calculate overall system health
calculate_overall_health() {
    echo "🎯 Overall System Health:"
    
    health_score=0
    max_score=5
    
    # Check PM2 (20 points)
    if command -v pm2 &> /dev/null && pm2 list 2>/dev/null | grep -q "online\|stopped"; then
        health_score=$((health_score + 1))
    fi
    
    # Check event system (20 points)
    if [ -d ".events" ]; then
        health_score=$((health_score + 1))
    fi
    
    # Check Beads daemon (20 points)
    if [ -f ".beads/daemon.pid" ]; then
        pid=$(cat .beads/daemon.pid 2>/dev/null)
        if [ "$pid" != "unknown" ] && kill -0 "$pid" 2>/dev/null; then
            health_score=$((health_score + 1))
        fi
    fi
    
    # Check Cody PBT (20 points)
    if [ -d ".cody" ] && [ -f ".cody/project/plan/feature-backlog.md" ]; then
        health_score=$((health_score + 1))
    fi
    
    # Check git hooks (20 points)
    if [ -f ".git/hooks/pre-commit" ] && [ -f ".git/hooks/post-commit" ]; then
        health_score=$((health_score + 1))
    fi
    
    # Calculate percentage
    health_percentage=$((health_score * 100 / max_score))
    
    if [ $health_percentage -ge 90 ]; then
        status="🟢 EXCELLENT"
        recommendation="System is fully operational"
    elif [ $health_percentage -ge 75 ]; then
        status="🟡 GOOD"
        recommendation="System is operational with minor issues"
    elif [ $health_percentage -ge 50 ]; then
        status="🟠 FAIR"
        recommendation="System has issues that need attention"
    else
        status="🔴 POOR"
        recommendation="System needs immediate attention"
    fi
    
    echo "  Health Score: $health_score/$max_score ($health_percentage%)"
    echo "  Status: $status"
    echo "  Recommendation: $recommendation"
    echo ""
}

# Function to show recent activity
show_recent_activity() {
    echo "📈 Recent Activity (Last 10 minutes):"
    
    # Check event processor logs
    if [ -f ".events-processor.log" ]; then
        echo "  Event Processor:"
        recent_events=$(tail -10 .events-processor.log | grep "\[INFO\]" | tail -3)
        echo "$recent_events" | sed 's/^/    /'
    fi
    
    # Check Beads daemon logs
    if [ -f ".beads/daemon.log" ]; then
        echo "  Beads Daemon:"
        recent_beads=$(tail -10 .beads/daemon.log | grep -E "(Sync|Export|Import)" | tail -3)
        echo "$recent_beads" | sed 's/^/    /'
    fi
    
    echo ""
}

# Function to show system metrics
show_system_metrics() {
    echo "📊 System Metrics:"
    
    # Event processing rate
    if [ -f ".events-processor.log" ]; then
        events_last_hour=$(grep "$(date -v -1H '+%Y-%m-%d %H:')" .events-processor.log | wc -l)
        echo "  Events processed (last hour): $events_last_hour"
    fi
    
    # Memory usage
    if command -v ps &> /dev/null; then
        event_proc_memory=$(ps aux | grep "[e]vent-processor.py" | awk '{sum+=$6} END {print sum/1024}' || echo "0")
        beads_memory=$(ps aux | grep "[b]d daemon" | awk '{sum+=$6} END {print sum/1024}' || echo "0")
        
        echo "  Memory Usage:"
        echo "    Event Processor: ${event_proc_memory}MB"
        echo "    Beads Daemon: ${beads_memory}MB"
    fi
    
    echo ""
}

# Main execution
main() {
    case "${1:-}" in
        "status"|"")
            check_pm2_status
            check_event_system
            check_beads_daemon
            check_cody_pbt
            check_git_hooks
            calculate_overall_health
            show_recent_activity
            show_system_metrics
            ;;
        "pm2")
            check_pm2_status
            ;;
        "events")
            check_event_system
            ;;
        "beads")
            check_beads_daemon
            ;;
        "cody")
            check_cody_pbt
            ;;
        "hooks")
            check_git_hooks
            ;;
        "metrics")
            show_system_metrics
            ;;
        "activity")
            show_recent_activity
            ;;
        "help"|"--help"|"-h")
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  status     Show complete system health (default)"
            echo "  pm2        Show PM2 process status"
            echo "  events     Show event system health"
            echo "  beads      Show Beads daemon status"
            echo "  cody       Show Cody PBT status"
            echo "  hooks      Show git hooks status"
            echo "  metrics    Show system metrics"
            echo "  activity   Show recent activity"
            echo "  help       Show this help message"
            ;;
        *)
            echo "Unknown command: $1"
            echo "Use '$0 help' for usage information"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"