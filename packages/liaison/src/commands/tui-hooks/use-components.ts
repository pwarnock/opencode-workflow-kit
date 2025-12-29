import { promises as fs } from 'fs';
import { spawn } from 'child_process';
import * as path from 'path';

export interface Component {
  id: string;
  name: string;
  description: string;
  status: 'installed' | 'not-installed';
  type: 'skill' | 'agent' | 'workflow' | 'plugin';
  path?: string;
}

export async function discoverComponents(
  type: string
): Promise<Component[]> {
  switch (type) {
    case 'skills':
      return discoverSkills();
    case 'agents':
      return discoverAgents();
    case 'workflows':
      return discoverWorkflows();
    case 'plugins':
      return discoverPlugins();
    default:
      return [];
  }
}

async function discoverSkills(): Promise<Component[]> {
  const skillsDir = path.join(process.cwd(), '.skills');
  const skills: Component[] = [];

  try {
    const entries = await fs.readdir(skillsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillPath = path.join(skillsDir, entry.name);
        const skillMdPath = path.join(skillPath, 'SKILL.md');

        try {
          const content = await fs.readFile(skillMdPath, 'utf-8');
          const nameMatch = content.match(/^name:\s*(.+)$/m);
          const descMatch = content.match(/^description:\s*(.+)$/m);

          skills.push({
            id: entry.name,
            name: nameMatch?.[1]?.trim() || entry.name,
            description: descMatch?.[1]?.trim() || 'No description available',
            status: 'installed',
            type: 'skill',
            path: skillPath,
          });
        } catch {
          skills.push({
            id: entry.name,
            name: entry.name,
            description: 'Invalid skill structure',
            status: 'installed',
            type: 'skill',
            path: skillPath,
          });
        }
      }
    }
  } catch (error) {
    console.error('Error discovering skills:', error);
  }

  return skills;
}

async function discoverAgents(): Promise<Component[]> {
  const agentsDir = path.join(process.cwd(), 'agents');
  const agents: Component[] = [];

  try {
    const entries = await fs.readdir(agentsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.json')) {
        const agentPath = path.join(agentsDir, entry.name);

        try {
          const content = await fs.readFile(agentPath, 'utf-8');
          const config = JSON.parse(content);

          agents.push({
            id: entry.name.replace('.json', ''),
            name: config.name || entry.name.replace('.json', ''),
            description: config.description || 'No description available',
            status: 'installed',
            type: 'agent',
            path: agentPath,
          });
        } catch {
          agents.push({
            id: entry.name.replace('.json', ''),
            name: entry.name.replace('.json', ''),
            description: 'Invalid agent config',
            status: 'installed',
            type: 'agent',
            path: agentPath,
          });
        }
      }
    }
  } catch (error) {
    console.error('Error discovering agents:', error);
  }

  return agents;
}

async function discoverWorkflows(): Promise<Component[]> {
  const workflowsDir = path.join(process.cwd(), 'config/workflows');
  const workflows: Component[] = [];

  try {
    const entries = await fs.readdir(workflowsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.json')) {
        const workflowPath = path.join(workflowsDir, entry.name);

        try {
          const content = await fs.readFile(workflowPath, 'utf-8');
          const config = JSON.parse(content);

          workflows.push({
            id: entry.name.replace('.json', ''),
            name: config.name || entry.name.replace('.json', ''),
            description: config.description || 'No description available',
            status: 'installed',
            type: 'workflow',
            path: workflowPath,
          });
        } catch {
          workflows.push({
            id: entry.name.replace('.json', ''),
            name: entry.name.replace('.json', ''),
            description: 'Invalid workflow config',
            status: 'installed',
            type: 'workflow',
            path: workflowPath,
          });
        }
      }
    }
  } catch (error) {
    console.error('Error discovering workflows:', error);
  }

  return workflows;
}

async function discoverPlugins(): Promise<Component[]> {
  return [];
}

export async function removeComponent(component: Component): Promise<{ success: boolean; message: string }> {
  if (!component.path) {
    return { success: false, message: 'No path available for component' };
  }

  try {
    await backupComponent(component);

    const stat = await fs.stat(component.path);
    if (stat.isDirectory()) {
      await fs.rm(component.path, { recursive: true, force: true });
    } else {
      await fs.unlink(component.path);
    }

    return { success: true, message: `${component.type} removed successfully` };
  } catch (error) {
    return {
      success: false,
      message: `Failed to remove ${component.type}: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function backupComponent(component: Component): Promise<void> {
  const backupDir = path.join(process.cwd(), '.liaison-backup');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const componentBackupDir = path.join(backupDir, `${component.type}s`, timestamp, component.id);

  try {
    await fs.mkdir(componentBackupDir, { recursive: true });

    if (component.path) {
      const stat = await fs.stat(component.path);

      if (stat.isDirectory()) {
        await fs.cp(component.path, path.join(componentBackupDir, component.id), {
          recursive: true,
        });
      } else {
        await fs.copyFile(component.path, path.join(componentBackupDir, path.basename(component.path)));
      }
    }
  } catch (error) {
    console.warn('Backup failed:', error);
  }
}

export async function createSkill(name: string, template?: string): Promise<{ success: boolean; message: string }> {
  try {
    const args = ['skill', 'create', name];
    if (template) {
      args.push(`--template`, template);
    }

    await new Promise<void>((resolve, reject) => {
      const proc = spawn('bun', ['packages/liaison/src/cli.ts', ...args], {
        stdio: 'inherit',
        cwd: process.cwd(),
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Process exited with code ${code}`));
        }
      });

      proc.on('error', reject);
    });

    return { success: true, message: `Skill '${name}' created successfully` };
  } catch (error) {
    return {
      success: false,
      message: `Failed to create skill: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function createAgent(name: string, template?: string): Promise<{ success: boolean; message: string }> {
  try {
    const args = ['opencode', 'agent', name];
    if (template) {
      args.push('--template', template);
    }

    await new Promise<void>((resolve, reject) => {
      const proc = spawn('bun', ['packages/liaison/src/cli.ts', ...args], {
        stdio: 'inherit',
        cwd: process.cwd(),
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Process exited with code ${code}`));
        }
      });

      proc.on('error', reject);
    });

    return { success: true, message: `Agent '${name}' created successfully` };
  } catch (error) {
    return {
      success: false,
      message: `Failed to create agent: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function createWorkflow(name: string): Promise<{ success: boolean; message: string }> {
  try {
    const args = ['workflow', 'create', name];

    await new Promise<void>((resolve, reject) => {
      const proc = spawn('bun', ['packages/liaison/src/cli.ts', ...args], {
        stdio: 'inherit',
        cwd: process.cwd(),
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Process exited with code ${code}`));
        }
      });

      proc.on('error', reject);
    });

    return { success: true, message: `Workflow '${name}' created successfully` };
  } catch (error) {
    return {
      success: false,
      message: `Failed to create workflow: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
