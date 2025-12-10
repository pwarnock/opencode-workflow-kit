#!/bin/bash
#
# CI Main Script
#
# Main entry point for CI/CD workflow automation tests

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TEST_RESULTS_DIR="$PROJECT_ROOT/test-results"
REPORT_FILE="$TEST_RESULTS_DIR/workflow-test-report-$(date +%Y%m%d-%H%M%S).json"
LOG_FILE="$TEST_RESULTS_DIR/workflow-test-log-$(date +%Y%m%d-%H%M%S).txt"

# Source CI modules
source "$SCRIPT_DIR/ci_detect.sh"
source "$SCRIPT_DIR/ci_logger.sh"

# Initialize logging
"$SCRIPT_DIR/ci_logger.sh" init "$LOG_FILE"
"$SCRIPT_DIR/ci_logger.sh" info "Starting v0.5.0 Workflow Automation Tests" "$LOG_FILE"
"$SCRIPT_DIR/ci_logger.sh" info "Test Results Directory: $TEST_RESULTS_DIR" "$LOG_FILE"

# Parse command line arguments
test_type="full"
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
            "$SCRIPT_DIR/ci_logger.sh" error "Unknown option: $1" "$LOG_FILE"
            exit 1
            ;;
    esac
done

# Detect CI environment
ci_type=$(detect_ci_environment)
"$SCRIPT_DIR/ci_logger.sh" info "Detected CI environment: $ci_type" "$LOG_FILE"
ci_setup "$ci_type"

# Run tests
"$SCRIPT_DIR/ci_logger.sh" info "Starting $test_type tests" "$LOG_FILE"

# Determine test arguments
case "$test_type" in
    "quick")
        test_args="--quick"
        ;;
    "performance")
        test_args="--performance"
        ;;
    "integration")
        test_args="--integration"
        ;;
    *)
        test_args=""
        ;;
esac

# Run workflow tests
"$SCRIPT_DIR/ci_logger.sh" info "Executing: python $SCRIPT_DIR/../run_workflow_tests.py $test_args --report --output $(basename "$REPORT_FILE")" "$LOG_FILE"

python "$SCRIPT_DIR/../run_workflow_tests.py" $test_args --report --output "$(basename "$REPORT_FILE")" >> "$LOG_FILE" 2>&1
exit_code=$?

# Check results
if [ $exit_code -eq 0 ]; then
    "$SCRIPT_DIR/ci_logger.sh" success "All tests passed successfully!" "$LOG_FILE"

    # Generate CI annotations
    "$SCRIPT_DIR/ci_annotations.sh" "$ci_type" "$REPORT_FILE"

    # Set success output
    echo ""
    echo "✅ v0.5.0 Workflow Automation Tests PASSED"
    echo "📄 Report: $REPORT_FILE"
    echo "📝 Log: $LOG_FILE"

    exit 0
else
    "$SCRIPT_DIR/ci_logger.sh" error "Some tests failed!" "$LOG_FILE"

    # Generate CI annotations
    "$SCRIPT_DIR/ci_annotations.sh" "$ci_type" "$REPORT_FILE"

    # Set failure output
    echo ""
    echo "❌ v0.5.0 Workflow Automation Tests FAILED"
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