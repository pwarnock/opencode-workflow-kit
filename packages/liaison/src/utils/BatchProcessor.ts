/**
 * Batch Processor for handling large datasets efficiently
 *
 * This implementation provides configurable batch processing with:
 * - Parallel processing within batches
 * - Progress tracking and reporting
 * - Error handling and retry logic
 * - Memory management for large datasets
 *
 * @packageDocumentation
 */

export interface BatchProcessorOptions {
  /** Maximum number of items to process in parallel within a batch */
  concurrency?: number;

  /** Maximum number of retry attempts for failed items */
  maxRetries?: number;

  /** Delay between retry attempts in milliseconds */
  retryDelay?: number;

  /** Callback for progress reporting */
  onProgress?: (progress: BatchProgress) => void;

  /** Callback for error handling */
  onError?: (error: Error, item: any, attempt: number) => void;
}

export interface BatchProgress {
  /** Total number of items to process */
  totalItems: number;

  /** Number of items processed so far */
  processedItems: number;

  /** Number of successful items */
  successfulItems: number;

  /** Number of failed items */
  failedItems: number;

  /** Current batch number */
  currentBatch: number;

  /** Total number of batches */
  totalBatches: number;

  /** Percentage completion (0-100) */
  percentage: number;

  /** Estimated time remaining in milliseconds */
  estimatedTimeRemaining?: number;
}

export interface BatchResult<T> {
  /** Items that were successfully processed */
  successes: T[];

  /** Items that failed processing */
  failures: {
    item: T;
    error: Error;
    attempt: number;
  }[];

  /** Total processing time in milliseconds */
  duration: number;

  /** Number of batches processed */
  batchesProcessed: number;

  /** Total items processed */
  totalItemsProcessed: number;
}

/**
 * Batch Processor for handling large datasets efficiently
 *
 * @example
 * ```typescript
 * const processor = new BatchProcessor({ batchSize: 100, concurrency: 10 });
 *
 * const result = await processor.process(items, async (item) => {
 *   // Process individual item
 *   return await processItem(item);
 * });
 *
 * console.log(`Processed ${result.successes.length} items successfully`);
 * ```
 */
export class BatchProcessor {
  private batchSize: number;
  private options: Required<BatchProcessorOptions>;

  /**
   * Create a new BatchProcessor instance
   *
   * @param batchSize - Number of items to process in each batch (default: 100)
   * @param options - Batch processing options
   */
  constructor(batchSize: number = 100, options: BatchProcessorOptions = {}) {
    this.batchSize = batchSize;
    this.options = {
      concurrency: options.concurrency || 10,
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
      onProgress: options.onProgress ?? (() => {}),
      onError: options.onError ?? (() => {}),
    };
  }

  /**
   * Process items in batches
   *
   * @param items - Array of items to process
   * @param processor - Function to process each item
   * @returns BatchResult with successes and failures
   */
  async process<T>(
    items: T[],
    processor: (item: T) => Promise<any>,
  ): Promise<BatchResult<T>> {
    const startTime = Date.now();
    const successes: T[] = [];
    const failures: { item: T; error: Error; attempt: number }[] = [];
    let batchesProcessed = 0;

    // Calculate total batches for progress reporting
    const totalBatches = Math.ceil(items.length / this.batchSize);

    // Process items in batches
    for (let i = 0; i < items.length; i += this.batchSize) {
      const batch = items.slice(i, i + this.batchSize);
      batchesProcessed++;

      // Process batch with concurrency
      const batchResult = await this.processBatch(
        batch,
        processor,
        batchesProcessed,
        totalBatches,
      );

      successes.push(...batchResult.successes);
      failures.push(...batchResult.failures);
    }

    return {
      successes,
      failures,
      duration: Date.now() - startTime,
      batchesProcessed,
      totalItemsProcessed: successes.length + failures.length,
    };
  }

  /**
   * Process a single batch with concurrency and retry logic
   */
  private async processBatch<T>(
    batch: T[],
    processor: (item: T) => Promise<any>,
    currentBatch: number,
    totalBatches: number,
  ): Promise<{
    successes: T[];
    failures: { item: T; error: Error; attempt: number }[];
  }> {
    const successes: T[] = [];
    const failures: { item: T; error: Error; attempt: number }[] = [];
    // const batchStartTime = Date.now();

    // Process items in parallel with concurrency limit
    // Process all items in the batch, but limit concurrent execution
    for (let i = 0; i < batch.length; i += this.options.concurrency) {
      const chunk = batch.slice(i, i + this.options.concurrency);
      const results = await Promise.all(
        chunk.map((item) => this.processItemWithRetry(item, processor)),
      );

      results.forEach((result) => {
        if (result.success) {
          successes.push(result.item);
        } else {
          failures.push({
            item: result.item,
            error: result.error!,
            attempt: result.attempt,
          });
        }
      });

      // Report progress
      const processedItems = i + chunk.length;
      this.reportProgress({
        totalItems: batch.length,
        processedItems: Math.min(processedItems, batch.length),
        successfulItems: successes.length,
        failedItems: failures.length,
        currentBatch,
        totalBatches,
        percentage: Math.round((processedItems / batch.length) * 100),
      });
    }

    return { successes, failures };
  }

  /**
   * Process individual item with retry logic
   */
  private async processItemWithRetry<T>(
    item: T,
    processor: (item: T) => Promise<any>,
  ): Promise<{ success: boolean; item: T; error?: Error; attempt: number }> {
    let attempt = 0;
    let lastError: Error | undefined;

    while (attempt < this.options.maxRetries) {
      attempt++;

      try {
        await processor(item);
        return { success: true, item, attempt };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.options.maxRetries) {
          // Delay before retry
          await new Promise((resolve) =>
            setTimeout(resolve, this.options.retryDelay),
          );
        }

        // Call error handler if provided
        if (this.options.onError) {
          this.options.onError(lastError, item, attempt);
        }
      }
    }

    return { success: false, item, error: lastError!, attempt };
  }

  /**
   * Report progress to callback if provided
   */
  private reportProgress(progress: BatchProgress): void {
    if (this.options.onProgress) {
      try {
        this.options.onProgress(progress);
      } catch (error) {
        console.error("Error in progress callback:", error);
      }
    }
  }

  /**
   * Get current batch size
   */
  getBatchSize(): number {
    return this.batchSize;
  }

  /**
   * Set new batch size
   */
  setBatchSize(size: number): void {
    if (size < 1) {
      throw new Error("Batch size must be at least 1");
    }
    this.batchSize = size;
  }
}
