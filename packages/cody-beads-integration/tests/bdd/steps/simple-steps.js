const { Given, When, Then } = require('@cucumber/cucumber');
const { execSync } = require('child_process');

/**
 * Step definitions for basic CLI scenarios
 */

Given('I run {string}', function (command) {
  this.lastOutput = execSync(`node ../../bin/cody-beads.js ${command}`, { 
    encoding: 'utf8',
    cwd: process.cwd()
  });
});

Then('output should contain {string}', function (expected) {
  if (!this.lastOutput.includes(expected)) {
    throw new Error(`Expected output to contain "${expected}", but got:\n${this.lastOutput}`);
  }
});

module.exports = { Given, When, Then };