/**
 * Context Manager Tests
 *
 * Tests the ContextManager functionality:
 * - Loading contexts (schema + seed data)
 * - Context switching
 * - Resetting contexts
 * - Status tracking
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createContextManager,
  createMockContextManager,
  type ContextDatabaseOps,
  type ContextManager,
} from "../context-manager";
import type { LoadedContext } from "../types";

// ============================================================================
// Test Fixtures
// ============================================================================

const MOCK_CONTEXTS: Record<string, LoadedContext> = {
  "S1": {
    name: "S1",
    description: "Social network with people and friendships",
    schema: `
      define
        person sub entity,
          owns name,
          plays friendship:friend;
        name sub attribute, value string;
        friendship sub relation,
          relates friend;
    `,
    seed: `
      insert $p isa person, has name "Alice";
      insert $p isa person, has name "Bob";
    `,
  },
  "e-commerce": {
    name: "e-commerce",
    description: "E-commerce with products and orders",
    schema: `
      define
        product sub entity,
          owns name,
          owns price;
        name sub attribute, value string;
        price sub attribute, value double;
    `,
    seed: `
      insert $p isa product, has name "Widget", has price 9.99;
    `,
  },
};

// ============================================================================
// Mock Database Operations
// ============================================================================

function createMockDbOps(): ContextDatabaseOps & {
  createDatabaseCalls: string[];
  executeSchemaCalls: Array<{ database: string; schema: string }>;
  executeWriteCalls: Array<{ database: string; query: string }>;
  activeDatabase: string | null;
  existingDatabases: Set<string>;
} {
  const createDatabaseCalls: string[] = [];
  const executeSchemaCalls: Array<{ database: string; schema: string }> = [];
  const executeWriteCalls: Array<{ database: string; query: string }> = [];
  let activeDatabase: string | null = null;
  // Track existing databases separately from calls (survives clearing createDatabaseCalls)
  const existingDatabases = new Set<string>();

  return {
    createDatabaseCalls,
    executeSchemaCalls,
    executeWriteCalls,
    existingDatabases,
    get activeDatabase() {
      return activeDatabase;
    },

    async createDatabase(name: string) {
      createDatabaseCalls.push(name);
      existingDatabases.add(name);
    },

    async executeSchema(database: string, schema: string) {
      executeSchemaCalls.push({ database, schema });
    },

    async executeWrite(database: string, query: string) {
      executeWriteCalls.push({ database, query });
    },

    getActiveDatabase() {
      return activeDatabase;
    },

    setActiveDatabase(name: string) {
      activeDatabase = name;
    },

    async databaseExists(name: string) {
      return existingDatabases.has(name);
    },
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("ContextManager", () => {
  let dbOps: ReturnType<typeof createMockDbOps>;
  let manager: ContextManager;

  beforeEach(() => {
    dbOps = createMockDbOps();
    manager = createContextManager({
      contexts: MOCK_CONTEXTS,
      dbOps,
    });
  });

  // --------------------------------------------------------------------------
  // Initial State
  // --------------------------------------------------------------------------

  describe("Initial State", () => {
    it("starts with no context loaded", () => {
      expect(manager.currentContext).toBeNull();
    });

    it("starts not loading", () => {
      expect(manager.isLoading).toBe(false);
    });

    it("starts with no error", () => {
      expect(manager.lastError).toBeNull();
    });

    it("reports not ready status", () => {
      const status = manager.getStatus();
      expect(status.isReady).toBe(false);
      expect(status.name).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // Loading Contexts
  // --------------------------------------------------------------------------

  describe("loadContext", () => {
    it("loads a context by name", async () => {
      await manager.loadContext("S1");

      expect(manager.currentContext).toBe("S1");
    });

    it("creates database with prefixed name", async () => {
      await manager.loadContext("S1");

      expect(dbOps.createDatabaseCalls).toContain("learn_S1");
    });

    it("executes schema", async () => {
      await manager.loadContext("S1");

      expect(dbOps.executeSchemaCalls.length).toBe(1);
      expect(dbOps.executeSchemaCalls[0].database).toBe("learn_S1");
      expect(dbOps.executeSchemaCalls[0].schema).toContain("person sub entity");
    });

    it("executes seed data", async () => {
      await manager.loadContext("S1");

      // Should have two insert statements
      expect(dbOps.executeWriteCalls.length).toBe(2);
      expect(dbOps.executeWriteCalls[0].query).toContain("Alice");
      expect(dbOps.executeWriteCalls[1].query).toContain("Bob");
    });

    it("sets active database", async () => {
      await manager.loadContext("S1");

      expect(dbOps.activeDatabase).toBe("learn_S1");
    });

    it("throws for unknown context", async () => {
      await expect(manager.loadContext("unknown")).rejects.toThrow(
        "Context not found: unknown"
      );
    });

    it("skips if already loaded", async () => {
      await manager.loadContext("S1");
      dbOps.createDatabaseCalls.length = 0;

      await manager.loadContext("S1");

      expect(dbOps.createDatabaseCalls.length).toBe(0);
    });

    it("switches to different context", async () => {
      await manager.loadContext("S1");
      await manager.loadContext("e-commerce");

      expect(manager.currentContext).toBe("e-commerce");
      expect(dbOps.createDatabaseCalls).toContain("learn_e_commerce");
    });

    it("reports ready status after loading", async () => {
      await manager.loadContext("S1");

      const status = manager.getStatus();
      expect(status.isReady).toBe(true);
      expect(status.name).toBe("S1");
    });
  });

  // --------------------------------------------------------------------------
  // Status Callbacks
  // --------------------------------------------------------------------------

  describe("Status Callbacks", () => {
    it("calls onContextChanged when context loads", async () => {
      const onContextChanged = vi.fn();
      manager = createContextManager({
        contexts: MOCK_CONTEXTS,
        dbOps,
        onContextChanged,
      });

      await manager.loadContext("S1");

      expect(onContextChanged).toHaveBeenCalledWith("S1");
    });

    it("calls onStatusChanged during loading", async () => {
      const onStatusChanged = vi.fn();
      manager = createContextManager({
        contexts: MOCK_CONTEXTS,
        dbOps,
        onStatusChanged,
      });

      await manager.loadContext("S1");

      // Should be called at least twice: loading start, loading end
      expect(onStatusChanged.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  // --------------------------------------------------------------------------
  // Reset Context
  // --------------------------------------------------------------------------

  describe("resetContext", () => {
    it("reloads current context", async () => {
      await manager.loadContext("S1");
      dbOps.createDatabaseCalls.length = 0;

      await manager.resetContext();

      expect(dbOps.createDatabaseCalls).toContain("learn_S1");
    });

    it("throws if no context loaded", async () => {
      await expect(manager.resetContext()).rejects.toThrow(
        "No context loaded to reset"
      );
    });

    it("preserves context name after reset", async () => {
      await manager.loadContext("S1");
      await manager.resetContext();

      expect(manager.currentContext).toBe("S1");
    });
  });

  // --------------------------------------------------------------------------
  // Clear Context
  // --------------------------------------------------------------------------

  describe("clearContext", () => {
    it("clears current context", async () => {
      await manager.loadContext("S1");
      await manager.clearContext();

      expect(manager.currentContext).toBeNull();
    });

    it("calls onContextChanged with null", async () => {
      const onContextChanged = vi.fn();
      manager = createContextManager({
        contexts: MOCK_CONTEXTS,
        dbOps,
        onContextChanged,
      });

      await manager.loadContext("S1");
      await manager.clearContext();

      expect(onContextChanged).toHaveBeenLastCalledWith(null);
    });
  });

  // --------------------------------------------------------------------------
  // isContextLoaded
  // --------------------------------------------------------------------------

  describe("isContextLoaded", () => {
    it("returns false when no context loaded", () => {
      expect(manager.isContextLoaded("S1")).toBe(false);
    });

    it("returns true when context matches", async () => {
      await manager.loadContext("S1");

      expect(manager.isContextLoaded("S1")).toBe(true);
    });

    it("returns false when context differs", async () => {
      await manager.loadContext("S1");

      expect(manager.isContextLoaded("e-commerce")).toBe(false);
    });

    it("returns true for null when no context loaded", () => {
      expect(manager.isContextLoaded(null)).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // switchOrLoadContext
  // --------------------------------------------------------------------------

  describe("switchOrLoadContext", () => {
    it("uses fast path when database already exists", async () => {
      // First load creates the database
      await manager.loadContext("S1");
      expect(dbOps.createDatabaseCalls).toEqual(["learn_S1"]);

      // Clear calls to track only the next operation
      dbOps.createDatabaseCalls.length = 0;
      dbOps.executeSchemaCalls.length = 0;
      dbOps.executeWriteCalls.length = 0;

      // Simulate switching away and back
      await manager.loadContext("e-commerce");
      dbOps.createDatabaseCalls.length = 0;

      // switchOrLoadContext should use fast path (no createDatabase call)
      await manager.switchOrLoadContext("S1");

      expect(dbOps.createDatabaseCalls).toEqual([]); // No DB recreation
      expect(manager.currentContext).toBe("S1");
      expect(dbOps.activeDatabase).toBe("learn_S1");
    });

    it("uses slow path when database does not exist", async () => {
      // switchOrLoadContext on fresh context should call loadContext
      await manager.switchOrLoadContext("S1");

      expect(dbOps.createDatabaseCalls).toEqual(["learn_S1"]);
      expect(dbOps.executeSchemaCalls.length).toBe(1);
      expect(dbOps.executeWriteCalls.length).toBe(2); // Two insert statements
      expect(manager.currentContext).toBe("S1");
    });

    it("calls onContextChanged on fast path", async () => {
      const onContextChanged = vi.fn();
      manager = createContextManager({
        contexts: MOCK_CONTEXTS,
        dbOps,
        onContextChanged,
      });

      // Load and switch away
      await manager.loadContext("S1");
      await manager.loadContext("e-commerce");
      onContextChanged.mockClear();

      // Fast path switch back
      await manager.switchOrLoadContext("S1");

      expect(onContextChanged).toHaveBeenCalledWith("S1");
    });

    it("calls onStatusChanged on fast path", async () => {
      const onStatusChanged = vi.fn();
      manager = createContextManager({
        contexts: MOCK_CONTEXTS,
        dbOps,
        onStatusChanged,
      });

      // Load and switch away
      await manager.loadContext("S1");
      await manager.loadContext("e-commerce");
      onStatusChanged.mockClear();

      // Fast path switch back
      await manager.switchOrLoadContext("S1");

      expect(onStatusChanged).toHaveBeenCalled();
    });

    it("skips when already on correct context and database", async () => {
      await manager.loadContext("S1");
      dbOps.createDatabaseCalls.length = 0;

      // Should be a no-op
      await manager.switchOrLoadContext("S1");

      expect(dbOps.createDatabaseCalls).toEqual([]);
      expect(manager.currentContext).toBe("S1");
    });

    it("switches database when context matches but wrong DB selected", async () => {
      await manager.loadContext("S1");

      // Manually change the active database (simulating user switching in UI)
      dbOps.setActiveDatabase("some_other_db");

      await manager.switchOrLoadContext("S1");

      // Should just switch back without reloading
      expect(dbOps.activeDatabase).toBe("learn_S1");
    });
  });

  // --------------------------------------------------------------------------
  // Error Handling
  // --------------------------------------------------------------------------

  describe("Error Handling", () => {
    it("captures error on schema failure", async () => {
      const failingDbOps = createMockDbOps();
      failingDbOps.executeSchema = async () => {
        throw new Error("Schema error");
      };

      manager = createContextManager({
        contexts: MOCK_CONTEXTS,
        dbOps: failingDbOps,
      });

      await expect(manager.loadContext("S1")).rejects.toThrow(
        "Schema error"
      );
      expect(manager.lastError).toBe("Schema error");
    });

    it("reports error in status", async () => {
      const failingDbOps = createMockDbOps();
      failingDbOps.executeSchema = async () => {
        throw new Error("Schema error");
      };

      manager = createContextManager({
        contexts: MOCK_CONTEXTS,
        dbOps: failingDbOps,
      });

      try {
        await manager.loadContext("S1");
      } catch {
        // Expected
      }

      const status = manager.getStatus();
      expect(status.isReady).toBe(false);
      expect(status.error).toBe("Schema error");
    });
  });
});

// ============================================================================
// Mock Context Manager Tests
// ============================================================================

describe("createMockContextManager", () => {
  it("tracks loadContext calls", async () => {
    const mock = createMockContextManager();

    await mock.loadContext("S1");
    await mock.loadContext("e-commerce");

    expect(mock.loadContextCalls).toEqual(["S1", "e-commerce"]);
  });

  it("updates currentContext", async () => {
    const mock = createMockContextManager();

    await mock.loadContext("S1");

    expect(mock.currentContext).toBe("S1");
  });

  it("allows setting context directly", () => {
    const mock = createMockContextManager();

    mock.setCurrentContext("test-context");

    expect(mock.currentContext).toBe("test-context");
  });

  it("isContextLoaded works correctly", async () => {
    const mock = createMockContextManager();

    await mock.loadContext("S1");

    expect(mock.isContextLoaded("S1")).toBe(true);
    expect(mock.isContextLoaded("other")).toBe(false);
  });
});
