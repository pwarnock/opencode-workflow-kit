# Advanced Git Automation Documentation

## Overview

The advanced git automation system provides comprehensive bidirectional synchronization between Git and Beads, enhanced dependency validation, and intelligent conflict resolution. This system ensures that your Git workflow and issue tracking remain perfectly synchronized.

## Features

### 1. Bidirectional Beads Integration

The system now supports full bidirectional sync between Git commits and Beads issues:

- **Git → Beads**: Automatically updates Beads issue status when commits are made
- **Beads → Git**: Creates Git commits to reflect Beads status changes
- **Conflict Detection**: Identifies and resolves inconsistencies between Git and Beads state
- **Real-time Sync**: Updates happen automatically during commit operations

### 2. Enhanced Issue Dependency Validation

Advanced dependency management with automated status transitions:

- **Circular Dependency Detection**: Prevents infinite dependency loops
- **Dependency Depth Analysis**: Warns about overly complex dependency chains
- **Automated Transitions**: Updates dependent issues when dependencies change
- **Dependency Graph Validation**: Ensures consistency across the entire dependency graph

### 3. Advanced CLI Commands

New powerful commands for managing the Git-Beads workflow:

#### `bidirectional-sync`
Performs comprehensive bidirectional synchronization with conflict resolution.

```bash
# Basic sync
python scripts/git-automation.py bidirectional-sync

# Auto-resolve conflicts
python scripts/git-automation.py bidirectional-sync --auto-resolve
```

#### `dependency-check`
Validates issue dependencies and provides recommendations.

```bash
# Check all dependencies
python scripts/git-automation.py dependency-check

# Check specific issues
python scripts/git-automation.py dependency-check --issue-ids opencode-config-123 opencode-config-456

# Auto-transition dependent issues
python scripts/git-automation.py dependency-check --auto-transition
```

#### `conflict-resolve`
Detects and resolves sync conflicts between Git and Beads.

```bash
# Interactive conflict resolution
python scripts/git-automation.py conflict-resolve

# Auto-resolve all conflicts
python scripts/git-automation.py conflict-resolve --auto-resolve
```

## Usage Examples

### Basic Workflow

1. **Make changes to your code**
2. **Stage files**: `git add your-files`
3. **Create commit with validation**:
   ```bash
   python scripts/git-automation.py commit --files your-files
   ```
4. **Check sync status**:
   ```bash
   python scripts/git-automation.py check-sync --auto-sync
   ```

### Advanced Dependency Management

1. **Validate dependencies before starting work**:
   ```bash
   python scripts/git-automation.py dependency-check --auto-transition
   ```

2. **Check for dependency conflicts**:
   ```bash
   python scripts/git-automation.py validate --strict
   ```

3. **Resolve any sync issues**:
   ```bash
   python scripts/git-automation.py bidirectional-sync --auto-resolve
   ```

### Conflict Resolution

When conflicts are detected between Git and Beads:

1. **Detect conflicts**:
   ```bash
   python scripts/git-automation.py conflict-resolve
   ```

2. **Review conflict details** - The system will show:
   - Issue ID
   - Conflict type (status_mismatch, orphaned_git_issue, stale_beads_issue)
   - Git status vs Beads status
   - Recommended resolution

3. **Auto-resolve or manually handle** based on recommendations

## Configuration

### Atomic Commit Rules

The system enforces atomic commit principles through configurable rules:

1. **Single Issue Rule**: Each commit should address only one issue
2. **Unrelated Changes Rule**: Don't mix different types of changes in one commit
3. **Version Mixing Rule**: Don't span multiple versions in one commit
4. **Dependency Rule**: Validate issue dependencies before committing

### Version Branch Management

Enhanced version branch workflow:

```bash
# Create version branch
python scripts/git-automation.py branch create --version 1.2.0

# Merge version branch
python scripts/git-automation.py branch merge --version 1.2.0

# Clean up old branches
python scripts/git-automation.py branch cleanup --dry-run
```

## Error Handling

The system includes comprehensive error handling:

- **Graceful Degradation**: Continues working even if Beads is unavailable
- **Retry Logic**: Automatic retries for transient failures
- **Fallback Mechanisms**: Alternative approaches when primary methods fail
- **Detailed Logging**: Clear error messages and warnings

## Testing

### Running Tests

```bash
# Run mock tests (no external dependencies)
uv run python scripts/test-git-automation-mock.py

# Run advanced tests (requires Beads installation)
uv run python scripts/test-git-automation-advanced.py
```

### Test Coverage

The test suite covers:

- ✅ Bidirectional sync functionality
- ✅ Dependency validation logic
- ✅ Conflict detection and resolution
- ✅ CLI command behavior
- ✅ Error handling scenarios
- ✅ Edge cases and boundary conditions

## Integration with Git Hooks

### Pre-commit Hook

Validates commits before they're created:

```bash
#!/bin/sh
python scripts/git-automation.py hook --hook-type pre-commit --files "$@"
```

### Post-commit Hook

Updates Beads after commits are created:

```bash
#!/bin/sh
python scripts/git-automation.py hook --hook-type post-commit
```

## Best Practices

### 1. Commit Hygiene

- **One Issue Per Commit**: Follow the atomic commit principle
- **Clear Messages**: Let the system generate intelligent commit messages
- **Dependency Awareness**: Check dependencies before starting work

### 2. Dependency Management

- **Keep Dependencies Simple**: Avoid deep dependency chains
- **Regular Validation**: Run dependency checks frequently
- **Auto-Transition**: Use automated status transitions for efficiency

### 3. Conflict Prevention

- **Regular Syncs**: Run bidirectional sync regularly
- **Consistent Workflow**: Use the automation tools consistently
- **Review Recommendations**: Pay attention to system recommendations

## Troubleshooting

### Common Issues

1. **Beads Command Not Found**
   - Ensure Beads is installed and in PATH
   - System will continue working with reduced functionality

2. **Sync Conflicts**
   - Run `conflict-resolve` command
   - Review conflict recommendations
   - Use `--auto-resolve` for simple cases

3. **Dependency Validation Failures**
   - Check for circular dependencies
   - Review dependency depth
   - Consider breaking down complex dependencies

### Debug Mode

Enable verbose output for troubleshooting:

```bash
python scripts/git-automation.py --verbose bidirectional-sync
```

## Performance Considerations

- **Caching**: Issue data is cached to reduce Beads API calls
- **Batch Operations**: Multiple issues are processed together
- **Incremental Syncs**: Only processes changes since last sync
- **Background Processing**: Heavy operations can be run asynchronously

## Future Enhancements

Planned improvements include:

- **Web Dashboard**: Visual interface for dependency management
- **Advanced Analytics**: Dependency metrics and insights
- **Integration APIs**: REST API for external tool integration
- **Custom Rules**: User-defined validation rules
- **Performance Optimization**: Further caching and batching improvements

## Contributing

When contributing to the git automation system:

1. **Add Tests**: Ensure new features have comprehensive test coverage
2. **Update Documentation**: Keep this documentation current
3. **Follow Patterns**: Use existing code patterns and conventions
4. **Error Handling**: Include proper error handling for all new features
5. **Backward Compatibility**: Maintain compatibility with existing workflows

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review the test files for usage examples
3. Examine the git-automation.py source code for detailed implementation
4. Create an issue in the project repository for bugs or feature requests