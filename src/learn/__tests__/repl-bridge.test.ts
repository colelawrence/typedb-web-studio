/**
 * REPL Bridge Tests
 *
 * Tests the ReplBridge functionality:
 * - Copy to REPL without executing
 * - Run query with result
 * - Navigation to query page
 * - Readiness checks
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createStore, provideOtel } from "@livestore/livestore";
import { makeInMemoryAdapter } from "@livestore/adapter-web";
import { Effect } from "effect";

import { createReplBridge, createMockReplBridge } from "../repl-bridge";
import { events, schema } from "../../livestore/schema";
import { uiState$ } from "../../livestore/queries";

// ============================================================================
// Test Context
// ============================================================================

let storeCounter = 0;

async function createTestStore() {
  return await Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        return yield* createStore({
          schema,
          storeId: `repl-bridge-test-${Date.now()}-${++storeCounter}`,
          adapter: makeInMemoryAdapter(),
        });
      })
    ).pipe(provideOtel({}))
  );
}

interface TestContext {
  store: Awaited<ReturnType<typeof createTestStore>>;
  navigate: ReturnType<typeof vi.fn>;
  executeQuery: ReturnType<typeof vi.fn>;
  showSnackbar: ReturnType<typeof vi.fn>;
  cleanup: () => Promise<void>;
}

async function createTestContext(): Promise<TestContext> {
  const store = await createTestStore();

  const navigate = vi.fn();
  const executeQuery = vi.fn().mockResolvedValue({
    success: true,
    resultCount: 5,
    executionTimeMs: 150,
  });
  const showSnackbar = vi.fn();

  return {
    store,
    navigate,
    executeQuery,
    showSnackbar,
    cleanup: async () => {
      // Cleanup is handled by Effect.scoped
    },
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("ReplBridge", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestContext();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  // --------------------------------------------------------------------------
  // Copy to REPL
  // --------------------------------------------------------------------------

  describe("copyToRepl", () => {
    it("sets query text in editor", () => {
      const bridge = createReplBridge({
        store: ctx.store,
        events,
        navigate: ctx.navigate,
        executeQuery: ctx.executeQuery,
        showSnackbar: ctx.showSnackbar,
      });

      bridge.copyToRepl("match $p isa person;");

      const uiState = ctx.store.query(uiState$);
      expect(uiState.currentQueryText).toBe("match $p isa person;");
    });

    it("marks editor as having unsaved changes", () => {
      const bridge = createReplBridge({
        store: ctx.store,
        events,
        navigate: ctx.navigate,
        executeQuery: ctx.executeQuery,
        showSnackbar: ctx.showSnackbar,
      });

      bridge.copyToRepl("match $p isa person;");

      const uiState = ctx.store.query(uiState$);
      expect(uiState.hasUnsavedChanges).toBe(true);
    });

    it("switches to code mode", () => {
      // Start in chat mode
      ctx.store.commit(events.uiStateSet({ editorMode: "chat" }));

      const bridge = createReplBridge({
        store: ctx.store,
        events,
        navigate: ctx.navigate,
        executeQuery: ctx.executeQuery,
        showSnackbar: ctx.showSnackbar,
      });

      bridge.copyToRepl("match $p isa person;");

      const uiState = ctx.store.query(uiState$);
      expect(uiState.editorMode).toBe("code");
    });

    it("navigates to query page if not already there", () => {
      // Start on home page
      ctx.store.commit(events.uiStateSet({ currentPage: "home" }));

      const bridge = createReplBridge({
        store: ctx.store,
        events,
        navigate: ctx.navigate,
        executeQuery: ctx.executeQuery,
        showSnackbar: ctx.showSnackbar,
      });

      bridge.copyToRepl("match $p isa person;");

      expect(ctx.navigate).toHaveBeenCalledWith("/query");
    });

    it("does not navigate if already on query page", () => {
      // Start on query page
      ctx.store.commit(events.uiStateSet({ currentPage: "query" }));

      const bridge = createReplBridge({
        store: ctx.store,
        events,
        navigate: ctx.navigate,
        executeQuery: ctx.executeQuery,
        showSnackbar: ctx.showSnackbar,
      });

      bridge.copyToRepl("match $p isa person;");

      expect(ctx.navigate).not.toHaveBeenCalled();
    });

    it("shows success snackbar", () => {
      const bridge = createReplBridge({
        store: ctx.store,
        events,
        navigate: ctx.navigate,
        executeQuery: ctx.executeQuery,
        showSnackbar: ctx.showSnackbar,
      });

      bridge.copyToRepl("match $p isa person;");

      expect(ctx.showSnackbar).toHaveBeenCalledWith("success", "Query copied to editor");
    });
  });

  // --------------------------------------------------------------------------
  // Run Query
  // --------------------------------------------------------------------------

  describe("runQuery", () => {
    it("executes query and returns result", async () => {
      const bridge = createReplBridge({
        store: ctx.store,
        events,
        navigate: ctx.navigate,
        executeQuery: ctx.executeQuery,
        showSnackbar: ctx.showSnackbar,
      });

      const result = await bridge.runQuery("match $p isa person;");

      expect(result.success).toBe(true);
      expect(result.resultCount).toBe(5);
      expect(ctx.executeQuery).toHaveBeenCalledWith("match $p isa person;");
    });

    it("sets query text before executing", async () => {
      const bridge = createReplBridge({
        store: ctx.store,
        events,
        navigate: ctx.navigate,
        executeQuery: ctx.executeQuery,
        showSnackbar: ctx.showSnackbar,
      });

      await bridge.runQuery("match $p isa person;");

      const uiState = ctx.store.query(uiState$);
      expect(uiState.currentQueryText).toBe("match $p isa person;");
    });

    it("shows success snackbar with result count", async () => {
      const bridge = createReplBridge({
        store: ctx.store,
        events,
        navigate: ctx.navigate,
        executeQuery: ctx.executeQuery,
        showSnackbar: ctx.showSnackbar,
      });

      await bridge.runQuery("match $p isa person;");

      expect(ctx.showSnackbar).toHaveBeenCalledWith("success", "Query executed (5 results)");
    });

    it("shows error snackbar on failure", async () => {
      ctx.executeQuery.mockResolvedValueOnce({
        success: false,
        error: "Syntax error",
        executionTimeMs: 50,
      });

      const bridge = createReplBridge({
        store: ctx.store,
        events,
        navigate: ctx.navigate,
        executeQuery: ctx.executeQuery,
        showSnackbar: ctx.showSnackbar,
      });

      await bridge.runQuery("match $p person;");

      expect(ctx.showSnackbar).toHaveBeenCalledWith("error", "Syntax error");
    });

    it("navigates to query page if not already there", async () => {
      ctx.store.commit(events.uiStateSet({ currentPage: "home" }));

      const bridge = createReplBridge({
        store: ctx.store,
        events,
        navigate: ctx.navigate,
        executeQuery: ctx.executeQuery,
        showSnackbar: ctx.showSnackbar,
      });

      await bridge.runQuery("match $p isa person;");

      expect(ctx.navigate).toHaveBeenCalledWith("/query");
    });
  });

  // --------------------------------------------------------------------------
  // Helper Methods
  // --------------------------------------------------------------------------

  describe("getCurrentQuery", () => {
    it("returns current query text", () => {
      ctx.store.commit(events.uiStateSet({ currentQueryText: "match $x isa thing;" }));

      const bridge = createReplBridge({
        store: ctx.store,
        events,
        navigate: ctx.navigate,
        executeQuery: ctx.executeQuery,
        showSnackbar: ctx.showSnackbar,
      });

      expect(bridge.getCurrentQuery()).toBe("match $x isa thing;");
    });
  });

  describe("isReady", () => {
    it("returns false when not connected", () => {
      ctx.store.commit(events.connectionSessionSet({
        status: "disconnected",
        activeDatabase: "test-db",
      }));

      const bridge = createReplBridge({
        store: ctx.store,
        events,
        navigate: ctx.navigate,
        executeQuery: ctx.executeQuery,
        showSnackbar: ctx.showSnackbar,
      });

      expect(bridge.isReady()).toBe(false);
    });

    it("returns false when no database selected", () => {
      ctx.store.commit(events.connectionSessionSet({
        status: "connected",
        activeDatabase: null,
      }));

      const bridge = createReplBridge({
        store: ctx.store,
        events,
        navigate: ctx.navigate,
        executeQuery: ctx.executeQuery,
        showSnackbar: ctx.showSnackbar,
      });

      expect(bridge.isReady()).toBe(false);
    });

    it("returns true when connected with database", () => {
      ctx.store.commit(events.connectionSessionSet({
        status: "connected",
        activeDatabase: "test-db",
      }));

      const bridge = createReplBridge({
        store: ctx.store,
        events,
        navigate: ctx.navigate,
        executeQuery: ctx.executeQuery,
        showSnackbar: ctx.showSnackbar,
      });

      expect(bridge.isReady()).toBe(true);
    });
  });
});

// ============================================================================
// Mock Bridge Tests
// ============================================================================

describe("createMockReplBridge", () => {
  it("tracks copyToRepl calls", () => {
    const bridge = createMockReplBridge();

    bridge.copyToRepl("query 1");
    bridge.copyToRepl("query 2");

    expect(bridge.copyToReplCalls).toEqual(["query 1", "query 2"]);
  });

  it("tracks runQuery calls", async () => {
    const bridge = createMockReplBridge();

    await bridge.runQuery("query 1");
    await bridge.runQuery("query 2");

    expect(bridge.runQueryCalls).toEqual(["query 1", "query 2"]);
  });

  it("returns configurable result", async () => {
    const bridge = createMockReplBridge();

    bridge.setQueryResult({
      success: false,
      error: "Test error",
      executionTimeMs: 0,
    });

    const result = await bridge.runQuery("test");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Test error");
  });

  it("isReady returns true by default", () => {
    const bridge = createMockReplBridge();
    expect(bridge.isReady()).toBe(true);
  });
});
