#!/usr/bin/env python3
"""
Test reporting and metrics system for opencode-config.
"""

import sys
import os
import json
import argparse
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from collections import defaultdict

# Add parent directory to path to import opencode_config
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from opencode_config.compatibility import CompatibilityTester
    from opencode_config.validator import ConfigValidator
except ImportError as e:
    print(f"Import error: {e}")
    print("Please install the package with: uv pip install -e .")
    sys.exit(1)


class TestReporter:
    """Advanced test reporting and metrics system."""
    
    def __init__(self, results_dir: Optional[Path] = None):
        """Initialize test reporter.
        
        Args:
            results_dir: Directory to store test results and reports
        """
        self.results_dir = results_dir or Path(__file__).parent.parent / "test-results"
        self.results_dir.mkdir(exist_ok=True)
        
        # Metrics storage
        self.metrics = {
            "test_runs": [],
            "coverage_history": [],
            "performance_trends": [],
            "failure_patterns": defaultdict(list),
            "success_rates": {}
        }
        
    def generate_comprehensive_report(self, test_results: Dict[str, Any]) -> Dict[str, Any]:
        """Generate comprehensive test report.
        
        Args:
            test_results: Results from test runner
            
        Returns:
            Comprehensive report with metrics and analysis
        """
        report = {
            "generated_at": datetime.now().isoformat(),
            "summary": self._generate_summary(test_results),
            "coverage_analysis": self._analyze_coverage(test_results),
            "performance_analysis": self._analyze_performance(test_results),
            "failure_analysis": self._analyze_failures(test_results),
            "trends_analysis": self._analyze_trends(test_results),
            "recommendations": self._generate_recommendations(test_results)
        }
        
        return report
    
    def _generate_summary(self, test_results: Dict[str, Any]) -> Dict[str, Any]:
        """Generate test summary."""
        summary = {
            "total_environments": test_results.get("total_environments", 0),
            "successful_environments": test_results.get("successful_environments", 0),
            "failed_environments": test_results.get("failed_environments", 0),
            "success_rate": test_results.get("success_rate", 0),
            "duration_seconds": test_results.get("duration_seconds", 0),
            "overall_status": "PASS" if test_results.get("overall_success", False) else "FAIL"
        }
        
        # Calculate additional metrics
        total_tests = 0
        total_issues = 0
        
        for result in test_results.get("results", []):
            for test_name, test_data in result.get("tests", {}).items():
                if isinstance(test_data, dict):
                    total_tests += 1
                    if not test_data.get("passed", test_data.get("compatible", True)):
                        total_issues += 1
        
        summary.update({
            "total_tests_run": total_tests,
            "total_issues_found": total_issues,
            "test_pass_rate": (total_tests - total_issues) / total_tests if total_tests > 0 else 0
        })
        
        return summary
    
    def _analyze_coverage(self, test_results: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze test coverage."""
        coverage = {
            "platforms_tested": set(),
            "config_types_tested": set(),
            "test_categories": set(),
            "coverage_gaps": []
        }
        
        for result in test_results.get("results", []):
            # Extract coverage data from compatibility tests
            compat_test = result.get("tests", {}).get("compatibility", {})
            if compat_test.get("coverage"):
                cov_data = compat_test["coverage"]
                coverage["platforms_tested"].update(cov_data.get("platforms_tested", []))
                coverage["config_types_tested"].update(cov_data.get("config_types_tested", []))
                coverage["test_categories"].update(cov_data.get("test_categories", []))
        
        # Convert sets to lists for JSON serialization
        coverage = {
            "platforms_tested": list(coverage["platforms_tested"]),
            "config_types_tested": list(coverage["config_types_tested"]),
            "test_categories": list(coverage["test_categories"]),
            "coverage_gaps": self._identify_coverage_gaps(coverage)
        }
        
        return coverage
    
    def _identify_coverage_gaps(self, coverage: Dict[str, Any]) -> List[str]:
        """Identify coverage gaps."""
        gaps = []
        
        expected_platforms = ["windows", "linux", "darwin"]
        tested_platforms = [p.lower() for p in coverage["platforms_tested"]]
        
        for platform in expected_platforms:
            if not any(platform in p for p in tested_platforms):
                gaps.append(f"Missing coverage for {platform} platform")
        
        expected_categories = ["structure", "validation", "paths", "platform", "templates", "installation"]
        for category in expected_categories:
            if category not in coverage["test_categories"]:
                gaps.append(f"Missing coverage for {category} tests")
        
        return gaps
    
    def _analyze_performance(self, test_results: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze performance metrics."""
        performance = {
            "test_duration": test_results.get("duration_seconds", 0),
            "environment_performance": [],
            "bottlenecks": []
        }
        
        for result in test_results.get("results", []):
            env_perf = {
                "environment": result.get("environment", "unknown"),
                "duration": 0,
                "slow_tests": []
            }
            
            # Extract performance data from tests
            for test_name, test_data in result.get("tests", {}).items():
                if isinstance(test_data, dict) and "performance" in test_data:
                    perf_data = test_data["performance"]
                    if isinstance(perf_data, dict):
                        env_perf["duration"] += perf_data.get("config_load_time", 0)
                        env_perf["duration"] += perf_data.get("validation_time", 0)
                        
                        # Identify slow tests
                        for metric, value in perf_data.items():
                            if isinstance(value, (int, float)) and value > 1.0:  # > 1 second
                                env_perf["slow_tests"].append(f"{metric}: {value:.3f}s")
            
            performance["environment_performance"].append(env_perf)
        
        # Identify bottlenecks
        avg_duration = sum(env["duration"] for env in performance["environment_performance"]) / len(performance["environment_performance"]) if performance["environment_performance"] else 0
        
        for env in performance["environment_performance"]:
            if env["duration"] > avg_duration * 1.5:
                performance["bottlenecks"].append(f"{env['environment']}: {env['duration']:.3f}s (avg: {avg_duration:.3f}s)")
        
        return performance
    
    def _analyze_failures(self, test_results: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze failure patterns."""
        failures = {
            "total_failures": 0,
            "failure_categories": defaultdict(int),
            "common_failures": defaultdict(int),
            "critical_failures": []
        }
        
        for result in test_results.get("results", []):
            if not result.get("success", True):
                failures["total_failures"] += 1
                
                for issue in result.get("issues", []):
                    # Categorize failures
                    if "validation" in issue.lower():
                        failures["failure_categories"]["validation"] += 1
                    elif "template" in issue.lower():
                        failures["failure_categories"]["template"] += 1
                    elif "installation" in issue.lower():
                        failures["failure_categories"]["installation"] += 1
                    elif "compatibility" in issue.lower():
                        failures["failure_categories"]["compatibility"] += 1
                    else:
                        failures["failure_categories"]["other"] += 1
                    
                    # Track common failures
                    failures["common_failures"][issue] += 1
                    
                    # Identify critical failures
                    if any(keyword in issue.lower() for keyword in ["error", "failed", "missing", "timeout"]):
                        failures["critical_failures"].append({
                            "environment": result.get("environment", "unknown"),
                            "issue": issue
                        })
        
        # Convert defaultdicts to regular dicts for JSON serialization
        failures["failure_categories"] = dict(failures["failure_categories"])
        failures["common_failures"] = dict(sorted(failures["common_failures"].items(), key=lambda x: x[1], reverse=True)[:5])
        
        return failures
    
    def _analyze_trends(self, test_results: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze trends over time."""
        trends = {
            "historical_data": [],
            "trend_analysis": {},
            "recommendations": []
        }
        
        # Load historical data
        history_file = self.results_dir / "test-history.json"
        if history_file.exists():
            try:
                with open(history_file, 'r') as f:
                    trends["historical_data"] = json.load(f)
            except Exception:
                trends["historical_data"] = []
        
        # Add current test run to history
        current_run = {
            "timestamp": datetime.now().isoformat(),
            "success_rate": test_results.get("success_rate", 0),
            "duration": test_results.get("duration_seconds", 0),
            "total_environments": test_results.get("total_environments", 0)
        }
        trends["historical_data"].append(current_run)
        
        # Keep only last 30 runs
        trends["historical_data"] = trends["historical_data"][-30:]
        
        # Analyze trends
        if len(trends["historical_data"]) >= 3:
            recent_runs = trends["historical_data"][-5:]
            avg_success_rate = sum(run["success_rate"] for run in recent_runs) / len(recent_runs)
            avg_duration = sum(run["duration"] for run in recent_runs) / len(recent_runs)
            
            trends["trend_analysis"] = {
                "recent_avg_success_rate": avg_success_rate,
                "recent_avg_duration": avg_duration,
                "stability": "stable" if avg_success_rate >= 0.9 else "unstable"
            }
            
            # Generate trend recommendations
            if avg_success_rate < 0.8:
                trends["recommendations"].append("Success rate is below 80%. Consider reviewing failing tests.")
            if avg_duration > 10:
                trends["recommendations"].append("Test duration is high. Consider optimizing test performance.")
        
        # Save updated history
        with open(history_file, 'w') as f:
            json.dump(trends["historical_data"], f, indent=2)
        
        return trends
    
    def _generate_recommendations(self, test_results: Dict[str, Any]) -> List[str]:
        """Generate recommendations based on test results."""
        recommendations = []
        
        # Success rate recommendations
        success_rate = test_results.get("success_rate", 0)
        if success_rate < 1.0:
            recommendations.append(f"Fix {int((1 - success_rate) * 100)}% of failing tests to achieve 100% success rate")
        
        # Coverage recommendations
        coverage = self._analyze_coverage(test_results)
        if coverage["coverage_gaps"]:
            recommendations.extend([f"Address coverage gap: {gap}" for gap in coverage["coverage_gaps"][:3]])
        
        # Performance recommendations
        performance = self._analyze_performance(test_results)
        if performance["bottlenecks"]:
            recommendations.append(f"Optimize performance bottlenecks: {', '.join(performance['bottlenecks'][:2])}")
        
        # Failure recommendations
        failures = self._analyze_failures(test_results)
        if failures["common_failures"]:
            most_common = list(failures["common_failures"].keys())[0]
            recommendations.append(f"Address most common failure: {most_common}")
        
        return recommendations
    
    def save_report(self, report: Dict[str, Any], filename: Optional[str] = None) -> Path:
        """Save report to file.
        
        Args:
            report: Report data
            filename: Optional filename (default: timestamped)
            
        Returns:
            Path to saved report
        """
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"test-report-{timestamp}.json"
        
        report_file = self.results_dir / filename
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        return report_file
    
    def generate_html_report(self, report: Dict[str, Any]) -> str:
        """Generate HTML report.
        
        Args:
            report: Report data
            
        Returns:
            HTML content
        """
        html = f"""
<!DOCTYPE html>
<html>
<head>
    <title>OpenCode Config Test Report</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; }}
        .header {{ background-color: #f0f0f0; padding: 20px; border-radius: 5px; }}
        .section {{ margin: 20px 0; }}
        .success {{ color: green; }}
        .failure {{ color: red; }}
        .warning {{ color: orange; }}
        table {{ border-collapse: collapse; width: 100%; }}
        th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
        th {{ background-color: #f2f2f2; }}
        .metric {{ display: inline-block; margin: 10px; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>OpenCode Config Test Report</h1>
        <p>Generated: {report['generated_at']}</p>
    </div>
    
    <div class="section">
        <h2>Summary</h2>
        <div class="metric">
            <strong>Overall Status:</strong> 
            <span class="{'success' if report['summary']['overall_status'] == 'PASS' else 'failure'}">
                {report['summary']['overall_status']}
            </span>
        </div>
        <div class="metric">
            <strong>Success Rate:</strong> {report['summary']['success_rate']:.1%}
        </div>
        <div class="metric">
            <strong>Duration:</strong> {report['summary']['duration_seconds']:.2f}s
        </div>
        <div class="metric">
            <strong>Tests Run:</strong> {report['summary']['total_tests_run']}
        </div>
    </div>
    
    <div class="section">
        <h2>Coverage Analysis</h2>
        <p><strong>Platforms Tested:</strong> {', '.join(report['coverage_analysis']['platforms_tested'])}</p>
        <p><strong>Test Categories:</strong> {', '.join(report['coverage_analysis']['test_categories'])}</p>
        {f"<p class='warning'><strong>Coverage Gaps:</strong> {', '.join(report['coverage_analysis']['coverage_gaps'])}</p>" if report['coverage_analysis']['coverage_gaps'] else ""}
    </div>
    
    <div class="section">
        <h2>Recommendations</h2>
        <ul>
            {"".join(f"<li>{rec}</li>" for rec in report['recommendations'])}
        </ul>
    </div>
</body>
</html>
        """
        
        return html


def main():
    """Main function."""
    parser = argparse.ArgumentParser(description="Generate test reports for opencode-config")
    parser.add_argument(
        "--results-file",
        type=Path,
        default=Path(__file__).parent.parent / "test-results.json",
        help="Test results file to analyze"
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).parent.parent / "test-results",
        help="Output directory for reports"
    )
    parser.add_argument(
        "--format",
        choices=["json", "html", "both"],
        default="both",
        help="Report format"
    )
    
    args = parser.parse_args()
    
    # Load test results
    if not args.results_file.exists():
        print(f"❌ Test results file not found: {args.results_file}")
        sys.exit(1)
    
    with open(args.results_file, 'r') as f:
        test_results = json.load(f)
    
    # Generate report
    reporter = TestReporter(args.output_dir)
    report = reporter.generate_comprehensive_report(test_results)
    
    # Save reports
    if args.format in ["json", "both"]:
        json_file = reporter.save_report(report)
        print(f"📄 JSON report saved: {json_file}")
    
    if args.format in ["html", "both"]:
        html_content = reporter.generate_html_report(report)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        html_file = args.output_dir / f"test-report-{timestamp}.html"
        with open(html_file, 'w') as f:
            f.write(html_content)
        print(f"🌐 HTML report saved: {html_file}")
    
    # Print summary
    summary = report["summary"]
    print(f"\n📊 Report Summary:")
    print(f"  Overall Status: {summary['overall_status']}")
    print(f"  Success Rate: {summary['success_rate']:.1%}")
    print(f"  Duration: {summary['duration_seconds']:.2f}s")
    print(f"  Recommendations: {len(report['recommendations'])}")
    
    sys.exit(0)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"❌ Report generation failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)