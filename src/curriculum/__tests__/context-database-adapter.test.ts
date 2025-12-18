/**
 * Tests for the Context Database Adapter
 *
 * These tests verify that the adapter correctly connects to the TypeDB service
 * and performs database operations for lesson contexts.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createStore, provideOtel } from "@livestore/livestore";
import { makeInMemoryAdapter } from "@livestore/adapter-web";
import { Effect } from "effect";

import { schema, events } from "../../livestore/schema";
import { connectionSession$ } from "../../livestore/queries";
import { createContextDatabaseAdapter } from "../context-database-adapter";
import type { TypeDBService } from "../../services/typedb-service";

// ============================================================================
// Mock TypeDB Service
// ============================================================================

function createMockService(): TypeDBService & {
  createDatabaseCalls: string[];
  deleteDatabaseCalls: string[];
  executeQueryCalls: Array<{
    database: string;
    query: string;
    options?: { transactionType?: string };
  }>;
  mockDatabases: Set<string>;
} {
  const mockDatabases = new Set<string>();
  const createDatabaseCalls: string[] = [];
  const deleteDatabaseCalls: string[] = [];
  const executeQueryCalls: Array<{
    database: string;
    query: string;
    options?: { transactionType?: string };
  }> = [];

  return {
    mockDatabases,
    createDatabaseCalls,
    deleteDatabaseCalls,
    executeQueryCalls,

    async connect() {},
    async disconnect() {},
    getStatus: () => "connected" as const,
    async getDatabases() {
      return Array.from(mockDatabases).map((name) => ({ name }));
    },
    async createDatabase(name: string) {
      createDatabaseCalls.push(name);
      mockDatabases.add(name);
    },
    async deleteDatabase(name: string) {
      deleteDatabaseCalls.push(name);
      mockDatabases.delete(name);
    },
    async executeQuery(
      database: string,
      query: string,
      options?: { transactionType?: string }
    ) {
      executeQueryCalls.push({ database, query, options });
      return { columns: [], rows: [] };
    },
    async getUsers() {
      return [];
    },
    async getSchema() {
      return { entities: [], relations: [], attributes: [] };
    },
    beginTransaction: async () => ({ id: "tx" }),
    query: async () => ({ columns: [], rows: [] }),
  } as unknown as TypeDBService & {
    createDatabaseCalls: string[];
    deleteDatabaseCalls: string[];
    executeQueryCalls: Array<{
      database: string;
      query: string;
      options?: { transactionType?: string };
    }>;
    mockDatabases: Set<string>;
  };
}

// ============================================================================
// Test Helpers
// ============================================================================

async function createTestStore() {
  return Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        return yield* createStore({
          schema,
          storeId: `test-${Date.now()}`,
          adapter: makeInMemoryAdapter(),
        });
      })
    ).pipe(provideOtel({}))
  );
}

// ============================================================================
// Tests
// ============================================================================

describe("createContextDatabaseAdapter", () => {
  let store: Awaited<ReturnType<typeof createTestStore>>;
  let mockService: ReturnType<typeof createMockService>;
  let refreshDatabaseListCalls: number;
  let quickConnectWasmCalls: number;

  beforeEach(async () => {
    store = await createTestStore();
    mockService = createMockService();
    refreshDatabaseListCalls = 0;
    quickConnectWasmCalls = 0;
  });

  function createAdapter(connectionStatus: "connected" | "disconnected" = "connected") {
    // Set initial connection status
    store.commit(
      events.connectionSessionSet({
        status: connectionStatus,
        activeDatabase: null,
      })
    );

    return createContextDatabaseAdapter({
      getService: () => mockService,
      store,
      refreshDatabaseList: async () => {
        refreshDatabaseListCalls++;
      },
      quickConnectWasm: async () => {
        quickConnectWasmCalls++;
        store.commit(
          events.connectionSessionSet({
            status: "connected",
          })
        );
        return mockService;
      },
    });
  }

  describe("createDatabase", () => {
    it("creates a new database", async () => {
      const adapter = createAdapter();
      await adapter.createDatabase("learn_social_network");

      expect(mockService.createDatabaseCalls).toContain("learn_social_network");
    });

    it("deletes existing database before creating", async () => {
      const adapter = createAdapter();
      mockService.mockDatabases.add("learn_social_network");

      await adapter.createDatabase("learn_social_network");

      expect(mockService.deleteDatabaseCalls).toContain("learn_social_network");
      expect(mockService.createDatabaseCalls).toContain("learn_social_network");
    });

    it("auto-connects to WASM if disconnected", async () => {
      const adapter = createAdapter("disconnected");

      await adapter.createDatabase("learn_test");

      expect(quickConnectWasmCalls).toBe(1);
      expect(mockService.createDatabaseCalls).toContain("learn_test");
    });

    it("does not auto-connect if already connected", async () => {
      const adapter = createAdapter("connected");

      await adapter.createDatabase("learn_test");

      expect(quickConnectWasmCalls).toBe(0);
    });
  });

  describe("executeSchema", () => {
    it("executes schema query with schema transaction type", async () => {
      const adapter = createAdapter();

      await adapter.executeSchema(
        "learn_test",
        "define entity person;"
      );

      expect(mockService.executeQueryCalls).toContainEqual({
        database: "learn_test",
        query: "define entity person;",
        options: { transactionType: "schema" },
      });
    });

    it("skips empty schema", async () => {
      const adapter = createAdapter();

      await adapter.executeSchema("learn_test", "   ");

      expect(mockService.executeQueryCalls).toHaveLength(0);
    });
  });

  describe("executeWrite", () => {
    it("executes write query with write transaction type", async () => {
      const adapter = createAdapter();

      await adapter.executeWrite(
        "learn_test",
        "insert $p isa person;"
      );

      expect(mockService.executeQueryCalls).toContainEqual({
        database: "learn_test",
        query: "insert $p isa person;",
        options: { transactionType: "write" },
      });
    });

    it("skips empty query", async () => {
      const adapter = createAdapter();

      await adapter.executeWrite("learn_test", "");

      expect(mockService.executeQueryCalls).toHaveLength(0);
    });
  });

  describe("getActiveDatabase", () => {
    it("returns active database from connection session", async () => {
      const adapter = createAdapter();
      store.commit(
        events.connectionSessionSet({
          activeDatabase: "my_database",
        })
      );

      const result = adapter.getActiveDatabase();

      expect(result).toBe("my_database");
    });

    it("returns null when no active database", async () => {
      const adapter = createAdapter();

      const result = adapter.getActiveDatabase();

      expect(result).toBeNull();
    });
  });

  describe("setActiveDatabase", () => {
    it("updates connection session with new active database", async () => {
      const adapter = createAdapter();

      adapter.setActiveDatabase("learn_social_network");

      const session = store.query(connectionSession$);
      expect(session.activeDatabase).toBe("learn_social_network");
    });

    it("triggers database list refresh", async () => {
      const adapter = createAdapter();

      adapter.setActiveDatabase("learn_social_network");

      // Wait for async refresh
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(refreshDatabaseListCalls).toBe(1);
    });
  });
});
