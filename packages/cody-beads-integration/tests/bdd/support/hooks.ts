import { Before, After, BeforeAll, AfterAll } from '@cucumber/cucumber';
import { CustomWorld } from './world.js';

/**
 * Setup and teardown hooks for BDD tests
 */

BeforeAll(async function () {
  // Global setup before all scenarios
  console.log('🚀 Starting BDD test suite');
});

AfterAll(async function () {
  // Global cleanup after all scenarios
  console.log('🏁 BDD test suite completed');
});

Before(async function (this: CustomWorld) {
  // Setup before each scenario
  await this.setupConfig();
  console.log('📋 Setting up scenario');
});

After(async function (this: CustomWorld) {
  // Cleanup after each scenario
  await this.cleanup();
  console.log('🧹 Cleaning up scenario');
});