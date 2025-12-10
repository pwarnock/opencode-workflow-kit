Feature: Template Management

  As a developer
  I want to create and manage project templates
  So that I can quickly set up new projects with consistent configurations

  Background:
    Given I have the liaison CLI installed
    And I am in a directory where I can create templates

  Scenario: List available templates
    Given I have default templates available
    When I run "liaison template list"
    Then I should see the minimal template
    And I should see the web-development template
    And I should see the python-development template
    And I should see the react-node template

  Scenario: Create custom template
    Given I want to create a custom template
    When I run "liaison template create my-template --type custom --description \"My custom template\""
    Then a template directory should be created
    And template metadata should be generated
    And I should see a success message

  Scenario: Apply template to new project
    Given I have a template available
    And I am in an empty directory
    When I run "liaison template apply my-template --name my-project"
    Then the template files should be copied
    And template variables should be substituted
    And dependencies should be installed if configured

  Scenario: Remove template
    Given I have a custom template
    When I run "liaison template remove my-template"
    Then the template should be removed
    And I should see a confirmation message

  Scenario: Initialize new project with template
    Given I want to start a new project
    And I choose the web-development template
    When I run "liaison init --template web-development --name my-web-app"
    Then a new project directory should be created
    And appropriate files should be generated
    And git should be initialized
    And dependencies should be installed

  Scenario: Template with custom variables
    Given I have a template with variables
    When I apply the template with variable overrides
    Then the variables should be substituted correctly
    And the output files should reflect the custom values

  Scenario: Template validation
    Given I have an invalid template
    When I try to apply it
    Then I should see validation errors
    And the application should fail gracefully

  Scenario: Template with post-setup commands
    Given I have a template with post-setup commands
    When I apply the template
    Then the commands should be executed
    And I should see command output
    And the template should complete successfully