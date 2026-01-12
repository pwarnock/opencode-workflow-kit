import { readFileSync, existsSync, promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface TemplateVariables {
  projectName: string;
  projectPath: string;
  timestamp: string;
  userName: string;
  userEmail: string;
}

export interface ClaudeTemplate {
  name: string;
  description: string;
  schema: string;
  systemPrompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface OpenCodeTemplate {
  name: string;
  description: string;
  agents: string[];
  features: string[];
}

const AVAILABLE_TEMPLATES: Record<string, ClaudeTemplate | OpenCodeTemplate> = {
  'minimal': {
    name: 'minimal',
    description: 'Minimal configuration for simple projects',
    schema: 'claude',
    systemPrompt: 'You are a helpful AI assistant.',
    model: 'claude-sonnet-4-20250514',
    temperature: 0.7,
    maxTokens: 4096
  } as ClaudeTemplate,
  'standard': {
    name: 'standard',
    description: 'Standard configuration with common tools',
    schema: 'claude',
    systemPrompt: 'You are the Liaison agent. You help with workflow automation and task management.',
    model: 'claude-sonnet-4-20250514',
    temperature: 0.7,
    maxTokens: 8192
  } as ClaudeTemplate,
  'full': {
    name: 'full',
    description: 'Full configuration with all features enabled',
    schema: 'claude',
    systemPrompt: 'You are the Liaison agent for {{projectName}}. You help with workflow automation, task management, and multi-agent coordination.',
    model: 'claude-sonnet-4-20250514',
    temperature: 0.7,
    maxTokens: 16384
  } as ClaudeTemplate,
  'research': {
    name: 'research',
    description: 'Research-focused configuration with web fetching',
    schema: 'claude',
    systemPrompt: 'You are a research specialist. You help find documentation, analyze APIs, and provide technical guidance.',
    model: 'claude-sonnet-4-20250514',
    temperature: 0.3,
    maxTokens: 8192
  } as ClaudeTemplate,
  'development': {
    name: 'development',
    description: 'Development-focused configuration with code tools',
    schema: 'opencode',
    agents: ['cli-specialist', 'code-reviewer'],
    features: ['command-patterns', 'code-review', 'quality-assurance']
  } as OpenCodeTemplate
};

export function getAvailableTemplates(): Array<{ name: string; description: string; schema: string }> {
  return Object.entries(AVAILABLE_TEMPLATES).map(([name, template]) => ({
    name,
    description: template.description,
    schema: 'schema' in template ? String(template.schema) : 'opencode'
  }));
}

export function getTemplateDetails(templateName: string): ClaudeTemplate | OpenCodeTemplate | null {
  const template = AVAILABLE_TEMPLATES[templateName];
  if (!template) {
    return null;
  }
  return { ...template };
}

export function substituteTemplateVariables(content: string, variables: TemplateVariables): string {
  let result = content;
  result = result.replace(/\{\{projectName\}\}/g, variables.projectName);
  result = result.replace(/\{\{projectPath\}\}/g, variables.projectPath);
  result = result.replace(/\{\{timestamp\}\}/g, variables.timestamp);
  result = result.replace(/\{\{userName\}\}/g, variables.userName);
  result = result.replace(/\{\{userEmail\}\}/g, variables.userEmail);
  return result;
}

export function validateRequiredVariables(variables: Partial<TemplateVariables>): { valid: boolean; missing: string[] } {
  const required: (keyof TemplateVariables)[] = ['projectName', 'projectPath', 'timestamp', 'userName', 'userEmail'];
  const missing = required.filter(key => !variables[key]);

  return {
    valid: missing.length === 0,
    missing: missing as string[]
  };
}

export function createTemplateVariables(
  projectPath: string,
  userName?: string,
  userEmail?: string
): TemplateVariables {
  return {
    projectName: projectPath.split('/').pop() || 'unknown-project',
    projectPath,
    timestamp: new Date().toISOString(),
    userName: userName || process.env.USER || process.env.USERNAME || 'unknown',
    userEmail: userEmail || process.env.EMAIL || ''
  };
}

export async function loadTemplateFromPackage(templateName: string): Promise<string | null> {
  try {
    const templatePath = join(__dirname, '../../../../opencode_config/src/templates', `${templateName}.json`);

    if (existsSync(templatePath)) {
      return readFileSync(templatePath, 'utf-8');
    }

    const claudeTemplatePath = join(__dirname, '../../../../opencode_config/src/templates/claude', `${templateName}.json`);

    if (existsSync(claudeTemplatePath)) {
      return readFileSync(claudeTemplatePath, 'utf-8');
    }

    return null;
  } catch {
    return null;
  }
}

export function generateConfiguredContent(
  template: ClaudeTemplate | OpenCodeTemplate,
  variables: TemplateVariables
): string {
  if ('systemPrompt' in template) {
    const processedPrompt = substituteTemplateVariables(template.systemPrompt, variables);

    const config = {
      $schema: 'https://claude.com/config.json',
      name: `${template.name}-agent`,
      description: template.description,
      model: template.model,
      temperature: template.temperature,
      maxTokens: template.maxTokens,
      systemPrompt: processedPrompt,
      generated: variables.timestamp,
      template: template.name
    };

    return JSON.stringify(config, null, 2);
  } else {
    const config = {
      $schema: 'https://opencode.ai/config.json',
      version: '1.0.0',
      template: template.name,
      project: {
        name: variables.projectName,
        path: variables.projectPath
      },
      agents: template.agents,
      features: template.features,
      generated: variables.timestamp
    };

    return JSON.stringify(config, null, 2);
  }
}
