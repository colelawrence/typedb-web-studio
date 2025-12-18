/**
 * Context Manager
 *
 * Manages lesson contexts (schema + seed data) for the interactive learning environment.
 * Handles loading, switching, and resetting database contexts.
 *
 * @module curriculum/context-manager
 */

import type { LoadedContext } from "./types";
import { lessonDatabaseNameForContext } from "./lesson-db";
import { splitTypeQLStatements } from "./typeql-statement-splitter";

/**
 * Context manager interface for loading and switching lesson contexts.
 */
export interface ContextManager {
  /**
   * Currently loaded context name, or null if none.
   */
  currentContext: string | null;

  /**
   * Whether a context is currently being loaded.
   */
  isLoading: boolean;

  /**
   * Last error that occurred during loading, or null.
   */
  lastError: string | null;

  /**
   * Loads a context by name.
   * Resets the database and applies schema + seed data.
   *
   * @param contextName The context to load (e.g., "social-network")
   * @returns Promise that resolves when context is loaded
   */
  loadContext(contextName: string): Promise<void>;

  /**
   * Resets the current context to its initial state.
   * Re-applies schema and seed data.
   */
  resetContext(): Promise<void>;

  /**
   * Clears the current context without loading a new one.
   */
  clearContext(): Promise<void>;

  /**
   * Gets the current context status.
   */
  getStatus(): ContextStatus;

  /**
   * Checks if a given context matches the current context.
   */
  isContextLoaded(contextName: string | null): boolean;
}

/**
 * Context status information.
 */
export interface ContextStatus {
  /**
   * Currently loaded context name, or null.
   */
  name: string | null;

  /**
   * Whether context is ready for queries.
   */
  isReady: boolean;

  /**
   * Whether context is currently being loaded.
   */
  isLoading: boolean;

  /**
   * Error message if loading failed.
   */
  error: string | null;
}

/**
 * Database operations interface for applying contexts.
 */
export interface ContextDatabaseOps {
  /**
   * Creates a new database, dropping existing if present.
   */
  createDatabase(name: string): Promise<void>;

  /**
   * Executes a schema definition query.
   */
  executeSchema(database: string, schema: string): Promise<void>;

  /**
   * Executes a write (insert) query.
   */
  executeWrite(database: string, query: string): Promise<void>;

  /**
   * Gets the current active database name.
   */
  getActiveDatabase(): string | null;

  /**
   * Sets the active database.
   */
  setActiveDatabase(name: string): void;
}

/**
 * Lesson context state for reactive updates.
 */
export interface LessonContextState {
  currentContext: string | null;
  isLoading: boolean;
  lastError: string | null;
  lastLoadedAt: number | null;
}

/**
 * Options for creating a context manager.
 */
export interface ContextManagerOptions {
  /**
   * Available contexts from the curriculum bundle.
   */
  contexts: Record<string, LoadedContext>;

  /**
   * Database operations for applying schema/seed.
   */
  dbOps: ContextDatabaseOps;

  /**
   * Optional callback when context changes.
   */
  onContextChanged?: (contextName: string | null) => void;

  /**
   * Optional callback for status updates.
   */
  onStatusChanged?: (status: ContextStatus) => void;

  /**
   * Callback to update lesson context state in LiveStore.
   * This is how we make context state reactive.
   */
  onStateUpdate?: (state: LessonContextState) => void;
}

/**
 * Creates a context manager for the interactive learning environment.
 */
export function createContextManager(options: ContextManagerOptions): ContextManager {
  const { contexts, dbOps, onContextChanged, onStatusChanged, onStateUpdate } = options;

  let currentContext: string | null = null;
  let isLoading = false;
  let lastError: string | null = null;
  let lastLoadedAt: number | null = null;

  const notifyStateUpdate = () => {
    // Update LiveStore state for reactivity
    onStateUpdate?.({
      currentContext,
      isLoading,
      lastError,
      lastLoadedAt,
    });
  };

  const notifyStatusChange = () => {
    onStatusChanged?.({
      name: currentContext,
      isReady: currentContext !== null && !isLoading && lastError === null,
      isLoading,
      error: lastError,
    });
    // Also update LiveStore state
    notifyStateUpdate();
  };

  const loadContext = async (contextName: string): Promise<void> => {
    // Skip if already loaded
    if (contextName === currentContext && !lastError) {
      return;
    }

    const context = contexts[contextName];
    if (!context) {
      throw new Error(`Context not found: ${contextName}`);
    }

    isLoading = true;
    lastError = null;
    notifyStatusChange();

    try {
      // Create/reset the database for this context
      const dbName = lessonDatabaseNameForContext(contextName);
      await dbOps.createDatabase(dbName);

      // Apply schema
      if (context.schema.trim()) {
        // Clean up schema - remove comments and normalize
        const cleanSchema = context.schema
          .split("\n")
          .filter((line) => !line.trim().startsWith("#"))
          .join("\n");

        await dbOps.executeSchema(dbName, cleanSchema);
      }

      // Apply seed data (insert and match-insert statements)
      if (context.seed.trim()) {
        const statements = splitTypeQLStatements(context.seed);

        for (const statement of statements) {
          try {
            await dbOps.executeWrite(dbName, statement);
          } catch (e) {
            // Log but continue with other statements
            console.warn(`[context-manager] Seed statement warning:`, e);
          }
        }
      }

      // Set as active database
      dbOps.setActiveDatabase(dbName);

      currentContext = contextName;
      isLoading = false;
      lastLoadedAt = Date.now();
      notifyStatusChange();
      onContextChanged?.(contextName);
    } catch (e) {
      isLoading = false;
      lastError = e instanceof Error ? e.message : String(e);
      notifyStatusChange();
      throw e;
    }
  };

  const resetContext = async (): Promise<void> => {
    if (!currentContext) {
      throw new Error("No context loaded to reset");
    }

    // Re-load the same context to reset it
    const contextToReload = currentContext;
    currentContext = null; // Clear so loadContext doesn't short-circuit
    await loadContext(contextToReload);
  };

  const clearContext = async (): Promise<void> => {
    currentContext = null;
    lastError = null;
    notifyStatusChange();
    onContextChanged?.(null);
  };

  const getStatus = (): ContextStatus => ({
    name: currentContext,
    isReady: currentContext !== null && !isLoading && lastError === null,
    isLoading,
    error: lastError,
  });

  const isContextLoaded = (contextName: string | null): boolean => {
    if (contextName === null) return currentContext === null;
    return currentContext === contextName;
  };

  return {
    get currentContext() {
      return currentContext;
    },
    get isLoading() {
      return isLoading;
    },
    get lastError() {
      return lastError;
    },
    loadContext,
    resetContext,
    clearContext,
    getStatus,
    isContextLoaded,
  };
}

/**
 * Creates a mock context manager for testing.
 */
export function createMockContextManager(): ContextManager & {
  loadContextCalls: string[];
  setCurrentContext: (name: string | null) => void;
} {
  let currentContext: string | null = null;
  const loadContextCalls: string[] = [];

  return {
    loadContextCalls,

    get currentContext() {
      return currentContext;
    },
    get isLoading() {
      return false;
    },
    get lastError() {
      return null;
    },

    setCurrentContext(name: string | null) {
      currentContext = name;
    },

    async loadContext(contextName: string) {
      loadContextCalls.push(contextName);
      currentContext = contextName;
    },

    async resetContext() {
      if (currentContext) {
        loadContextCalls.push(currentContext);
      }
    },

    async clearContext() {
      currentContext = null;
    },

    getStatus() {
      return {
        name: currentContext,
        isReady: currentContext !== null,
        isLoading: false,
        error: null,
      };
    },

    isContextLoaded(contextName: string | null) {
      if (contextName === null) return currentContext === null;
      return currentContext === contextName;
    },
  };
}
