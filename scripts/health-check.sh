#!/usr/bin/env bash
# Enhanced Health Check System for Liaison Toolkit
# Supports parallel execution, git-based caching, and structured JSON output

set -euo pipefail

# Default values
PARALLEL=true
FORMAT="json"
COMPONENT="all"
CACHE_DIR="/tmp/liaison-health"
VERBOSE=false
SEQUENTIAL=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --parallel)
            PARALLEL=true
            shift
            ;;
        --sequential)
            PARALLEL=false
            SEQUENTIAL=true
            shift
            ;;
        --format=*)
            FORMAT="${1#*=}"
            shift
            ;;
        --component=*)
            COMPONENT="${1#*=}"
            shift
            ;;
        --cache-dir=*)
            CACHE_DIR="${1#*=}"
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --parallel       Run checks in parallel (default)"
            echo "  --sequential     Run checks sequentially for precision"
            echo "  --format=FORMAT  Output format: json (default), text"
            echo "  --component=COMP  Check specific component: all (default), core, deps, sync, config, coordinator"
            echo "  --cache-dir=DIR  Cache directory (default: /tmp/liaison-health)"
            echo "  --verbose        Show detailed output"
            echo "  --help, -h       Show this help"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Create cache directory
mkdir -p "$CACHE_DIR"

# Get cache key based on git state
get_cache_key() {
    local git_hash
    git_hash=$(git rev-parse HEAD 2>/dev/null || echo "no-git")
    local timestamp
    timestamp=$(git log -1 --format=%ct 2>/dev/null || echo "$(date +%s)")
    echo "health-${git_hash}-${timestamp}"
}

# Check if cache is valid (5 minutes)
is_cache_valid() {
    local cache_file="$CACHE_DIR/$(get_cache_key).json"
    [[ -f "$cache_file" && $(find "$cache_file" -mmin -5 2>/dev/null) ]]
}

# Get cached result
get_cached_result() {
    local cache_file="$CACHE_DIR/$(get_cache_key).json"
    if [[ -f "$cache_file" ]]; then
        cat "$cache_file"
        return 0
    fi
    return 1
}

# Cache result
cache_result() {
    local result="$1"
    local cache_file="$CACHE_DIR/$(get_cache_key).json"
    echo "$result" > "$cache_file"
}

# Core environment checks
check_core() {
    local result
    result='{"component":"core","status":"healthy","score":100,"details":{'
    
    declare -a issues=()
    local score=100
    
    # Check Python
    if command -v python3 >/dev/null 2>&1; then
        local python_version
        python_version=$(python3 --version 2>/dev/null || echo "unknown")
        result+='"python":{"status":"healthy","version":"'"$python_version"'"},'
    else
        issues+=("Python not found")
        score=$((score - 25))
        result+='"python":{"status":"unhealthy","error":"Python not found"},'
    fi
    
    # Check UV
    if command -v uv >/dev/null 2>&1; then
        local uv_version
        uv_version=$(uv --version 2>/dev/null || echo "unknown")
        result+='"uv":{"status":"healthy","version":"'"$uv_version"'"},'
    else
        issues+=("UV not found")
        score=$((score - 25))
        result+='"uv":{"status":"unhealthy","error":"UV not found"},'
    fi
    
    # Check Node.js
    if command -v node >/dev/null 2>&1; then
        local node_version
        node_version=$(node --version 2>/dev/null || echo "unknown")
        result+='"node":{"status":"healthy","version":"'"$node_version"'"},'
    else
        issues+=("Node.js not found")
        score=$((score - 25))
        result+='"node":{"status":"unhealthy","error":"Node.js not found"},'
    fi
    
    # Check Bun
    if command -v bun >/dev/null 2>&1; then
        local bun_version
        bun_version=$(bun --version 2>/dev/null || echo "unknown")
        result+='"bun":{"status":"healthy","version":"'"$bun_version"'"}'
    else
        issues+=("Bun not found")
        score=$((score - 25))
        result+='"bun":{"status":"unhealthy","error":"Bun not found"}'
    fi
    
    result+='},"issues":['
    for issue in "${issues[@]}"; do
        result+='"'"$issue"'",'
    done
    result=${result%,} # Remove trailing comma
    result+='],"score":'$score'}'
    
    echo "$result"
}

# Dependency checks
check_dependencies() {
    local result
    result='{"component":"dependencies","status":"healthy","score":100,"details":{'
    
    declare -a issues=()
    local score=100
    
    # Check TypeScript
    if command -v npx >/dev/null 2>&1 && npx tsc --version >/dev/null 2>&1; then
        local tsc_version
        tsc_version=$(npx tsc --version 2>/dev/null || echo "unknown")
        result+='"typescript":{"status":"healthy","version":"'"$tsc_version"'"},'
    else
        issues+=("TypeScript not available")
        score=$((score - 20))
        result+='"typescript":{"status":"unhealthy","error":"TypeScript not available"},'
    fi
    
    # Check package.json dependencies
    if [[ -f "package.json" ]]; then
        if command -v bun >/dev/null 2>&1; then
            if bun install --dry-run >/dev/null 2>&1; then
                result+='"package_deps":{"status":"healthy","message":"Dependencies OK"},'
            else
                issues+=("Package dependencies may be broken")
                score=$((score - 30))
                result+='"package_deps":{"status":"unhealthy","error":"Package dependencies may be broken"},'
            fi
        fi
    else
        issues+=("package.json not found")
        score=$((score - 20))
        result+='"package_deps":{"status":"unhealthy","error":"package.json not found"},'
    fi
    
    # Check Python dependencies
    if [[ -f "pyproject.toml" ]]; then
        if command -v uv >/dev/null 2>&1; then
            if uv pip check >/dev/null 2>&1; then
                result+='"python_deps":{"status":"healthy","message":"Python dependencies OK"}'
            else
                issues+=("Python dependencies may be broken")
                score=$((score - 30))
                result+='"python_deps":{"status":"unhealthy","error":"Python dependencies may be broken"}'
            fi
        fi
    else
        result+='"python_deps":{"status":"unknown","message":"No Python project"}'
    fi
    
    result+='},"issues":['
    for issue in "${issues[@]}"; do
        result+='"'"$issue"'",'
    done
    result=${result%,}
    result+='],"score":'$score'}'
    
    echo "$result"
}

# Sync status monitoring
check_sync() {
    local result
    result='{"component":"sync","status":"healthy","score":100,"details":{'
    
    declare -a issues=()
    local score=100
    
    # Check sync state file
    if [[ -f ".beads-cody-sync-state.json" ]]; then
        local last_sync
        last_sync=$(jq -r '.last_sync // "unknown"' .beads-cody-sync-state.json 2>/dev/null || echo "unknown")
        local last_success
        last_success=$(jq -r '.last_refresh_success // false' .beads-cody-sync-state.json 2>/dev/null || echo "false")
        
        result+='"last_sync":"'"$last_sync"'","last_success":"'"$last_success'",'
        
        if [[ "$last_success" == "true" ]]; then
            result+='"sync_status":"healthy"},'
        else
            issues+=("Last sync failed")
            score=$((score - 40))
            result+='"sync_status":"unhealthy"},'
        fi
        
        # Check sync age (warn if > 2 hours)
        if command -v date >/dev/null 2>&1; then
            local sync_age_seconds
            sync_age_seconds=$(($(date +%s) - $(date -d "$last_sync" +%s 2>/dev/null || echo 0)))
            if [[ $sync_age_seconds -gt 7200 ]]; then # 2 hours
                issues+=("Sync is $((sync_age_seconds / 3600)) hours old")
                score=$((score - 20))
            fi
        fi
    else
        issues+=("No sync state file found")
        score=$((score - 50))
        result+='"sync_status":"unknown","error":"No sync state file"},'
    fi
    
    # Check Beads availability
    if command -v bd >/dev/null 2>&1 || command -v bun >/dev/null 2>&1 && bun x bd --version >/dev/null 2>&1; then
        result+='"beads":{"status":"healthy","message":"Beads available"}'
    else
        issues+=("Beads not available")
        score=$((score - 30))
        result+='"beads":{"status":"unhealthy","error":"Beads not available"}'
    fi
    
    result+='},"issues":['
    for issue in "${issues[@]}"; do
        result+='"'"$issue"'",'
    done
    result=${result%,}
    result+='],"score":'$score'}'
    
    echo "$result"
}

# Configuration validation
check_config() {
    local result
    result='{"component":"config","status":"healthy","score":100,"details":{'
    
    declare -a issues=()
    local score=100
    
    # Check justfile
    if [[ -f "justfile" ]]; then
        if command -v just >/dev/null 2>&1; then
            result+='"justfile":{"status":"healthy","message":"justfile found"}'
        else
            issues+=("Just not installed")
            score=$((score - 20))
            result+='"justfile":{"status":"degraded","error":"Just not installed"}'
        fi
    else
        issues+=("justfile not found")
        score=$((score - 30))
        result+='"justfile":{"status":"unhealthy","error":"justfile not found"}'
    fi
    
    result+='},"issues":['
    for issue in "${issues[@]}"; do
        result+='"'"$issue"'",'
    done
    result=${result%,}
    result+='],"score":'$score'}'
    
    echo "$result"
}

# Coordinator integration
check_coordinator() {
    local result
    result='{"component":"coordinator","status":"healthy","score":100,"details":{'
    
    declare -a issues=()
    local score=100
    
    # Check if coordinator binary exists
    if [[ -f "packages/liaison-coordinator/bin/liaison.js" ]]; then
        # Try to call coordinator health endpoint
        local temp_file
        temp_file=$(mktemp)
        if node packages/liaison-coordinator/bin/liaison.js health --format=json > "$temp_file" 2>/dev/null; then
            local coordinator_result
            coordinator_result=$(cat "$temp_file")
            # Extract status from coordinator result
            local coordinator_status
            coordinator_status=$(echo "$coordinator_result" | jq -r '.overall // "healthy"' 2>/dev/null || echo "healthy")
            result+='"coordinator_health":"'"$coordinator_status"'","coordinator_data":'"$coordinator_result"'}'
            
            if [[ "$coordinator_status" != "healthy" ]]; then
                issues+=("Coordinator reports $coordinator_status")
                score=$((score - 30))
            fi
        else
            issues+=("Coordinator health check failed")
            score=$((score - 50))
            result+='"coordinator_health":"unhealthy","error":"Health check failed"}'
        fi
        rm -f "$temp_file"
    else
        issues+=("Coordinator binary not found")
        score=$((score - 100))
        result+='"coordinator_health":"unhealthy","error":"Coordinator binary not found"}'
    fi
    
    result+='},"issues":['
    for issue in "${issues[@]}"; do
        result+='"'"$issue"'",'
    done
    result=${result%,}
    result+='],"score":'$score'}'
    
    echo "$result"
}

    # Calculate overall status
calculate_overall_status() {
    local components=("$@")
    local failed_components=0
    local total_components=${#components[@]}
    local total_score=0
    declare -a all_issues=()
    
    # Count failures and calculate average score
    for component_data in "${components[@]}"; do
        local status
        status=$(echo "$component_data" | jq -r '.status // "unknown"')
        local score
        score=$(echo "$component_data" | jq -r '.score // 0')
        local component_issues
        component_issues=$(echo "$component_data" | jq -r '.issues[]? // empty')
        
        total_score=$((total_score + score))
        
        if [[ "$status" == "unhealthy" ]]; then
            failed_components=$((failed_components + 1))
        fi
        
        # Collect all issues
        while IFS= read -r issue; do
            all_issues+=("$issue")
        done <<< "$component_issues"
    done
    
    # Calculate average score
    local avg_score=$((total_score / total_components))
    
    # Apply failure thresholds
    local overall_status
    if [[ $failed_components -eq 0 ]]; then
        overall_status="healthy"
    elif [[ $failed_components -le 2 ]]; then
        overall_status="degraded"
    else
        overall_status="unhealthy"
    fi
    
    # Generate recommendations
    declare -a recommendations=()
    if [[ $failed_components -gt 0 ]]; then
        recommendations+=("Check failed components for resolution steps")
    fi
    if [[ $avg_score -lt 80 ]]; then
        recommendations+=("Consider running setup commands to improve system health")
    fi
    
    # Build final result using jq for safe JSON construction
    local temp_file
    temp_file=$(mktemp)
    
    # Create base JSON structure
    cat > "$temp_file" << EOF
{
    "timestamp": "$(date -Iseconds)",
    "git_commit": "$(git rev-parse HEAD 2>/dev/null || echo "no-git")",
    "overall": "$overall_status",
    "score": $avg_score,
    "execution": {
        "mode": "$(if [[ "$PARALLEL" == "true" ]]; then echo "parallel"; else echo "sequential"; fi)",
        "duration_ms": $duration_ms,
        "cache_hit": false
    },
    "components": {},
    "issues": [],
    "recommendations": [],
    "metadata": {
        "components_checked": $total_components,
        "failed_components": $failed_components,
        "cache_dir": "$CACHE_DIR"
    }
}
EOF
    
    # Add component data
    for component_data in "${components[@]}"; do
        local component_name
        component_name=$(echo "$component_data" | jq -r '.component')
        jq --argjson comp_data "$component_data" \
            '.components[$component_name] = $comp_data' \
            --arg component_name "$component_name" \
            "$temp_file" > "${temp_file}.tmp" && mv "${temp_file}.tmp" "$temp_file"
    done
    
    # Add issues
    for issue in "${all_issues[@]}"; do
        jq --arg issue "$issue" '.issues += [$issue]' "$temp_file" > "${temp_file}.tmp" && mv "${temp_file}.tmp" "$temp_file"
    done
    
    # Add recommendations
    for rec in "${recommendations[@]}"; do
        jq --arg rec "$rec" '.recommendations += [$rec]' "$temp_file" > "${temp_file}.tmp" && mv "${temp_file}.tmp" "$temp_file"
    done
    
    # Output final result
    cat "$temp_file"
    rm -f "$temp_file" "${temp_file}.tmp"
}

# Main execution
main() {
    local start_time
    start_time=$(date +%s%N 2>/dev/null || echo 0)
    
    # Check cache first
    if is_cache_valid; then
        if [[ "$VERBOSE" == "true" ]]; then
            echo "📋 Using cached health check result" >&2
        fi
        get_cached_result
        return 0
    fi
    
    # Run component checks
    local components=()
    
    case "$COMPONENT" in
        "all")
            if [[ "$PARALLEL" == "true" ]]; then
                # Run checks in parallel
                check_core &
                check_dependencies &
                check_sync &
                check_config &
                check_coordinator &
                wait
                
                # Collect results (simplified for parallel execution)
                components+=("$(check_core)")
                components+=("$(check_dependencies)")
                components+=("$(check_sync)")
                components+=("$(check_config)")
                components+=("$(check_coordinator)")
            else
                # Run checks sequentially
                components+=("$(check_core)")
                components+=("$(check_dependencies)")
                components+=("$(check_sync)")
                components+=("$(check_config)")
                components+=("$(check_coordinator)")
            fi
            ;;
        "core")
            components+=("$(check_core)")
            ;;
        "deps")
            components+=("$(check_dependencies)")
            ;;
        "sync")
            components+=("$(check_sync)")
            ;;
        "config")
            components+=("$(check_config)")
            ;;
        "coordinator")
            components+=("$(check_coordinator)")
            ;;
        *)
            echo "Unknown component: $COMPONENT" >&2
            exit 1
            ;;
    esac
    
    # Calculate overall status and format output
    local result
    result=$(calculate_overall_status "${components[@]}")
    
    # Calculate duration
    local end_time
    end_time=$(date +%s%N 2>/dev/null || echo 0)
    local duration_ms=$(((end_time - start_time) / 1000000))
    
    # Update duration in result
    result=$(echo "$result" | jq ".execution.duration_ms = $duration_ms")
    
    # Cache result
    cache_result "$result"
    
    # Output result
    if [[ "$FORMAT" == "json" ]]; then
        echo "$result" | jq '.'
    else
        # Text format
        local overall_status
        overall_status=$(echo "$result" | jq -r '.overall')
        local score
        score=$(echo "$result" | jq -r '.score')
        
        echo "🏥 Health Check Results"
        echo "Overall Status: $overall_status"
        echo "Health Score: $score/100"
        echo "Duration: ${duration_ms}ms"
        
        if [[ "$VERBOSE" == "true" ]]; then
            echo ""
            echo "Component Details:"
            echo "$result" | jq -r '.components | to_entries[] | "  \(.key): \(.value.status) (\(.value.score)/100)"'
        fi
    fi
}

# Run main function
main "$@"