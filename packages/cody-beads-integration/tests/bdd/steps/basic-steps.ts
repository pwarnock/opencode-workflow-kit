import { When, Then } from '@cucumber/cucumber';
import { execSync } from 'child_process';
import { SimpleWorld } from '../support/simple-world';

When('I run {string}', function (this: SimpleWorld, command: string) {
  this.lastOutput = execSync(`node ../../bin/cody-beads.js ${command}`, { 
    encoding: 'utf8',
    cwd: process.cwd()
  });
});

Then('output should contain {string}', function (this: SimpleWorld, expected: string) {
  if (!this.lastOutput.includes(expected)) {
    throw new Error(`Expected output to contain "${expected}", but got:\n${this.lastOutput}`);
  }
});