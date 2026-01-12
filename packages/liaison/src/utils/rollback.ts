import { promises as fs } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import { createBackup, type BackupInfo, type BackupType, getBackupById, restoreBackup } from './backup-manager';

export interface RollbackPoint {
  id: string;
  description: string;
  timestamp: Date;
  files: RollbackFile[];
  operationId: string;
}

export interface RollbackFile {
  path: string;
  backupId: string;
  content?: string;
}

export interface RollbackOperation {
  id: string;
  type: 'config' | 'setup' | 'template' | 'skill' | 'workflow' | 'generic';
  description: string;
  timestamp: Date;
  rollbackPointId: string;
  status: 'pending' | 'completed' | 'rolled_back' | 'failed';
}

const ROLLBACK_INDEX_FILE = '.liaison-rollback-index.json';

interface RollbackIndex {
  operations: RollbackOperation[];
  rollbackPoints: Record<string, RollbackPoint>;
}

function getRollbackRoot(): string {
  return join(process.cwd(), '.liaison-rollback');
}

function getRollbackIndexPath(): string {
  return join(getRollbackRoot(), ROLLBACK_INDEX_FILE);
}

async function getRollbackIndex(): Promise<RollbackIndex> {
  try {
    const content = await fs.readFile(getRollbackIndexPath(), 'utf-8');
    return JSON.parse(content);
  } catch {
    return { operations: [], rollbackPoints: {} };
  }
}

async function saveRollbackIndex(index: RollbackIndex): Promise<void> {
  await fs.mkdir(getRollbackRoot(), { recursive: true });
  await fs.writeFile(getRollbackIndexPath(), JSON.stringify(index, null, 2), 'utf-8');
}

function generateOperationId(): string {
  return `op-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function createRollbackPoint(
  description: string,
  files: string[],
  operationId?: string
): Promise<RollbackPoint> {
  const id = generateOperationId();
  const rollbackFiles: RollbackFile[] = [];

  for (const filePath of files) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const backup = await createBackup(filePath, { type: 'generic' });

      rollbackFiles.push({
        path: filePath,
        backupId: backup.id,
        content: content,
      });
    } catch {
    }
  }

  const rollbackPoint: RollbackPoint = {
    id,
    description,
    timestamp: new Date(),
    files: rollbackFiles,
    operationId: operationId || generateOperationId(),
  };

  const index = await getRollbackIndex();
  index.rollbackPoints[id] = rollbackPoint;

  const operation: RollbackOperation = {
    id: rollbackPoint.operationId,
    type: 'generic',
    description,
    timestamp: new Date(),
    rollbackPointId: id,
    status: 'pending',
  };

  index.operations.unshift(operation);
  await saveRollbackIndex(index);

  return rollbackPoint;
}

export async function createRollbackPointWithType(
  description: string,
  files: string[],
  type: RollbackOperation['type'],
  operationId?: string
): Promise<RollbackPoint> {
  const point = await createRollbackPoint(description, files, operationId);

  const index = await getRollbackIndex();
  const operation = index.operations.find(op => op.id === point.operationId);
  if (operation) {
    operation.type = type;
  }

  await saveRollbackIndex(index);

  return point;
}

export async function recordOperationStart(
  description: string,
  type: RollbackOperation['type']
): Promise<string> {
  const operationId = generateOperationId();

  const index = await getRollbackIndex();
  const operation: RollbackOperation = {
    id: operationId,
    type,
    description,
    timestamp: new Date(),
    rollbackPointId: '',
    status: 'pending',
  };

  index.operations.unshift(operation);
  await saveRollbackIndex(index);

  return operationId;
}

export async function recordOperationComplete(
  operationId: string,
  rollbackPointId: string
): Promise<void> {
  const index = await getRollbackIndex();
  const operation = index.operations.find(op => op.id === operationId);

  if (operation) {
    operation.rollbackPointId = rollbackPointId;
    operation.status = 'completed';
  }

  await saveRollbackIndex(index);
}

export async function recordOperationFailed(operationId: string): Promise<void> {
  const index = await getRollbackIndex();
  const operation = index.operations.find(op => op.id === operationId);

  if (operation) {
    operation.status = 'failed';
  }

  await saveRollbackIndex(index);
}

export async function getRollbackHistory(
  limit: number = 20
): Promise<Array<RollbackOperation & { rollbackPoint?: RollbackPoint }>> {
  const index = await getRollbackIndex();

  const history: Array<RollbackOperation & { rollbackPoint?: RollbackPoint }> = [];

  for (const operation of index.operations.slice(0, limit)) {
    const rollbackPoint = index.rollbackPoints[operation.rollbackPointId];
    history.push({
      ...operation,
      rollbackPoint,
    });
  }

  return history;
}

export async function getOperationById(operationId: string): Promise<RollbackOperation | null> {
  const index = await getRollbackIndex();
  return index.operations.find(op => op.id === operationId) || null;
}

export async function getRollbackPointById(pointId: string): Promise<RollbackPoint | null> {
  const index = await getRollbackIndex();
  return index.rollbackPoints[pointId] || null;
}

export async function rollback(operationId: string): Promise<{
  success: boolean;
  filesRestored: number;
  errors: string[];
}> {
  const result = {
    success: true,
    filesRestored: 0,
    errors: [] as string[],
  };

  const index = await getRollbackIndex();
  const operation = index.operations.find(op => op.id === operationId);

  if (!operation) {
    result.success = false;
    result.errors.push(`Operation '${operationId}' not found`);
    return result;
  }

  const rollbackPoint = index.rollbackPoints[operation.rollbackPointId];

  if (!rollbackPoint) {
    result.success = false;
    result.errors.push(`Rollback point '${operation.rollbackPointId}' not found`);
    return result;
  }

  for (const file of rollbackPoint.files) {
    try {
      await restoreBackup(file.backupId, file.path);
      result.filesRestored++;
    } catch (error) {
      result.errors.push(`Failed to restore ${file.path}: ${error}`);
      result.success = false;
    }
  }

  if (result.success) {
    operation.status = 'rolled_back';
  }

  await saveRollbackIndex(index);

  return result;
}

export async function rollbackToPoint(pointId: string): Promise<{
  success: boolean;
  filesRestored: number;
  errors: string[];
}> {
  const index = await getRollbackIndex();
  const rollbackPoint = index.rollbackPoints[pointId];

  if (!rollbackPoint) {
    return {
      success: false,
      filesRestored: 0,
      errors: [`Rollback point '${pointId}' not found`],
    };
  }

  const result = {
    success: true,
    filesRestored: 0,
    errors: [] as string[],
  };

  for (const file of rollbackPoint.files) {
    try {
      await restoreBackup(file.backupId, file.path);
      result.filesRestored++;
    } catch (error) {
      result.errors.push(`Failed to restore ${file.path}: ${error}`);
      result.success = false;
    }
  }

  const operation = index.operations.find(op => op.id === rollbackPoint.operationId);
  if (operation) {
    operation.status = result.success ? 'rolled_back' : 'failed';
  }

  await saveRollbackIndex(index);

  return result;
}

export async function rollbackLatest(
  type?: RollbackOperation['type']
): Promise<{
  success: boolean;
  operationId?: string;
  filesRestored: number;
  errors: string[];
}> {
  const history = await getRollbackHistory(50);

  let targetOperation = history.find(op => op.status === 'completed');

  if (type) {
    targetOperation = history.find(op => op.status === 'completed' && op.type === type);
  }

  if (!targetOperation) {
    return {
      success: false,
      filesRestored: 0,
      errors: ['No completed operations found to rollback'],
    };
  }

  const result = await rollback(targetOperation.id);

  return {
    ...result,
    operationId: targetOperation.id,
  };
}

export async function clearRollbackHistory(olderThan?: number): Promise<number> {
  const index = await getRollbackIndex();
  let deletedCount = 0;

  if (olderThan) {
    const cutoffTime = Date.now() - olderThan;

    const toKeep = index.operations.filter(op => op.timestamp.getTime() > cutoffTime);

    for (const op of index.operations) {
      if (op.timestamp.getTime() <= cutoffTime) {
        deletedCount++;
        delete index.rollbackPoints[op.rollbackPointId];
      }
    }

    index.operations = toKeep;
  } else {
    deletedCount = index.operations.length;
    index.operations = [];
    index.rollbackPoints = {};
  }

  await saveRollbackIndex(index);

  return deletedCount;
}

export async function getRollbackStats(): Promise<{
  totalOperations: number;
  byStatus: Record<RollbackOperation['status'], number>;
  byType: Record<RollbackOperation['type'], number>;
}> {
  const history = await getRollbackHistory(1000);

  const stats = {
    totalOperations: history.length,
    byStatus: {} as Record<RollbackOperation['status'], number>,
    byType: {} as Record<RollbackOperation['type'], number>,
  };

  for (const op of history) {
    stats.byStatus[op.status] = (stats.byStatus[op.status] || 0) + 1;
    stats.byType[op.type] = (stats.byType[op.type] || 0) + 1;
  }

  return stats;
}
