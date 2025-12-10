import { describe, it, expect, beforeEach } from "vitest";
import { ConflictResolver } from "../../src/core/conflict-resolver.js";
import { SyncConflict } from "../../src/types/index.js";

describe("ConflictResolver", () => {
  let resolver: ConflictResolver;

  beforeEach(() => {
    resolver = new ConflictResolver();
  });

  describe("cody-wins strategy", () => {
    it("should resolve with cody data", async () => {
      const conflict: SyncConflict = {
        type: "issue",
        itemId: "test-1",
        itemType: "Issue",
        message: "Data conflict",
        codyData: { id: 1, title: "Cody version" },
        beadsData: { id: 1, title: "Beads version" },
        resolution: "cody-wins",
      };

      const result = await resolver.resolve(conflict);

      expect(result.success).toBe(true);
      expect(result.action).toBe("cody-wins");
      expect(result.data).toEqual(conflict.codyData);
    });
  });

  describe("beads-wins strategy", () => {
    it("should resolve with beads data", async () => {
      const conflict: SyncConflict = {
        type: "issue",
        itemId: "test-1",
        itemType: "Issue",
        message: "Data conflict",
        codyData: { id: 1, title: "Cody version" },
        beadsData: { id: 1, title: "Beads version" },
        resolution: "beads-wins",
      };

      const result = await resolver.resolve(conflict);

      expect(result.success).toBe(true);
      expect(result.action).toBe("beads-wins");
      expect(result.data).toEqual(conflict.beadsData);
    });
  });

  describe("timestamp strategy", () => {
    it("should choose newer data based on timestamp", async () => {
      const conflict: SyncConflict = {
        type: "issue",
        itemId: "test-1",
        itemType: "Issue",
        message: "Timestamp conflict",
        codyData: { id: 1, updated_at: "2025-12-05T10:00:00Z" },
        beadsData: { id: 1, updated_at: "2025-12-05T09:00:00Z" },
        resolution: "timestamp",
      };

      const result = await resolver.resolve(conflict);

      expect(result.success).toBe(true);
      expect(result.action).toBe("cody-wins");
      expect(result.data).toEqual(conflict.codyData);
    });

    it("should choose beads when beads is newer", async () => {
      const conflict: SyncConflict = {
        type: "issue",
        itemId: "test-1",
        itemType: "Issue",
        message: "Timestamp conflict",
        codyData: { id: 1, updated_at: "2025-12-05T09:00:00Z" },
        beadsData: { id: 1, updated_at: "2025-12-05T10:00:00Z" },
        resolution: "timestamp",
      };

      const result = await resolver.resolve(conflict);

      expect(result.success).toBe(true);
      expect(result.action).toBe("beads-wins");
      expect(result.data).toEqual(conflict.beadsData);
    });
  });

  describe("merge strategy", () => {
    it("should merge non-conflicting fields", async () => {
      const conflict: SyncConflict = {
        type: "issue",
        itemId: "test-1",
        itemType: "Issue",
        message: "Merge conflict",
        codyData: { id: 1, title: "Title", labels: ["bug"] },
        beadsData: { id: 1, priority: 1, labels: ["feature"] },
        resolution: "merge",
      };

      const result = await resolver.resolve(conflict);

      expect(result.success).toBe(true);
      expect(result.action).toBe("merge");
      expect(result.data.title).toBe("Title");
      expect(result.data.priority).toBe(1);
      expect(result.data.labels).toContain("bug");
      expect(result.data.labels).toContain("feature");
    });
  });

  describe("fallback strategy", () => {
    it("should use fallback for unknown strategy", async () => {
      const conflict: SyncConflict = {
        type: "issue",
        itemId: "test-1",
        itemType: "Issue",
        message: "Unknown strategy",
        codyData: { id: 1 },
        beadsData: { id: 1 },
        resolution: "unknown" as any,
      };

      const result = await resolver.resolve(conflict);

      expect(result.action).toBe("manual");
    });
  });
});
