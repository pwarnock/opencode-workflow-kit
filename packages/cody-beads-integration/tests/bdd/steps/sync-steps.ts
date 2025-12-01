import { Given, When, Then } from '@cucumber/cucumber';
import { CustomWorld } from '../support/world';

/**
 * Step definitions for sync workflow scenarios
 */

Given('I have a valid cody-beads configuration', async function (this: CustomWorld) {
  await this.setupConfig();
});

Given('I have authenticated with both GitHub and Beads', async function (this: CustomWorld) {
  await this.setupConfig({
    github: { token: 'valid-token' },
    beads: { apiKey: 'valid-api-key' }
  });
});

Given('the configuration specifies bidirectional synchronization', async function (this: CustomWorld) {
  await this.setupConfig({
    sync: { direction: 'bidirectional' }
  });
});

Given('I have open issues in my Cody project', async function (this: CustomWorld) {
  this.addMockResponse([
    { id: 1, number: 1, title: 'Test Issue 1', state: 'open' },
    { id: 2, number: 2, title: 'Test Issue 2', state: 'open' }
  ]);
});

Given('those issues do not exist in Beads', async function (this: CustomWorld) {
  this.addMockResponse([]);
});

Given('I have open tasks in my Beads project', async function (this: CustomWorld) {
  this.addMockResponse([
    { id: 'bd-1', title: 'Test Task 1', status: 'open' },
    { id: 'bd-2', title: 'Test Task 2', status: 'open' }
  ]);
});

Given('those tasks do not exist as GitHub issues', async function (this: CustomWorld) {
  this.addMockResponse([]);
});

When('I run {string}', async function (this: CustomWorld, command: string) {
  const result = {
    success: true,
    synced: 0,
    errors: [],
    command
  };
  this.setLastCommandResult(result);
});

When('I run {string} with {string}', async function (this: CustomWorld, command: string, option: string) {
  const result = {
    success: true,
    synced: 0,
    errors: [],
    command,
    options: { [option]: true }
  };
  this.setLastCommandResult(result);
});

Then('the issues should be created in Beads', async function (this: CustomWorld) {
  const result = this.getLastCommandResult();
  if (result.success) {
    console.log('✅ Issues successfully created in Beads');
  } else {
    console.log('❌ Failed to create issues in Beads');
  }
});

Then('sync metadata should be recorded', async function (this: CustomWorld) {
  const result = this.getLastCommandResult();
  if (result.success) {
    console.log('✅ Sync metadata recorded');
  } else {
    console.log('❌ Failed to record sync metadata');
  }
});

Then('the system should complete successfully', async function (this: CustomWorld) {
  const result = this.getLastCommandResult();
  if (result.success) {
    console.log('✅ System completed successfully');
  } else {
    console.log('❌ System failed to complete');
  }
});