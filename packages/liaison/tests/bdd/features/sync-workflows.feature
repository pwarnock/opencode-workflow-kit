Feature: Cody-Beads Synchronization Workflows

  As a developer using Cody Product Builder Toolkit and Beads
  I want to synchronize issues and pull requests between the platforms
  So that I can maintain consistency and track progress across both systems

  Background:
    Given I have a valid liaison configuration
    And I have authenticated with both GitHub and Beads
    And the configuration specifies bidirectional synchronization

  Scenario: Sync issues from Cody to Beads
    Given I have open issues in my Cody project
    And those issues don't exist in Beads
    When I run "liaison sync --direction cody-to-beads"
    Then the issues should be created in Beads
    And the original issues should remain unchanged in Cody
    And sync metadata should be recorded

  Scenario: Sync issues from Beads to Cody
    Given I have open tasks in my Beads project
    And those tasks don't exist as GitHub issues
    When I run "liaison sync --direction beads-to-cody"
    Then GitHub issues should be created
    And the original tasks should remain unchanged in Beads
    And sync metadata should be recorded

  Scenario: Handle conflicts with manual resolution
    Given I have an issue that exists in both Cody and Beads
    And the issue has been modified in both systems
    When I run "liaison sync --conflict-resolution manual"
    Then I should be prompted to choose which version to keep
    And my choice should be applied to both systems
    And sync metadata should be updated

  Scenario: Handle conflicts with automatic resolution
    Given I have an issue that exists in both Cody and Beads
    And the issue has been modified in both systems
    When I run "liaison sync --conflict-resolution newer-wins"
    Then the newer version should be applied to both systems
    And sync metadata should be updated

  Scenario: Sync with dry run
    Given I have changes in both Cody and Beads
    When I run "liaison sync --dry-run"
    Then the system should show what would be synced
    But no actual changes should be made
    And sync metadata should not be modified

  Scenario: Sync with specific time range
    Given I have issues updated at different times
    When I run "liaison sync --since 2025-01-01T00:00:00Z"
    Then only issues updated since that time should be synced
    And older issues should be ignored

  Scenario: Sync with label filtering
    Given I have issues with different labels
    And my configuration includes only specific labels
    When I run "liaison sync"
    Then only issues with matching labels should be synced
    And other issues should be ignored

  Scenario: Error handling during sync
    Given I have valid issues to sync
    And the GitHub API becomes unavailable
    When I run "liaison sync"
    Then the sync should fail gracefully
    And I should see a meaningful error message
    And partial changes should be rolled back
    And error details should be logged

  Scenario: Large dataset sync
    Given I have more than 100 issues to sync
    And GitHub API rate limits are in effect
    When I run "liaison sync"
    Then the sync should respect rate limits
    And progress should be shown during sync
    And the sync should complete successfully