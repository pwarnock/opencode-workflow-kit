#!/usr/bin/env python3
"""
Comprehensive schema validation testing for opencode-config.
Tests all configurations against their respective JSON schemas with detailed reporting.
"""

import sys
import os
import json
import argparse
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime

# Add parent directory to path to import opencode_config
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from opencode_config.validator import ConfigValidator
except ImportError as e:
    print(f"Import error: {e}")
    print("Please install the package with: uv pip install -e .")
    sys.exit(1)


class SchemaValidationTester:
    """Comprehensive schema validation tester."""
    
    def __init__(self, config_dir: Optional[Path] = None):
        """Initialize schema validation tester.
        
        Args:
            config_dir: Directory containing configuration files
        """
        self.config_dir = config_dir or Path(__file__).parent.parent / "config"
        self.validator = ConfigValidator()
        self.results = {
            'total_files': 0,
            'valid_files': 0,
            'invalid_files': 0,
            'warnings': 0,
            'errors': [],
            'warnings_list': [],
            'schema_coverage': {},
            'detailed_results': []
        }
        
    def discover_configs(self) -> List[Path]:
        """Discover all configuration files.
        
        Returns:
            List of configuration file paths
        """
        config_files = []
        
        # Find all JSON files in config directory
        for json_file in self.config_dir.rglob("*.json"):
            # Skip schema files themselves
            if "schemas" in str(json_file):
                continue
            config_files.append(json_file)
            
        return sorted(config_files)
    
    def validate_file(self, config_path: Path) -> Dict[str, Any]:
        """Validate a single configuration file.
        
        Args:
            config_path: Path to configuration file
            
        Returns:
            Validation result details
        """
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                config_data = json.load(f)
        except Exception as e:
            return {
                'file': str(config_path),
                'valid': False,
                'error': f"Failed to load JSON: {e}",
                'warnings': [],
                'schema_used': None,
                'validation_time': 0
            }
        
        start_time = datetime.now()
        
        # Determine schema type based on file location and content
        schema_type = self._determine_schema_type(config_path, config_data)
        
        # Validate using the appropriate validator
        try:
            result = self.validator.validate_file(config_path)
            validation_time = (datetime.now() - start_time).total_seconds()
            
            return {
                'file': str(config_path),
                'valid': result['valid'],
                'error': None if result['valid'] else '; '.join(result['errors']),
                'warnings': result.get('warnings', []),
                'schema_used': schema_type,
                'validation_time': validation_time,
                'details': result
            }
            
        except Exception as e:
            validation_time = (datetime.now() - start_time).total_seconds()
            return {
                'file': str(config_path),
                'valid': False,
                'error': f"Validation failed: {e}",
                'warnings': [],
                'schema_used': schema_type,
                'validation_time': validation_time
            }
    
    def _determine_schema_type(self, config_path: Path, config_data: Dict[str, Any]) -> str:
        """Determine the schema type for a configuration file.
        
        Args:
            config_path: Path to configuration file
            config_data: Loaded configuration data
            
        Returns:
            Schema type identifier
        """
        # Check file path hints
        if 'agents' in str(config_path):
            return 'agent-config'
        elif 'permissions' in str(config_path):
            return 'permissions'
        elif 'mcp' in str(config_path):
            return 'mcp-servers'
        elif 'project' in str(config_path):
            return 'project-config'
        
        # Check content hints
        if 'agent' in config_data:
            return 'agent-config'
        elif 'permissions' in config_data:
            return 'permissions'
        elif 'servers' in config_data:
            return 'mcp-servers'
        elif 'project' in config_data:
            return 'project-config'
        
        return 'unknown'
    
    def run_all_validations(self) -> Dict[str, Any]:
        """Run schema validation on all configuration files.
        
        Returns:
            Comprehensive validation results
        """
        print("🔍 Starting comprehensive schema validation...")
        print(f"📁 Scanning: {self.config_dir}")
        
        config_files = self.discover_configs()
        self.results['total_files'] = len(config_files)
        
        print(f"📋 Found {len(config_files)} configuration files")
        
        for config_path in config_files:
            print(f"  🔧 Validating: {config_path.relative_to(self.config_dir.parent)}")
            
            result = self.validate_file(config_path)
            self.results['detailed_results'].append(result)
            
            # Update counters
            if result['valid']:
                self.results['valid_files'] += 1
            else:
                self.results['invalid_files'] += 1
                self.results['errors'].append({
                    'file': result['file'],
                    'error': result['error']
                })
            
            # Track warnings
            if result['warnings']:
                self.results['warnings'] += len(result['warnings'])
                for warning in result['warnings']:
                    self.results['warnings_list'].append({
                        'file': result['file'],
                        'warning': warning
                    })
            
            # Track schema coverage
            schema_type = result['schema_used']
            if schema_type not in self.results['schema_coverage']:
                self.results['schema_coverage'][schema_type] = 0
            self.results['schema_coverage'][schema_type] += 1
        
        return self.results
    
    def print_summary(self):
        """Print validation summary."""
        print("\n" + "="*60)
        print("🏁 Schema Validation Summary")
        print("="*60)
        
        print(f"📊 Overall Results:")
        print(f"  Total Files: {self.results['total_files']}")
        print(f"  Valid Files: {self.results['valid_files']}")
        print(f"  Invalid Files: {self.results['invalid_files']}")
        print(f"  Warnings: {self.results['warnings']}")
        
        success_rate = (self.results['valid_files'] / self.results['total_files']) * 100 if self.results['total_files'] > 0 else 0
        print(f"  Success Rate: {success_rate:.1f}%")
        
        print(f"\n📋 Schema Coverage:")
        for schema_type, count in self.results['schema_coverage'].items():
            print(f"  {schema_type}: {count} files")
        
        if self.results['errors']:
            print(f"\n❌ Validation Errors:")
            for error in self.results['errors']:
                print(f"  {error['file']}: {error['error']}")
        
        if self.results['warnings_list']:
            print(f"\n⚠️  Warnings:")
            for warning in self.results['warnings_list'][:5]:  # Show first 5
                print(f"  {warning['file']}: {warning['warning']}")
            if len(self.results['warnings_list']) > 5:
                print(f"  ... and {len(self.results['warnings_list']) - 5} more")
        
        if self.results['invalid_files'] == 0:
            print(f"\n✅ All schema validations passed!")
        else:
            print(f"\n❌ {self.results['invalid_files']} files failed validation")
    
    def save_report(self, output_path: Optional[Path] = None):
        """Save detailed validation report.
        
        Args:
            output_path: Path to save report (default: schema-validation-report.json)
        """
        if output_path is None:
            output_path = Path(__file__).parent.parent / "test-results" / f"schema-validation-report-{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        output_path.parent.mkdir(exist_ok=True)
        
        report = {
            'timestamp': datetime.now().isoformat(),
            'summary': {
                'total_files': self.results['total_files'],
                'valid_files': self.results['valid_files'],
                'invalid_files': self.results['invalid_files'],
                'warnings': self.results['warnings'],
                'success_rate': (self.results['valid_files'] / self.results['total_files']) * 100 if self.results['total_files'] > 0 else 0
            },
            'schema_coverage': self.results['schema_coverage'],
            'errors': self.results['errors'],
            'warnings': self.results['warnings_list'],
            'detailed_results': self.results['detailed_results']
        }
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        print(f"\n📄 Detailed report saved: {output_path}")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Comprehensive schema validation testing")
    parser.add_argument(
        "config_dir",
        nargs="?",
        default="config/",
        help="Configuration directory to validate (default: config/)"
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
    
    config_dir = Path(args.config_dir)
    if not config_dir.exists():
        print(f"❌ Configuration directory not found: {config_dir}")
        sys.exit(1)
    
    tester = SchemaValidationTester(config_dir)
    results = tester.run_all_validations()
    
    if not args.quiet:
        tester.print_summary()
    
    tester.save_report(Path(args.output) if args.output else None)
    
    # Exit with error code if validation failed
    if results['invalid_files'] > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()