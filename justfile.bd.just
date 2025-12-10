# BD (beads) Issue Tracker Commands
# This file contains all bd-related commands with proper syntax

# Setup bd (beads) issue tracker
bd-setup:
    #!/usr/bin/env sh
    echo "📋 Setting up bd (beads) issue tracker..."
    @if [ -f "scripts/setup-bd.sh" ]; then
        ./scripts/setup-bd.sh
    else
        echo "⚠️ bd setup script not found. Skipping bd setup."
    fi

# Check for ready work
bd-ready:
    #!/usr/bin/env sh
    echo "📋 Checking for ready work..."
    @./scripts/bd-wrapper.sh ready

# Create new bd issue
bd-create title type priority:
    #!/usr/bin/env sh
    echo "📝 Creating new bd issue..."
    @./scripts/bd-wrapper.sh create "$1" -t "$2" -p "$3"

# Update bd issue
bd-update id status:
    #!/usr/bin/env sh
    echo "🔄 Updating bd issue..."
    @./scripts/bd-wrapper.sh update "$1" --status "$2"

# Close bd issue
bd-close id reason:
    #!/usr/bin/env sh
    echo "✅ Closing bd issue..."
    @./scripts/bd-wrapper.sh close "$1" --reason "$2"

# List all bd issues
bd-list:
    #!/usr/bin/env sh
    echo "📋 Listing all bd issues..."
    @./scripts/bd-wrapper.sh list

# Show bd issue details
bd-show id:
    #!/usr/bin/env sh
    echo "📄 Showing bd issue details..."
    @./scripts/bd-wrapper.sh show "$1"