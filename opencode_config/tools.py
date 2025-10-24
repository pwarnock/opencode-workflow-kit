"""Custom tools for opencode integration."""

import json
import subprocess
import sys
from pathlib import Path
from typing import Dict, Any, Optional


def cody_version_add(version_number: str, version_name: str, features: str) -> Dict[str, Any]:
    """Add a new version using :cody.
    
    Args:
        version_number: Version number (e.g., "1.0.0")
        version_name: Version name (e.g., "initial-release")
        features: Description of features for this version
    
    Returns:
        Dict with success status and message
    """
    try:
        # Create version folder structure
        version_folder = Path(f"versions/{version_number}-{version_name}")
        version_folder.mkdir(parents=True, exist_ok=True)
        
        # Create version metadata
        version_data = {
            "version": f"{version_number}-{version_name}",
            "number": version_number,
            "name": version_name,
            "features": features,
            "created_at": "2025-10-24T10:00:00-07:00",
            "status": "planned"
        }
        
        version_file = version_folder / "version.json"
        with open(version_file, 'w') as f:
            json.dump(version_data, f, indent=2)
        
        # Execute :cody version add command
        cody_cmd = [":cody", "version", "add"]
        result = subprocess.run(cody_cmd, capture_output=True, text=True, input=f"{version_number}\n{version_name}\n{features}")
        
        if result.returncode == 0:
            return {
                "success": True,
                "message": f"Version {version_number}-{version_name} created successfully",
                "folder": str(version_folder),
                "cody_output": result.stdout
            }
        else:
            return {
                "success": False,
                "message": "Failed to execute :cody command",
                "error": result.stderr
            }
            
    except Exception as e:
        return {
            "success": False,
            "message": f"Error creating version: {str(e)}"
        }


def cody_version_build(version: str) -> Dict[str, Any]:
    """Build a version using :cody.
    
    Args:
        version: Version identifier (e.g., "1.0.0-initial-release")
    
    Returns:
        Dict with success status and message
    """
    try:
        cody_cmd = [":cody", "version", "build", version]
        result = subprocess.run(cody_cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            return {
                "success": True,
                "message": f"Version {version} build started",
                "cody_output": result.stdout
            }
        else:
            return {
                "success": False,
                "message": "Failed to build version",
                "error": result.stderr
            }
            
    except Exception as e:
        return {
            "success": False,
            "message": f"Error building version: {str(e)}"
        }


def create_subagent(name: str, agent_type: str, tools: list, description: str = "") -> Dict[str, Any]:
    """Create a new subagent configuration.
    
    Args:
        name: Agent name
        agent_type: Type of agent (development, planning, etc.)
        tools: List of tools the agent can use
        description: Optional description
    
    Returns:
        Dict with success status and message
    """
    try:
        agent_config = {
            "description": description or f"{name} - {agent_type} agent",
            "mode": "subagent",
            "tools": {tool: True for tool in tools}
        }
        
        # Create agent file
        agent_file = Path(f".config/opencode/agents/{name}.md")
        agent_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Write agent configuration in markdown format
        with open(agent_file, 'w') as f:
            f.write(f"---\n")
            f.write(f"description: {agent_config['description']}\n")
            f.write(f"mode: {agent_config['mode']}\n")
            f.write(f"tools:\n")
            for tool, enabled in agent_config['tools'].items():
                f.write(f"  {tool}: {enabled}\n")
            f.write(f"---\n\n")
            f.write(f"{agent_config['description']}\n")
        
        return {
            "success": True,
            "message": f"Agent {name} created successfully",
            "file": str(agent_file)
        }
        
    except Exception as e:
        return {
            "success": False,
            "message": f"Error creating agent: {str(e)}"
        }


def cody_refresh() -> Dict[str, Any]:
    """Refresh :cody project state.
    
    Returns:
        Dict with success status and message
    """
    try:
        cody_cmd = [":cody", "refresh"]
        result = subprocess.run(cody_cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            return {
                "success": True,
                "message": "Project refreshed successfully",
                "cody_output": result.stdout
            }
        else:
            return {
                "success": False,
                "message": "Failed to refresh project",
                "error": result.stderr
            }
            
    except Exception as e:
        return {
            "success": False,
            "message": f"Error refreshing project: {str(e)}"
        }