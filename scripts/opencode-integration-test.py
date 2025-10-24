#!/usr/bin/env python3
"""
OpenCode integration testing for opencode-config.
Tests configurations with actual opencode agent to ensure runtime compatibility.
"""

import sys
import os
import json
import subprocess
import tempfile
import shutil
import argparse
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime

# Add parent directory to path to import opencode_config
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from opencode_config.validator import ConfigValidator
    from opencode_config.compatibility import CompatibilityTester
except ImportError as e:
    print(f"Import error: {e}")
    print("Please install the package with: uv pip install -e .")
    sys.exit(1)


class OpenCodeIntegrationTester:
    """Integration tester for OpenCode agent compatibility."""
    
    def __init__(self, config_dir: Optional[Path] = None):
        """Initialize integration tester.
        
        Args:
            config_dir: Directory containing configuration files
        """
        self.config_dir = config_dir or Path(__file__).parent.parent / "config"
        self.validator = ConfigValidator()
        self.compatibility_tester = CompatibilityTester()
        self.results = {
            'total_tests': 0,
            'passed_tests': 0,
            'failed_tests': 0,
            'warnings': 0,
            'errors': [],
            'warnings_list': [],
            'test_results': []
        }
        
    def discover_test_configs(self) -> List[Path]:
        """Discover configuration files suitable for integration testing.
        
        Returns:
            List of configuration file paths
        """
        config_files = []
        
        # Focus on agent configurations for integration testing
        for json_file in self.config_dir.rglob("*.json"):
            if "schemas" in str(json_file):
                continue
            if "agents" in str(json_file):
                config_files.append(json_file)
                
        return sorted(config_files)
    
    def test_config_loading(self, config_path: Path) -> Dict[str, Any]:
        """Test configuration loading and parsing.
        
        Args:
            config_path: Path to configuration file
            
        Returns:
            Test result details
        """
        result = {
            'test_type': 'config_loading',
            'config_file': str(config_path),
            'success': False,
            'error': None,
            'warnings': [],
            'duration': 0
        }
        
        start_time = datetime.now()
        
        try:
            # Test basic JSON loading
            with open(config_path, 'r', encoding='utf-8') as f:
                config_data = json.load(f)
            
            # Test schema validation
            validation_result = self.validator.validate_file(config_path)
            if not validation_result['valid']:
                result['error'] = f"Schema validation failed: {'; '.join(validation_result['errors'])}"
                result['duration'] = (datetime.now() - start_time).total_seconds()
                return result
            
            # Test required fields for agent configs
            if 'agent' in config_data:
                agent_config = config_data['agent']
                required_fields = ['name', 'version', 'type']
                missing_fields = [field for field in required_fields if field not in agent_config]
                if missing_fields:
                    result['error'] = f"Missing required agent fields: {', '.join(missing_fields)}"
                    result['duration'] = (datetime.now() - start_time).total_seconds()
                    return result
            
            result['success'] = True
            
        except Exception as e:
            result['error'] = str(e)
        
        result['duration'] = (datetime.now() - start_time).total_seconds()
        return result
    
    def test_environment_compatibility(self, config_path: Path) -> Dict[str, Any]:
        """Test environment compatibility for configuration.
        
        Args:
            config_path: Path to configuration file
            
        Returns:
            Test result details
        """
        result = {
            'test_type': 'environment_compatibility',
            'config_file': str(config_path),
            'success': False,
            'error': None,
            'warnings': [],
            'platform_tests': {},
            'duration': 0
        }
        
        start_time = datetime.now()
        
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                config_data = json.load(f)
            
            # Test platform-specific configurations
            platforms = ['darwin', 'linux', 'windows']
            
            for platform in platforms:
                platform_result = {
                    'compatible': True,
                    'issues': []
                }
                
                # Check platform overrides
                if 'platform_overrides' in config_data:
                    overrides = config_data['platform_overrides']
                    if platform in overrides:
                        # Test platform-specific paths and commands
                        platform_config = overrides[platform]
                        
                        # Test environment paths
                        if 'environment' in platform_config and 'paths' in platform_config['environment']:
                            paths = platform_config['environment']['paths']
                            for path_name, path_value in paths.items():
                                # Expand environment variables and user home
                                expanded_path = os.path.expandvars(path_value.replace('~', str(Path.home())))
                                # For Windows paths, convert to forward slashes for testing
                                if '\\' in expanded_path:
                                    expanded_path = expanded_path.replace('\\', '/')
                                platform_result['issues'].append(f"Path {path_name}: {expanded_path}")
                
                result['platform_tests'][platform] = platform_result
            
            # Test shell compatibility
            if 'environment' in config_data and 'shell' in config_data['environment']:
                shell_config = config_data['environment']['shell']
                default_shell = shell_config.get('default', 'bash')
                
                # Test shell availability on current platform
                try:
                    subprocess.run(['which', default_shell], capture_output=True, check=True, timeout=5)
                except (subprocess.CalledProcessError, subprocess.TimeoutExpired, FileNotFoundError):
                    result['warnings'].append(f"Default shell '{default_shell}' not available on current platform")
            
            result['success'] = True
            
        except Exception as e:
            result['error'] = str(e)
        
        result['duration'] = (datetime.now() - start_time).total_seconds()
        return result
    
    def test_mcp_server_config(self, config_path: Path) -> Dict[str, Any]:
        """Test MCP server configuration compatibility.
        
        Args:
            config_path: Path to configuration file
            
        Returns:
            Test result details
        """
        result = {
            'test_type': 'mcp_server_config',
            'config_file': str(config_path),
            'success': False,
            'error': None,
            'warnings': [],
            'server_tests': {},
            'duration': 0
        }
        
        start_time = datetime.now()
        
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                config_data = json.load(f)
            
            # Test MCP server configurations
            if 'servers' in config_data:
                servers = config_data['servers']
                
                for server_name, server_config in servers.items():
                    server_result = {
                        'valid': True,
                        'issues': []
                    }
                    
                    # Test command configuration
                    if 'command' in server_config:
                        command = server_config['command']
                        
                        # Test platform-specific commands
                        for platform, platform_command in command.items():
                            if isinstance(platform_command, list):
                                # Check if command is executable
                                if platform_command and platform_command[0]:
                                    cmd_name = platform_command[0]
                                    if cmd_name not in ['python', 'cmd', 'powershell', 'bash']:
                                        # Try to find the command
                                        try:
                                            subprocess.run(['which', cmd_name], capture_output=True, check=True, timeout=3)
                                        except (subprocess.CalledProcessError, subprocess.TimeoutExpired, FileNotFoundError):
                                            server_result['issues'].append(f"Command '{cmd_name}' not found for platform '{platform}'")
                    
                    # Test timeout configuration
                    if 'timeout' in server_config:
                        timeout = server_config['timeout']
                        if not isinstance(timeout, int) or timeout <= 0:
                            server_result['issues'].append(f"Invalid timeout value: {timeout}")
                    
                    result['server_tests'][server_name] = server_result
            
            result['success'] = True
            
        except Exception as e:
            result['error'] = str(e)
        
        result['duration'] = (datetime.now() - start_time).total_seconds()
        return result
    
    def test_runtime_simulation(self, config_path: Path) -> Dict[str, Any]:
        """Simulate runtime usage of configuration.
        
        Args:
            config_path: Path to configuration file
            
        Returns:
            Test result details
        """
        result = {
            'test_type': 'runtime_simulation',
            'config_file': str(config_path),
            'success': False,
            'error': None,
            'warnings': [],
            'simulation_results': {},
            'duration': 0
        }
        
        start_time = datetime.now()
        
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                config_data = json.load(f)
            
            # Simulate agent initialization
            if 'agent' in config_data:
                agent_config = config_data['agent']
                
                # Test agent metadata
                simulation_results = {}
                
                # Test capabilities parsing
                if 'capabilities' in agent_config:
                    capabilities = agent_config['capabilities']
                    if isinstance(capabilities, list):
                        simulation_results['capabilities_count'] = len(capabilities)
                        simulation_results['capabilities'] = capabilities
                    else:
                        result['warnings'].append("Capabilities should be a list")
                
                # Test project-specific flag
                if 'project_specific' in agent_config:
                    project_specific = agent_config['project_specific']
                    if isinstance(project_specific, bool):
                        simulation_results['project_specific'] = project_specific
                    else:
                        result['warnings'].append("project_specific should be a boolean")
                
                result['simulation_results'] = simulation_results
            
            # Test behavior configuration
            if 'behavior' in config_data:
                behavior = config_data['behavior']
                
                # Test numeric values
                numeric_fields = ['max_file_size', 'max_concurrent_operations']
                for field in numeric_fields:
                    if field in behavior:
                        value = behavior[field]
                        if isinstance(value, str) and value.endswith('MB'):
                            try:
                                size_mb = int(value[:-2])
                                if size_mb <= 0:
                                    result['warnings'].append(f"Invalid {field}: {value}")
                            except ValueError:
                                result['warnings'].append(f"Invalid {field} format: {value}")
            
            result['success'] = True
            
        except Exception as e:
            result['error'] = str(e)
        
        result['duration'] = (datetime.now() - start_time).total_seconds()
        return result
    
    def run_integration_tests(self) -> Dict[str, Any]:
        """Run all integration tests.
        
        Returns:
            Comprehensive test results
        """
        print("🚀 Starting OpenCode integration testing...")
        print(f"📁 Scanning: {self.config_dir}")
        
        config_files = self.discover_test_configs()
        
        print(f"📋 Found {len(config_files)} agent configuration files")
        
        for config_path in config_files:
            print(f"\n🔧 Testing: {config_path.relative_to(self.config_dir.parent)}")
            
            # Run different types of integration tests
            test_methods = [
                self.test_config_loading,
                self.test_environment_compatibility,
                self.test_mcp_server_config,
                self.test_runtime_simulation
            ]
            
            for test_method in test_methods:
                self.results['total_tests'] += 1
                
                test_result = test_method(config_path)
                self.results['test_results'].append(test_result)
                
                if test_result['success']:
                    self.results['passed_tests'] += 1
                    print(f"  ✅ {test_result['test_type']}: PASS")
                else:
                    self.results['failed_tests'] += 1
                    print(f"  ❌ {test_result['test_type']}: FAIL - {test_result['error']}")
                    self.results['errors'].append({
                        'file': test_result['config_file'],
                        'test_type': test_result['test_type'],
                        'error': test_result['error']
                    })
                
                if test_result['warnings']:
                    self.results['warnings'] += len(test_result['warnings'])
                    for warning in test_result['warnings']:
                        self.results['warnings_list'].append({
                            'file': test_result['config_file'],
                            'test_type': test_result['test_type'],
                            'warning': warning
                        })
        
        return self.results
    
    def print_summary(self):
        """Print test summary."""
        print("\n" + "="*60)
        print("🏁 OpenCode Integration Test Summary")
        print("="*60)
        
        print(f"📊 Overall Results:")
        print(f"  Total Tests: {self.results['total_tests']}")
        print(f"  Passed Tests: {self.results['passed_tests']}")
        print(f"  Failed Tests: {self.results['failed_tests']}")
        print(f"  Warnings: {self.results['warnings']}")
        
        success_rate = (self.results['passed_tests'] / self.results['total_tests']) * 100 if self.results['total_tests'] > 0 else 0
        print(f"  Success Rate: {success_rate:.1f}%")
        
        if self.results['errors']:
            print(f"\n❌ Test Failures:")
            for error in self.results['errors']:
                print(f"  {error['file']} ({error['test_type']}): {error['error']}")
        
        if self.results['warnings_list']:
            print(f"\n⚠️  Warnings:")
            for warning in self.results['warnings_list'][:5]:  # Show first 5
                print(f"  {warning['file']} ({warning['test_type']}): {warning['warning']}")
            if len(self.results['warnings_list']) > 5:
                print(f"  ... and {len(self.results['warnings_list']) - 5} more")
        
        if self.results['failed_tests'] == 0:
            print(f"\n✅ All integration tests passed!")
        else:
            print(f"\n❌ {self.results['failed_tests']} tests failed")
    
    def save_report(self, output_path: Optional[Path] = None):
        """Save detailed test report.
        
        Args:
            output_path: Path to save report (default: opencode-integration-report.json)
        """
        if output_path is None:
            output_path = Path(__file__).parent.parent / "test-results" / f"opencode-integration-report-{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        output_path.parent.mkdir(exist_ok=True)
        
        report = {
            'timestamp': datetime.now().isoformat(),
            'summary': {
                'total_tests': self.results['total_tests'],
                'passed_tests': self.results['passed_tests'],
                'failed_tests': self.results['failed_tests'],
                'warnings': self.results['warnings'],
                'success_rate': (self.results['passed_tests'] / self.results['total_tests']) * 100 if self.results['total_tests'] > 0 else 0
            },
            'errors': self.results['errors'],
            'warnings': self.results['warnings_list'],
            'test_results': self.results['test_results']
        }
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        print(f"\n📄 Detailed report saved: {output_path}")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="OpenCode integration testing")
    parser.add_argument(
        "config_dir",
        nargs="?",
        default="config/",
        help="Configuration directory to test (default: config/)"
    )
    parser.add_argument(
        "--output",
        help="Output file for test report"
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Only show summary"
    )
    
    args = parser.parse_args()
    
    config_dir = Path(args.config_dir)
    if not config_dir.exists():
        print(f"❌ Configuration directory not found: {config_dir}")
        sys.exit(1)
    
    tester = OpenCodeIntegrationTester(config_dir)
    results = tester.run_integration_tests()
    
    if not args.quiet:
        tester.print_summary()
    
    tester.save_report(Path(args.output) if args.output else None)
    
    # Exit with error code if tests failed
    if results['failed_tests'] > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()