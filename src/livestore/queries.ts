/**
 * LiveStore queries for TypeDB Studio.
 *
 * Pre-defined queries that can be subscribed to throughout the app.
 */

import { queryDb } from "@livestore/livestore";
import { tables } from "./schema";

// ============================================================================
// Profile Queries (Interactive Learning)
// ============================================================================

/** All profiles, ordered by last active */
export const allProfiles$ = queryDb(
  tables.profiles.orderBy("lastActiveAt", "desc"),
  { label: "allProfiles" }
);

/**
 * Create a query for a specific profile by ID.
 * Returns array with single item or empty array.
 */
export function profileById$(profileId: string) {
  return queryDb(
    tables.profiles.where({ id: profileId }),
    { label: `profile:${profileId}` }
  );
}

/**
 * Reading progress for a specific profile.
 * Returns all sections/headings marked or viewed by this profile.
 */
export function readingProgressForProfile$(profileId: string) {
  return queryDb(
    () => tables.readingProgress.where({ profileId }).orderBy("lastViewedAt", "desc"),
    { label: `readingProgress:${profileId}` }
  );
}

/**
 * Reading progress for a specific section within a profile.
 * Returns all heading progress entries for this section.
 */
export function readingProgressForSection$(profileId: string, sectionId: string) {
  return queryDb(
    () => tables.readingProgress.where({ profileId, sectionId }),
    { label: `readingProgress:${profileId}:${sectionId}` }
  );
}

/**
 * Check if a specific section/heading has been marked as read.
 * Returns array with single item or empty array.
 */
export function isSectionRead$(profileId: string, sectionId: string, headingId?: string) {
  const id = `${profileId}:${sectionId}:${headingId ?? "root"}`;
  return queryDb(
    tables.readingProgress.where({ id }),
    { label: `isSectionRead:${id}` }
  );
}

/**
 * Example executions for a specific profile.
 * Returns all examples that have been executed by this profile.
 */
export function executionsForProfile$(profileId: string) {
  return queryDb(
    () => tables.exampleExecutions.where({ profileId }).orderBy("executedAt", "desc"),
    { label: `executions:${profileId}` }
  );
}

/**
 * Get all unique example IDs that have been executed by a profile.
 * Useful for showing which examples have been "completed".
 */
export function executedExampleIds$(profileId: string) {
  return queryDb(
    () => tables.exampleExecutions.where({ profileId }),
    { label: `executedExampleIds:${profileId}` }
  );
}

/**
 * Annotations for a specific profile.
 */
export function annotationsForProfile$(profileId: string) {
  return queryDb(
    () => tables.annotations.where({ profileId }).orderBy("updatedAt", "desc"),
    { label: `annotations:${profileId}` }
  );
}

/**
 * Annotations for a specific section within a profile.
 */
export function annotationsForSection$(profileId: string, sectionId: string) {
  return queryDb(
    () => tables.annotations.where({ profileId, sectionId }),
    { label: `annotations:${profileId}:${sectionId}` }
  );
}

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
// Local Server Queries
// ============================================================================

/** All local WASM servers (non-demo), ordered by last used */
export const localServers$ = queryDb(
  tables.localServers.where({ isDemo: false }).orderBy("lastUsedAt", "desc"),
  { label: "localServers" }
);

/** All demo servers, ordered by name */
export const demoServers$ = queryDb(
  tables.localServers.where({ isDemo: true }).orderBy("name", "asc"),
  { label: "demoServers" }
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

// ============================================================================
// Schema Types
// ============================================================================

/** Parsed schema types for the current database */
export const schemaTypes$ = queryDb(tables.schemaTypes.get(), {
  label: "schemaTypes",
});

// ============================================================================
// Query Results (Ephemeral)
// ============================================================================

/** Current query execution results */
export const queryResults$ = queryDb(tables.queryResults.get(), {
  label: "queryResults",
});

// ============================================================================
// Available Databases
// ============================================================================

/** Available databases for current connection */
export const availableDatabases$ = queryDb(tables.availableDatabases.get(), {
  label: "availableDatabases",
});
