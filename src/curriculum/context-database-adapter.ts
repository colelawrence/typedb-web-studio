/**
 * Context Database Adapter
 *
 * Implements ContextDatabaseOps interface to connect the ContextManager
 * to the actual TypeDB service for lesson database operations.
 *
 * @module curriculum/context-database-adapter
 */

import type { Store } from "@livestore/livestore";
import type { TypeDBService } from "../services/typedb-service";
import type { schema } from "../livestore/schema";
import { events } from "../livestore/schema";
import { connectionSession$ } from "../livestore/queries";
import type { ContextDatabaseOps } from "./context-manager";

/**
 * Options for creating the context database adapter.
 */
export interface ContextDatabaseAdapterOptions {
  /**
   * Function to get the current TypeDB service instance.
   */
  getService: () => TypeDBService;

  /**
   * LiveStore instance for querying/updating connection state.
   */
  store: Store<typeof schema>;

  /**
   * Function to refresh the database list after changes.
   */
  refreshDatabaseList: () => Promise<void>;

  /**
   * Function to auto-connect to WASM mode if not connected.
   * This enables a seamless learning experience.
   */
  quickConnectWasm: () => Promise<TypeDBService>;
}

/**
 * Creates a ContextDatabaseOps adapter that connects to the TypeDB service.
 *
 * This adapter:
 * - Auto-connects to WASM mode if not already connected
 * - Creates/resets databases for lesson contexts
 * - Executes schema and seed queries
 * - Updates LiveStore with the active database
 */
export function createContextDatabaseAdapter(
  options: ContextDatabaseAdapterOptions
): ContextDatabaseOps {
  const { getService, store, refreshDatabaseList, quickConnectWasm } = options;

  /**
   * Ensures we have a connected TypeDB service.
   * Auto-connects to WASM mode if disconnected.
   */
  async function ensureConnected(): Promise<TypeDBService> {
    const session = store.query(connectionSession$);

    if (session.status === "connected") {
      return getService();
    }

    // Auto-connect to WASM mode for learning
    console.log("[context-database-adapter] Auto-connecting to WASM mode...");
    return quickConnectWasm();
  }

  return {
    async createDatabase(name: string): Promise<void> {
      const service = await ensureConnected();

      // Try to delete existing database first (reset behavior)
      try {
        const databases = await service.getDatabases();
        const exists = databases.some((db) => db.name === name);
        if (exists) {
          console.log(
            `[context-database-adapter] Deleting existing database: ${name}`
          );
          await service.deleteDatabase(name);
        }
      } catch (e) {
        // Ignore errors - database might not exist
        console.log(
          `[context-database-adapter] No existing database to delete: ${name}`
        );
      }

      // Create fresh database
      console.log(`[context-database-adapter] Creating database: ${name}`);
      await service.createDatabase(name);
    },

    async executeSchema(database: string, schema: string): Promise<void> {
      const service = await ensureConnected();

      if (!schema.trim()) {
        return;
      }

      console.log(
        `[context-database-adapter] Executing schema on ${database}...`
      );
      await service.executeQuery(database, schema, {
        transactionType: "schema",
      });
    },

    async executeWrite(database: string, query: string): Promise<void> {
      const service = await ensureConnected();

      if (!query.trim()) {
        return;
      }

      console.log(
        `[context-database-adapter] Executing write on ${database}...`
      );
      await service.executeQuery(database, query, {
        transactionType: "write",
      });
    },

    getActiveDatabase(): string | null {
      const session = store.query(connectionSession$);
      return session.activeDatabase;
    },

    setActiveDatabase(name: string): void {
      console.log(`[context-database-adapter] Setting active database: ${name}`);

      // Update LiveStore with the new active database
      store.commit(
        events.connectionSessionSet({
          activeDatabase: name,
        })
      );

      // Refresh the database list so the selector updates
      refreshDatabaseList().catch((e) => {
        console.warn(
          "[context-database-adapter] Failed to refresh database list:",
          e
        );
      });
    },

    async databaseExists(name: string): Promise<boolean> {
      const service = await ensureConnected();
      const databases = await service.getDatabases();
      return databases.some((db) => db.name === name);
    },
  };
}
