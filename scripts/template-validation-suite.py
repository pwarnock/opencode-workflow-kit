#!/usr/bin/env python3
"""
Template validation suite for opencode-config.
Tests environment templates with various customization scenarios.
"""

import sys
import os
import json
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


class TemplateValidationSuite:
    """Comprehensive template validation suite."""
    
    def __init__(self, config_dir: Optional[Path] = None):
        """Initialize template validation suite.
        
        Args:
            config_dir: Directory containing configuration files
        """
        self.config_dir = config_dir or Path(__file__).parent.parent / "config"
        self.validator = ConfigValidator()
        self.compatibility_tester = CompatibilityTester()
        self.templates_dir = Path(__file__).parent.parent / "config" / "project" / ".opencode"
        self.results = {
            'total_scenarios': 0,
            'passed_scenarios': 0,
            'failed_scenarios': 0,
            'warnings': 0,
            'errors': [],
            'warnings_list': [],
            'scenario_results': []
        }
        
    def discover_templates(self) -> List[str]:
        """Discover available environment templates.
        
        Returns:
            List of template names
        """
        templates = []
        
        # Check for template configurations
        if self.templates_dir.exists():
            for template_file in self.templates_dir.glob("*.json"):
                templates.append(template_file.stem)
        
        # Also check for common template names
        common_templates = ['minimal', 'web-development', 'python-development', 'full-stack']
        for template in common_templates:
            if template not in templates:
                templates.append(template)
        
        return sorted(templates)
    
    def test_template_application(self, template_name: str, target_dir: Path) -> Dict[str, Any]:
        """Test template application to a target directory.
        
        Args:
            template_name: Name of the template to test
            target_dir: Target directory for template application
            
        Returns:
            Test result details
        """
        result = {
            'scenario': f'template_application_{template_name}',
            'template_name': template_name,
            'success': False,
            'error': None,
            'warnings': [],
            'files_created': [],
            'validation_results': {},
            'duration': 0
        }
        
        start_time = datetime.now()
        
        try:
            # Create target directory
            target_dir.mkdir(parents=True, exist_ok=True)
            
            # Apply template using environment-templates.py
            import subprocess
            cmd = [
                sys.executable, 
                str(Path(__file__).parent / "environment-templates.py"),
                'apply', template_name, str(target_dir)
            ]
            
            process_result = subprocess.run(
                cmd, 
                capture_output=True, 
                text=True, 
                timeout=30,
                cwd=Path(__file__).parent.parent
            )
            
            if process_result.returncode != 0:
                result['error'] = f"Template application failed: {process_result.stderr}"
                result['duration'] = (datetime.now() - start_time).total_seconds()
                return result
            
            # Check created files
            if target_dir.exists():
                for file_path in target_dir.rglob("*"):
                    if file_path.is_file():
                        result['files_created'].append(str(file_path.relative_to(target_dir)))
            
            # Validate created configuration files
            for created_file in result['files_created']:
                file_path = target_dir / created_file
                if file_path.suffix == '.json':
                    validation_result = self.validator.validate_file(file_path)
                    result['validation_results'][created_file] = validation_result
                    
                    if not validation_result['valid']:
                        result['warnings'].append(f"Validation failed for {created_file}: {'; '.join(validation_result['errors'])}")
            
            result['success'] = True
            
        except subprocess.TimeoutExpired:
            result['error'] = "Template application timed out"
        except Exception as e:
            result['error'] = str(e)
        
        result['duration'] = (datetime.now() - start_time).total_seconds()
        return result
    
    def test_template_customization(self, template_name: str) -> Dict[str, Any]:
        """Test template customization scenarios.
        
        Args:
            template_name: Name of the template to test
            
        Returns:
            Test result details
        """
        result = {
            'scenario': f'template_customization_{template_name}',
            'template_name': template_name,
            'success': False,
            'error': None,
            'warnings': [],
            'customization_tests': [],
            'duration': 0
        }
        
        start_time = datetime.now()
        
        try:
            with tempfile.TemporaryDirectory() as temp_dir:
                base_dir = Path(temp_dir)
                
                # Test 1: Basic application
                basic_dir = base_dir / "basic"
                basic_result = self.test_template_application(template_name, basic_dir)
                result['customization_tests'].append({
                    'test': 'basic_application',
                    'result': basic_result
                })
                
                if not basic_result['success']:
                    result['error'] = f"Basic template application failed: {basic_result['error']}"
                    result['duration'] = (datetime.now() - start_time).total_seconds()
                    return result
                
                # Test 2: Custom configuration override
                custom_dir = base_dir / "custom"
                custom_result = self.test_template_application(template_name, custom_dir)
                
                if custom_result['success']:
                    # Apply customizations
                    for config_file in custom_dir.rglob("*.json"):
                        try:
                            with open(config_file, 'r+') as f:
                                config_data = json.load(f)
                                
                                # Add custom environment variable
                                if 'environment' not in config_data:
                                    config_data['environment'] = {}
                                if 'variables' not in config_data['environment']:
                                    config_data['environment']['variables'] = {}
                                
                                config_data['environment']['variables']['CUSTOM_TEST_VAR'] = 'test_value'
                                
                                # Write back
                                f.seek(0)
                                json.dump(config_data, f, indent=2)
                                f.truncate()
                        
                        except Exception as e:
                            result['warnings'].append(f"Failed to customize {config_file}: {e}")
                    
                    # Re-validate customized files
                    for config_file in custom_dir.rglob("*.json"):
                        validation_result = self.validator.validate_file(config_file)
                        if not validation_result['valid']:
                            result['warnings'].append(f"Customized file validation failed: {config_file}")
                
                result['customization_tests'].append({
                    'test': 'custom_override',
                    'result': custom_result
                })
                
                # Test 3: Platform-specific customization
                platform_dir = base_dir / "platform"
                platform_result = self.test_template_application(template_name, platform_dir)
                
                if platform_result['success']:
                    # Add platform-specific overrides
                    for config_file in platform_dir.rglob("*.json"):
                        try:
                            with open(config_file, 'r+') as f:
                                config_data = json.load(f)
                                
                                # Add platform overrides
                                if 'platform_overrides' not in config_data:
                                    config_data['platform_overrides'] = {}
                                
                                config_data['platform_overrides']['darwin'] = {
                                    'environment': {
                                        'variables': {
                                            'MACOS_SPECIFIC_VAR': 'macos_value'
                                        }
                                    }
                                }
                                
                                config_data['platform_overrides']['linux'] = {
                                    'environment': {
                                        'variables': {
                                            'LINUX_SPECIFIC_VAR': 'linux_value'
                                        }
                                    }
                                }
                                
                                # Write back
                                f.seek(0)
                                json.dump(config_data, f, indent=2)
                                f.truncate()
                        
                        except Exception as e:
                            result['warnings'].append(f"Failed to add platform overrides to {config_file}: {e}")
                    
                    # Re-validate platform-customized files
                    for config_file in platform_dir.rglob("*.json"):
                        validation_result = self.validator.validate_file(config_file)
                        if not validation_result['valid']:
                            result['warnings'].append(f"Platform-customized file validation failed: {config_file}")
                
                result['customization_tests'].append({
                    'test': 'platform_specific',
                    'result': platform_result
                })
            
            result['success'] = True
            
        except Exception as e:
            result['error'] = str(e)
        
        result['duration'] = (datetime.now() - start_time).total_seconds()
        return result
    
    def test_template_inheritance(self, template_name: str) -> Dict[str, Any]:
        """Test template inheritance scenarios.
        
        Args:
            template_name: Name of the template to test
            
        Returns:
            Test result details
        """
        result = {
            'scenario': f'template_inheritance_{template_name}',
            'template_name': template_name,
            'success': False,
            'error': None,
            'warnings': [],
            'inheritance_tests': [],
            'duration': 0
        }
        
        start_time = datetime.now()
        
        try:
            with tempfile.TemporaryDirectory() as temp_dir:
                base_dir = Path(temp_dir)
                
                # Test 1: Base template application
                base_dir = base_dir / "base"
                base_result = self.test_template_application(template_name, base_dir)
                result['inheritance_tests'].append({
                    'test': 'base_template',
                    'result': base_result
                })
                
                if not base_result['success']:
                    result['error'] = f"Base template application failed: {base_result['error']}"
                    result['duration'] = (datetime.now() - start_time).total_seconds()
                    return result
                
                # Test 2: Create child configuration that inherits from base
                child_dir = base_dir / "child"
                child_dir.mkdir(parents=True, exist_ok=True)
                
                # Copy base configuration and add inheritance
                for config_file in base_dir.rglob("*.json"):
                    relative_path = config_file.relative_to(base_dir)
                    child_file = child_dir / relative_path
                    child_file.parent.mkdir(parents=True, exist_ok=True)
                    
                    try:
                        with open(config_file, 'r') as src, open(child_file, 'w') as dst:
                            config_data = json.load(src)
                            
                            # Add inheritance reference
                            config_data['inherits'] = str(relative_path)
                            
                            # Add child-specific customization
                            if 'environment' not in config_data:
                                config_data['environment'] = {}
                            if 'variables' not in config_data['environment']:
                                config_data['environment']['variables'] = {}
                            
                            config_data['environment']['variables']['CHILD_SPECIFIC_VAR'] = 'child_value'
                            
                            json.dump(config_data, dst, indent=2)
                    
                    except Exception as e:
                        result['warnings'].append(f"Failed to create child config {relative_path}: {e}")
                
                # Validate child configurations
                for config_file in child_dir.rglob("*.json"):
                    validation_result = self.validator.validate_file(config_file)
                    result['inheritance_tests'].append({
                        'test': f'child_validation_{config_file.name}',
                        'result': validation_result
                    })
                    
                    if not validation_result['valid']:
                        result['warnings'].append(f"Child config validation failed: {config_file}")
            
            result['success'] = True
            
        except Exception as e:
            result['error'] = str(e)
        
        result['duration'] = (datetime.now() - start_time).total_seconds()
        return result
    
    def test_template_compatibility(self, template_name: str) -> Dict[str, Any]:
        """Test template compatibility across different scenarios.
        
        Args:
            template_name: Name of the template to test
            
        Returns:
            Test result details
        """
        result = {
            'scenario': f'template_compatibility_{template_name}',
            'template_name': template_name,
            'success': False,
            'error': None,
            'warnings': [],
            'compatibility_tests': [],
            'duration': 0
        }
        
        start_time = datetime.now()
        
        try:
            with tempfile.TemporaryDirectory() as temp_dir:
                base_dir = Path(temp_dir)
                
                # Apply template
                template_dir = base_dir / "template"
                template_result = self.test_template_application(template_name, template_dir)
                
                if not template_result['success']:
                    result['error'] = f"Template application failed: {template_result['error']}"
                    result['duration'] = (datetime.now() - start_time).total_seconds()
                    return result
                
                # Test compatibility with different environments
                environments = ['development', 'production', 'testing']
                
                for env in environments:
                    env_dir = base_dir / f"env_{env}"
                    env_dir.mkdir(parents=True, exist_ok=True)
                    
                    # Copy template files
                    for config_file in template_dir.rglob("*.json"):
                        relative_path = config_file.relative_to(template_dir)
                        env_file = env_dir / relative_path
                        env_file.parent.mkdir(parents=True, exist_ok=True)
                        shutil.copy2(config_file, env_file)
                    
                    # Add environment-specific customizations
                    for config_file in env_dir.rglob("*.json"):
                        try:
                            with open(config_file, 'r+') as f:
                                config_data = json.load(f)
                                
                                # Add environment variable
                                if 'environment' not in config_data:
                                    config_data['environment'] = {}
                                if 'variables' not in config_data['environment']:
                                    config_data['environment']['variables'] = {}
                                
                                config_data['environment']['variables']['ENVIRONMENT'] = env
                                config_data['environment']['variables']['ENV_SPECIFIC_VAR'] = f'{env}_value'
                                
                                # Write back
                                f.seek(0)
                                json.dump(config_data, f, indent=2)
                                f.truncate()
                        
                        except Exception as e:
                            result['warnings'].append(f"Failed to customize {config_file} for {env}: {e}")
                    
                    # Validate environment-specific configurations
                    env_validation = {
                        'environment': env,
                        'valid': True,
                        'errors': [],
                        'files_validated': 0
                    }
                    
                    for config_file in env_dir.rglob("*.json"):
                        validation_result = self.validator.validate_file(config_file)
                        env_validation['files_validated'] += 1
                        
                        if not validation_result['valid']:
                            env_validation['valid'] = False
                            env_validation['errors'].extend(validation_result['errors'])
                    
                    result['compatibility_tests'].append(env_validation)
            
            result['success'] = True
            
        except Exception as e:
            result['error'] = str(e)
        
        result['duration'] = (datetime.now() - start_time).total_seconds()
        return result
    
    def run_template_validation(self) -> Dict[str, Any]:
        """Run comprehensive template validation suite.
        
        Returns:
            Comprehensive validation results
        """
        print("🧪 Starting template validation suite...")
        
        templates = self.discover_templates()
        print(f"📋 Found {len(templates)} templates: {', '.join(templates)}")
        
        if not templates:
            print("⚠️  No templates found to test")
            return self.results
        
        for template_name in templates:
            print(f"\n🔧 Testing template: {template_name}")
            
            # Run different validation scenarios
            test_methods = [
                self.test_template_application,
                self.test_template_customization,
                self.test_template_inheritance,
                self.test_template_compatibility
            ]
            
            for test_method in test_methods:
                self.results['total_scenarios'] += 1
                
                if test_method == self.test_template_application:
                    # For application test, we need a target directory
                    with tempfile.TemporaryDirectory() as temp_dir:
                        test_result = test_method(template_name, Path(temp_dir) / "test")
                else:
                    test_result = test_method(template_name)
                
                self.results['scenario_results'].append(test_result)
                
                if test_result['success']:
                    self.results['passed_scenarios'] += 1
                    print(f"  ✅ {test_result['scenario']}: PASS")
                else:
                    self.results['failed_scenarios'] += 1
                    print(f"  ❌ {test_result['scenario']}: FAIL - {test_result['error']}")
                    self.results['errors'].append({
                        'template': template_name,
                        'scenario': test_result['scenario'],
                        'error': test_result['error']
                    })
                
                if test_result['warnings']:
                    self.results['warnings'] += len(test_result['warnings'])
                    for warning in test_result['warnings']:
                        self.results['warnings_list'].append({
                            'template': template_name,
                            'scenario': test_result['scenario'],
                            'warning': warning
                        })
        
        return self.results
    
    def print_summary(self):
        """Print validation summary."""
        print("\n" + "="*60)
        print("🏁 Template Validation Suite Summary")
        print("="*60)
        
        print(f"📊 Overall Results:")
        print(f"  Total Scenarios: {self.results['total_scenarios']}")
        print(f"  Passed Scenarios: {self.results['passed_scenarios']}")
        print(f"  Failed Scenarios: {self.results['failed_scenarios']}")
        print(f"  Warnings: {self.results['warnings']}")
        
        success_rate = (self.results['passed_scenarios'] / self.results['total_scenarios']) * 100 if self.results['total_scenarios'] > 0 else 0
        print(f"  Success Rate: {success_rate:.1f}%")
        
        if self.results['errors']:
            print(f"\n❌ Failed Scenarios:")
            for error in self.results['errors']:
                print(f"  {error['template']} ({error['scenario']}): {error['error']}")
        
        if self.results['warnings_list']:
            print(f"\n⚠️  Warnings:")
            for warning in self.results['warnings_list'][:5]:  # Show first 5
                print(f"  {warning['template']} ({warning['scenario']}): {warning['warning']}")
            if len(self.results['warnings_list']) > 5:
                print(f"  ... and {len(self.results['warnings_list']) - 5} more")
        
        if self.results['failed_scenarios'] == 0:
            print(f"\n✅ All template validation scenarios passed!")
        else:
            print(f"\n❌ {self.results['failed_scenarios']} scenarios failed")
    
    def save_report(self, output_path: Optional[Path] = None):
        """Save detailed validation report.
        
        Args:
            output_path: Path to save report (default: template-validation-report.json)
        """
        if output_path is None:
            output_path = Path(__file__).parent.parent / "test-results" / f"template-validation-report-{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        output_path.parent.mkdir(exist_ok=True)
        
        report = {
            'timestamp': datetime.now().isoformat(),
            'summary': {
                'total_scenarios': self.results['total_scenarios'],
                'passed_scenarios': self.results['passed_scenarios'],
                'failed_scenarios': self.results['failed_scenarios'],
                'warnings': self.results['warnings'],
                'success_rate': (self.results['passed_scenarios'] / self.results['total_scenarios']) * 100 if self.results['total_scenarios'] > 0 else 0
            },
            'errors': self.results['errors'],
            'warnings': self.results['warnings_list'],
            'scenario_results': self.results['scenario_results']
        }
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        print(f"\n📄 Detailed report saved: {output_path}")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Template validation suite")
    parser.add_argument(
        "--template",
        help="Specific template to test (default: all templates)"
    )
    parser.add_argument(
        "--output",
        help="Output file for validation report"
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Only show summary"
    )
    
    args = parser.parse_args()
    
    suite = TemplateValidationSuite()
    
    if args.template:
        # Test specific template
        print(f"🔍 Testing specific template: {args.template}")
        with tempfile.TemporaryDirectory() as temp_dir:
            result = suite.test_template_application(args.template, Path(temp_dir) / "test")
            print(f"Result: {'PASS' if result['success'] else 'FAIL'}")
            if result['error']:
                print(f"Error: {result['error']}")
            if result['warnings']:
                print("Warnings:")
                for warning in result['warnings']:
                    print(f"  {warning}")
    else:
        # Run full validation suite
        results = suite.run_template_validation()
        
        if not args.quiet:
            suite.print_summary()
        
        suite.save_report(Path(args.output) if args.output else None)
        
        # Exit with error code if scenarios failed
        if results['failed_scenarios'] > 0:
            sys.exit(1)


if __name__ == "__main__":
    main()