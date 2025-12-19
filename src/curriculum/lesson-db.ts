/**
 * Lesson Database Utilities
 *
 * Shared mapping between context names and database names.
 * This is the single source of truth for the contextName -> databaseName mapping.
 *
 * @module curriculum/lesson-db
 */

/**
 * Prefix used for lesson database names.
 * Used to identify lesson databases in the database selector.
 */
export const LESSON_DB_PREFIX = "learn_";

/**
 * Converts a context name to its corresponding database name.
 * This mapping is used by both:
 * - ContextManager.loadContext() to create the database
 * - DocumentViewerScope to verify the correct database is selected
 *
 * @example
 * lessonDatabaseNameForContext("S1") // => "learn_S1"
 */
export function lessonDatabaseNameForContext(contextName: string): string {
  return `${LESSON_DB_PREFIX}${contextName.replace(/-/g, "_")}`;
}
