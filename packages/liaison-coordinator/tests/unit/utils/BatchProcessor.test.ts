import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  BatchProcessor,
  BatchProcessorOptions,
  BatchResult,
  BatchProgress,
} from "../../../src/utils/BatchProcessor";

describe("BatchProcessor", () => {
  let processor: BatchProcessor;
  let mockProcessor: any;
  let progressCallback: any;
  let errorCallback: any;

  beforeEach(() => {
    mockProcessor = vi.fn();
    progressCallback = vi.fn();
    errorCallback = vi.fn();

    const options: BatchProcessorOptions = {
      concurrency: 5,
      maxRetries: 2,
      retryDelay: 100,
      onProgress: progressCallback,
      onError: errorCallback,
    };

    processor = new BatchProcessor(10, options);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Constructor", () => {
    it("should initialize with default options", () => {
      const defaultProcessor = new BatchProcessor();
      expect(defaultProcessor).toBeDefined();
      expect(defaultProcessor.getBatchSize()).toBe(100);
    });

    it("should initialize with custom batch size", () => {
      expect(processor.getBatchSize()).toBe(10);
    });

    it("should initialize with custom options", () => {
      const customProcessor = new BatchProcessor(50, { concurrency: 3 });
      expect(customProcessor.getBatchSize()).toBe(50);
    });
  });

  describe("setBatchSize", () => {
    it("should update batch size", () => {
      processor.setBatchSize(20);
      expect(processor.getBatchSize()).toBe(20);
    });

    it("should throw error for invalid batch size", () => {
      expect(() => processor.setBatchSize(0)).toThrow(
        "Batch size must be at least 1",
      );
      expect(() => processor.setBatchSize(-1)).toThrow(
        "Batch size must be at least 1",
      );
    });
  });

  describe("process", () => {
    it("should process items successfully", async () => {
      const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      mockProcessor.mockResolvedValue(true);

      const result = await processor.process(items, mockProcessor);

      expect(result.successes.length).toBe(10);
      expect(result.failures.length).toBe(0);
      expect(result.batchesProcessed).toBe(1);
      expect(result.totalItemsProcessed).toBe(10);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it("should handle empty array", async () => {
      const result = await processor.process([], mockProcessor);

      expect(result.successes.length).toBe(0);
      expect(result.failures.length).toBe(0);
      expect(result.batchesProcessed).toBe(0);
      expect(result.totalItemsProcessed).toBe(0);
    });

    it("should process items in multiple batches", async () => {
      const items = Array.from({ length: 25 }, (_, i) => i + 1);
      mockProcessor.mockResolvedValue(true);

      const result = await processor.process(items, mockProcessor);

      expect(result.successes.length).toBe(25);
      expect(result.failures.length).toBe(0);
      expect(result.batchesProcessed).toBe(3); // 25 items / 10 per batch = 3 batches
    });

    it("should handle processing failures", async () => {
      const items = [1, 2, 3, 4, 5];
      mockProcessor.mockImplementation((item: number) => {
        if (item === 3) {
          throw new Error("Processing failed");
        }
        return Promise.resolve();
      });

      const result = await processor.process(items, mockProcessor);

      expect(result.successes.length).toBe(4); // items 1, 2, 4, 5
      expect(result.failures.length).toBe(1); // item 3
      expect(result.failures[0].item).toBe(3);
      expect(result.failures[0].error.message).toBe("Processing failed");
    });

    it("should call progress callback", async () => {
      const items = Array.from({ length: 20 }, (_, i) => i + 1);
      mockProcessor.mockResolvedValue(true);

      await processor.process(items, mockProcessor);

      expect(progressCallback).toHaveBeenCalled();
      const firstCall = progressCallback.mock.calls[0][0];
      // Progress is reported per batch, so totalItems is the batch size (10)
      expect(firstCall.totalItems).toBe(10);
      expect(firstCall.processedItems).toBeGreaterThan(0);
    });

    it("should call error callback on failures", async () => {
      const items = [1, 2, 3];
      mockProcessor.mockRejectedValue(new Error("Test error"));

      await processor.process(items, mockProcessor);

      expect(errorCallback).toHaveBeenCalled();
      const firstCall = errorCallback.mock.calls[0];
      expect(firstCall[0].message).toBe("Test error");
      expect(firstCall[1]).toBe(1); // First item
      expect(firstCall[2]).toBeGreaterThan(0); // Attempt number
    });

    it("should handle retry logic", async () => {
      const items = [1];
      let attempt = 0;
      mockProcessor.mockImplementation(() => {
        attempt++;
        if (attempt < 2) {
          throw new Error("Temporary failure");
        }
        return Promise.resolve();
      });

      const result = await processor.process(items, mockProcessor);

      expect(result.successes.length).toBe(1);
      expect(result.failures.length).toBe(0);
      expect(mockProcessor).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });

    it("should respect maxRetries option", async () => {
      const items = [1];
      mockProcessor.mockRejectedValue(new Error("Persistent error"));

      const result = await processor.process(items, mockProcessor);

      expect(result.successes.length).toBe(0);
      expect(result.failures.length).toBe(1);
      expect(mockProcessor).toHaveBeenCalledTimes(2); // Initial + 1 retry (maxRetries=2)
    });

    it("should respect concurrency limit", async () => {
      const items = Array.from({ length: 15 }, (_, i) => i + 1);
      let concurrentCalls = 0;
      let maxConcurrent = 0;

      mockProcessor.mockImplementation(async () => {
        concurrentCalls++;
        maxConcurrent = Math.max(maxConcurrent, concurrentCalls);
        await new Promise((resolve) => setTimeout(resolve, 10));
        concurrentCalls--;
        return Promise.resolve();
      });

      await processor.process(items, mockProcessor);

      // Should not exceed concurrency limit of 5
      expect(maxConcurrent).toBeLessThanOrEqual(5);
    });

    it("should handle mixed success and failure", async () => {
      const items = [1, 2, 3, 4, 5];
      mockProcessor.mockImplementation((item: number) => {
        if (item % 2 === 0) {
          return Promise.resolve(); // Even numbers succeed
        }
        throw new Error("Odd number failure"); // Odd numbers fail
      });

      const result = await processor.process(items, mockProcessor);

      expect(result.successes).toEqual([2, 4]); // Even numbers
      expect(result.failures.map((f) => f.item)).toEqual([1, 3, 5]); // Odd numbers
    });
  });

  describe("BatchProgress", () => {
    it("should include all required fields", async () => {
      const items = Array.from({ length: 10 }, (_, i) => i + 1);
      mockProcessor.mockResolvedValue(true);

      await processor.process(items, mockProcessor);

      const progressCall = progressCallback.mock.calls[0][0];
      expect(progressCall).toHaveProperty("totalItems");
      expect(progressCall).toHaveProperty("processedItems");
      expect(progressCall).toHaveProperty("successfulItems");
      expect(progressCall).toHaveProperty("failedItems");
      expect(progressCall).toHaveProperty("currentBatch");
      expect(progressCall).toHaveProperty("totalBatches");
      expect(progressCall).toHaveProperty("percentage");
    });

    it("should calculate percentage correctly", async () => {
      const items = Array.from({ length: 20 }, (_, i) => i + 1);
      mockProcessor.mockResolvedValue(true);

      await processor.process(items, mockProcessor);

      // Check that we got progress updates with percentages
      const progressCalls = progressCallback.mock.calls.map((call) => call[0]);
      const hasFullPercentage = progressCalls.some((p) => p.percentage === 100);
      expect(hasFullPercentage).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle processor function errors gracefully", async () => {
      const items = [1, 2, 3];
      mockProcessor.mockRejectedValue(new Error("Processor error"));

      const result = await processor.process(items, mockProcessor);

      expect(result.successes.length).toBe(0);
      expect(result.failures.length).toBe(3);
      expect(
        result.failures.every((f) => f.error.message === "Processor error"),
      ).toBe(true);
    });

    it("should handle non-Error exceptions", async () => {
      const items = [1];
      mockProcessor.mockRejectedValue("String error");

      const result = await processor.process(items, mockProcessor);

      expect(result.failures[0].error).toBeInstanceOf(Error);
      expect(result.failures[0].error.message).toBe("String error");
    });

    it("should handle progress callback errors gracefully", async () => {
      const items = [1, 2];
      mockProcessor.mockResolvedValue(true);
      progressCallback.mockImplementation(() => {
        throw new Error("Progress callback error");
      });

      // Should not throw, just log the error
      await expect(
        processor.process(items, mockProcessor),
      ).resolves.toBeDefined();
    });
  });

  describe("Performance", () => {
    it("should complete within reasonable time", async () => {
      const items = Array.from({ length: 50 }, (_, i) => i + 1);
      mockProcessor.mockResolvedValue(true);

      const startTime = Date.now();
      await processor.process(items, mockProcessor);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it("should include duration in result", async () => {
      const items = [1, 2, 3];
      mockProcessor.mockResolvedValue(true);

      const result = await processor.process(items, mockProcessor);

      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.duration).toBeLessThan(1000); // Should be fast for small batch
    });
  });
});
