import { promises as fs } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';

export interface ConflictInfo {
  key: string;
  templateValue: unknown;
  existingValue: unknown;
  templateMtime: number;
  existingMtime: number;
  conflictType: 'value' | 'structure' | 'missing';
}

export interface MergeOptions {
  overwrite?: boolean;
  promptUser?: boolean;
  backupDir?: string;
}

export interface MergeResult {
  success: boolean;
  merged: Record<string, unknown>;
  conflicts: ConflictInfo[];
  backupPath?: string;
  strategy: 'newer-wins' | 'template-wins' | 'user-choice' | 'merge-deep';
}

async function getFileMtime(filePath: string): Promise<number> {
  try {
    const stats = await fs.stat(filePath);
    return stats.mtimeMs;
  } catch {
    return 0;
  }
}

export async function createBackup(filePath: string, backupDir?: string): Promise<string> {
  const targetDir = backupDir || join(process.cwd(), '.liaison-backup', 'config', new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5));
  await fs.mkdir(targetDir, { recursive: true });
  const fileName = filePath.split('/').pop() || 'config.json';
  const destPath = join(targetDir, fileName);
  await fs.copyFile(filePath, destPath);
  return destPath;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;
  
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a as object);
    const keysB = Object.keys(b as object);
    
    if (keysA.length !== keysB.length) return false;
    
    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) return false;
    }
    
    return true;
  }
  
  return false;
}

function flattenObject(obj: Record<string, unknown>, prefix = ''): Record<string, { value: unknown; mtime?: number }> {
  const result: Record<string, { value: unknown; mtime?: number }> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const nested = flattenObject(value as Record<string, unknown>, newKey);
      Object.assign(result, nested);
    } else {
      result[newKey] = { value };
    }
  }
  
  return result;
}

export async function detectConflicts(
  templateConfig: Record<string, unknown>,
  existingConfig: Record<string, unknown>,
  templatePath?: string
): Promise<ConflictInfo[]> {
  const conflicts: ConflictInfo[] = [];
  
  const templateMtime = templatePath ? await getFileMtime(templatePath) : Date.now();
  const flatTemplate = flattenObject(templateConfig);
  const flatExisting = flattenObject(existingConfig);
  
  const allKeys = new Set([...Object.keys(flatTemplate), ...Object.keys(flatExisting)]);
  
  for (const key of allKeys) {
    const templateVal = flatTemplate[key];
    const existingVal = flatExisting[key];
    
    if (templateVal === undefined && existingVal !== undefined) {
      conflicts.push({
        key,
        templateValue: undefined,
        existingValue: existingVal.value,
        templateMtime,
        existingMtime: Date.now(),
        conflictType: 'missing'
      });
    } else if (templateVal !== undefined && existingVal === undefined) {
      conflicts.push({
        key,
        templateValue: templateVal.value,
        existingValue: undefined,
        templateMtime,
        existingMtime: 0,
        conflictType: 'missing'
      });
    } else if (templateVal !== undefined && existingVal !== undefined) {
      if (!deepEqual(templateVal.value, existingVal.value)) {
        conflicts.push({
          key,
          templateValue: templateVal.value,
          existingValue: existingVal.value,
          templateMtime,
          existingMtime: Date.now(),
          conflictType: 'value'
        });
      }
    }
  }
  
  return conflicts;
}

export async function promptUserForConflict(conflict: ConflictInfo): Promise<'template' | 'existing' | 'skip'> {
  const formatValue = (val: unknown): string => {
    if (val === undefined) return 'not set';
    if (typeof val === 'object') return JSON.stringify(val, null, 2);
    return String(val);
  };
  
  const { choice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'choice',
      message: `Conflict detected for key: ${chalk.cyan(conflict.key)}`,
      choices: [
        {
          name: `Use template value: ${formatValue(conflict.templateValue).slice(0, 50)}`,
          value: 'template'
        },
        {
          name: `Keep existing value: ${formatValue(conflict.existingValue).slice(0, 50)}`,
          value: 'existing'
        },
        {
          name: 'Skip this key (keep both)',
          value: 'skip'
        }
      ],
      default: 'existing'
    }
  ]);
  
  return choice;
}

export async function promptUserForAllConflicts(conflicts: ConflictInfo[]): Promise<Map<string, 'template' | 'existing' | 'skip'>> {
  const decisions = new Map<string, 'template' | 'existing' | 'skip'>();
  
  console.log(chalk.yellow(`\n⚠️  Found ${conflicts.length} conflicts:`));
  console.log();
  
  for (const conflict of conflicts) {
    const decision = await promptUserForConflict(conflict);
    decisions.set(conflict.key, decision);
    
    if (decision !== 'skip') {
      console.log(chalk.gray(`  → ${decision === 'template' ? 'Template' : 'Existing'} value selected for: ${conflict.key}`));
    } else {
      console.log(chalk.gray(`  → Skipped: ${conflict.key}`));
    }
    console.log();
  }
  
  return decisions;
}

export async function mergeConfigs(
  templateConfig: Record<string, unknown>,
  existingConfig: Record<string, unknown>,
  options: MergeOptions = {}
): Promise<MergeResult> {
  const { overwrite = false, promptUser = false, backupDir } = options;
  
  const conflicts = await detectConflicts(templateConfig, existingConfig);
  
  if (conflicts.length === 0) {
    return {
      success: true,
      merged: { ...existingConfig, ...templateConfig },
      conflicts: [],
      strategy: 'merge-deep'
    };
  }
  
  console.log(chalk.yellow(`\n⚠️  Detected ${conflicts.length} conflicts between template and existing config\n`));
  
  let backupPath: string | undefined;
  const existingPath = join(process.cwd(), '.opencode', 'config.json');
  
  if (conflicts.length > 0) {
    try {
      backupPath = await createBackup(existingPath, backupDir);
      console.log(chalk.gray(`📁 Backup created: ${backupPath}`));
    } catch {
      console.log(chalk.yellow('⚠️  Could not create backup (file may not exist yet)'));
    }
  }
  
  const decisions = promptUser 
    ? await promptUserForAllConflicts(conflicts) 
    : new Map();
  
  const merged: Record<string, unknown> = { ...existingConfig };
  
  for (const [key, templateVal] of Object.entries(flattenObject(templateConfig))) {
    const existingVal = (flattenObject(existingConfig))[key];
    const conflict = conflicts.find(c => c.key === key);
    
    if (!conflict) {
      merged[key] = templateVal.value;
      continue;
    }
    
    const decision = decisions.get(key);
    
    if (overwrite) {
      merged[key] = templateVal.value;
    } else if (decision === 'template') {
      merged[key] = templateVal.value;
    } else if (decision === 'existing') {
      merged[key] = existingVal?.value;
    } else if (decision === 'skip') {
      continue;
    } else {
      if (conflict.existingMtime > conflict.templateMtime) {
        console.log(chalk.gray(`  Using existing (newer) for: ${key}`));
        merged[key] = existingVal?.value;
      } else {
        console.log(chalk.gray(`  Using template (newer) for: ${key}`));
        merged[key] = templateVal.value;
      }
    }
  }
  
  const unresolvedKeys = conflicts.filter(c => !decisions.has(c.key) && decisions.get(c.key) !== 'skip');
  const strategy = overwrite ? 'template-wins' : (decisions.size > 0 ? 'user-choice' : 'newer-wins');
  
  return {
    success: true,
    merged,
    conflicts: unresolvedKeys,
    backupPath,
    strategy
  };
}

export async function detectAndMerge(
  templatePath: string,
  existingPath: string,
  options: MergeOptions = {}
): Promise<MergeResult> {
  let templateConfig: Record<string, unknown>;
  let existingConfig: Record<string, unknown>;
  
  try {
    const templateContent = await fs.readFile(templatePath, 'utf-8');
    templateConfig = JSON.parse(templateContent);
  } catch (error) {
    throw new Error(`Failed to read template config: ${error}`);
  }
  
  try {
    const existingContent = await fs.readFile(existingPath, 'utf-8');
    existingConfig = JSON.parse(existingContent);
  } catch {
    existingConfig = {};
  }
  
  return mergeConfigs(templateConfig, existingConfig, options);
}

export function calculateConflictSimilarity(
  templateConfig: Record<string, unknown>,
  existingConfig: Record<string, unknown>
): number {
  const flatTemplate = flattenObject(templateConfig);
  const flatExisting = flattenObject(existingConfig);
  
  const allKeys = new Set([...Object.keys(flatTemplate), ...Object.keys(flatExisting)]);
  if (allKeys.size === 0) return 100;
  
  let matching = 0;
  for (const key of allKeys) {
    const templateVal = flatTemplate[key];
    const existingVal = flatExisting[key];
    
    if (templateVal !== undefined && existingVal !== undefined) {
      if (deepEqual(templateVal.value, existingVal.value)) {
        matching++;
      }
    }
  }
  
  return Math.round((matching / allKeys.size) * 100);
}
