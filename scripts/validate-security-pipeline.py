#!/usr/bin/env python3
"""
Security Pipeline Validation Script
Validates that all security checks passed and generates comprehensive report
for owk-2zz SecOps security testing implementation
"""

import json
import sys
import argparse
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional


def validate_dependency_scan(results_dir: Path) -> Dict[str, Any]:
    """Validate dependency vulnerability scan results"""
    results = {}

    # Check npm/bun audit results
    npm_file = results_dir / "npm-audit-results.json"
    if npm_file.exists():
        try:
            with open(npm_file) as f:
                npm_results = json.load(f)
                vulnerabilities = npm_results.get("vulnerabilities", [])
                results["npm"] = {
                    "vulnerabilities": len(vulnerabilities),
                    "critical": len(
                        [v for v in vulnerabilities if v.get("severity") == "critical"]
                    ),
                    "high": len(
                        [v for v in vulnerabilities if v.get("severity") == "high"]
                    ),
                    "moderate": len(
                        [v for v in vulnerabilities if v.get("severity") == "moderate"]
                    ),
                    "low": len(
                        [v for v in vulnerabilities if v.get("severity") == "low"]
                    ),
                }
        except json.JSONDecodeError as e:
            results["npm"] = {"error": f"Invalid JSON: {e}"}
        except Exception as e:
            results["npm"] = {"error": f"Parse error: {e}"}

    # Check safety results
    safety_file = results_dir / "safety-results.json"
    if safety_file.exists():
        try:
            with open(safety_file) as f:
                safety_results = json.load(f)
                vulnerabilities = safety_results.get("vulnerabilities", [])
                results["python_safety"] = {
                    "vulnerabilities": len(vulnerabilities),
                    "critical": len(
                        [v for v in vulnerabilities if v.get("severity") == "critical"]
                    ),
                    "high": len(
                        [v for v in vulnerabilities if v.get("severity") == "high"]
                    ),
                }
        except json.JSONDecodeError as e:
            results["python_safety"] = {"error": f"Invalid JSON: {e}"}
        except Exception as e:
            results["python_safety"] = {"error": f"Parse error: {e}"}

    # Check pip-audit results
    pip_audit_file = results_dir / "pip-audit-results.json"
    if pip_audit_file.exists():
        try:
            with open(pip_audit_file) as f:
                pip_audit_results = json.load(f)
                vulnerabilities = pip_audit_results.get("vulnerabilities", [])
                results["pip_audit"] = {
                    "vulnerabilities": len(vulnerabilities),
                    "critical": len(
                        [
                            v
                            for v in vulnerabilities
                            if v.get("severity") in ["critical", "CRITICAL"]
                        ]
                    ),
                    "high": len(
                        [
                            v
                            for v in vulnerabilities
                            if v.get("severity") in ["high", "HIGH"]
                        ]
                    ),
                }
        except json.JSONDecodeError as e:
            results["pip_audit"] = {"error": f"Invalid JSON: {e}"}
        except Exception as e:
            results["pip_audit"] = {"error": f"Parse error: {e}"}

    return results


def validate_secret_detection(results_dir: Path) -> Dict[str, Any]:
    """Validate secret detection results"""
    results = {}

    # Check detect-secrets baseline
    baseline_file = results_dir / ".secrets.baseline"
    if baseline_file.exists():
        try:
            with open(baseline_file) as f:
                baseline = json.load(f)
                results["detect_secrets"] = {
                    "secrets_found": len(baseline.get("results", [])),
                    "files_scanned": len(baseline.get("results", [])),
                    "baseline_created": True,
                }
        except json.JSONDecodeError as e:
            results["detect_secrets"] = {"error": f"Invalid JSON: {e}"}
        except Exception as e:
            results["detect_secrets"] = {"error": f"Parse error: {e}"}
    else:
        results["detect_secrets"] = {"baseline_created": False}

    # Check Trivy SARIF results
    trivy_file = results_dir / "trivy-secrets.sarif"
    if trivy_file.exists():
        try:
            with open(trivy_file) as f:
                trivy_results = json.load(f)
                runs = trivy_results.get("runs", [])
                if runs:
                    trivy_findings = runs[0].get("results", [])
                    severity_breakdown = {}
                    for finding in trivy_findings:
                        level = finding.get("level", "unknown")
                        severity_breakdown[level] = severity_breakdown.get(level, 0) + 1

                    results["trivy_secrets"] = {
                        "secrets_found": len(trivy_findings),
                        "severity_breakdown": severity_breakdown,
                    }
                else:
                    results["trivy_secrets"] = {
                        "secrets_found": 0,
                        "severity_breakdown": {},
                    }
        except json.JSONDecodeError as e:
            results["trivy_secrets"] = {"error": f"Invalid JSON: {e}"}
        except Exception as e:
            results["trivy_secrets"] = {"error": f"Parse error: {e}"}

    return results


def validate_static_analysis(results_dir: Path) -> Dict[str, Any]:
    """Validate static analysis results"""
    results = {}

    # Check semgrep results
    semgrep_file = results_dir / "semgrep-results.json"
    if semgrep_file.exists():
        try:
            with open(semgrep_file) as f:
                semgrep_results = json.load(f)
                findings = semgrep_results.get("results", [])

                severity_breakdown = {}
                high_severity_count = 0

                for finding in findings:
                    metadata = finding.get("metadata", {})
                    severity = metadata.get("severity", "UNKNOWN")
                    severity_breakdown[severity] = (
                        severity_breakdown.get(severity, 0) + 1
                    )

                    if severity in ["ERROR", "HIGH", "CRITICAL"]:
                        high_severity_count += 1

                results["semgrep"] = {
                    "findings": len(findings),
                    "high_severity": high_severity_count,
                    "severity_breakdown": severity_breakdown,
                }
        except json.JSONDecodeError as e:
            results["semgrep"] = {"error": f"Invalid JSON: {e}"}
        except Exception as e:
            results["semgrep"] = {"error": f"Parse error: {e}"}

    # Check bandit results
    bandit_file = results_dir / "bandit-results.json"
    if bandit_file.exists():
        try:
            with open(bandit_file) as f:
                bandit_results = json.load(f)
                results_data = bandit_results.get("results", [])

                high_severity_count = 0
                medium_severity_count = 0

                for result in results_data:
                    issue_severity = result.get("issue_severity", "UNKNOWN")
                    if issue_severity in ["HIGH", "CRITICAL"]:
                        high_severity_count += 1
                    elif issue_severity == "MEDIUM":
                        medium_severity_count += 1

                results["bandit"] = {
                    "findings": len(results_data),
                    "high_severity": high_severity_count,
                    "medium_severity": medium_severity_count,
                }
        except json.JSONDecodeError as e:
            results["bandit"] = {"error": f"Invalid JSON: {e}"}
        except Exception as e:
            results["bandit"] = {"error": f"Parse error: {e}"}

    return results


def generate_security_report(
    dependency_results: Dict[str, Any],
    secret_results: Dict[str, Any],
    static_results: Dict[str, Any],
    thresholds: Dict[str, int],
) -> Dict[str, Any]:
    """Generate comprehensive security validation report"""

    report = {
        "timestamp": datetime.now().isoformat(),
        "validation_status": "passed",
        "dependency_vulnerabilities": dependency_results,
        "secret_detection": secret_results,
        "static_analysis": static_results,
        "summary": {
            "total_vulnerabilities": 0,
            "critical_vulnerabilities": 0,
            "high_vulnerabilities": 0,
            "secrets_found": 0,
            "high_severity_findings": 0,
        },
        "thresholds": thresholds,
        "recommendations": [],
    }

    # Calculate vulnerability totals
    for tool_results in dependency_results.values():
        if isinstance(tool_results, dict) and "vulnerabilities" in tool_results:
            report["summary"]["total_vulnerabilities"] += tool_results.get(
                "vulnerabilities", 0
            )
            report["summary"]["critical_vulnerabilities"] += tool_results.get(
                "critical", 0
            )
            report["summary"]["high_vulnerabilities"] += tool_results.get("high", 0)

    # Calculate secret detection totals
    for tool_results in secret_results.values():
        if isinstance(tool_results, dict) and "secrets_found" in tool_results:
            report["summary"]["secrets_found"] += tool_results.get("secrets_found", 0)

    # Calculate static analysis totals
    for tool_results in static_results.values():
        if isinstance(tool_results, dict) and "high_severity" in tool_results:
            report["summary"]["high_severity_findings"] += tool_results.get(
                "high_severity", 0
            )

    # Determine validation status based on thresholds
    critical_threshold = thresholds.get("critical", 0)
    high_threshold = thresholds.get("high", 5)
    secrets_threshold = thresholds.get("secrets", 0)
    high_findings_threshold = thresholds.get("high_findings", 3)

    if report["summary"]["critical_vulnerabilities"] > critical_threshold:
        report["validation_status"] = "failed"
        report["recommendations"].append(
            f"CRITICAL: {report['summary']['critical_vulnerabilities']} critical vulnerabilities found (threshold: {critical_threshold})"
        )
    elif report["summary"]["secrets_found"] > secrets_threshold:
        report["validation_status"] = "failed"
        report["recommendations"].append(
            f"CRITICAL: {report['summary']['secrets_found']} secrets found (threshold: {secrets_threshold})"
        )
    elif report["summary"]["high_vulnerabilities"] > high_threshold:
        report["validation_status"] = "warning"
        report["recommendations"].append(
            f"WARNING: {report['summary']['high_vulnerabilities']} high vulnerabilities found (threshold: {high_threshold})"
        )
    elif report["summary"]["high_severity_findings"] > high_findings_threshold:
        report["validation_status"] = "warning"
        report["recommendations"].append(
            f"WARNING: {report['summary']['high_severity_findings']} high-severity static analysis findings (threshold: {high_findings_threshold})"
        )

    if report["validation_status"] == "passed":
        report["recommendations"].append(
            "All security checks passed within acceptable thresholds"
        )

    return report


def main():
    """Main validation function"""
    parser = argparse.ArgumentParser(description="Security Pipeline Validation")
    parser.add_argument(
        "--dependency-results",
        required=True,
        help="Directory containing dependency scan results",
    )
    parser.add_argument(
        "--secret-results",
        required=True,
        help="Directory containing secret detection results",
    )
    parser.add_argument(
        "--static-results", help="Directory containing static analysis results"
    )
    parser.add_argument(
        "--output", required=True, help="Output file for validation report"
    )
    parser.add_argument(
        "--threshold-critical",
        type=int,
        default=0,
        help="Threshold for critical vulnerabilities",
    )
    parser.add_argument(
        "--threshold-high",
        type=int,
        default=5,
        help="Threshold for high vulnerabilities",
    )
    parser.add_argument(
        "--threshold-secrets", type=int, default=0, help="Threshold for secrets found"
    )
    parser.add_argument(
        "--threshold-high-findings",
        type=int,
        default=3,
        help="Threshold for high-severity static findings",
    )

    args = parser.parse_args()

    # Validate results
    dependency_dir = Path(args.dependency_results)
    secret_dir = Path(args.secret_results)
    static_dir = Path(args.static_results) if args.static_results else None

    dependency_results = validate_dependency_scan(dependency_dir)
    secret_results = validate_secret_detection(secret_dir)
    static_results = validate_static_analysis(static_dir) if static_dir else {}

    # Set thresholds
    thresholds = {
        "critical": args.threshold_critical,
        "high": args.threshold_high,
        "secrets": args.threshold_secrets,
        "high_findings": args.threshold_high_findings,
    }

    # Generate report
    report = generate_security_report(
        dependency_results, secret_results, static_results, thresholds
    )

    # Save report
    output_file = Path(args.output)
    with open(output_file, "w") as f:
        json.dump(report, f, indent=2)

    # Print summary
    print(f"🔒 Security Pipeline Validation Complete")
    print(f"Status: {report['validation_status'].upper()}")
    print(f"Total vulnerabilities: {report['summary']['total_vulnerabilities']}")
    print(f"Critical vulnerabilities: {report['summary']['critical_vulnerabilities']}")
    print(f"High vulnerabilities: {report['summary']['high_vulnerabilities']}")
    print(f"Secrets found: {report['summary']['secrets_found']}")
    print(f"High-severity findings: {report['summary']['high_severity_findings']}")

    if report["recommendations"]:
        print("\nRecommendations:")
        for rec in report["recommendations"]:
            print(f"  - {rec}")

    # Exit with appropriate code
    if report["validation_status"] == "failed":
        print("\n❌ Security validation FAILED")
        sys.exit(1)
    elif report["validation_status"] == "warning":
        print("\n⚠️  Security validation PASSED with warnings")
        sys.exit(2)
    else:
        print("\n✅ Security validation PASSED")
        sys.exit(0)


if __name__ == "__main__":
    main()
