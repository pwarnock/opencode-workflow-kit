import { promises as fs } from 'fs';
import { join, relative } from 'path';
import chalk from 'chalk';

export type BackupType = 'config' | 'skill' | 'workflow' | 'template' | 'generic';

export interface BackupInfo {
  id: string;
  path: string;
  type: BackupType;
  timestamp: Date;
  originalPath: string;
  size: number;
}

export interface CreateBackupOptions {
  type?: BackupType;
  customDir?: string;
  maxBackups?: number;
}

function generateBackupId(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
}

function getBackupRoot(): string {
  return join(process.cwd(), '.liaison-backup');
}

export function getBackupPath(type: BackupType): string {
  return join(getBackupRoot(), type);
}

export async function createBackup(
  filePath: string,
  options: CreateBackupOptions = {}
): Promise<BackupInfo> {
  const { type = 'generic', customDir, maxBackups = 10 } = options;

  const backupRoot = customDir || getBackupPath(type);
  const backupId = generateBackupId();
  const backupDir = join(backupRoot, backupId);
  const fileName = filePath.split('/').pop() || 'backup';
  const destPath = join(backupDir, fileName);

  await fs.mkdir(backupDir, { recursive: true });

  const stats = await fs.stat(filePath);
  await fs.copyFile(filePath, destPath);

  const info: BackupInfo = {
    id: backupId,
    path: destPath,
    type,
    timestamp: new Date(),
    originalPath: filePath,
    size: stats.size,
  };

  await recordBackup(info);

  await cleanupOldBackups(type, maxBackups, customDir);

  return info;
}

export async function createBackupWithContents(
  filePath: string,
  contents: string,
  options: CreateBackupOptions = {}
): Promise<BackupInfo> {
  const { type = 'generic', customDir, maxBackups = 10 } = options;

  const backupRoot = customDir || getBackupPath(type);
  const backupId = generateBackupId();
  const backupDir = join(backupRoot, backupId);
  const fileName = filePath.split('/').pop() || 'backup';
  const destPath = join(backupDir, fileName);

  await fs.mkdir(backupDir, { recursive: true });
  await fs.writeFile(destPath, contents, 'utf-8');

  const info: BackupInfo = {
    id: backupId,
    path: destPath,
    type,
    timestamp: new Date(),
    originalPath: filePath,
    size: Buffer.byteLength(contents, 'utf-8'),
  };

  await recordBackup(info);
  await cleanupOldBackups(type, maxBackups, customDir);

  return info;
}

const BACKUP_INDEX_FILE = '.liaison-backup-index.json';

interface BackupIndex {
  backups: Record<string, BackupInfo[]>;
}

async function getBackupIndex(): Promise<BackupIndex> {
  const indexPath = join(getBackupRoot(), BACKUP_INDEX_FILE);
  try {
    const content = await fs.readFile(indexPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { backups: {} };
  }
}

async function saveBackupIndex(index: BackupIndex): Promise<void> {
  const indexPath = join(getBackupRoot(), BACKUP_INDEX_FILE);
  await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
}

async function recordBackup(info: BackupInfo): Promise<void> {
  const index = await getBackupIndex();
  const type = info.type;

  if (!index.backups[type]) {
    index.backups[type] = [];
  }

  index.backups[type].unshift(info);

  await saveBackupIndex(index);
}

export async function listBackups(
  type?: BackupType,
  maxCount: number = 20
): Promise<BackupInfo[]> {
  const index = await getBackupIndex();

  if (type) {
    const backups = index.backups[type] || [];
    return backups.slice(0, maxCount);
  }

  const allBackups: BackupInfo[] = [];
  for (const backups of Object.values(index.backups)) {
    allBackups.push(...backups);
  }

  return allBackups
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, maxCount);
}

export async function getBackupById(backupId: string): Promise<BackupInfo | null> {
  const index = await getBackupIndex();

  for (const backups of Object.values(index.backups)) {
    const backup = backups.find(b => b.id === backupId);
    if (backup) {
      return backup;
    }
  }

  return null;
}

export async function restoreBackup(
  backupId: string,
  targetPath?: string
): Promise<BackupInfo> {
  const backup = await getBackupById(backupId);

  if (!backup) {
    throw new Error(`Backup '${backupId}' not found`);
  }

  const destPath = targetPath || backup.originalPath;
  const destDir = destPath.split('/').slice(0, -1).join('/');
  if (destDir) {
    await fs.mkdir(destDir, { recursive: true });
  }

  await fs.copyFile(backup.path, destPath);

  return {
    ...backup,
    originalPath: destPath,
  };
}

export async function restoreLatestBackup(type: BackupType): Promise<BackupInfo | null> {
  const backups = await listBackups(type, 1);
  if (backups.length === 0) {
    return null;
  }

  const latest = backups[0];
  await restoreBackup(latest.id);
  return latest;
}

export async function cleanupOldBackups(
  type: BackupType,
  maxAge: number,
  customDir?: string
): Promise<number> {
  const backupRoot = customDir || getBackupPath(type);
  const cutoffTime = Date.now() - maxAge;

  let deletedCount = 0;
  const index = await getBackupIndex();
  const backups = index.backups[type] || [];

  const toKeep = [];
  for (const backup of backups) {
    if (backup.timestamp.getTime() > cutoffTime) {
      toKeep.push(backup);
    } else {
      try {
        await fs.rm(backup.path, { recursive: true, force: true });
        deletedCount++;
      } catch {
      }
    }
  }

  index.backups[type] = toKeep;
  await saveBackupIndex(index);

  return deletedCount;
}

export async function cleanupAllBackups(
  type?: BackupType
): Promise<number> {
  let deletedCount = 0;

  if (type) {
    const index = await getBackupIndex();
    const backups = index.backups[type] || [];

    for (const backup of backups) {
      try {
        await fs.rm(backup.path, { recursive: true, force: true });
        deletedCount++;
      } catch {
      }
    }

    delete index.backups[type];
    await saveBackupIndex(index);
  } else {
    const backupRoot = getBackupRoot();
    try {
      await fs.rm(backupRoot, { recursive: true, force: true });
      deletedCount = -1;
    } catch {
      deletedCount = 0;
    }
  }

  return deletedCount;
}

export async function getBackupStorageInfo(): Promise<{
  totalBackups: number;
  totalSize: number;
  byType: Record<BackupType, { count: number; size: number }>;
}> {
  const index = await getBackupIndex();
  const result = {
    totalBackups: 0,
    totalSize: 0,
    byType: {} as Record<BackupType, { count: number; size: number }>,
  };

  for (const type of Object.keys(index.backups) as BackupType[]) {
    result.byType[type] = { count: 0, size: 0 };
  }

  for (const [type, backups] of Object.entries(index.backups)) {
    const typedType = type as BackupType;
    let typeSize = 0;
    let typeCount = 0;

    for (const backup of backups) {
      try {
        const stats = await fs.stat(backup.path);
        typeSize += stats.size;
        typeCount++;
      } catch {
      }
    }

    result.byType[typedType] = { count: typeCount, size: typeSize };
    result.totalBackups += typeCount;
    result.totalSize += typeSize;
  }

  return result;
}

export function formatBackupSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function backupBeforeWrite(
  filePath: string,
  content: string,
  options: CreateBackupOptions = {}
): Promise<BackupInfo | null> {
  try {
    await fs.access(filePath);
  } catch {
    return null;
  }

  return createBackupWithContents(filePath, content, options);
}
