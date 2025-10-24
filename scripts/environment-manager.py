#!/usr/bin/env python3
"""
Environment management system for opencode-config
Handles Context7 API keys and configuration validation
"""

import os
import json
import sys
from pathlib import Path
from typing import Dict, List, Optional, Any


class EnvironmentManager:
    """Manages environment variables and validation for opencode-config"""
    
    def __init__(self, config_path: Optional[Path] = None):
        self.config_path = config_path or Path(__file__).parent.parent
        self.env_file = self.config_path / ".env"
        self.env_example = self.config_path / ".env.example"
        
    def validate_environment(self) -> Dict[str, Any]:
        """Validate current environment configuration"""
        results = {
            "valid": True,
            "errors": [],
            "warnings": [],
            "configured": []
        }
        
        # Check for Context7 API key
        context7_key = os.getenv("CONTEXT7_API_KEY")
        if context7_key:
            results["configured"].append("CONTEXT7_API_KEY")
            if len(context7_key) < 10:
                results["errors"].append("CONTEXT7_API_KEY appears to be too short")
                results["valid"] = False
        else:
            results["warnings"].append("CONTEXT7_API_KEY not set - Context7 features will be limited")
        
        # Check for other required environment variables
        required_vars = [
            "OPENCODE_CONTEXT",
            "CODY_MODE"
        ]
        
        for var in required_vars:
            if os.getenv(var):
                results["configured"].append(var)
            else:
                results["warnings"].append(f"{var} not set")
        
        return results
    
    def create_env_template(self) -> None:
        """Create .env.example template file"""
        template = """# Context7 API Configuration
CONTEXT7_API_KEY=your_context7_api_key_here

# OpenCode Configuration
OPENCODE_CONTEXT=development
CODY_MODE=default

# Optional: Custom Context7 server configuration
# CONTEXT7_SERVER_URL=https://api.context7.ai
# CONTEXT7_TIMEOUT=30
"""
        
        if not self.env_example.exists():
            self.env_example.write_text(template)
            print(f"Created environment template: {self.env_example}")
    
    def load_env_file(self) -> bool:
        """Load environment variables from .env file"""
        if not self.env_file.exists():
            return False
        
        try:
            with open(self.env_file, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        os.environ[key] = value
            return True
        except Exception as e:
            print(f"Error loading .env file: {e}")
            return False
    
    def setup_environment(self, api_key: Optional[str] = None) -> Dict[str, Any]:
        """Setup environment configuration"""
        results = {
            "success": False,
            "actions": [],
            "errors": []
        }
        
        try:
            # Create .env.example if it doesn't exist
            self.create_env_template()
            
            # If API key provided, update .env file
            if api_key:
                env_content = ""
                if self.env_file.exists():
                    env_content = self.env_file.read_text()
                
                # Update or add CONTEXT7_API_KEY
                lines = env_content.split('\n')
                key_updated = False
                
                for i, line in enumerate(lines):
                    if line.startswith('CONTEXT7_API_KEY='):
                        lines[i] = f'CONTEXT7_API_KEY={api_key}'
                        key_updated = True
                        break
                
                if not key_updated:
                    lines.append(f'CONTEXT7_API_KEY={api_key}')
                
                self.env_file.write_text('\n'.join(lines))
                results["actions"].append("Updated CONTEXT7_API_KEY in .env file")
            
            # Load environment variables
            if self.load_env_file():
                results["actions"].append("Loaded environment variables from .env file")
            
            # Validate configuration
            validation = self.validate_environment()
            results.update(validation)
            results["success"] = validation["valid"]
            
        except Exception as e:
            results["errors"].append(f"Setup failed: {e}")
        
        return results
    
    def get_environment_status(self) -> Dict[str, Any]:
        """Get current environment status"""
        status = {
            "env_file_exists": self.env_file.exists(),
            "env_example_exists": self.env_example.exists(),
            "environment_variables": {}
        }
        
        # List relevant environment variables
        relevant_vars = [
            "CONTEXT7_API_KEY",
            "OPENCODE_CONTEXT", 
            "CODY_MODE",
            "CONTEXT7_SERVER_URL",
            "CONTEXT7_TIMEOUT"
        ]
        
        for var in relevant_vars:
            value = os.getenv(var)
            if value:
                # Mask sensitive values
                if "API_KEY" in var:
                    status["environment_variables"][var] = f"{value[:8]}...{value[-4:]}" if len(value) > 12 else "***"
                else:
                    status["environment_variables"][var] = value
        
        return status


def main():
    """CLI interface for environment management"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Manage opencode-config environment")
    parser.add_argument("action", choices=["validate", "setup", "status", "create-template"],
                       help="Action to perform")
    parser.add_argument("--api-key", help="Context7 API key for setup")
    parser.add_argument("--config-path", help="Path to config directory")
    
    args = parser.parse_args()
    
    manager = EnvironmentManager(
        Path(args.config_path) if args.config_path else None
    )
    
    if args.action == "validate":
        results = manager.validate_environment()
        print(json.dumps(results, indent=2))
        sys.exit(0 if results["valid"] else 1)
    
    elif args.action == "setup":
        results = manager.setup_environment(args.api_key)
        print(json.dumps(results, indent=2))
        sys.exit(0 if results["success"] else 1)
    
    elif args.action == "status":
        status = manager.get_environment_status()
        print(json.dumps(status, indent=2))
    
    elif args.action == "create-template":
        manager.create_env_template()
        print("Environment template created")


if __name__ == "__main__":
    main()