import { promises as fs } from 'fs';
import { join } from 'path';
import chalk from 'chalk';

export interface Migration {
  fromVersion: string;
  toVersion: string;
  migrate: (config: Record<string, unknown>) => Record<string, unknown>;
  description: string;
}

export interface MigrationResult {
  success: boolean;
  fromVersion: string;
  toVersion: string;
  changes: string[];
  migratedConfig?: Record<string, unknown>;
  error?: string;
}

export interface ConfigVersionInfo {
  currentVersion: string;
  latestVersion: string;
  needsMigration: boolean;
  availableMigrations: Migration[];
  configPath?: string;
}

const VERSION_FILE = '.liaison-versions.json';

interface VersionRegistry {
  currentVersion: string;
  migrations: Array<{
    fromVersion: string;
    toVersion: string;
    description: string;
  }>;
}

const INTERNAL_MIGRATIONS: Migration[] = [];

export function registerMigration(migration: Migration): void {
  INTERNAL_MIGRATIONS.push(migration);
}

export function getRegisteredMigrations(): Migration[] {
  return [...INTERNAL_MIGRATIONS].sort((a, b) =>
    a.fromVersion.localeCompare(b.fromVersion)
  );
}

export function detectVersion(config: Record<string, unknown>): string {
  if (config.$schema?.toString().includes('2024')) {
    return '1.0.0';
  }

  if (typeof config.version === 'string') {
    return config.version;
  }

  if (typeof config.version === 'number') {
    return String(config.version);
  }

  return 'unknown';
}

export async function detectVersionFromFile(
  configPath: string
): Promise<ConfigVersionInfo> {
  let config: Record<string, unknown>;
  let currentVersion = 'unknown';

  try {
    const content = await fs.readFile(configPath, 'utf-8');
    config = JSON.parse(content);
    currentVersion = detectVersion(config);
  } catch {
    return {
      currentVersion: 'unknown',
      latestVersion: 'unknown',
      needsMigration: false,
      availableMigrations: [],
      configPath,
    };
  }

  return {
    currentVersion,
    latestVersion: await getLatestVersion(),
    needsMigration: currentVersion !== (await getLatestVersion()),
    availableMigrations: await getAvailableMigrations(currentVersion),
    configPath,
  };
}

async function getLatestVersion(): Promise<string> {
  const versions = await getVersionRegistry();
  return versions.currentVersion;
}

async function getVersionRegistry(): Promise<VersionRegistry> {
  try {
    const versionPath = join(process.cwd(), '.liaison-versions.json');
    const content = await fs.readFile(versionPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {
      currentVersion: '1.0.0',
      migrations: [],
    };
  }
}

async function saveVersionRegistry(registry: VersionRegistry): Promise<void> {
  const versionPath = join(process.cwd(), '.liaison-versions.json');
  await fs.writeFile(versionPath, JSON.stringify(registry, null, 2), 'utf-8');
}

export async function getAvailableMigrations(
  fromVersion: string
): Promise<Migration[]> {
  const latestVersion = await getLatestVersion();

  if (fromVersion === 'unknown') {
    return [];
  }

  if (fromVersion === latestVersion) {
    return [];
  }

  const available: Migration[] = [];
  const migrations = getRegisteredMigrations();

  let currentVersion = fromVersion;

  while (currentVersion !== latestVersion) {
    const nextMigration = migrations.find(
      m => m.fromVersion === currentVersion
    );

    if (nextMigration) {
      available.push(nextMigration);
      currentVersion = nextMigration.toVersion;
    } else {
      break;
    }
  }

  return available;
}

export async function migrate(
  config: Record<string, unknown>,
  fromVersion: string,
  toVersion: string
): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    fromVersion,
    toVersion,
    changes: [],
  };

  if (fromVersion === 'unknown') {
    result.error = 'Cannot migrate from unknown version';
    return result;
  }

  if (fromVersion === toVersion) {
    result.success = true;
    result.changes.push('No migration needed - already at target version');
    result.migratedConfig = config;
    return result;
  }

  const availableMigrations = await getAvailableMigrations(fromVersion);
  const targetMigration = availableMigrations.find(m => m.toVersion === toVersion);

  if (!targetMigration) {
    result.error = `No migration path from ${fromVersion} to ${toVersion}`;
    return result;
  }

  try {
    let migratedConfig = { ...config };
    let currentVersion = fromVersion;

    for (const migration of availableMigrations) {
      if (migration.toVersion === toVersion) {
        result.changes.push(`Applying migration: ${migration.description}`);
        migratedConfig = migration.migrate(migratedConfig);
        currentVersion = migration.toVersion;
        break;
      }
    }

    migratedConfig.version = toVersion;

    result.success = true;
    result.migratedConfig = migratedConfig;
    result.changes.push(`Migration from ${fromVersion} to ${toVersion} completed`);
  } catch (error) {
    result.error = `Migration failed: ${error}`;
  }

  return result;
}

export async function migrateConfigFile(
  configPath: string,
  toVersion?: string
): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    fromVersion: 'unknown',
    toVersion: toVersion || await getLatestVersion(),
    changes: [],
  };

  try {
    const content = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(content);
    const fromVersion = detectVersion(config);

    result.fromVersion = fromVersion;

    if (fromVersion === 'unknown') {
      result.error = 'Cannot determine config version';
      return result;
    }

    const migrationResult = await migrate(config, fromVersion, result.toVersion);

    if (migrationResult.success && migrationResult.migratedConfig) {
      await fs.writeFile(
        configPath,
        JSON.stringify(migrationResult.migratedConfig, null, 2),
        'utf-8'
      );
      result.success = true;
      result.changes = migrationResult.changes;
      result.migratedConfig = migrationResult.migratedConfig;
    } else {
      result.error = migrationResult.error;
    }
  } catch (error) {
    result.error = `Failed to migrate config: ${error}`;
  }

  return result;
}

export async function migrateAllConfigs(
  directory: string,
  toVersion?: string
): Promise<Array<{ path: string; result: MigrationResult }>> {
  const results: Array<{ path: string; result: MigrationResult }> = [];

  const configPaths = [
    join(directory, '.opencode', 'config.json'),
    join(directory, '.claude', 'config.json'),
  ];

  for (const configPath of configPaths) {
    try {
      await fs.access(configPath);
      const result = await migrateConfigFile(configPath, toVersion);
      results.push({ path: configPath, result });
    } catch {
    }
  }

  return results;
}

export function createVersionDetector(
  versionField: string = 'version',
  schemaField: string = '$schema'
): (config: Record<string, unknown>) => string {
  return (config: Record<string, unknown>): string => {
    if (config[versionField]) {
      return String(config[versionField]);
    }

    if (config[schemaField]?.toString().includes('2024')) {
      return '1.0.0';
    }

    return 'unknown';
  };
}

export function createSimpleMigration(
  fromVersion: string,
  toVersion: string,
  transform: (config: Record<string, unknown>) => Record<string, unknown>,
  description: string
): Migration {
  return {
    fromVersion,
    toVersion,
    migrate: transform,
    description,
  };
}

export async function validateConfigVersion(
  config: Record<string, unknown>,
  expectedVersion: string
): Promise<{
  valid: boolean;
  currentVersion: string;
  message: string;
}> {
  const currentVersion = detectVersion(config);

  if (currentVersion === 'unknown') {
    return {
      valid: false,
      currentVersion: 'unknown',
      message: 'Config version cannot be determined',
    };
  }

  if (currentVersion !== expectedVersion) {
    return {
      valid: false,
      currentVersion,
      message: `Config version ${currentVersion} does not match expected ${expectedVersion}`,
    };
  }

  return {
    valid: true,
    currentVersion,
    message: 'Config version is valid',
  };
}

registerMigration(
  createSimpleMigration(
    '1.0.0',
    '1.1.0',
    (config) => {
      const migrated = { ...config };
      if (!migrated.tools) {
        migrated.tools = {
          read: true,
          write: false,
          edit: true,
          bash: false,
        };
      }
      return migrated;
    },
    'Added default tools configuration'
  )
);

registerMigration(
  createSimpleMigration(
    '1.1.0',
    '1.2.0',
    (config) => {
      const migrated = { ...config };
      if (!migrated.behavior) {
        migrated.behavior = {
          conservative: false,
          confirmation_required: false,
          context_preservation: true,
        };
      }
      return migrated;
    },
    'Added behavior configuration section'
  )
);

registerMigration(
  createSimpleMigration(
    '1.2.0',
    '2.0.0',
    (config) => {
      const migrated = { ...config };
      migrated.version = '2.0.0';
      if (migrated.$schema) {
        migrated.$schema = migrated.$schema.toString().replace('1.0', '2.0');
      }
      return migrated;
    },
    'Schema version bump to 2.0.0'
  )
);
