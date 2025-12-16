/**
 * REPL Bridge
 *
 * Provides communication between the document viewer and the query REPL.
 * Allows documentation examples to be copied to or run in the REPL.
 *
 * @module learn/repl-bridge
 */

import type { Store } from "@livestore/livestore";
import type { schema, events } from "../livestore/schema";
import { connectionSession$, uiState$ } from "../livestore/queries";

/**
 * REPL Bridge interface for document-to-REPL communication.
 */
export interface ReplBridge {
  /**
   * Copies a query to the REPL editor without executing.
   * - Sets the editor content
   * - Switches to code mode (if in chat mode)
   * - Navigates to query page if not already there
   * - Does NOT run the query
   *
   * @param query The TypeQL query to copy
   */
  copyToRepl(query: string): void;

  /**
   * Runs a query in the REPL and returns the result.
   * - Sets the editor content
   * - Switches to code mode (if in chat mode)
   * - Navigates to query page if not already there
   * - Executes the query
   * - Returns the result
   *
   * @param query The TypeQL query to execute
   * @returns Execution result with success status, result count, and timing
   */
  runQuery(query: string): Promise<ReplQueryResult>;

  /**
   * Gets the current query text in the editor.
   */
  getCurrentQuery(): string;

  /**
   * Checks if the REPL is ready to execute queries.
   * Returns false if not connected or no database selected.
   */
  isReady(): boolean;
}

/**
 * Result of running a query through the REPL bridge.
 */
export interface ReplQueryResult {
  /**
   * Whether the query executed successfully.
   */
  success: boolean;

  /**
   * Number of results returned (for match/fetch queries).
   */
  resultCount?: number;

  /**
   * Error message if the query failed.
   */
  error?: string;

  /**
   * Execution time in milliseconds.
   */
  executionTimeMs: number;
}

/**
 * Options for creating a REPL bridge.
 */
export interface ReplBridgeOptions {
  /** LiveStore instance */
  store: Store<typeof schema>;
  /** LiveStore events for committing changes */
  events: typeof events;
  /** Navigate to a route */
  navigate: (path: string) => void;
  /** Execute a query against TypeDB */
  executeQuery: (query: string) => Promise<{
    success: boolean;
    resultCount?: number;
    error?: string;
    executionTimeMs: number;
  }>;
  /** Show a snackbar notification */
  showSnackbar: (type: "success" | "warning" | "error", message: string) => void;
}

/**
 * Creates a REPL bridge for document-to-REPL communication.
 */
export function createReplBridge(options: ReplBridgeOptions): ReplBridge {
  const { store, events: storeEvents, navigate, executeQuery, showSnackbar } = options;

  const copyToRepl = (query: string) => {
    // Set the query text in the editor
    store.commit(storeEvents.uiStateSet({
      currentQueryText: query,
      hasUnsavedChanges: true,
      editorMode: "code",
    }));

    // Navigate to query page if not already there
    const uiState = store.query(uiState$);
    if (uiState.currentPage !== "query") {
      store.commit(storeEvents.uiStateSet({ currentPage: "query" }));
      navigate("/query");
    }

    showSnackbar("success", "Query copied to editor");
  };

  const runQuery = async (query: string): Promise<ReplQueryResult> => {
    // First copy to REPL
    store.commit(storeEvents.uiStateSet({
      currentQueryText: query,
      hasUnsavedChanges: true,
      editorMode: "code",
    }));

    // Navigate to query page if not already there
    const uiState = store.query(uiState$);
    if (uiState.currentPage !== "query") {
      store.commit(storeEvents.uiStateSet({ currentPage: "query" }));
      navigate("/query");
    }

    // Execute the query
    const result = await executeQuery(query);

    if (result.success) {
      showSnackbar("success", `Query executed (${result.resultCount ?? 0} results)`);
    } else {
      showSnackbar("error", result.error ?? "Query failed");
    }

    return result;
  };

  const getCurrentQuery = (): string => {
    const uiState = store.query(uiState$);
    return uiState.currentQueryText;
  };

  const isReady = (): boolean => {
    const session = store.query(connectionSession$);
    return session.status === "connected" && session.activeDatabase !== null;
  };

  return {
    copyToRepl,
    runQuery,
    getCurrentQuery,
    isReady,
  };
}

/**
 * Creates a mock REPL bridge for testing.
 */
export function createMockReplBridge(): ReplBridge & {
  copyToReplCalls: string[];
  runQueryCalls: string[];
  setQueryResult: (result: ReplQueryResult) => void;
} {
  const copyToReplCalls: string[] = [];
  const runQueryCalls: string[] = [];
  let mockResult: ReplQueryResult = {
    success: true,
    resultCount: 3,
    executionTimeMs: 100,
  };

  return {
    copyToReplCalls,
    runQueryCalls,

    copyToRepl(query: string) {
      copyToReplCalls.push(query);
    },

    async runQuery(query: string): Promise<ReplQueryResult> {
      runQueryCalls.push(query);
      return mockResult;
    },

    getCurrentQuery() {
      return "";
    },

    isReady() {
      return true;
    },

    setQueryResult(result: ReplQueryResult) {
      mockResult = result;
    },
  };
}
