import { Given, When, Then } from '@cucumber/cucumber';
import { CustomWorld } from '../support/world.js';
import { expect } from 'chai';

/**
 * Step definitions for template management scenarios
 */

Given('I have a template configuration with {string}', async function (this: CustomWorld, templateType: string) {
  this.config = {
    ...this.config,
    templateConfig: {
      type: templateType,
      name: `test-${templateType}`,
      description: `Test ${templateType} template`
    }
  };
});

Given('I want to create a {string} project', async function (this: CustomWorld, projectType: string) {
  this.config = {
    ...this.config,
    projectType
  };
  this.config.projectName = `test-${projectType}-project`;
});

When('I create a project from the {string} template', async function (this: CustomWorld, templateName: string) {
  const result = await this.executeCommand(`template create ${templateName} ${this.config.projectName}`);
  this.setLastCommandResult(result);
});

When('I list available templates', async function (this: CustomWorld) {
  const result = await this.executeCommand('template list');
  this.setLastCommandResult(result);
});

When('I validate the template configuration', async function (this: CustomWorld) {
  const result = await this.executeCommand(`template validate ${this.config.templateConfig?.type}`);
  this.setLastCommandResult(result);
});

Then('the project should be created successfully', async function (this: CustomWorld) {
  const result = this.getLastCommandResult();
  expect(result.exitCode).to.equal(0);
  expect(result.stdout).to.contain('Project created successfully');
});

Then('the template should be applied correctly', async function (this: CustomWorld) {
  const result = this.getLastCommandResult();
  expect(result.exitCode).to.equal(0);
  expect(result.stdout).to.contain('Template applied successfully');
});

Then('I should see the {string} template in the list', async function (this: CustomWorld, templateName: string) {
  const result = this.getLastCommandResult();
  expect(result.stdout).to.contain(templateName);
});

Then('the template configuration should be valid', async function (this: CustomWorld) {
  const result = this.getLastCommandResult();
  expect(result.exitCode).to.equal(0);
  expect(result.stdout).to.contain('Template configuration is valid');
});

Then('I should see an error about invalid template', async function (this: CustomWorld) {
  const result = this.getLastCommandResult();
  expect(result.exitCode).to.not.equal(0);
  expect(result.stderr).to.contain('template');
});

Given('I have an existing project with configuration', async function (this: CustomWorld) {
  this.config = {
    ...this.config,
    existingProject: {
      name: 'existing-project',
      config: {
        version: '1.0.0',
        github: { owner: 'test', repo: 'existing' },
        cody: { projectId: 'test-cody' },
        beads: { projectPath: './existing-beads' }
      }
    }
  };
});

When('I update the project configuration', async function (this: CustomWorld) {
  const configPath = `./${this.config.existingProject?.name}/cody-beads.config.json`;
  const result = await this.executeCommand(`config set github.owner new-owner --config ${configPath}`);
  this.setLastCommandResult(result);
});

Then('the configuration should be updated', async function (this: CustomWorld) {
  const result = this.getLastCommandResult();
  expect(result.exitCode).to.equal(0);
  expect(result.stdout).to.contain('Configuration updated');
});

When('I initialize a new project with the template', async function (this: CustomWorld) {
  const result = await this.executeCommand(`init --template ${this.config.templateConfig?.type} ${this.config.projectName}`);
  this.setLastCommandResult(result);
});

Then('the project structure should be created', async function (this: CustomWorld) {
  const result = this.getLastCommandResult();
  expect(result.exitCode).to.equal(0);
  expect(result.stdout).to.contain('Project initialized');
});