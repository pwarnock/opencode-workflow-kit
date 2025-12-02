import { CLIPlugin, PluginCommand, PluginMiddleware, PluginHooks } from './types.js';

/**
 * Cody-Beads Integration Plugin
 * Provides bidirectional sync between Beads and Cody systems through CLI commands
 */
export const codyBeadsPlugin: CLIPlugin = {
  name: 'cody-beads-integration',
  version: '0.5.0',
  description: 'Bidirectional sync between Beads and Cody task management systems',
  commands: [
    {
      name: 'sync',
      description: 'Sync Beads and Cody systems',
      handler: async (args: any, options: any) => {
        const { spawn } = await import('child_process');
        
        return new Promise((resolve, reject) => {
          const syncProcess = spawn('python3', [
            'scripts/automated-sync.py',
            ...(options.force ? ['--force'] : []),
            ...(options.trigger ? ['--trigger', options.trigger] : [])
          ], {
            stdio: 'inherit',
            cwd: process.cwd()
          });

          syncProcess.on('close', (code) => {
            if (code === 0) {
              resolve({ success: true, code });
            } else {
              reject(new Error(`Sync failed with exit code ${code}`));
            }
          });

          syncProcess.on('error', (error) => {
            reject(error);
          });
        });
      }
    },
    {
      name: 'init',
      description: 'Initialize project with Beads-Cody integration',
      handler: async (args, options) => {
        const { spawn } = await import('child_process');
        
        // Install automated sync system
        console.log('🚀 Installing Beads-Cody automated sync...');
        
        return new Promise((resolve, reject) => {
          const installProcess = spawn('python3', [
            'scripts/install-automated-sync.py'
          ], {
            stdio: 'inherit',
            cwd: process.cwd()
          });

          installProcess.on('close', (code) => {
            if (code === 0) {
              console.log('✅ Beads-Cody integration installed successfully');
              resolve({ success: true, code });
            } else {
              reject(new Error(`Installation failed with exit code ${code}`));
            }
          });

          installProcess.on('error', (error) => {
            reject(error);
          });
        });
      }
    },
    {
      name: 'status',
      description: 'Show sync system health and status',
      handler: async (args, options) => {
        const { spawn } = await import('child_process');
        
        return new Promise((resolve, reject) => {
          const monitorProcess = spawn('python3', [
            'scripts/sync-monitor.py'
          ], {
            stdio: 'pipe',
            cwd: process.cwd()
          });

          let output = '';
          let errorOutput = '';

          monitorProcess.stdout?.on('data', (data) => {
            output += data.toString();
          });

          monitorProcess.stderr?.on('data', (data) => {
            errorOutput += data.toString();
          });

          monitorProcess.on('close', (code) => {
            if (code === 0) {
              resolve({ 
                success: true, 
                status: 'healthy',
                output: output.trim()
              });
            } else {
              resolve({ 
                success: false, 
                status: 'unhealthy',
                output: output.trim(),
                error: errorOutput.trim()
              });
            }
          });

          monitorProcess.on('error', (error) => {
            reject(error);
          });
        });
      }
    },
    {
      name: 'config',
      description: 'Manage sync configuration',
      handler: async (args, options) => {
        const fs = await import('fs/promises');
        const path = await import('path');
        
        const configPath = path.join(process.cwd(), '.beads-cody-config.json');
        
        if (options.show) {
          try {
            const configData = await fs.readFile(configPath, 'utf-8');
            const config = JSON.parse(configData);
            console.log('Current Beads-Cody Configuration:');
            console.log(JSON.stringify(config, null, 2));
            return { success: true, config };
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
              console.log('No configuration file found. Using defaults.');
              return { success: true, config: null };
            }
            throw error;
          }
        }
        
        if (options.set) {
          const [key, value] = options.set.split('=');
          if (!key || !value) {
            throw new Error('Invalid format. Use: --set key=value');
          }
          
          let config: Record<string, any> = {};
          try {
            const configData = await fs.readFile(configPath, 'utf-8');
            config = JSON.parse(configData);
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
              throw error;
            }
          }
          
          // Set nested key support (e.g., sync.interval)
          const keys = key.split('.');
          let current: Record<string, any> = config;
          for (let i = 0; i < keys.length - 1; i++) {
            if (!(keys[i] in current)) {
              current[keys[i]] = {};
            }
            current = current[keys[i]];
          }
          
          // Convert value to appropriate type
          if (value === 'true') current[keys[keys.length - 1]] = true;
          else if (value === 'false') current[keys[keys.length - 1]] = false;
          else if (!isNaN(Number(value))) current[keys[keys.length - 1]] = Number(value);
          else current[keys[keys.length - 1]] = value;
          
          await fs.writeFile(configPath, JSON.stringify(config, null, 2));
          console.log(`✅ Configuration updated: ${key} = ${value}`);
          
          return { success: true, config };
        }
        
        // Show config usage
        console.log('Usage:');
        console.log('  opencode cody-beads-integration config --show    Show current configuration');
        console.log('  opencode cody-beads-integration config --set key=value  Set configuration value');
        console.log('');
        console.log('Available configuration keys:');
        console.log('  sync.interval        - Sync interval in seconds (default: 300)');
        console.log('  sync.auto_commit     - Auto-commit sync changes (default: true)');
        console.log('  sync.conflict_resolution - Conflict resolution strategy (default: "manual")');
        console.log('  logging.level        - Log level (default: "info")');
        
        return { success: true };
      }
    },
    {
      name: 'beads-create',
      description: 'Create a Beads issue',
      handler: async (args, options) => {
        const { spawn } = await import('child_process');
        
        const bdArgs = ['create'];
        
        if (args && args.title) bdArgs.push(args.title);
        if (options.type) bdArgs.push('-t', options.type);
        if (options.priority) bdArgs.push('-p', options.priority);
        if (options.description) bdArgs.push('-d', options.description);
        if (options.dependencies) bdArgs.push('--deps', options.dependencies);
        
        bdArgs.push('--json');
        
        return new Promise((resolve, reject) => {
          const createProcess = spawn('bd', bdArgs, {
            stdio: 'inherit',
            cwd: process.cwd()
          });

          createProcess.on('close', (code) => {
            if (code === 0) {
              resolve({ success: true, code });
            } else {
              reject(new Error(`Beads create failed with exit code ${code}`));
            }
          });

          createProcess.on('error', (error) => {
            reject(error);
          });
        });
      }
    },
    {
      name: 'beads-ready',
      description: 'Show ready Beads issues',
      handler: async (args, options) => {
        const { spawn } = await import('child_process');
        
        const bdArgs = ['ready'];
        if (options.json) bdArgs.push('--json');
        if (options.limit) bdArgs.push('--limit', options.limit);
        
        return new Promise((resolve, reject) => {
          const readyProcess = spawn('bd', bdArgs, {
            stdio: 'inherit',
            cwd: process.cwd()
          });

          readyProcess.on('close', (code) => {
            if (code === 0) {
              resolve({ success: true, code });
            } else {
              reject(new Error(`Beads ready failed with exit code ${code}`));
            }
          });

          readyProcess.on('error', (error) => {
            reject(error);
          });
        });
      }
    },
    {
      name: 'beads-update',
      description: 'Update a Beads issue',
      handler: async (args: any, options: any) => {
        const { spawn } = await import('child_process');
        
        if (!args || !args.id) {
          throw new Error('Issue ID is required. Usage: beads-update <id> [options]');
        }
        
        const bdArgs = ['update', args.id];
        
        if (options.status) bdArgs.push('--status', options.status);
        if (options.priority) bdArgs.push('--priority', options.priority);
        if (options.notes) bdArgs.push('--notes', options.notes);
        if (options.json) bdArgs.push('--json');
        
        return new Promise((resolve, reject) => {
          const updateProcess = spawn('bd', bdArgs, {
            stdio: 'inherit',
            cwd: process.cwd()
          });

          updateProcess.on('close', (code) => {
            if (code === 0) {
              resolve({ success: true, code });
            } else {
              reject(new Error(`Beads update failed with exit code ${code}`));
            }
          });

          updateProcess.on('error', (error) => {
            reject(error);
          });
        });
      }
    },
    {
      name: 'beads-close',
      description: 'Close a Beads issue',
      handler: async (args, options) => {
        const { spawn } = await import('child_process');
        
        if (!args.id) {
          throw new Error('Issue ID is required. Usage: beads-close <id> [options]');
        }
        
        const bdArgs = ['close', args.id];
        
        if (options.reason) bdArgs.push('--reason', options.reason);
        if (options.json) bdArgs.push('--json');
        
        return new Promise((resolve, reject) => {
          const closeProcess = spawn('bd', bdArgs, {
            stdio: 'inherit',
            cwd: process.cwd()
          });

          closeProcess.on('close', (code) => {
            if (code === 0) {
              resolve({ success: true, code });
            } else {
              reject(new Error(`Beads close failed with exit code ${code}`));
            }
          });

          closeProcess.on('error', (error) => {
            reject(error);
          });
        });
      }
    }
  ],
  middleware: [
    {
      name: 'timing-middleware',
      execute: async (context: any, next: () => Promise<void>) => {
        const start = Date.now();
        await next();
        const duration = Date.now() - start;
        
        // Store timing in metadata for potential logging
        context.metadata.set('executionTime', duration);
      }
    },
    {
      name: 'error-handling-middleware',
      execute: async (context: any, next: () => Promise<void>) => {
        try {
          await next();
        } catch (error) {
          // Add error context to metadata
          context.metadata.set('error', {
            message: (error as Error).message,
            command: context.command,
            args: context.args,
            timestamp: new Date().toISOString()
          });
          throw error;
        }
      }
    }
  ],
  hooks: {
    beforeCommand: async (command: string, args: any) => {
      // Could add pre-command validation here
      if (command === 'beads-create' && (!args || !args.title)) {
        console.warn('⚠️  Creating issue without title may not be optimal');
      }
    },
    afterCommand: async (command: string, result: any) => {
      // Could add post-command logging here
      const executionTime = result?.executionTime;
      if (executionTime && executionTime > 5000) {
        console.warn(`⚠️  Command '${command}' took ${executionTime}ms to execute`);
      }
    },
    onError: async (error: Error, command: string) => {
      // Centralized error handling
      console.error(`❌ Error in command '${command}': ${error.message}`);
      
      // Could add error reporting here
      if (process.env.NODE_ENV === 'production') {
        // Send to error tracking service
      }
    }
  }
};