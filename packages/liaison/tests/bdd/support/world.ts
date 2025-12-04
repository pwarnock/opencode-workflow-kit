import { setWorldConstructor, World, IWorldOptions } from '@cucumber/cucumber';
import { ConfigManager } from '../../../src/utils/config.js';
import { TestDataFactory } from '../../unit/utils/test-data-factory';

/**
 * Custom World object for BDD testing
 */
export class CustomWorld extends World {
  public config: any;
  public tempDir: string;
  public mockResponses: any[] = [];
  public lastCommandResult: any;
  public configManager: ConfigManager;

  constructor(options: IWorldOptions) {
    super(options);
    this.configManager = new ConfigManager();
  }

  /**
   * Set up test configuration
   */
  async setupConfig(overrides = {}) {
    this.config = TestDataFactory.createMockConfig(overrides);
    this.tempDir = TestDataFactory.createTempDir();
  }

  /**
   * Clean up test resources
   */
  async cleanup() {
    TestDataFactory.cleanupTempDirs();
    this.mockResponses = [];
    this.lastCommandResult = null;
  }

  /**
   * Add a mock response for CLI prompts
   */
  addMockResponse(response: any) {
    this.mockResponses.push(response);
  }

  /**
   * Get next mock response
   */
  getNextMockResponse() {
    return this.mockResponses.shift();
  }

  /**
   * Set the result of the last command
   */
  setLastCommandResult(result: any) {
    this.lastCommandResult = result;
  }

  /**
   * Get last command result
   */
  getLastCommandResult() {
    return this.lastCommandResult;
  }

  /**
   * Execute a CLI command and return result
   */
  async executeCommand(command: string) {
    const { spawn } = await import('child_process');
    
    return new Promise((resolve) => {
      const child = spawn(command, { shell: true, cwd: this.tempDir });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        resolve({
          exitCode: code || 0,
          stdout,
          stderr,
          command
        });
      });
    });
  }
}

setWorldConstructor(CustomWorld);