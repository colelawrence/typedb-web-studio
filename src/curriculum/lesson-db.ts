/**
 * Lesson Database Utilities
 *
 * Shared mapping between context names and database names.
 * This is the single source of truth for the contextName -> databaseName mapping.
 *
 * @module curriculum/lesson-db
 */

/**
 * Converts a context name to its corresponding database name.
 * This mapping is used by both:
 * - ContextManager.loadContext() to create the database
 * - DocumentViewerScope to verify the correct database is selected
 *
 * @example
 * lessonDatabaseNameForContext("social-network") // => "learn_social_network"
 */
export function lessonDatabaseNameForContext(contextName: string): string {
  return `learn_${contextName.replace(/-/g, "_")}`;
}
