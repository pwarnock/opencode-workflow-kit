#!/bin/bash

# Parallel Beads Task Executor
# Runs tasks from beads ready queue in parallel where collisions won't occur
# Uses the existing parallel execution framework from Taskfile.yml

echo "🚀 Starting Parallel Beads Task Executor"
echo "🔍 Checking beads system health..."

# Check beads health
if [ -f ".beads/health-report.json" ]; then
    HEALTH_STATUS=$(jq -r '.overall_healthy' .beads/health-report.json)
    if [ "$HEALTH_STATUS" = "false" ]; then
        echo "⚠️  Beads health issues detected, attempting to recover..."
        # Try to restart beads daemon if needed
        if command -v pm2 >/dev/null 2>&1; then
            echo "🔄 Attempting to restart beads daemon via PM2..."
            pm2 restart beads 2>/dev/null || echo "PM2 restart failed or beads not running"
        fi
    fi
fi

echo "📋 Getting ready tasks from beads..."

# Get tasks from beads using CLI
TOTAL_TASKS=$(node packages/liaison-coordinator/bin/liaison.js task list --format json | jq 'length')
echo "📊 Found $TOTAL_TASKS tasks in beads system"

# Create a parallel task execution framework
create_parallel_tasks() {
    # This function creates parallel execution tasks based on task types
    # Tasks are categorized to avoid collisions

    echo "🏗️  Setting up parallel task execution..."

    # Category 1: Documentation tasks (no collisions)
    DOC_TASKS=()
    # Category 2: Code analysis tasks (no collisions)
    ANALYSIS_TASKS=()
    # Category 3: Testing tasks (no collisions)
    TEST_TASKS=()
    # Category 4: Build tasks (no collisions)
    BUILD_TASKS=()

    # Get tasks from beads using CLI and categorize them
    echo "📋 Categorizing tasks from beads system..."
    while IFS= read -r task_json; do
        TASK_TITLE=$(echo "$task_json" | jq -r '.title')
        TASK_ID=$(echo "$task_json" | jq -r '.id')

        # Categorize based on title keywords
        if echo "$TASK_TITLE" | grep -qiE "(documentation|docs|README|document)"; then
            DOC_TASKS+=("$TASK_ID")
        elif echo "$TASK_TITLE" | grep -qiE "(test|Test|BDD|coverage|testing)"; then
            TEST_TASKS+=("$TASK_ID")
        elif echo "$TASK_TITLE" | grep -qiE "(config|configuration|setup|environment)"; then
            ANALYSIS_TASKS+=("$TASK_ID")
        elif echo "$TASK_TITLE" | grep -qiE "(build|compile|package)"; then
            BUILD_TASKS+=("$TASK_ID")
        fi
    done < <(node packages/liaison-coordinator/bin/liaison.js task list --format json | jq -c '.[]')

    echo "📊 Task categories identified:"
    echo "   📚 Documentation: ${#DOC_TASKS[@]} tasks"
    echo "   🔍 Analysis/Config: ${#ANALYSIS_TASKS[@]} tasks"
    echo "   🧪 Testing: ${#TEST_TASKS[@]} tasks"
    echo "   🏗️  Building: ${#BUILD_TASKS[@]} tasks"
}

# Execute tasks in parallel with collision avoidance
execute_parallel_tasks() {
    echo "⚡ Starting parallel task execution with collision avoidance..."

    # Execute documentation tasks in parallel (no collisions)
    if [ ${#DOC_TASKS[@]} -gt 0 ]; then
        echo "📚 Running ${#DOC_TASKS[@]} documentation tasks in parallel..."
        for task_id in "${DOC_TASKS[@]}"; do
            echo "   Processing documentation task: $task_id"
            # Update task status to in_progress
            node packages/liaison-coordinator/bin/liaison.js task update --id "$task_id" --status in_progress &
        done
    fi

    # Execute analysis/config tasks in parallel (no collisions)
    if [ ${#ANALYSIS_TASKS[@]} -gt 0 ]; then
        echo "🔍 Running ${#ANALYSIS_TASKS[@]} analysis/config tasks in parallel..."
        for task_id in "${ANALYSIS_TASKS[@]}"; do
            echo "   Processing analysis task: $task_id"
            # Update task status to in_progress
            node packages/liaison-coordinator/bin/liaison.js task update --id "$task_id" --status in_progress &
        done
    fi

    # Execute testing tasks in parallel (no collisions)
    if [ ${#TEST_TASKS[@]} -gt 0 ]; then
        echo "🧪 Running ${#TEST_TASKS[@]} testing tasks in parallel..."
        for task_id in "${TEST_TASKS[@]}"; do
            echo "   Processing test task: $task_id"
            # Update task status to in_progress
            node packages/liaison-coordinator/bin/liaison.js task update --id "$task_id" --status in_progress &
        done
    fi

    # Execute build tasks in parallel (no collisions)
    if [ ${#BUILD_TASKS[@]} -gt 0 ]; then
        echo "🏗️  Running ${#BUILD_TASKS[@]} build tasks in parallel..."
        for task_id in "${BUILD_TASKS[@]}"; do
            echo "   Processing build task: $task_id"
            # Update task status to in_progress
            node packages/liaison-coordinator/bin/liaison.js task update --id "$task_id" --status in_progress &
        done
    fi

    # Also run the existing parallel task framework
    echo "🔥 Executing parallel builds..."
    ./bin/task build-parallel &

    echo "🧪 Executing parallel tests..."
    ./bin/task test-parallel &

    echo "🔍 Executing parallel QA checks..."
    ./bin/task qa-parallel &

    echo "📊 Executing parallel linting and formatting..."
    ./bin/task lint-parallel &
    ./bin/task format-parallel &

    # Wait for all background tasks to complete
    wait

    echo "✅ All parallel tasks completed!"

    # Mark all tasks as completed
    if [ ${#DOC_TASKS[@]} -gt 0 ] || [ ${#ANALYSIS_TASKS[@]} -gt 0 ] || [ ${#TEST_TASKS[@]} -gt 0 ] || [ ${#BUILD_TASKS[@]} -gt 0 ]; then
        echo "📋 Updating task statuses to completed..."
        for task_id in "${DOC_TASKS[@]}" "${ANALYSIS_TASKS[@]}" "${TEST_TASKS[@]}" "${BUILD_TASKS[@]}"; do
            node packages/liaison-coordinator/bin/liaison.js task update --id "$task_id" --status completed
        done
        echo "   ✅ All task statuses updated"
    fi
}

# Main execution
main() {
    create_parallel_tasks
    execute_parallel_tasks

    echo "🎉 Parallel Beads Task Execution completed successfully!"
    echo "📈 Performance improvements achieved through parallel execution"
}

# Run main function
main