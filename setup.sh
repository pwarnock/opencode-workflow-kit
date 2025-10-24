#!/bin/bash

# OpenCode Config Setup Script
# This script sets up opencode-config with uv and .venv

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if uv is installed
check_uv() {
    if ! command -v uv &> /dev/null; then
        print_error "uv is not installed. Please install uv first:"
        echo "curl -LsSf https://astral.sh/uv/install.sh | sh"
        exit 1
    fi
    print_success "uv is installed"
}

# Create virtual environment with uv
create_venv() {
    print_status "Creating virtual environment with uv..."
    if [ ! -d ".venv" ]; then
        uv venv
        print_success "Virtual environment created at .venv"
    else
        print_warning "Virtual environment already exists at .venv"
    fi
}

# Install dependencies with uv
install_deps() {
    print_status "Installing dependencies with uv..."
    uv sync
    print_success "Dependencies installed"
}

# Setup global configuration
setup_global_config() {
    print_status "Setting up global configuration..."
    
    # Create ~/.opencode directory if it doesn't exist
    mkdir -p ~/.opencode
    
    # Copy global configurations
    if [ -d "config/global" ]; then
        cp -r config/global/* ~/.opencode/
        print_success "Global configuration copied to ~/.opencode/"
    else
        print_warning "No global configuration found in config/global/"
    fi
}

# Setup project configuration (optional)
setup_project_config() {
    if [ "$1" = "--project" ]; then
        print_status "Setting up project configuration..."
        if [ -d "config/project/.opencode" ]; then
            cp -r config/project/.opencode ./
            print_success "Project configuration copied to ./.opencode/"
        else
            print_warning "No project configuration found in config/project/.opencode/"
        fi
    fi
}

# Validate installation
validate_installation() {
    print_status "Validating installation..."
    
    # Run compatibility test
    if uv run python scripts/test-compatibility.py; then
        print_success "Installation validation passed"
    else
        print_error "Installation validation failed"
        exit 1
    fi
}

# Main setup function
main() {
    print_status "Starting OpenCode Config setup..."
    
    check_uv
    create_venv
    install_deps
    setup_global_config
    setup_project_config "$@"
    validate_installation
    
    print_success "OpenCode Config setup complete!"
    echo
    print_status "Next steps:"
    echo "1. Activate the virtual environment: source .venv/bin/activate"
    echo "2. Run tests: uv run python scripts/test-compatibility.py"
    echo "3. Customize configurations in ~/.opencode/ or ./.opencode/"
    echo
    print_status "For project-specific setup, run: ./setup.sh --project"
}

# Run main function with all arguments
main "$@"