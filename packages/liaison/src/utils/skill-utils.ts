import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';
import Ajv from 'ajv';
import * as YAML from 'js-yaml';

/**
 * Skill utilities for managing Agent Skills
 * Implements Agent Skills standard: https://agentskills.io/specification
 */

// Type definitions
export interface SkillFrontmatter {
  name: string;
  description: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
  'allowed-tools'?: string;
}

export interface SkillConfig extends SkillFrontmatter {
  path: string;
  body: string;
  skillMdPath: string;
}

export interface ValidationError {
  type: string;
  message: string;
  field?: string;
  suggestion?: string;
}

export interface ValidationWarning {
  type: string;
  message: string;
  field?: string;
}

export interface SkillValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  frontmatter?: SkillFrontmatter;
}

export interface SkillDiscoveryOptions {
  locations?: string[];
  includeGlobal?: boolean;
  includeProject?: boolean;
  validate?: boolean;
}

export interface AvailableSkillMetadata {
  name: string;
  description: string;
  location?: string;
  available: boolean;
  modified?: number;
}

const skillSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: ['name', 'description'],
  additionalProperties: false,
  properties: {
    name: {
      type: 'string',
      minLength: 1,
      maxLength: 64,
      pattern: '^[a-z0-9]+(-[a-z0-9]+)*$',
    },
    description: {
      type: 'string',
      minLength: 1,
      maxLength: 1024,
    },
    license: {
      type: 'string',
      maxLength: 256,
    },
    compatibility: {
      type: 'string',
      minLength: 1,
      maxLength: 500,
    },
    metadata: {
      type: 'object',
      additionalProperties: { type: 'string' },
    },
    'allowed-tools': {
      type: 'string',
    },
  },
};

const ajv = new Ajv();
const validateFrontmatter = ajv.compile(skillSchema);

/**
 * Parse YAML frontmatter from SKILL.md
 */
export function parseFrontmatter(content: string): { frontmatter: Record<string, unknown>; body: string } {
  const lines = content.split('\n');
  const frontmatterLines: string[] = [];
  let bodyStartIndex = 0;
  let inFrontmatter = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (i === 0 && line.trim() === '---') {
      inFrontmatter = true;
      continue;
    }

    if (inFrontmatter && line.trim() === '---') {
      bodyStartIndex = i + 1;
      break;
    }

    if (inFrontmatter) {
      frontmatterLines.push(line);
    }
  }

  const body = lines.slice(bodyStartIndex).join('\n');
  const frontmatterYaml = frontmatterLines.join('\n');

  // Use js-yaml for proper YAML parsing with nested object support
  let frontmatter: Record<string, unknown> = {};
  try {
    const parsed = YAML.load(frontmatterYaml) as Record<string, unknown>;
    if (parsed && typeof parsed === 'object') {
      frontmatter = parsed;
    }
  } catch (e) {
    // If YAML parsing fails, return empty frontmatter
    // The validation step will catch this error
    frontmatter = {};
  }

  return { frontmatter, body };
}

/**
 * Validate a SKILL.md file
 */
export async function validateSkill(skillPath: string): Promise<SkillValidationResult> {
  const errors: Array<{ type: string; message: string; field?: string; suggestion?: string }> = [];
  const warnings: Array<{ type: string; message: string; field?: string }> = [];

  try {
    // Check if SKILL.md exists
    const skillMdPath = join(skillPath, 'SKILL.md');
    let skillContent: string;

    try {
      skillContent = await fs.readFile(skillMdPath, 'utf-8');
    } catch {
      errors.push({
        type: 'missing-file',
        message: 'SKILL.md file not found in skill directory',
        suggestion: `Create ${skillMdPath}`,
      });
      return { valid: false, errors, warnings };
    }

    // Parse frontmatter
    let frontmatter: Record<string, unknown>;
    try {
      const parsed = parseFrontmatter(skillContent);
      frontmatter = parsed.frontmatter;
    } catch (e) {
      errors.push({
        type: 'invalid-frontmatter',
        message: `Failed to parse frontmatter: ${e instanceof Error ? e.message : String(e)}`,
      });
      return { valid: false, errors, warnings };
    }

    // Validate against schema
    const valid = validateFrontmatter(frontmatter);
    if (!valid) {
      for (const error of validateFrontmatter.errors || []) {
        errors.push({
          type: 'invalid-field',
          message: error.message || 'Invalid field',
          field: error.instancePath,
        });
      }
    }

     // Check directory name matches skill name
     const dirName = skillPath.split('/').pop();
     const skillName = frontmatter.name as string;
     if (dirName !== skillName) {
       errors.push({
         type: 'invalid-name',
         message: `Directory name "${dirName}" doesn't match skill name "${skillName}"`,
         suggestion: `Rename directory to "${skillName}"`,
       });
     }

    // Check for optional recommended fields
    if (!frontmatter.license) {
      warnings.push({
        type: 'missing-recommended',
        message: 'Consider adding a license field',
        field: 'license',
      });
    }

    // Check content length
    const body = skillContent.substring(skillContent.lastIndexOf('---') + 3).trim();
    if (body.length < 100) {
      warnings.push({
        type: 'style',
        message: 'Skill content seems short. Consider providing more detailed instructions.',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      frontmatter: frontmatter as unknown as SkillFrontmatter,
    };
  } catch (e) {
    errors.push({
      type: 'other',
      message: `Validation failed: ${e instanceof Error ? e.message : String(e)}`,
    });
    return { valid: false, errors: errors as any, warnings };
  }
}

/**
 * Discover all available skills
 */
export async function discoverSkills(options: SkillDiscoveryOptions = {}): Promise<AvailableSkillMetadata[]> {
  const locations = options.locations || ['.skills'];
  const skills: AvailableSkillMetadata[] = [];

  for (const location of locations) {
    try {
      const entries = await fs.readdir(location, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skillPath = join(location, entry.name);
          const skillMdPath = join(skillPath, 'SKILL.md');

          try {
            const skillContent = await fs.readFile(skillMdPath, 'utf-8');
            const { frontmatter } = parseFrontmatter(skillContent);

            if (frontmatter.name && frontmatter.description) {
              const stat = await fs.stat(skillMdPath);
              skills.push({
                name: frontmatter.name as string,
                description: frontmatter.description as string,
                location: skillMdPath,
                available: true,
                modified: stat.mtimeMs,
              });
            }
          } catch {
            // Skip invalid skills
          }
        }
      }
    } catch {
      // Location doesn't exist, skip
    }
  }

  return skills;
}

/**
 * Generate <available_skills> XML for agent prompts
 */
export function generateAvailableSkillsXml(skills: AvailableSkillMetadata[]): string {
  const skillEntries = skills
    .map(
      (skill) =>
        `  <skill>
    <name>${escapeXml(skill.name)}</name>
    <description>${escapeXml(skill.description)}</description>${skill.location ? `\n    <location>${escapeXml(skill.location)}</location>` : ''}
  </skill>`,
    )
    .join('\n');

  return `<available_skills>
${skillEntries}
</available_skills>`;
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Create symlink to skills directory
 */
export async function createSymlink(target: string, link: string): Promise<void> {
  try {
    // Try to remove existing symlink/directory
    try {
      await fs.rm(link, { recursive: true, force: true });
    } catch {
      // Ignore errors
    }

    // Create symlink
    await fs.symlink(target, link, 'dir');
  } catch (e) {
    throw new Error(`Failed to create symlink from ${link} to ${target}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Copy skills directory (Windows compatibility fallback)
 */
export async function copySkillsDirectory(source: string, target: string): Promise<void> {
  try {
    await fs.cp(source, target, { recursive: true, force: true });
  } catch (e) {
    throw new Error(`Failed to copy skills directory: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Test if symlinks are supported on this platform
 */
export function supportsSymlinks(): boolean {
  try {
    // Try to check if we can create a test symlink
    const testDir = '/tmp/symlink-test';
    execSync(`mkdir -p ${testDir} && ln -s . ${testDir}/test && rm -rf ${testDir}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read SKILL.md content
 */
export async function readSkillContent(skillName: string, location: string = '.skills'): Promise<SkillConfig | null> {
  const skillPath = join(location, skillName);
  const skillMdPath = join(skillPath, 'SKILL.md');

  try {
    const content = await fs.readFile(skillMdPath, 'utf-8');
    const { frontmatter, body } = parseFrontmatter(content);

    return {
      ...(frontmatter as unknown as SkillFrontmatter),
      path: skillPath,
      body,
      skillMdPath,
    } as unknown as SkillConfig;
  } catch {
    return null;
  }
}

/**
 * Generate SKILL.md template content
 */
export function generateSkillTemplate(name: string, description: string, template: string = 'workflow'): string {
  const templates: Record<string, string> = {
    workflow: `---
name: ${name}
description: ${description}
license: MIT
metadata:
  author: Your Name
  version: "1.0"
---

# ${name}

${description}

## When to use this skill

Describe when this skill should be applied.

## Instructions

Provide step-by-step instructions for completing this workflow:

1. First step
2. Second step
3. Third step

## Verification

After completing these steps:
- [ ] Step 1 verification
- [ ] Step 2 verification
- [ ] Step 3 verification

## Examples

Provide concrete examples of applying this skill.

## Related Resources

- Resource 1
- Resource 2
`,

    library: `---
name: ${name}
description: ${description}
license: MIT
metadata:
  author: Your Name
  version: "1.0"
---

# ${name}

${description}

## API Reference

Document the API or library interface.

## Common Patterns

### Pattern 1

Explain the pattern and provide code examples.

### Pattern 2

Explain the pattern and provide code examples.

## Error Handling

Document common errors and how to handle them.

## Examples

Provide concrete examples of using this library.

## References

- [Official Documentation](https://example.com)
`,

    qa: `---
name: ${name}
description: ${description}
license: MIT
metadata:
  author: Your Name
  version: "1.0"
---

# ${name}

${description}

## Testing Strategy

### Unit Tests

Describe unit testing approach.

### Integration Tests

Describe integration testing approach.

### Performance Tests

Describe performance testing approach.

## Quality Standards

- Code coverage: 80%
- Performance baseline: < 100ms
- All tests passing

## Running Tests

Provide commands to run tests:

\`\`\`bash
npm test
npm run test:integration
\`\`\`

## Test Checklist

- [ ] Unit tests written
- [ ] Integration tests written
- [ ] Coverage target met
- [ ] Performance benchmarks passing
`,

    deployment: `---
name: ${name}
description: ${description}
license: MIT
metadata:
  author: Your Name
  version: "1.0"
---

# ${name}

${description}

## Pre-deployment Checklist

- [ ] All tests passing
- [ ] Code reviewed
- [ ] Release notes prepared
- [ ] Backups created

## Deployment Steps

1. Create release branch
2. Run build
3. Deploy to staging
4. Verify functionality
5. Deploy to production
6. Monitor metrics

## Rollback Procedure

If deployment fails:

1. Stop new deployment
2. Revert to previous version
3. Verify service health
4. Notify team
5. Create incident report

## Post-deployment

- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Update documentation
- [ ] Communicate with team
`,
  };

  return templates[template] || templates.workflow;
}
