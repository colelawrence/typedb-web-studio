/**
 * Test Fixtures Index
 *
 * Provides database fixtures for deterministic testing.
 */

import { Database } from '@typedb/embedded'

// Re-export fixtures
export * from './S1'

/**
 * Cached fixture snapshots for faster test setup.
 */
const fixtureCache = new Map<string, Uint8Array>()

/**
 * Load or create a fixture snapshot.
 *
 * @param name - Fixture name
 * @param createFn - Function to create the fixture database
 * @returns Database instance populated with fixture data
 */
export async function loadFixture(
  name: string,
  createFn: (dbName: string) => Promise<Database>
): Promise<Database> {
  // Check if we have a cached snapshot
  const cached = fixtureCache.get(name)
  if (cached) {
    const db = await Database.open(`${name}_${Date.now()}`)
    await db.importSnapshot(cached)
    return db
  }

  // Create fresh fixture
  const db = await createFn(name)

  // Cache the snapshot for future use
  const snapshot = await db.exportSnapshot()
  fixtureCache.set(name, snapshot)

  return db
}

/**
 * Clear all cached fixtures.
 */
export function clearFixtureCache(): void {
  fixtureCache.clear()
}

/**
 * Creates an empty database for testing.
 */
export async function createEmptyDb(name = 'empty_test'): Promise<Database> {
  return Database.open(name)
}

/**
 * Creates a database with only schema (no data).
 */
export async function createSchemaOnlyDb(
  name: string,
  schema: string
): Promise<Database> {
  const db = await Database.open(name)
  await db.define(schema)
  return db
}
