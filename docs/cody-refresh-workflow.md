# Cody Refresh Workflow Documentation

## Overview

The `:cody refresh` workflow is a system administration command that updates project context and synchronizes documentation across the entire project. This workflow is executed by the `cody-admin` subagent and ensures that all project documentation, state, and context remain consistent and up-to-date.

## Purpose

The refresh workflow serves several key purposes:

1. **Context Synchronization**: Updates all subagents with the current project state
2. **Documentation Maintenance**: Ensures all project documents are current and consistent
3. **State Management**: Synchronizes version status, feature backlog, and release notes
4. **Validation**: Verifies document integrity and consistency

## Workflow Structure

The refresh workflow follows a structured four-phase approach:

### 1. Context Analysis Phase
- **Project State Reading**: Reads all project documentation files
- **Change Detection**: Identifies changes since the last refresh
- **State Comparison**: Compares current state with previous state
- **Change Reporting**: Generates a comprehensive change report

### 2. Documentation Update Phase
- **Plan Documentation**: Updates `plan.md` with current project status
- **PRD Updates**: Updates `prd.md` with latest requirements and features
- **Feature Backlog**: Updates `feature-backlog.md` with completed work
- **Version Files**: Updates version-specific files with current status
- **Cleanup**: Removes outdated information and references

### 3. State Synchronization Phase
- **Agent Memory Refresh**: Updates all subagent memory with current context
- **Subagent Synchronization**: Ensures all subagents have consistent state
- **Configuration Updates**: Updates configuration files as needed
- **Dependency Management**: Synchronizes project dependencies

### 4. Validation and Reporting Phase
- **Consistency Validation**: Validates all documentation for consistency
- **Integrity Checking**: Verifies document integrity and completeness
- **Refresh Reporting**: Generates detailed report of changes made
- **Project Overview**: Provides updated project status summary

## Usage

### Basic Usage

```bash
/cody refresh
```

### Command Aliases

The refresh workflow can also be executed using:

```bash
/cody-refresh
@cody-refresh
```

### Integration with Other Workflows

The refresh workflow is designed to work seamlessly with other :cody workflows:

```bash
# Complete workflow sequence
/cody plan          # Planning phase
/cody build         # Build phase
/cody refresh       # Refresh context
```

## Implementation Details

### Agent Configuration

The refresh workflow is executed by the `cody-admin` subagent with the following capabilities:

- **System Access**: Full read/write access to all project files
- **Document Processing**: Tools for reading, analyzing, and updating documents
- **Context Management**: State synchronization and memory management
- **Validation Tools**: Document integrity and consistency checking

### Workflow Execution

1. **Initialization**: Workflow starts and loads current project context
2. **Analysis**: Project state is analyzed and changes detected
3. **Update**: Documentation is updated with current information
4. **Synchronization**: All subagents are synchronized with new state
5. **Validation**: Final validation and reporting
6. **Completion**: Workflow completes and returns status

### Error Handling

The refresh workflow includes comprehensive error handling:

- **Graceful Degradation**: Continues operation even with missing files
- **Error Recovery**: Recovers from incomplete operations
- **Validation**: Ensures document integrity after updates
- **Clear Reporting**: Provides detailed error messages and status

## Configuration

### Workflow Configuration

The refresh workflow can be configured through the `cody-admin` agent configuration:

```json
{
  "specialization": {
    "capabilities": [
      "system-refresh",
      "configuration-management",
      "state-synchronization"
    ]
  }
}
```

### Customization Options

- **Document Update Frequency**: Configure how often documents are updated
- **Change Detection Sensitivity**: Adjust change detection thresholds
- **Validation Strictness**: Configure validation requirements
- **Reporting Detail**: Adjust level of detail in refresh reports

## Best Practices

### When to Use Refresh

1. **After Major Changes**: Run refresh after significant project changes
2. **Before Planning**: Refresh context before starting new planning sessions
3. **Regular Maintenance**: Include refresh in regular maintenance workflows
4. **Before Releases**: Ensure all documentation is current before releases

### Performance Optimization

- **Incremental Refresh**: Configure for incremental updates when possible
- **Selective Updates**: Focus on changed areas rather than full refresh
- **Scheduled Refresh**: Set up automated refresh schedules

## Troubleshooting

### Common Issues

1. **Missing Documentation Files**
   - Ensure all required documentation files exist
   - Run with `--create-missing` flag to generate missing files

2. **Permission Issues**
   - Verify cody-admin has proper permissions
   - Check file system access rights

3. **Inconsistent State**
   - Run validation checks before refresh
   - Use `--force-sync` to override inconsistencies

4. **Performance Issues**
   - Reduce scope of refresh operation
   - Optimize document processing

### Debugging

Enable verbose logging for detailed troubleshooting:

```bash
export CODY_DEBUG=1
/cody refresh
```

## Integration

### With Other Systems

The refresh workflow integrates with:

- **Version Control**: Synchronizes with git state
- **Issue Tracking**: Updates issue status and tracking
- **CI/CD Pipelines**: Can be included in automated workflows
- **Monitoring Systems**: Provides status and health information

### API Integration

The refresh workflow can be triggered programmatically:

```typescript
// Example API call
import { executeWorkflow } from '@opencode/cody-workflows';

await executeWorkflow('cody-refresh', {
  projectId: 'my-project',
  forceSync: true
});
```

## Examples

### Basic Refresh

```bash
# Simple refresh
/cody refresh

# Expected output:
🔄 Refreshing project context...
📊 Analyzing changes since last refresh...
📄 Updated 3 documentation files
🔄 Synchronized version status
✅ Project context refreshed successfully.
```

### Advanced Usage

```bash
# Refresh with detailed reporting
/cody refresh --verbose

# Refresh specific components
/cody refresh --documents-only

# Force full synchronization
/cody refresh --force-sync
```

## Security Considerations

- **Access Control**: Ensure only authorized users can execute refresh
- **Data Integrity**: Validate all changes before committing
- **Audit Logging**: Maintain logs of all refresh operations
- **Backup**: Create backups before major refresh operations

## Future Enhancements

Planned improvements for the refresh workflow:

- **Incremental Updates**: More granular update capabilities
- **Change Preview**: Preview changes before applying
- **Rollback Support**: Ability to revert refresh operations
- **Performance Optimization**: Faster processing of large projects

## Conclusion

The `:cody refresh` workflow is a powerful tool for maintaining project consistency and ensuring all documentation and context remain current. By following the best practices and integration patterns outlined in this documentation, teams can effectively manage project state and maintain accurate documentation throughout the development lifecycle.