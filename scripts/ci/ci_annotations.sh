#!/bin/bash
#
# CI Annotations Generator
#
# Generates CI-specific annotations from test reports

generate_ci_annotations() {
    local ci_type=$1
    local report_file=$2

    if [ ! -f "$report_file" ]; then
        echo "No report file found for annotations"
        return 1
    fi

    echo "Generating CI annotations for $ci_type"

    # Extract test results using jq
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
                    echo "✅ $module_name: $tests_run tests passed"
                else
                    echo "❌ $module_name: $failures failures, $errors errors"
                fi
            done <<< "$modules"
            ;;
    esac
}

# Main execution
if [ "$#" -lt 2 ]; then
    echo "Usage: $0 <ci_type> <report_file>"
    exit 1
fi

generate_ci_annotations "$1" "$2"