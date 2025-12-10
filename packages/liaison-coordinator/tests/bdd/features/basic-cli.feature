Feature: Basic CLI Functionality

  Scenario: Show help information
    When I run "liaison --help"
    Then the output should contain "liaison"
    And the output should contain "sync"
    And the output should contain "config"

  Scenario: List templates
    When I run "liaison template list"
    Then the output should contain "Available Templates"
    And the output should contain "minimal"