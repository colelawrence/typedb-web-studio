/**
 * Demo Manager
 *
 * Manages demo databases for the TypeDB Studio.
 * Handles loading, switching, and resetting demo databases.
 *
 * @module demos/demo-manager
 */

import type { DemoDefinition } from "./index";
import { demoDatabaseNameForDemo } from "./demo-db";
import { splitTypeQLStatements } from "../curriculum/typeql-statement-splitter";

/**
 * Demo manager interface for loading and switching demos.
 */
export interface DemoManager {
  /**
   * Currently loaded demo ID, or null if none.
   */
  currentDemo: string | null;

  /**
   * Whether a demo is currently being loaded.
   */
  isLoading: boolean;

  /**
   * Last error that occurred during loading, or null.
   */
  lastError: string | null;

  /**
   * Loads a demo by ID.
   * Creates the database and applies schema + sample data.
   *
   * @param demoId The demo to load (e.g., "social-network")
   * @returns Promise that resolves when demo is loaded
   */
  loadDemo(demoId: string): Promise<void>;

  /**
   * Switches to a demo, reusing the existing database if it exists.
   * This is faster than loadDemo when the database already exists.
   *
   * - If the database exists: just switches to it (fast path)
   * - If the database doesn't exist: falls back to full loadDemo (slow path)
   *
   * @param demoId The demo to switch to (e.g., "social-network")
   */
  switchOrLoadDemo(demoId: string): Promise<void>;

  /**
   * Resets the current demo to its initial state.
   * Re-applies schema and sample data.
   */
  resetDemo(): Promise<void>;

  /**
   * Clears the current demo without loading a new one.
   */
  clearDemo(): Promise<void>;

  /**
   * Gets the current demo status.
   */
  getStatus(): DemoStatus;

  /**
   * Checks if a given demo matches the current demo.
   */
  isDemoLoaded(demoId: string | null): boolean;
}

/**
 * Demo status information.
 */
export interface DemoStatus {
  /**
   * Currently loaded demo ID, or null.
   */
  demoId: string | null;

  /**
   * Whether demo is ready for queries.
   */
  isReady: boolean;

  /**
   * Whether demo is currently being loaded.
   */
  isLoading: boolean;

  /**
   * Error message if loading failed.
   */
  error: string | null;
}

/**
 * Database operations interface for applying demos.
 */
export interface DemoDatabaseOps {
  /**
   * Creates a new database, dropping existing if present.
   */
  createDatabase(name: string): Promise<void>;

  /**
   * Executes a schema definition query.
   */
  executeSchema(database: string, schema: string): Promise<void>;

  /**
   * Executes a write (insert/match-insert) query.
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

  /**
   * Checks if a database exists on the server.
   */
  databaseExists(name: string): Promise<boolean>;
}

/**
 * Demo context state for reactive updates.
 */
export interface DemoContextState {
  currentDemo: string | null;
  isLoading: boolean;
  lastError: string | null;
  lastLoadedAt: number | null;
}

/**
 * Options for creating a demo manager.
 */
export interface DemoManagerOptions {
  /**
   * Available demos.
   */
  demos: DemoDefinition[];

  /**
   * Database operations for applying schema/data.
   */
  dbOps: DemoDatabaseOps;

  /**
   * Optional callback when demo changes.
   */
  onDemoChanged?: (demoId: string | null) => void;

  /**
   * Optional callback for status updates.
   */
  onStatusChanged?: (status: DemoStatus) => void;

  /**
   * Callback to update demo context state in LiveStore.
   * This is how we make demo state reactive.
   */
  onStateUpdate?: (state: DemoContextState) => void;
}

/**
 * Creates a demo manager for TypeDB Studio.
 */
export function createDemoManager(options: DemoManagerOptions): DemoManager {
  const { demos, dbOps, onDemoChanged, onStatusChanged, onStateUpdate } = options;

  // Create lookup map for demos
  const demoMap = new Map(demos.map((d) => [d.id, d]));

  let currentDemo: string | null = null;
  let isLoading = false;
  let lastError: string | null = null;
  let lastLoadedAt: number | null = null;

  const notifyStateUpdate = () => {
    onStateUpdate?.({
      currentDemo,
      isLoading,
      lastError,
      lastLoadedAt,
    });
  };

  const notifyStatusChange = () => {
    onStatusChanged?.({
      demoId: currentDemo,
      isReady: currentDemo !== null && !isLoading && lastError === null,
      isLoading,
      error: lastError,
    });
    notifyStateUpdate();
  };

  const loadDemo = async (demoId: string): Promise<void> => {
    console.log(`[demo-manager] loadDemo called:`, {
      demoId,
      currentDemo,
      lastError,
      availableDemos: Array.from(demoMap.keys()),
    });

    // Skip if already loaded
    if (demoId === currentDemo && !lastError) {
      console.log(`[demo-manager] Skipping - already loaded`);
      return;
    }

    const demo = demoMap.get(demoId);
    if (!demo) {
      console.error(`[demo-manager] Demo not found: ${demoId}`);
      throw new Error(`Demo not found: ${demoId}`);
    }

    isLoading = true;
    lastError = null;
    notifyStatusChange();

    try {
      // Create/reset the database for this demo
      const dbName = demoDatabaseNameForDemo(demoId);
      console.log(`[demo-manager] Creating database: ${dbName}`);
      await dbOps.createDatabase(dbName);

      // Apply schema
      if (demo.schema.trim()) {
        // Clean up schema - remove comments and normalize
        const cleanSchema = demo.schema
          .split("\n")
          .filter((line) => !line.trim().startsWith("#"))
          .join("\n");

        await dbOps.executeSchema(dbName, cleanSchema);
      }

      // Apply sample data (insert and match-insert statements)
      if (demo.sampleData.trim()) {
        const statements = splitTypeQLStatements(demo.sampleData);

        for (const statement of statements) {
          try {
            await dbOps.executeWrite(dbName, statement);
          } catch (e) {
            // Log but continue with other statements
            console.warn(`[demo-manager] Sample data statement warning:`, e);
          }
        }
      }

      // Set as active database
      dbOps.setActiveDatabase(dbName);

      currentDemo = demoId;
      isLoading = false;
      lastLoadedAt = Date.now();
      notifyStatusChange();
      onDemoChanged?.(demoId);
    } catch (e) {
      isLoading = false;
      lastError = e instanceof Error ? e.message : String(e);
      notifyStatusChange();
      throw e;
    }
  };

  const switchOrLoadDemo = async (demoId: string): Promise<void> => {
    // Skip if already loaded and selected
    if (demoId === currentDemo && !lastError) {
      const expectedDb = demoDatabaseNameForDemo(demoId);
      const activeDb = dbOps.getActiveDatabase();
      if (activeDb === expectedDb) {
        console.log(`[demo-manager] Already on correct demo/database`);
        return;
      }
      // Demo matches but wrong database selected - just switch
      console.log(`[demo-manager] Switching to existing database: ${expectedDb}`);
      dbOps.setActiveDatabase(expectedDb);
      return;
    }

    const dbName = demoDatabaseNameForDemo(demoId);

    // Fast path: if database exists, just switch to it
    const exists = await dbOps.databaseExists(dbName);
    if (exists) {
      console.log(`[demo-manager] Fast path - switching to existing database: ${dbName}`);
      dbOps.setActiveDatabase(dbName);
      currentDemo = demoId;
      lastLoadedAt = Date.now();
      lastError = null;
      notifyStatusChange();
      onDemoChanged?.(demoId);
      return;
    }

    // Slow path: full load (create DB, apply schema/data)
    console.log(`[demo-manager] Slow path - database doesn't exist, doing full load`);
    await loadDemo(demoId);
  };

  const resetDemo = async (): Promise<void> => {
    if (!currentDemo) {
      throw new Error("No demo loaded to reset");
    }

    // Re-load the same demo to reset it
    const demoToReload = currentDemo;
    currentDemo = null; // Clear so loadDemo doesn't short-circuit
    await loadDemo(demoToReload);
  };

  const clearDemo = async (): Promise<void> => {
    currentDemo = null;
    lastError = null;
    notifyStatusChange();
    onDemoChanged?.(null);
  };

  const getStatus = (): DemoStatus => ({
    demoId: currentDemo,
    isReady: currentDemo !== null && !isLoading && lastError === null,
    isLoading,
    error: lastError,
  });

  const isDemoLoaded = (demoId: string | null): boolean => {
    if (demoId === null) return currentDemo === null;
    return currentDemo === demoId;
  };

  return {
    get currentDemo() {
      return currentDemo;
    },
    get isLoading() {
      return isLoading;
    },
    get lastError() {
      return lastError;
    },
    loadDemo,
    switchOrLoadDemo,
    resetDemo,
    clearDemo,
    getStatus,
    isDemoLoaded,
  };
}

/**
 * Creates a mock demo manager for testing.
 */
export function createMockDemoManager(): DemoManager & {
  loadDemoCalls: string[];
  setCurrentDemo: (id: string | null) => void;
} {
  let currentDemo: string | null = null;
  const loadDemoCalls: string[] = [];

  return {
    loadDemoCalls,

    get currentDemo() {
      return currentDemo;
    },
    get isLoading() {
      return false;
    },
    get lastError() {
      return null;
    },

    setCurrentDemo(id: string | null) {
      currentDemo = id;
    },

    async loadDemo(demoId: string) {
      loadDemoCalls.push(demoId);
      currentDemo = demoId;
    },

    async switchOrLoadDemo(demoId: string) {
      loadDemoCalls.push(demoId);
      currentDemo = demoId;
    },

    async resetDemo() {
      if (currentDemo) {
        loadDemoCalls.push(currentDemo);
      }
    },

    async clearDemo() {
      currentDemo = null;
    },

    getStatus() {
      return {
        demoId: currentDemo,
        isReady: currentDemo !== null,
        isLoading: false,
        error: null,
      };
    },

    isDemoLoaded(demoId: string | null) {
      if (demoId === null) return currentDemo === null;
      return currentDemo === demoId;
    },
  };
}
