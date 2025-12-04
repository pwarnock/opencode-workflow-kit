Feature: Basic CLI Functionality

  Scenario: Show help information
    When I run "codybeads --help"
    Then the output should contain "cody-beads"
    And the output should contain "sync"
    And the output should contain "config"

  Scenario: List templates
    When I run "codybeads template list"
    Then the output should contain "Available Templates"
    And the output should contain "minimal"