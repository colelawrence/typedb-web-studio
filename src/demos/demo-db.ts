/**
 * Demo Database Utilities
 *
 * Shared mapping between demo IDs and database names.
 * This is the single source of truth for the demoId -> databaseName mapping.
 *
 * @module demos/demo-db
 */

/**
 * Prefix used for demo database names.
 * Used to identify demo databases in the database selector.
 */
export const DEMO_DB_PREFIX = "demo_";

/**
 * Converts a demo ID to its corresponding database name.
 *
 * @example
 * demoDatabaseNameForDemo("social-network") // => "demo_social_network"
 * demoDatabaseNameForDemo("e-commerce") // => "demo_e_commerce"
 */
export function demoDatabaseNameForDemo(demoId: string): string {
  return `${DEMO_DB_PREFIX}${demoId.replace(/-/g, "_")}`;
}

/**
 * Checks if a database name is a demo database.
 *
 * @example
 * isDemoDatabase("demo_social_network") // => true
 * isDemoDatabase("my_database") // => false
 */
export function isDemoDatabase(name: string): boolean {
  return name.startsWith(DEMO_DB_PREFIX);
}

/**
 * Extracts the demo ID from a demo database name.
 * Returns null if the name is not a demo database.
 *
 * @example
 * getDemoIdFromDatabaseName("demo_social_network") // => "social-network"
 * getDemoIdFromDatabaseName("my_database") // => null
 */
export function getDemoIdFromDatabaseName(name: string): string | null {
  if (!isDemoDatabase(name)) return null;
  return name.slice(DEMO_DB_PREFIX.length).replace(/_/g, "-");
}
