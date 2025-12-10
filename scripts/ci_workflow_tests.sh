#!/bin/bash
#
# CI/CD Integration Script for v0.5.0 Workflow Automation Tests
#
# This script provides comprehensive CI/CD integration for the workflow automation testing infrastructure.
# It supports multiple CI platforms and provides detailed reporting and exit codes.

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TEST_RESULTS_DIR="$PROJECT_ROOT/test-results"
REPORT_FILE="$TEST_RESULTS_DIR/workflow-test-report-$(date +%Y%m%d-%H%M%S).json"
LOG_FILE="$TEST_RESULTS_DIR/workflow-test-log-$(date +%Y%m%d-%H%M%S).txt"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create results directory
mkdir -p "$TEST_RESULTS_DIR"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] [INFO] $1" >> "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] [SUCCESS] $1" >> "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] [WARNING] $1" >> "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] [ERROR] $1" >> "$LOG_FILE"
}

# Detect CI environment
detect_ci_environment() {
    if [ -n "$GITHUB_ACTIONS" ]; then
        echo "github"
    elif [ -n "$GITLAB_CI" ]; then
        echo "gitlab"
    elif [ -n "$CI" ]; then
        echo "generic"
    else
        echo "local"
    fi
}

# CI-specific setup
ci_setup() {
    local ci_type=$1

    log_info "Detected CI environment: $ci_type"

    case "$ci_type" in
        "github")
            log_info "Setting up GitHub Actions environment"
            # GitHub Actions specific setup
            echo "GITHUB_WORKFLOW=${GITHUB_WORKFLOW}" >> "$GITHUB_ENV"
            echo "GITHUB_JOB=${GITHUB_JOB}" >> "$GITHUB_ENV"
            ;;
        "gitlab")
            log_info "Setting up GitLab CI environment"
            # GitLab CI specific setup
            echo "CI_JOB_NAME=${CI_JOB_NAME}" >> "$GITHUB_ENV"
            ;;
        "generic")
            log_info "Setting up generic CI environment"
            ;;
        "local")
            log_info "Running in local development environment"
            ;;
    esac
}

# Run workflow tests
run_workflow_tests() {
    local test_type=$1
    local report_flag=""

    log_info "Starting v0.5.0 Workflow Automation Tests"

    # Determine test type
    case "$test_type" in
        "full")
            log_info "Running full test suite"
            ;;
        "quick")
            log_info "Running quick test suite (core tests only)"
            test_args="--quick"
            ;;
        "performance")
            log_info "Running performance tests only"
            test_args="--performance"
            ;;
        "integration")
            log_info "Running integration tests only"
            test_args="--integration"
            ;;
        *)
            log_error "Unknown test type: $test_type"
            return 1
            ;;
    esac

    # Run tests with reporting
    log_info "Executing: python $SCRIPT_DIR/run_workflow_tests.py $test_args --report --output $REPORT_FILE"

    # Run tests and capture output
    python "$SCRIPT_DIR/run_workflow_tests.py" $test_args --report --output "$(basename "$REPORT_FILE")" >> "$LOG_FILE" 2>&1
    local exit_code=$?

    # Check if report was generated
    if [ -f "$REPORT_FILE" ]; then
        log_success "Test report generated: $REPORT_FILE"

        # Extract key metrics from report
        local total_tests=$(jq -r '.summary.total_tests' "$REPORT_FILE" 2>/dev/null || echo "0")
        local total_failures=$(jq -r '.summary.total_failures' "$REPORT_FILE" 2>/dev/null || echo "0")
        local total_errors=$(jq -r '.summary.total_errors' "$REPORT_FILE" 2>/dev/null || echo "0")
        local success_rate=$(jq -r '.summary.success_rate' "$REPORT_FILE" 2>/dev/null || echo "0")
        local overall_success=$(jq -r '.overall_success' "$REPORT_FILE" 2>/dev/null || echo "false")

        # Display summary
        echo ""
        echo "📊 Test Results Summary:"
        echo "  Total Tests: $total_tests"
        echo "  Failures: $total_failures"
        echo "  Errors: $total_errors"
        echo "  Success Rate: $success_rate%"
        echo "  Overall Success: $overall_success"
        echo ""
    else
        log_error "Test report not generated"
        exit_code=1
    fi

    return $exit_code
}

# Generate CI annotations
generate_ci_annotations() {
    local ci_type=$1
    local report_file=$2

    if [ ! -f "$report_file" ]; then
        log_warning "No report file found for annotations"
        return
    fi

    log_info "Generating CI annotations"

    # Extract test results
    local modules=$(jq -c '.modules[]' "$report_file" 2>/dev/null)

    case "$ci_type" in
        "github")
            # GitHub Actions annotations
            while IFS= read -r module; do
                local module_name=$(echo "$module" | jq -r '.module')
                local success=$(echo "$module" | jq -r '.success')
                local tests_run=$(echo "$module" | jq -r '.metrics.tests_run')
                local failures=$(echo "$module" | jq -r '.metrics.failures')
                local errors=$(echo "$module" | jq -r '.metrics.errors')

                if [ "$success" = "true" ]; then
                    echo "::notice title=Test Results - $module_name::✅ $tests_run tests passed"
                else
                    echo "::error title=Test Results - $module_name::❌ $failures failures, $errors errors"
                fi
            done <<< "$modules"
            ;;
        "gitlab")
            # GitLab CI annotations
            while IFS= read -r module; do
                local module_name=$(echo "$module" | jq -r '.module')
                local success=$(echo "$module" | jq -r '.success')
                local tests_run=$(echo "$module" | jq -r '.metrics.tests_run')
                local failures=$(echo "$module" | jq -r '.metrics.failures')
                local errors=$(echo "$module" | jq -r '.metrics.errors')

                if [ "$success" = "true" ]; then
                    echo "📋 $module_name: $tests_run tests passed"
                else
                    echo "❌ $module_name: $failures failures, $errors errors"
                fi
            done <<< "$modules"
            ;;
        *)
            # Generic annotations
            while IFS= read -r module; do
                local module_name=$(echo "$module" | jq -r '.module')
                local success=$(echo "$module" | jq -r '.success')
                local tests_run=$(echo "$module" | jq -r '.metrics.tests_run')
                local failures=$(echo "$module" | jq -r '.metrics.failures')
                local errors=$(echo "$module" | jq -r '.metrics.errors')

                if [ "$success" = "true" ]; then
                    log_success "$module_name: $tests_run tests passed"
                else
                    log_error "$module_name: $failures failures, $errors errors"
                fi
            done <<< "$modules"
            ;;
    esac
}

# Main execution
main() {
    local test_type="full"
    local ci_type

    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --quick)
                test_type="quick"
                shift
                ;;
            --performance)
                test_type="performance"
                shift
                ;;
            --integration)
                test_type="integration"
                shift
                ;;
            --help|-h)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --quick          Run quick test suite (core tests only)"
                echo "  --performance    Run performance tests only"
                echo "  --integration    Run integration tests only"
                echo "  --help, -h       Show this help message"
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    # Initialize logging
    echo "v0.5.0 Workflow Automation Tests - CI/CD Integration" > "$LOG_FILE"
    echo "Started: $(date)" >> "$LOG_FILE"
    echo "Test Type: $test_type" >> "$LOG_FILE"
    echo "" >> "$LOG_FILE"

    # Detect CI environment
    ci_type=$(detect_ci_environment)
    ci_setup "$ci_type"

    # Run tests
    log_info "Starting $test_type tests in $ci_type environment"

    if run_workflow_tests "$test_type"; then
        log_success "All tests passed successfully!"

        # Generate CI annotations
        generate_ci_annotations "$ci_type" "$REPORT_FILE"

        # Set success output
        echo ""
        echo -e "${GREEN}✅ v0.5.0 Workflow Automation Tests PASSED${NC}"
        echo "📄 Report: $REPORT_FILE"
        echo "📝 Log: $LOG_FILE"

        exit 0
    else
        log_error "Some tests failed!"

        # Generate CI annotations
        generate_ci_annotations "$ci_type" "$REPORT_FILE"

        # Set failure output
        echo ""
        echo -e "${RED}❌ v0.5.0 Workflow Automation Tests FAILED${NC}"
        echo "📄 Report: $REPORT_FILE"
        echo "📝 Log: $LOG_FILE"
        echo ""
        echo "🔍 Check the log file for detailed error information:"
        echo "    cat $LOG_FILE"
        echo ""
        echo "📊 Review the test report for failure analysis:"
        echo "    cat $REPORT_FILE | jq ."

        exit 1
    fi
}

# Execute main function
main "$@"