import { CLIPlugin } from './types.js';

/**
 * Liaison Integration Plugin
 * Provides seamless integration between Liaison and task management systems through CLI commands
 */
export const liaisonPlugin: CLIPlugin = {
  name: 'liaison',
  version: '0.5.0',
  description: 'Seamless integration between Liaison and task management systems',
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
      description: 'Initialize project with Liaison integration',
      handler: async (_args, _options) => {
        const { spawn } = await import('child_process');
        
        // Install automated sync system
        console.log('🚀 Installing Liaison automated sync...');
        
        return new Promise((resolve, reject) => {
          const installProcess = spawn('python3', [
            'scripts/install-automated-sync.py'
          ], {
            stdio: 'inherit',
            cwd: process.cwd()
          });

          installProcess.on('close', (code) => {
            if (code === 0) {
              console.log('✅ Liaison integration installed successfully');
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
      handler: async (_args, _options) => {
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
        
        const configPath = path.join(process.cwd(), '.liaison-config.json');
        
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
        console.log('  opencode liaison config --show    Show current configuration');
        console.log('  opencode liaison config --set key=value  Set configuration value');
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
    },
    {
      name: 'listTasks',
      description: 'List all tasks from Beads system',
      handler: async (args, options) => {
        const { spawn } = await import('child_process');

        const bdArgs = ['list'];
        if (options.json) bdArgs.push('--json');
        if (options.status) bdArgs.push('--status', options.status);
        if (options.priority) bdArgs.push('--priority', options.priority);
        if (options.limit) bdArgs.push('--limit', options.limit);

        return new Promise((resolve, reject) => {
          const listProcess = spawn('bd', bdArgs, {
            stdio: 'inherit',
            cwd: process.cwd()
          });

          listProcess.on('close', (code) => {
            if (code === 0) {
              resolve({ success: true, code });
            } else {
              reject(new Error(`Beads list failed with exit code ${code}`));
            }
          });

          listProcess.on('error', (error) => {
            reject(error);
          });
        });
      }
    },
    {
      name: 'createTask',
      description: 'Create a new task in Beads system',
      handler: async (args, options) => {
        const { spawn } = await import('child_process');

        if (!args.title) {
          throw new Error('Task title is required');
        }

        const bdArgs = ['create', args.title];
        if (options.type) bdArgs.push('-t', options.type);
        if (options.priority) bdArgs.push('-p', options.priority);
        if (options.description) bdArgs.push('-d', options.description);
        if (options.dependencies) bdArgs.push('--deps', options.dependencies);

        return new Promise((resolve, reject) => {
          const createProcess = spawn('bd', bdArgs, {
            stdio: 'inherit',
            cwd: process.cwd()
          });

          createProcess.on('close', (code) => {
            if (code === 0) {
              resolve({ success: true, code });
            } else {
              reject(new Error(`Task creation failed with exit code ${code}`));
            }
          });

          createProcess.on('error', (error) => {
            reject(error);
          });
        });
      }
    },
    {
      name: 'updateTask',
      description: 'Update an existing task in Beads system',
      handler: async (args, options) => {
        const { spawn } = await import('child_process');

        if (!args.id) {
          throw new Error('Task ID is required');
        }

        const bdArgs = ['update', args.id];
        if (options.status) bdArgs.push('--status', options.status);
        if (options.priority) bdArgs.push('--priority', options.priority);
        if (options.notes) bdArgs.push('--notes', options.notes);
        if (options.title) bdArgs.push('--title', options.title);

        return new Promise((resolve, reject) => {
          const updateProcess = spawn('bd', bdArgs, {
            stdio: 'inherit',
            cwd: process.cwd()
          });

          updateProcess.on('close', (code) => {
            if (code === 0) {
              resolve({ success: true, code });
            } else {
              reject(new Error(`Task update failed with exit code ${code}`));
            }
          });

          updateProcess.on('error', (error) => {
            reject(error);
          });
        });
      }
    },
    {
      name: 'deleteTask',
      description: 'Delete a task from Beads system',
      handler: async (args, options) => {
        const { spawn } = await import('child_process');

        if (!args.id) {
          throw new Error('Task ID is required');
        }

        const bdArgs = ['delete', args.id];
        if (options.force) bdArgs.push('--force');

        return new Promise((resolve, reject) => {
          const deleteProcess = spawn('bd', bdArgs, {
            stdio: 'inherit',
            cwd: process.cwd()
          });

          deleteProcess.on('close', (code) => {
            if (code === 0) {
              resolve({ success: true, code });
            } else {
              reject(new Error(`Task deletion failed with exit code ${code}`));
            }
          });

          deleteProcess.on('error', (error) => {
            reject(error);
          });
        });
      }
    },
    {
      name: 'syncTasks',
      description: 'Sync tasks between Beads and Cody systems',
      handler: async (args, options) => {
        const { spawn } = await import('child_process');

        const syncArgs = ['scripts/sync-tasks.py'];
        if (options.force) syncArgs.push('--force');
        if (options.dryRun) syncArgs.push('--dry-run');

        return new Promise((resolve, reject) => {
          const syncProcess = spawn('python3', syncArgs, {
            stdio: 'inherit',
            cwd: process.cwd()
          });

          syncProcess.on('close', (code) => {
            if (code === 0) {
              resolve({ success: true, code });
            } else {
              reject(new Error(`Task sync failed with exit code ${code}`));
            }
          });

          syncProcess.on('error', (error) => {
            reject(error);
          });
        });
      }
    },
    {
      name: 'assignTask',
      description: 'Assign a task to a user',
      handler: async (args, _options) => {
        const { spawn } = await import('child_process');

        if (!args.id || !args.user) {
          throw new Error('Task ID and user are required');
        }

        const bdArgs = ['assign', args.id, args.user];

        return new Promise((resolve, reject) => {
          const assignProcess = spawn('bd', bdArgs, {
            stdio: 'inherit',
            cwd: process.cwd()
          });

          assignProcess.on('close', (code) => {
            if (code === 0) {
              resolve({ success: true, code });
            } else {
              reject(new Error(`Task assignment failed with exit code ${code}`));
            }
          });

          assignProcess.on('error', (error) => {
            reject(error);
          });
        });
      }
    },
    {
      name: 'listWorkflows',
      description: 'List all available workflows',
      handler: async (args, options) => {
        const { spawn } = await import('child_process');

        const workflowArgs = ['scripts/list-workflows.py'];
        if (options.json) workflowArgs.push('--json');

        return new Promise((resolve, reject) => {
          const listProcess = spawn('python3', workflowArgs, {
            stdio: 'inherit',
            cwd: process.cwd()
          });

          listProcess.on('close', (code) => {
            if (code === 0) {
              resolve({ success: true, code });
            } else {
              reject(new Error(`Workflow listing failed with exit code ${code}`));
            }
          });

          listProcess.on('error', (error) => {
            reject(error);
          });
        });
      }
    },
    {
      name: 'createWorkflow',
      description: 'Create a new workflow',
      handler: async (args, options) => {
        const { spawn } = await import('child_process');

        if (!args.name) {
          throw new Error('Workflow name is required');
        }

        const workflowArgs = ['scripts/create-workflow.py', args.name];
        if (options.template) workflowArgs.push('--template', options.template);
        if (options.description) workflowArgs.push('--description', options.description);

        return new Promise((resolve, reject) => {
          const createProcess = spawn('python3', workflowArgs, {
            stdio: 'inherit',
            cwd: process.cwd()
          });

          createProcess.on('close', (code) => {
            if (code === 0) {
              resolve({ success: true, code });
            } else {
              reject(new Error(`Workflow creation failed with exit code ${code}`));
            }
          });

          createProcess.on('error', (error) => {
            reject(error);
          });
        });
      }
    },
    {
      name: 'runWorkflow',
      description: 'Run a workflow',
      handler: async (args, options) => {
        const { spawn } = await import('child_process');

        if (!args.name) {
          throw new Error('Workflow name is required');
        }

        const workflowArgs = ['scripts/run-workflow.py', args.name];
        if (options.force) workflowArgs.push('--force');
        if (options.dryRun) workflowArgs.push('--dry-run');

        return new Promise((resolve, reject) => {
          const runProcess = spawn('python3', workflowArgs, {
            stdio: 'inherit',
            cwd: process.cwd()
          });

          runProcess.on('close', (code) => {
            if (code === 0) {
              resolve({ success: true, code });
            } else {
              reject(new Error(`Workflow execution failed with exit code ${code}`));
            }
          });

          runProcess.on('error', (error) => {
            reject(error);
          });
        });
      }
    },
    {
      name: 'scheduleWorkflow',
      description: 'Schedule a workflow to run at a specific time',
      handler: async (args, options) => {
        const { spawn } = await import('child_process');

        if (!args.name || !args.time) {
          throw new Error('Workflow name and schedule time are required');
        }

        const workflowArgs = ['scripts/schedule-workflow.py', args.name, args.time];
        if (options.recurring) workflowArgs.push('--recurring');
        if (options.interval) workflowArgs.push('--interval', options.interval);

        return new Promise((resolve, reject) => {
          const scheduleProcess = spawn('python3', workflowArgs, {
            stdio: 'inherit',
            cwd: process.cwd()
          });

          scheduleProcess.on('close', (code) => {
            if (code === 0) {
              resolve({ success: true, code });
            } else {
              reject(new Error(`Workflow scheduling failed with exit code ${code}`));
            }
          });

          scheduleProcess.on('error', (error) => {
            reject(error);
          });
        });
      }
    },
    {
      name: 'showWorkflowLogs',
      description: 'Show logs for a workflow execution',
      handler: async (args, options) => {
        const { spawn } = await import('child_process');

        if (!args.name) {
          throw new Error('Workflow name is required');
        }

        const workflowArgs = ['scripts/show-workflow-logs.py', args.name];
        if (options.follow) workflowArgs.push('--follow');
        if (options.limit) workflowArgs.push('--limit', options.limit);

        return new Promise((resolve, reject) => {
          const logsProcess = spawn('python3', workflowArgs, {
            stdio: 'inherit',
            cwd: process.cwd()
          });

          logsProcess.on('close', (code) => {
            if (code === 0) {
              resolve({ success: true, code });
            } else {
              reject(new Error(`Workflow logs retrieval failed with exit code ${code}`));
            }
          });

          logsProcess.on('error', (error) => {
            reject(error);
          });
        });
      }
    },
    {
      name: 'searchPlugins',
      description: 'Search for available plugins',
      handler: async (args, options) => {
        const { spawn } = await import('child_process');

        const pluginArgs = ['scripts/search-plugins.py'];
        if (args.query) pluginArgs.push(args.query);
        if (options.json) pluginArgs.push('--json');
        if (options.limit) pluginArgs.push('--limit', options.limit);

        return new Promise((resolve, reject) => {
          const searchProcess = spawn('python3', pluginArgs, {
            stdio: 'inherit',
            cwd: process.cwd()
          });

          searchProcess.on('close', (code) => {
            if (code === 0) {
              resolve({ success: true, code });
            } else {
              reject(new Error(`Plugin search failed with exit code ${code}`));
            }
          });

          searchProcess.on('error', (error) => {
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