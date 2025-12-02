"""Basic tests for opencode-config package."""

import os

import pytest


def test_package_files_exist():
    """Test that required package files exist."""
    package_dir = os.path.join(os.path.dirname(__file__), "..")

    required_files = [
        "__init__.py",
        "validator.py",
        "compatibility.py",
        "tools.py",
        "cli.py",
        "package.json",
    ]

    for file_name in required_files:
        file_path = os.path.join(package_dir, file_name)
        assert os.path.exists(file_path), f"Required file {file_name} does not exist"


def test_package_has_init():
    """Test that package has proper __init__.py file."""
    init_file = os.path.join(os.path.dirname(__file__), "..", "__init__.py")
    assert os.path.exists(init_file), "__init__.py file missing"

    with open(init_file) as f:
        content = f.read()
        assert len(content) > 0, "__init__.py is empty"


def test_python_syntax():
    """Test that Python files have valid syntax."""
    import ast

    package_dir = os.path.join(os.path.dirname(__file__), "..")
    python_files = ["validator.py", "compatibility.py", "tools.py", "cli.py"]

    for file_name in python_files:
        file_path = os.path.join(package_dir, file_name)
        if os.path.exists(file_path):
            with open(file_path) as f:
                try:
                    ast.parse(f.read())
                except SyntaxError as e:
                    pytest.fail(f"Syntax error in {file_name}: {e}")


def test_package_json_valid():
    """Test that package.json is valid JSON."""
    import json

    package_json_path = os.path.join(os.path.dirname(__file__), "..", "package.json")
    assert os.path.exists(package_json_path), "package.json does not exist"

    with open(package_json_path) as f:
        try:
            data = json.load(f)
            assert "name" in data, "package.json missing 'name' field"
            assert "version" in data, "package.json missing 'version' field"
        except json.JSONDecodeError as e:
            pytest.fail(f"Invalid JSON in package.json: {e}")
