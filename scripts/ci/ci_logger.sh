#!/bin/bash
#
# CI Logger
#
# Provides logging functions for CI environments

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Initialize logging
init_logging() {
    local log_file=$1
    echo "v0.5.0 Workflow Automation Tests - CI/CD Integration" > "$log_file"
    echo "Started: $(date)" >> "$log_file"
    echo "" >> "$log_file"
}

# Log functions
log_info() {
    local message=$1
    local log_file=$2
    echo -e "${BLUE}[INFO]${NC} $message"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] [INFO] $message" >> "$log_file"
}

log_success() {
    local message=$1
    local log_file=$2
    echo -e "${GREEN}[SUCCESS]${NC} $message"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] [SUCCESS] $message" >> "$log_file"
}

log_warning() {
    local message=$1
    local log_file=$2
    echo -e "${YELLOW}[WARNING]${NC} $message"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] [WARNING] $message" >> "$log_file"
}

log_error() {
    local message=$1
    local log_file=$2
    echo -e "${RED}[ERROR]${NC} $message"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] [ERROR] $message" >> "$log_file"
}

# Main execution
if [ "$#" -lt 2 ]; then
    echo "Usage: $0 <function> <log_file> [message]"
    echo "Functions: init, info, success, warning, error"
    exit 1
fi

function=$1
log_file=$2
message="${*:3}"

case "$function" in
    "init")
        init_logging "$log_file"
        ;;
    "info")
        log_info "$message" "$log_file"
        ;;
    "success")
        log_success "$message" "$log_file"
        ;;
    "warning")
        log_warning "$message" "$log_file"
        ;;
    "error")
        log_error "$message" "$log_file"
        ;;
    *)
        echo "Unknown function: $function"
        exit 1
        ;;
esac