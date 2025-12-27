/**
 * Agent Skills Type Definitions
 * Based on Agent Skills standard: https://agentskills.io/specification
 */

/**
 * SKILL.md frontmatter metadata
 * All fields except name and description are optional
 */
export interface SkillFrontmatter {
  /** Unique identifier (1-64 chars, lowercase alphanumeric + hyphens) - REQUIRED */
  name: string;

  /** Description of skill and when to use it (1-1024 chars) - REQUIRED */
  description: string;

  /** License name or reference (optional) */
  license?: string;

  /** Environment/compatibility requirements (1-500 chars, optional) */
  compatibility?: string;

  /** Custom metadata as key-value pairs (optional) */
  metadata?: Record<string, string>;

  /** Space-delimited list of pre-approved tools (experimental, optional) */
  'allowed-tools'?: string;
}

/**
 * Complete skill configuration with content and directory info
 */
export interface SkillConfig extends SkillFrontmatter {
  path: string;
  body: string;
  skillMdPath: string;
}

/**
 * Subagent specialization with optional skill requirements
 */
export interface SubagentSpecialization {
  domain: string;
  framework: string;
  capabilities: string[];
  required_skills?: string[];
}

/**
 * Skill directory structure
 */
export interface SkillDirectory {
  /** Skill name (must match directory name) */
  name: string;

  /** Path to skill directory */
  path: string;

  /** Path to SKILL.md file */
  skillMd: string;

  /** Paths to reference files in references/ directory */
  references?: string[];

  /** Paths to scripts in scripts/ directory */
  scripts?: string[];

  /** Paths to assets in assets/ directory */
  assets?: string[];
}

/**
 * Skill validation result
 */
export interface SkillValidationResult {
  /** Whether skill is valid */
  valid: boolean;

  /** List of errors found */
  errors: ValidationError[];

  /** List of warnings found */
  warnings: ValidationWarning[];

  /** Parsed frontmatter (if valid) */
  frontmatter?: SkillFrontmatter;
}

/**
 * Validation error details
 */
export interface ValidationError {
  /** Error type */
  type: 'missing-file' | 'invalid-frontmatter' | 'invalid-name' | 'invalid-description' | 'invalid-field' | 'other';

  /** Error message */
  message: string;

  /** Field name (if applicable) */
  field?: string;

  /** Suggested fix (if available) */
  suggestion?: string;
}

/**
 * Validation warning details
 */
export interface ValidationWarning {
  /** Warning type */
  type: 'missing-recommended' | 'style' | 'structure' | 'other';

  /** Warning message */
  message: string;

  /** Field name (if applicable) */
  field?: string;
}

/**
 * Options for skill discovery
 */
export interface SkillDiscoveryOptions {
  /** Locations to search for skills */
  locations?: string[];

  /** Whether to include global skills */
  includeGlobal?: boolean;

  /** Whether to include project skills */
  includeProject?: boolean;

  /** Whether to validate discovered skills */
  validate?: boolean;
}

/**
 * Options for skill creation
 */
export interface SkillCreationOptions {
  /** Skill name */
  name: string;

  /** Skill description */
  description: string;

  /** License (optional) */
  license?: string;

  /** Author name (optional, goes in metadata) */
  author?: string;

  /** Skill template type */
  template?: 'workflow' | 'library' | 'qa' | 'deployment' | 'custom';

  /** Location to create skill (defaults to .skills/) */
  location?: string;

  /** Whether to create sample content */
  withSamples?: boolean;
}

/**
 * Options for skill initialization
 */
export interface SkillInitOptions {
  /** Whether to create symlinks */
  createSymlinks?: boolean;

  /** Whether to use copies instead of symlinks (for Windows compatibility) */
  useCopies?: boolean;

  /** Location for skills (.skills/ or custom path) */
  location?: string;

  /** Whether to update .gitignore */
  updateGitignore?: boolean;

  /** Whether to make this a global initialization (~/.skills/) */
  global?: boolean;
}

/**
 * Available skill metadata for agent prompts
 * Used to generate <available_skills> XML for agent systems
 */
export interface AvailableSkillMetadata {
  /** Skill name */
  name: string;

  /** Skill description */
  description: string;

  /** Path to SKILL.md file (for filesystem-based agents) */
  location?: string;

  /** Whether skill is available locally */
  available: boolean;

  /** Last modified timestamp */
  modified?: number;
}

/**
 * Subagent specialization with optional skill requirements
 */
export interface SubagentSpecialization {
  /** Domain of expertise */
  domain: string;

  /** Framework or technology focus */
  framework: string;

  /** Capabilities this subagent provides */
  capabilities: string[];

  /** Skills required by this subagent (optional) */
  required_skills?: string[];
}
