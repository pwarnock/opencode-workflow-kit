import { readFileSync } from 'fs';
import { join as pathJoin } from 'path';

import { FREE_MODELS } from '../types/models.js';
import { SubagentOptions } from '../types/templates.js';

/**
 * Generate subagent structure based on agent type and options
 */
function generateSubagentStructure(name: string, options: SubagentOptions): any {
  const templateName = options.template || name;
  const templateLower = templateName.toLowerCase();

  const specializations: Record<string, any> = {
    'custom-agent': {
      domain: 'general',
      framework: 'general',
      capabilities: ['general-assistance']
    },
    'qa-subagent': {
      domain: 'quality-assurance',
      framework: 'testing',
      capabilities: ['test-strategy', 'test-execution', 'quality-gate-enforcement', 'performance-testing']
    },
    'security-subagent': {
      domain: 'security-assurance',
      framework: 'security',
      capabilities: ['vulnerability-scanning', 'security-audit', 'compliance-validation', 'threat-modeling']
    },
    'library-researcher': {
      domain: 'library-research',
      framework: 'research',
      capabilities: ['library-research', 'documentation-analysis', 'context7-integration']
    },
    'code-reviewer': {
      domain: 'code-review',
      framework: 'quality',
      capabilities: ['code-review', 'quality-assurance', 'best-practices-enforcement', 'security-review']
    },
    'docs-writer': {
      domain: 'documentation',
      framework: 'technical-writing',
      capabilities: ['documentation-generation', 'api-docs', 'tutorials', 'user-guides']
    },
    'liaison-specialist': {
      domain: 'liaison-architecture',
      framework: 'workflow-automation',
      capabilities: ['workflow-design', 'task-automation', 'integration-management', 'architecture-guidance']
    },
    'cli-specialist': {
      domain: 'cli-development',
      framework: 'commander.js',
      capabilities: ['command-patterns', 'argument-validation', 'cli-ux', 'help-text-formatting', 'error-handling', 'option-definition'],
      required_skills: ['cli-development', 'bun-development']
    },
    'ci-cd-specialist': {
      domain: 'devops',
      framework: 'github-actions',
      capabilities: ['ci-setup', 'test-automation', 'coverage-enforcement', 'quality-gates', 'workflow-automation', 'artifact-management'],
      required_skills: ['testing-automation', 'bun-development']
    },
    'release-engineer': {
      domain: 'release-management',
      framework: 'changesets',
      capabilities: ['version-bump', 'changelog-gen', 'npm-publish', 'github-releases', 'version-coordination', 'release-coordination'],
      required_skills: ['release-publishing', 'git-automation', 'bun-development']
    },
    'security-validator': {
      domain: 'security-assurance',
      framework: 'owasp-cwe-snyk',
      capabilities: ['dependency-audit', 'secret-detection', 'vulnerability-management', 'compliance-validation', 'threat-modeling', 'code-security-review'],
      required_skills: ['security-scanning', 'git-automation']
    },
    'workflow-architect': {
      domain: 'workflow-automation',
      framework: 'liaison',
      capabilities: ['agent-orchestration', 'delegation-routing', 'workflow-graph', 'inter-agent-communication', 'workflow-design', 'task-driven-automation'],
      required_skills: ['subagent-coordination', 'liaison-workflows', 'bun-development']
    }
  };
  
  const baseSpecialization = specializations[templateLower];
  if (!baseSpecialization && options.template) {
    throw new Error(`Unknown template: '${options.template}'. Available templates: ${Object.keys(specializations).join(', ')}`);
  }

  const fallbackSpecialization = {
    domain: options.domain || 'general',
    framework: options.framework || 'general',
    capabilities: options.capabilities || ['general-assistance']
  };

  return { ...(baseSpecialization || fallbackSpecialization), ...options };
}

/**
 * Get tool permissions based on domain
 */
function getToolPermissions(domain: string): any {
  const basePermissions = {
    read: true,
    write: false,
    edit: true,
    bash: false,
    webfetch: true,
    grep: false,
    glob: false,
    list: false,
    patch: false,
    todowrite: false,
    todoread: false
  };
  
  const domainPermissions: Record<string, any> = {
    'quality-assurance': {
      bash: true,
      write: true,
      list: true
    },
    'security-assurance': {
      bash: true,
      grep: true,
      list: true
    },
    'library-research': {
      webfetch: true,
      grep: true
    },
    'code-review': {
      edit: true,
      grep: true
    },
    'documentation': {
      write: true,
      edit: true,
      bash: true
    },
    'liaison-architecture': {
      bash: true,
      write: true,
      list: true,
      patch: true
    },
    'cli-development': {
      read: true,
      write: true,
      edit: true,
      bash: true,
      grep: true,
      glob: true,
      list: true,
      todowrite: true,
      todoread: true
    },
    'devops': {
      read: true,
      write: true,
      edit: true,
      bash: true,
      grep: true,
      glob: true,
      list: true,
      todowrite: true,
      todoread: true
    },
    'release-management': {
      read: true,
      write: true,
      edit: true,
      bash: true,
      grep: true,
      glob: true,
      list: true,
      todowrite: true,
      todoread: true
    },
    'workflow-automation': {
      read: true,
      write: true,
      edit: true,
      bash: true,
      grep: true,
      glob: true,
      list: true,
      todowrite: true,
      todoread: true
    }
  };
  
  return { ...basePermissions, ...domainPermissions[domain] };
}

/**
 * Template processing system for OpenCode subagent configurations
 * 
 * Note: Subagents can declare required_skills in their specialization.
 * These are optional and used for runtime validation/warnings only.
 * See: schemas/subagent-config.json and .skills/ directory
 */

export function generateSubagentConfig(name: string, options: SubagentOptions = {}): string {
  // Generate subagent-specific configuration
  const specialization = generateSubagentStructure(name, options);
  const tools = getToolPermissions(specialization.domain);
  
  // Generate permission matrix
  const permissions = {
    read: true,
    write: false,
    execute: false,
    admin: false
  };
  
  // Generate environment variables
  const environment: any = {
    CODY_MODE: specialization.domain === 'quality-assurance' ? 'qa' : 'subagent',
    OPENCODE_CONTEXT: specialization.domain
  };
  
  if (specialization.domain === 'library-research') {
    environment['CONTEXT7_API_KEY'] = '${CONTEXT7_API_KEY}';
  }
  
  // Generate behavior config
  const behavior = {
    conservative: ['security-assurance', 'quality-assurance', 'code-review'].includes(specialization.domain),
    confirmation_required: ['security-assurance', 'quality-assurance', 'code-review'].includes(specialization.domain),
    context_preservation: true,
    rollback_enabled: specialization.domain === 'liaison-architecture',
    system_aware: true,
    version_aware: true
  };
  
  // Prepare template variables
  const envVars = Object.entries(environment)
    .map(([key, value]) => `    "${key}": "${value}"`)
    .join(',\n');
  
  const capabilities = specialization.capabilities
    .map((cap: string) => `      "${cap}"`)
    .join(',\n');

  const requiredSkillsSection = specialization.required_skills
    ? `,
    "required_skills": [
${specialization.required_skills.map((skill: string) => `      "${skill}"`).join(',\n')}
    ]`
    : '';
  
  // Use default model (big-pickle) - models managed through configuration
  const modelInfo = FREE_MODELS['big-pickle'];
  
  const template = `{
  "$schema": "../schemas/subagent-config.json",
  "description": "{{description}}",
  "mode": "subagent",
  "tools": {
    "read": {{tools.read}},
    "write": {{tools.write}},
    "edit": {{tools.edit}},
    "bash": {{tools.bash}},
    "webfetch": {{tools.webfetch}},
    "grep": {{tools.grep}},
    "glob": {{tools.glob}},
    "list": {{tools.list}},
    "patch": {{tools.patch}},
    "todowrite": {{tools.todowrite}},
    "todoread": {{tools.todoread}}
  },
  "permissions": {
    "read": {{permissions.read}},
    "write": {{permissions.write}},
    "execute": {{permissions.execute}},
    "admin": {{permissions.admin}}
  },
  "environment": {
    {{environmentVars}}
  },
  "behavior": {
    "conservative": {{behavior.conservative}},
    "confirmation_required": {{behavior.confirmation_required}},
    "context_preservation": {{behavior.context_preservation}},
    "rollback_enabled": {{behavior.rollback_enabled}},
    "system_aware": {{behavior.system_aware}},
    "version_aware": {{behavior.version_aware}}
  },
  "specialization": {
    "domain": "{{specialization.domain}}",
    "framework": "{{specialization.framework}}",
    "capabilities": [
      {{specialization.capabilities}}
    ]{{requiredSkillsSection}}
  }
}`;
  
  return template
    .replace(/\{\{name\}\}/g, name)
    .replace(/\{\{description\}\}/g, options.description || `Specialized ${name} agent`)
    .replace(/\{\{model\}\}/g, modelInfo.id)
    .replace(/\{\{modelName\}\}/g, modelInfo.name)
    .replace(/\{\{contextWindow\}\}/g, modelInfo.context.toString())
    .replace(/\{\{temperature\}\}/g, (options.temperature || 0.1).toString())
    .replace(/\{\{inputCost\}\}/g, modelInfo.cost.input.toString())
    .replace(/\{\{outputCost\}\}/g, modelInfo.cost.output.toString())
    .replace(/\{\{tools\.read\}\}/g, String(tools.read || false))
    .replace(/\{\{tools\.write\}\}/g, String(tools.write || false))
    .replace(/\{\{tools\.edit\}\}/g, String(tools.edit || false))
    .replace(/\{\{tools\.bash\}\}/g, String(tools.bash || false))
    .replace(/\{\{tools\.webfetch\}\}/g, String(tools.webfetch || false))
    .replace(/\{\{tools\.grep\}\}/g, String(tools.grep || false))
    .replace(/\{\{tools\.glob\}\}/g, String(tools.glob || false))
    .replace(/\{\{tools\.list\}\}/g, String(tools.list || false))
    .replace(/\{\{tools\.patch\}\}/g, String(tools.patch || false))
    .replace(/\{\{tools\.todowrite\}\}/g, String(tools.todowrite || false))
    .replace(/\{\{tools\.todoread\}\}/g, String(tools.todoread || false))
    .replace(/\{\{permissions\.read\}\}/g, String(permissions.read || false))
    .replace(/\{\{permissions\.write\}\}/g, String(permissions.write || false))
    .replace(/\{\{permissions\.execute\}\}/g, String(permissions.execute || false))
    .replace(/\{\{permissions\.admin\}\}/g, String(permissions.admin || false))
    .replace(/\{\{environmentVars\}\}/g, envVars)
    .replace(/\{\{behavior\.conservative\}\}/g, String(behavior.conservative || false))
    .replace(/\{\{behavior\.confirmation_required\}\}/g, String(behavior.confirmation_required || false))
    .replace(/\{\{behavior\.context_preservation\}\}/g, String(behavior.context_preservation || false))
    .replace(/\{\{behavior\.rollback_enabled\}\}/g, String(behavior.rollback_enabled || false))
    .replace(/\{\{behavior\.system_aware\}\}/g, String(behavior.system_aware || false))
    .replace(/\{\{behavior\.version_aware\}\}/g, String(behavior.version_aware || false))
    .replace(/\{\{specialization\.domain\}\}/g, specialization.domain)
    .replace(/\{\{specialization\.framework\}\}/g, specialization.framework)
    .replace(/\{\{specialization\.capabilities\}\}/g, capabilities)
    .replace(/\{\{requiredSkillsSection\}\}/g, requiredSkillsSection);
}

// Legacy function for backward compatibility
export function generateAgentConfig(name: string, options: any = {}): string {
  return generateSubagentConfig(name, options);
}

/**
 * List all available agent templates
 */
export function listAgentTemplates(): Array<{name: string, description: string, useCase: string, domain: string, framework: string}> {
  const specializations: Record<string, any> = {
    'custom-agent': {
      domain: 'general',
      framework: 'general',
      capabilities: ['general-assistance']
    },
    'qa-subagent': {
      domain: 'quality-assurance',
      framework: 'testing',
      capabilities: ['test-strategy', 'test-execution', 'quality-gate-enforcement', 'performance-testing']
    },
    'security-subagent': {
      domain: 'security-assurance',
      framework: 'security',
      capabilities: ['vulnerability-scanning', 'security-audit', 'compliance-validation', 'threat-modeling']
    },
    'library-researcher': {
      domain: 'library-research',
      framework: 'research',
      capabilities: ['library-research', 'documentation-analysis', 'context7-integration']
    },
    'code-reviewer': {
      domain: 'code-review',
      framework: 'quality',
      capabilities: ['code-review', 'quality-assurance', 'best-practices-enforcement', 'security-review']
    },
    'docs-writer': {
      domain: 'documentation',
      framework: 'technical-writing',
      capabilities: ['documentation-generation', 'api-docs', 'tutorials', 'user-guides']
    },
    'liaison-specialist': {
      domain: 'liaison-architecture',
      framework: 'workflow-automation',
      capabilities: ['workflow-design', 'task-automation', 'integration-management', 'architecture-guidance']
    },
    'cli-specialist': {
      domain: 'cli-development',
      framework: 'commander.js',
      capabilities: ['command-patterns', 'argument-validation', 'cli-ux', 'help-text-formatting', 'error-handling', 'option-definition'],
      required_skills: ['cli-development', 'bun-development']
    },
    'ci-cd-specialist': {
      domain: 'devops',
      framework: 'github-actions',
      capabilities: ['ci-setup', 'test-automation', 'coverage-enforcement', 'quality-gates', 'workflow-automation', 'artifact-management'],
      required_skills: ['testing-automation', 'bun-development']
    },
    'release-engineer': {
      domain: 'release-management',
      framework: 'changesets',
      capabilities: ['version-bump', 'changelog-gen', 'npm-publish', 'github-releases', 'version-coordination', 'release-coordination'],
      required_skills: ['release-publishing', 'git-automation', 'bun-development']
    },
    'security-validator': {
      domain: 'security-assurance',
      framework: 'owasp-cwe-snyk',
      capabilities: ['dependency-audit', 'secret-detection', 'vulnerability-management', 'compliance-validation', 'threat-modeling', 'code-security-review'],
      required_skills: ['security-scanning', 'git-automation']
    },
    'workflow-architect': {
      domain: 'workflow-automation',
      framework: 'liaison',
      capabilities: ['agent-orchestration', 'delegation-routing', 'workflow-graph', 'inter-agent-communication', 'workflow-design', 'task-driven-automation'],
      required_skills: ['subagent-coordination', 'liaison-workflows', 'bun-development']
    }
  };

  const templateDescriptions: Record<string, {description: string, useCase: string}> = {
    'custom-agent': {
      description: 'Generic agent template for any purpose',
      useCase: 'General purpose tasks and custom workflows'
    },
    'qa-subagent': {
      description: 'Quality assurance and testing specialist',
      useCase: 'Test strategy, execution, and quality gate enforcement'
    },
    'security-subagent': {
      description: 'Security assurance and compliance specialist',
      useCase: 'Vulnerability scanning, security audits, and compliance validation'
    },
    'library-researcher': {
      description: 'Library and API research specialist',
      useCase: 'Documentation research, API integration help'
    },
    'code-reviewer': {
      description: 'Code review and quality assurance specialist',
      useCase: 'Reviewing pull requests, code quality checks'
    },
    'docs-writer': {
      description: 'Technical writing and documentation specialist',
      useCase: 'Writing README files, API docs, tutorials'
    },
    'liaison-specialist': {
      description: 'Liaison architecture and workflow automation',
      useCase: 'Workflow design, task automation, integration management'
    },
    'cli-specialist': {
      description: 'CLI development and command implementation',
      useCase: 'Creating CLI commands, argument parsing, user experience'
    },
    'ci-cd-specialist': {
      description: 'CI/CD pipeline automation and quality gates',
      useCase: 'Setting up GitHub Actions, test automation, coverage enforcement'
    },
    'release-engineer': {
      description: 'Release management and deployment coordination',
      useCase: 'Version bumping, changelog generation, npm publishing'
    },
    'security-validator': {
      description: 'Security reviews, vulnerability scanning, compliance',
      useCase: 'Dependency audits, secret detection, security gates'
    },
    'workflow-architect': {
      description: 'Multi-agent workflow design and orchestration',
      useCase: 'Designing agent workflows, delegation patterns, orchestration'
    }
  };

  return Object.keys(specializations).map(name => ({
    name,
    domain: specializations[name].domain,
    framework: specializations[name].framework,
    description: templateDescriptions[name].description,
    useCase: templateDescriptions[name].useCase
  }));
}

// Legacy functions
export function generateConfig(options: any = {}): string {
  const defaultModel = options.model || 'openrouter/z-ai/glm-4.6';
  
  return JSON.stringify({
    $schema: "https://opencode.ai/config.json",
    theme: "github-dark",
    model: defaultModel,
    tools: { 
      webfetch: true, 
      bash: true, 
      edit: true, 
      read: true 
    },
    agent: options.agents || {},
    provider: {
      openrouter: {
        options: {
          apiKey: "{env:OPENROUTER_API_KEY}",
          defaultModel: defaultModel
        }
      }
    }
  }, null, 2);
}

export function loadTemplate(templateName: string): string {
  const templatePath = pathJoin(__dirname, `../templates/agents/${templateName}.md.template`);
  return readFileSync(templatePath, 'utf8');
}

/**
 * Generate skill configuration based on Agent Skills standard
 */
export function generateSkillConfig(name: string, options: any = {}): string {
  const skillName = name.toLowerCase().replace(/\s+/g, '-');

  return `---
name: ${skillName}
description: ${options.description || `Skill: ${skillName}`}
license: MIT
metadata:
  author: ${options.author || 'Your Name'}
  version: "1.0"
---
# ${skillName}

${options.instructions || 'Instructions for this skill'}
`;
}