import { SyncConflict, ConflictResolutionStrategy } from "../types/index.js";
import chalk from "chalk";

export interface ConflictContext {
  conflict: SyncConflict;
  timestamp: Date;
  userInput?: string;
}

export interface ResolutionStrategy {
  name: ConflictResolutionStrategy;
  canHandle(conflict: SyncConflict): boolean;
  resolve(context: ConflictContext): Promise<ResolutionResult>;
}

export interface ResolutionResult {
  success: boolean;
  action: "cody-wins" | "beads-wins" | "merge" | "manual" | "skip";
  data?: any;
  error?: string;
}

export class ConflictResolver {
  private strategies: Map<ConflictResolutionStrategy, ResolutionStrategy> = new Map();
  private fallbackStrategy: ConflictResolutionStrategy = "manual";

  constructor() {
    this.registerDefaultStrategies();
  }

  private registerDefaultStrategies(): void {
    this.registerStrategy(new CodyWinsStrategy());
    this.registerStrategy(new BeadsWinsStrategy());
    this.registerStrategy(new TimestampStrategy());
    this.registerStrategy(new MergeStrategy());
    this.registerStrategy(new ManualStrategy());
  }

  registerStrategy(strategy: ResolutionStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  async resolve(
    conflict: SyncConflict,
    preferredStrategy?: ConflictResolutionStrategy,
  ): Promise<ResolutionResult> {
    const strategy = preferredStrategy || conflict.resolution || this.fallbackStrategy;
    const handler = this.strategies.get(strategy);

    if (!handler) {
      console.warn(chalk.yellow(`⚠️  Unknown strategy: ${strategy}, using fallback`));
      return this.resolveFallback(conflict);
    }

    if (!handler.canHandle(conflict)) {
      console.warn(chalk.yellow(`⚠️  Strategy ${strategy} cannot handle conflict, using fallback`));
      return this.resolveFallback(conflict);
    }

    const context: ConflictContext = {
      conflict,
      timestamp: new Date(),
    };

    try {
      return await handler.resolve(context);
    } catch (error) {
      console.error(chalk.red(`❌ Strategy ${strategy} failed: ${error}`));
      return this.resolveFallback(conflict);
    }
  }

  private async resolveFallback(conflict: SyncConflict): Promise<ResolutionResult> {
    const fallback = this.strategies.get(this.fallbackStrategy);
    if (!fallback) {
      return {
        success: false,
        action: "skip",
        error: "No fallback strategy available",
      };
    }

    return fallback.resolve({
      conflict,
      timestamp: new Date(),
    });
  }

  setFallbackStrategy(strategy: ConflictResolutionStrategy): void {
    if (!this.strategies.has(strategy)) {
      throw new Error(`Strategy ${strategy} not registered`);
    }
    this.fallbackStrategy = strategy;
  }
}

class CodyWinsStrategy implements ResolutionStrategy {
  name: ConflictResolutionStrategy = "cody-wins";

  canHandle(conflict: SyncConflict): boolean {
    return !!conflict.codyData;
  }

  async resolve(context: ConflictContext): Promise<ResolutionResult> {
    return {
      success: true,
      action: "cody-wins",
      data: context.conflict.codyData,
    };
  }
}

class BeadsWinsStrategy implements ResolutionStrategy {
  name: ConflictResolutionStrategy = "beads-wins";

  canHandle(conflict: SyncConflict): boolean {
    return !!conflict.beadsData;
  }

  async resolve(context: ConflictContext): Promise<ResolutionResult> {
    return {
      success: true,
      action: "beads-wins",
      data: context.conflict.beadsData,
    };
  }
}

class TimestampStrategy implements ResolutionStrategy {
  name: ConflictResolutionStrategy = "timestamp";

  canHandle(conflict: SyncConflict): boolean {
    return !!(conflict.codyData && conflict.beadsData);
  }

  async resolve(context: ConflictContext): Promise<ResolutionResult> {
    const { codyData, beadsData } = context.conflict;

    const codyTime = new Date(codyData.updated_at || codyData.updatedAt).getTime();
    const beadsTime = new Date(beadsData.updated_at || beadsData.updatedAt).getTime();

    if (codyTime > beadsTime) {
      return {
        success: true,
        action: "cody-wins",
        data: codyData,
      };
    } else {
      return {
        success: true,
        action: "beads-wins",
        data: beadsData,
      };
    }
  }
}

class MergeStrategy implements ResolutionStrategy {
  name: ConflictResolutionStrategy = "merge";

  canHandle(conflict: SyncConflict): boolean {
    return !!(conflict.codyData && conflict.beadsData);
  }

  async resolve(context: ConflictContext): Promise<ResolutionResult> {
    const { codyData, beadsData } = context.conflict;

    // Merge strategy: combine non-conflicting fields
    const merged = {
      ...beadsData,
      ...codyData,
      // Preserve arrays by merging
      labels: this.mergeArrays(codyData.labels, beadsData.labels),
      // Combine descriptions if different
      description: this.mergeDescriptions(
        codyData.description || codyData.body,
        beadsData.description || beadsData.body,
      ),
    };

    return {
      success: true,
      action: "merge",
      data: merged,
    };
  }

  private mergeArrays(arr1: any[] = [], arr2: any[] = []): any[] {
    return [...new Set([...arr1, ...arr2])];
  }

  private mergeDescriptions(desc1?: string, desc2?: string): string {
    if (!desc1) return desc2 || "";
    if (!desc2) return desc1;
    if (desc1 === desc2) return desc1;
    return `${desc1}\n\n---\n\n${desc2}`;
  }
}

class ManualStrategy implements ResolutionStrategy {
  name: ConflictResolutionStrategy = "manual";

  canHandle(_conflict: SyncConflict): boolean {
    return true; // Can always handle as fallback
  }

  async resolve(context: ConflictContext): Promise<ResolutionResult> {
    console.log(chalk.yellow("\n⚠️  Manual resolution required:"));
    console.log(chalk.gray(`  Conflict: ${context.conflict.message}`));
    console.log(chalk.gray(`  Item: ${context.conflict.itemId}`));
    
    if (context.conflict.codyData) {
      console.log(chalk.blue("\n  Cody data:"));
      console.log(chalk.gray(`    ${JSON.stringify(context.conflict.codyData, null, 2)}`));
    }
    
    if (context.conflict.beadsData) {
      console.log(chalk.green("\n  Beads data:"));
      console.log(chalk.gray(`    ${JSON.stringify(context.conflict.beadsData, null, 2)}`));
    }

    return {
      success: false,
      action: "manual",
      error: "Manual resolution required - use --force with preferred strategy",
    };
  }
}
