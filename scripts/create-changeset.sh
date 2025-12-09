#!/bin/bash

# Headless Changeset Creator
# Usage: ./scripts/create-changeset.sh <package> <version-type> <summary>

set -e

PACKAGE=${1:-"@pwarnock/liaison"}
VERSION_TYPE=${2:-"patch"}
SUMMARY=${3:-"Automated changeset"}

# Create changeset directory if it doesn't exist
mkdir -p .changeset

# Generate changeset filename with timestamp
TIMESTAMP=$(date +%Y%m%d%H%M%S)
FILENAME=".changeset/changeset-${TIMESTAMP}.md"

# Create changeset content
cat > "${FILENAME}" << EOF
---
"${PACKAGE}": ${VERSION_TYPE}
---

### ${SUMMARY}

EOF

echo "Created changeset: ${FILENAME}"
echo "Package: ${PACKAGE}"
echo "Version: ${VERSION_TYPE}"
echo "Summary: ${SUMMARY}"