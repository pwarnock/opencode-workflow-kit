#!/bin/bash
#
# CI Environment Detection
#
# Detects the CI environment and provides configuration

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

    echo "Detected CI environment: $ci_type"

    case "$ci_type" in
        "github")
            echo "Setting up GitHub Actions environment"
            # GitHub Actions specific setup
            echo "GITHUB_WORKFLOW=${GITHUB_WORKFLOW}" >> "$GITHUB_ENV"
            echo "GITHUB_JOB=${GITHUB_JOB}" >> "$GITHUB_ENV"
            ;;
        "gitlab")
            echo "Setting up GitLab CI environment"
            # GitLab CI specific setup
            echo "CI_JOB_NAME=${CI_JOB_NAME}" >> "$GITHUB_ENV"
            ;;
        "generic")
            echo "Setting up generic CI environment"
            ;;
        "local")
            echo "Running in local development environment"
            ;;
    esac
}

# Main execution
if [ "$#" -eq 0 ]; then
    detect_ci_environment
else
    ci_setup "$1"
fi