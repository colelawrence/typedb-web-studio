/**
 * LiveStore queries for TypeDB Studio.
 *
 * Pre-defined queries that can be subscribed to throughout the app.
 */

import { queryDb } from "@livestore/livestore";
import { tables } from "./schema";

// ============================================================================
// UI State Queries
// ============================================================================

/** Current UI state (client-scoped) */
export const uiState$ = queryDb(tables.uiState.get(), { label: "uiState" });

/** Current snackbar notifications */
export const snackbarNotifications$ = queryDb(tables.snackbarNotifications.get(), {
  label: "snackbarNotifications",
});

// ============================================================================
// Connection Queries
// ============================================================================

/** All saved connections, ordered by last used */
export const allConnections$ = queryDb(
  tables.connections.orderBy("lastUsedAt", "desc"),
  { label: "allConnections" }
);

// ============================================================================
// Saved Queries
// ============================================================================

/** All folders (not deleted), ordered by sort order */
export const allFolders$ = queryDb(
  tables.savedQueryFolders.where({ deletedAt: null }).orderBy("sortOrder", "asc"),
  { label: "allFolders" }
);

/** All queries (not deleted), ordered by sort order */
export const allQueries$ = queryDb(
  tables.savedQueries.where({ deletedAt: null }).orderBy("sortOrder", "asc"),
  { label: "allQueries" }
);

// ============================================================================
// Query History
// ============================================================================

/** Query history, most recent first, limited to 50 */
export const queryHistory$ = queryDb(
  () => tables.queryHistory.orderBy("executedAt", "desc").limit(50),
  { label: "queryHistory" }
);
