"""Configuration validator for opencode-config."""

import json
import sys
from pathlib import Path
from typing import Dict, List, Any, Optional

try:
    from jsonschema import validate, ValidationError
except ImportError:
    print("Warning: jsonschema not installed. Install with: uv pip install jsonschema")
    validate = None
    ValidationError = ValueError


class ConfigValidator:
    """Validates configuration files against JSON schemas."""
    
    def __init__(self, schemas_dir: Optional[Path] = None):
        """Initialize validator.
        
        Args:
            schemas_dir: Directory containing schema files
        """
        self.schemas_dir = schemas_dir or Path(__file__).parent.parent / "schemas"
        self.schemas = self._load_schemas()
    
    def _load_schemas(self) -> Dict[str, Dict[str, Any]]:
        """Load all schema files."""
        schemas = {}
        if not self.schemas_dir.exists():
            return schemas
        
        for schema_file in self.schemas_dir.glob("*.json"):
            try:
                with open(schema_file, 'r') as f:
                    schemas[schema_file.stem] = json.load(f)
            except Exception as e:
                print(f"Warning: Failed to load schema {schema_file}: {e}")
        
        return schemas
    
    def _resolve_inheritance(self, config: Dict[str, Any], config_path: Path) -> Dict[str, Any]:
        """Resolve configuration inheritance.
        
        Args:
            config: Configuration dictionary
            config_path: Path to the configuration file
            
        Returns:
            Merged configuration with inheritance resolved
        """
        if "inherits" not in config:
            return config
        
        parent_path = config_path.parent / config["inherits"]
        if not parent_path.exists():
            return config  # Return original if parent doesn't exist
        
        try:
            with open(parent_path, 'r') as f:
                parent_config = json.load(f)
        except Exception:
            return config  # Return original if parent can't be loaded
        
        # Recursively resolve parent inheritance
        resolved_parent = self._resolve_inheritance(parent_config, parent_path)
        
        # Merge configurations (child overrides parent)
        merged = resolved_parent.copy()
        merged.update(config)
        # Remove inherits as it's been resolved
        merged.pop("inherits", None)
        
        return merged
    
    def validate_file(self, file_path: Path) -> Dict[str, Any]:
        """Validate a single configuration file.
        
        Args:
            file_path: Path to configuration file
            
        Returns:
            Validation result with valid, errors, warnings fields
        """
        result = {
            "valid": True,
            "errors": [],
            "warnings": []
        }
        
        if not file_path.exists():
            result["valid"] = False
            result["errors"].append(f"File not found: {file_path}")
            return result
        
        try:
            with open(file_path, 'r') as f:
                config = json.load(f)
        except json.JSONDecodeError as e:
            result["valid"] = False
            result["errors"].append(f"Invalid JSON: {e}")
            return result
        except Exception as e:
            result["valid"] = False
            result["errors"].append(f"Failed to read file: {e}")
            return result
        
        # Check for $schema reference
        schema_ref = config.get("$schema")
        if not schema_ref:
            result["warnings"].append("No $schema reference found")
            return result
        
        # Find matching schema
        schema_name = Path(schema_ref).stem
        if schema_name not in self.schemas:
            result["warnings"].append(f"Schema not found: {schema_ref}")
            return result
        
        # Resolve inheritance before validation
        resolved_config = self._resolve_inheritance(config, file_path)
        
        # Validate against schema
        if validate is None:
            result["warnings"].append("jsonschema not available for validation")
            return result
        
        try:
            schema = self.schemas[schema_name]
            validate(instance=resolved_config, schema=schema)
        except ValidationError as e:
            result["valid"] = False
            result["errors"].append(f"Schema validation failed: {e.message}")
        except Exception as e:
            result["valid"] = False
            result["errors"].append(f"Validation error: {e}")
        
        return result
    
    def validate_path(self, path: Path) -> Dict[str, Any]:
        """Validate all JSON files in a path.
        
        Args:
            path: Path to file or directory
            
        Returns:
            Combined validation result
        """
        result = {
            "valid": True,
            "errors": [],
            "warnings": [],
            "files_validated": 0
        }
        
        if path.is_file():
            if path.suffix == ".json":
                file_result = self.validate_file(path)
                result["errors"].extend(file_result["errors"])
                result["warnings"].extend(file_result["warnings"])
                result["files_validated"] = 1
                if not file_result["valid"]:
                    result["valid"] = False
            else:
                result["warnings"].append(f"Skipping non-JSON file: {path}")
        
        elif path.is_dir():
            for json_file in path.rglob("*.json"):
                file_result = self.validate_file(json_file)
                result["errors"].extend(file_result["errors"])
                result["warnings"].extend(file_result["warnings"])
                result["files_validated"] += 1
                if not file_result["valid"]:
                    result["valid"] = False
        
        else:
            result["valid"] = False
            result["errors"].append(f"Path not found: {path}")
        
        return result