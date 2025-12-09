# Task Management with Real Beads Backend

This guide covers using Liaison's task management with the real Beads backend integration.

## 🎯 Overview

Liaison v0.6.0+ integrates directly with the `@beads/bd` backend, providing real task management capabilities instead of mock operations.

## 🚀 Getting Started

### Prerequisites

1. **Beads Installation**: Ensure `@beads/bd` is properly installed
2. **Beads Project**: Initialize a Beads project in your directory
3. **Configuration**: Set up Liaison configuration

### Quick Setup
```bash
# 1. Initialize Liaison project
liaison init -n my-project

# 2. Initialize Beads project
bd init

# 3. Configure integration
liaison config setup

# 4. Test setup
liaison config test
```

## 📋 Task Management Commands

### Create Tasks

#### Basic Task Creation
```bash
# Simple task
liaison task create --title "Fix login bug"

# Task with description
liaison task create --title "Add user authentication" --description "Implement OAuth2 login with GitHub"

# Task with priority
liaison task create --title "Critical security fix" --priority high

# Task with assignee
liaison task create --title "Update documentation" --assignee john-doe
```

#### Advanced Task Creation
```bash
# Full task with all options
liaison task create \
  --title "Implement new feature" \
  --description "Add user profile management with avatar upload" \
  --priority medium \
  --assignee jane-smith \
  --labels "feature,frontend,users" \
  --due-date "2025-01-15"
```

### List Tasks

#### Basic Listing
```bash
# List all tasks
liaison task list

# List with specific format
liaison task list --format table
liaison task list --format json
liaison task list --format csv
```

#### Filtered Listing
```bash
# Filter by status
liaison task list --status pending
liaison task list --status in-progress
liaison task list --status completed

# Filter by priority
liaison task list --priority high
liaison task list --priority medium
liaison task list --priority low

# Filter by assignee
liaison task list --assignee john-doe

# Filter by labels
liaison task list --labels "bug,urgent"
```

#### Sorting and Limiting
```bash
# Sort by priority
liaison task list --sort priority

# Sort by due date
liaison task list --sort due-date

# Limit results
liaison task list --limit 10

# Combined filters
liaison task list --status pending --priority high --limit 5
```

### Update Tasks

#### Basic Updates
```bash
# Update status
liaison task update bd-123 --status in-progress
liaison task update bd-123 --status completed

# Update priority
liaison task update bd-123 --priority high

# Update assignee
liaison task update bd-123 --assignee jane-smith
```

#### Advanced Updates
```bash
# Update multiple fields
liaison task update bd-123 \
  --status in-progress \
  --priority high \
  --assignee john-doe \
  --labels "bug,urgent,security"

# Add comment
liaison task update bd-123 --comment "Started working on this issue"

# Set due date
liaison task update bd-123 --due-date "2025-01-20"
```

### Show Task Details

```bash
# Show task with all details
liaison task show bd-123

# Show with specific format
liaison task show bd-123 --format json
liaison task show bd-123 --format detailed
```

### Delete Tasks

```bash
# Delete task (with confirmation)
liaison task delete bd-123

# Force delete without confirmation
liaison task delete bd-123 --force
```

## 🔗 Task Relationships

### Link Tasks
```bash
# Link tasks together
liaison task link bd-123 --to bd-456
liaison task link bd-123 --to bd-789 --type "blocks"

# Link to GitHub issues
liaison task link bd-123 --to gh-456
```

### Unlink Tasks
```bash
# Remove task link
liaison task unlink bd-123 --from bd-456
```

### Show Dependencies
```bash
# Show task dependencies
liaison task dependencies bd-123

# Show what this task blocks
liaison task blocks bd-123

# Show what this task depends on
liaison task depends-on bd-123
```

## 🏷️ Label Management

### Create Labels
```bash
# Create new label
liaison task label create "urgent" --color red --description "Urgent tasks"

# Create multiple labels
liaison task label create "bug" --color red
liaison task label create "feature" --color green
liaison task label create "enhancement" --color blue
```

### List Labels
```bash
# List all labels
liaison task label list

# Show label details
liaison task label show "urgent"
```

### Apply Labels to Tasks
```bash
# Add single label
liaison task update bd-123 --labels "urgent"

# Add multiple labels
liaison task update bd-123 --labels "bug,urgent,security"

# Remove all labels
liaison task update bd-123 --labels ""
```

## 📊 Task Analytics

### Task Statistics
```bash
# Show overall statistics
liaison task stats

# Stats by assignee
liaison task stats --by assignee

# Stats by priority
liaison task stats --by priority

# Stats by status
liaison task stats --by status
```

### Burndown Charts
```bash
# Show burndown for current sprint
liaison task burndown --sprint current

# Custom date range
liaison task burndown --from "2025-01-01" --to "2025-01-31"

# By assignee
liaison task burndown --assignee john-doe
```

## 🔍 Search and Filter

### Advanced Search
```bash
# Search by title
liaison task search --title "login"

# Search by description
liaison task search --description "authentication"

# Search by content
liaison task search --content "security bug"

# Combined search
liaison task search --title "bug" --priority high --status pending
```

### Complex Filters
```bash
# Multiple conditions
liaison task list \
  --status pending \
  --priority high \
  --labels "bug,security" \
  --assignee john-doe

# Date ranges
liaison task list \
  --created-after "2025-01-01" \
  --due-before "2025-01-31"

# Exclude conditions
liaison task list \
  --status completed \
  --exclude-labels "wontfix,duplicate"
```

## 🔄 Workflow Integration

### Daily Workflow
```bash
# 1. Check my tasks for today
liaison task list --assignee $USER --status pending --sort priority

# 2. Start working on highest priority task
liaison task update bd-123 --status in-progress

# 3. Add progress comment
liaison task update bd-123 --comment "Started implementation"

# 4. Complete task
liaison task update bd-123 --status completed --comment "Finished implementation"
```

### Sprint Planning
```bash
# 1. Review backlog
liaison task list --status backlog --sort priority

# 2. Plan sprint
liaison task update bd-123 --status "sprint-1"
liaison task update bd-456 --status "sprint-1"

# 3. Generate sprint report
liaison task stats --status "sprint-1"
```

### Code Review Workflow
```bash
# 1. Create review task
liaison task create \
  --title "Review PR #42" \
  --description "Review user authentication changes" \
  --assignee senior-dev \
  --labels "code-review,urgent"

# 2. Update review status
liaison task update bd-789 --status in-progress --comment "Started review"

# 3. Complete review
liaison task update bd-789 \
  --status completed \
  --comment "LGTM with minor suggestions"
```

## 🛠️ Advanced Features

### Bulk Operations
```bash
# Bulk update multiple tasks
liaison task bulk-update \
  --tasks bd-123,bd-456,bd-789 \
  --status "in-review"

# Bulk assign
liaison task bulk-update \
  --tasks bd-123,bd-456 \
  --assignee new-team-member

# Bulk label
liaison task bulk-update \
  --tasks bd-123,bd-456,bd-789 \
  --labels "sprint-2"
```

### Task Templates
```bash
# Create task from template
liaison task create --template "bug-report" --title "Login page crashes"

# Define template in config
# cody-beads.config.json:
{
  "taskTemplates": {
    "bug-report": {
      "labels": ["bug"],
      "priority": "high",
      "description": "Bug report template"
    }
  }
}
```

### Automation Hooks
```bash
# Enable auto-assignment
liaison config set beads.autoAssign true

# Set auto-assignment rules
liaison config set beads.assignmentRules "round-robin"

# Enable status transitions
liaison config set beads.autoStatusTransition true
```

## 🔧 Configuration

### Beads Configuration
```json
{
  "beads": {
    "projectPath": "./my-project",
    "autoSync": false,
    "syncInterval": 60,
    "autoAssign": false,
    "defaultPriority": "medium",
    "defaultLabels": [],
    "taskTemplates": {
      "bug": {
        "labels": ["bug"],
        "priority": "high"
      },
      "feature": {
        "labels": ["feature"],
        "priority": "medium"
      }
    }
  }
}
```

### Environment Variables
```bash
# Beads project path
export BEADS_PROJECT_PATH="./my-project"

# Default assignee
export BEADS_DEFAULT_ASSIGNEE="john-doe"

# Auto-sync settings
export BEADS_AUTO_SYNC="true"
export BEADS_SYNC_INTERVAL="300"
```

## 🚨 Troubleshooting

### Common Issues

#### Task Creation Fails
```bash
# Check beads project
bd list

# Check configuration
liaison config test

# Enable debug
export DEBUG=liaison:beads
liaison task create --title "Test"
```

#### Task Not Found
```bash
# Verify task exists
liaison task show bd-123

# List all tasks
liaison task list

# Check task ID format
bd list | grep bd-123
```

#### Sync Issues
```bash
# Check beads daemon
bd daemons status

# Restart daemon
bd daemons restart

# Force sync
liaison sync --force
```

## 📚 Best Practices

### 1. Consistent Task IDs
- Use Beads task IDs (bd-123) in all references
- Include task IDs in commit messages
- Link tasks to related issues and PRs

### 2. Proper Status Management
- Use standard statuses: `pending`, `in-progress`, `in-review`, `completed`
- Update status when work begins/ends
- Use comments for status transitions

### 3. Effective Labeling
- Use consistent label naming
- Apply priority labels consistently
- Use labels for filtering and reporting

### 4. Regular Cleanup
- Close completed tasks regularly
- Archive old tasks
- Review and update labels

### 5. Team Coordination
- Assign tasks clearly
- Use comments for updates
- Link related tasks

## 🔗 Integration Examples

### GitHub Integration
```bash
# Create task from GitHub issue
liaison task create \
  --title "Fix issue #42" \
  --description "GitHub issue: https://github.com/user/repo/issues/42" \
  --labels "github,bug"

# Link to GitHub PR
liaison task link bd-123 --to gh-456
```

### CI/CD Integration
```bash
# In CI pipeline
if [ $CI_STATUS == "failed" ]; then
  liaison task create \
    --title "Build failed: $COMMIT_SHA" \
    --description "CI build failure on main branch" \
    --priority high \
    --labels "ci,build-failure"
fi
```

### Script Integration
```bash
#!/bin/bash
# daily-standup.sh

echo "=== Daily Standup Tasks ==="
liaison task list --assignee $USER --status in-progress --format table

echo ""
echo "=== Ready to Start ==="
liaison task list --assignee $USER --status pending --priority high --limit 3
```

This comprehensive task management system provides real integration with Beads, enabling powerful workflow automation and team collaboration. 🚀