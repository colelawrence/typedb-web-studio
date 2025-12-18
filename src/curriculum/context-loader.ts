/**
 * Curriculum Context Loader
 *
 * Loads context definitions (schema + seed data) and applies them to TypeDB.
 * Used by the curriculum example test runner to set up appropriate database state.
 *
 * This module is used by browser-based tests that run against TypeDB WASM.
 * For build-time processing, context paths are resolved by the Vite plugin.
 *
 * @module curriculum/context-loader
 */

import type { TypeDBEmbeddedService } from '../services/typedb-embedded-service';
import type { LoadedContext } from './types';
import { splitTypeQLStatements } from './typeql-statement-splitter';

/**
 * Context files loaded from the virtual module at build time.
 * The Vite plugin populates this with the actual file contents.
 */
interface ContextFiles {
  schema: string;
  seed: string;
}

/**
 * Cache of loaded context files.
 * In browser, these are loaded from the virtual module.
 * In tests, they can be provided directly.
 */
const contextCache = new Map<string, ContextFiles>();

/**
 * Register context files for use by the loader.
 * Called at build time by the Vite plugin, or directly in tests.
 *
 * @param name - Context name
 * @param files - Schema and seed file contents
 */
export function registerContext(name: string, files: ContextFiles): void {
  contextCache.set(name, files);
}

/**
 * Load a context by name.
 * Returns the schema and seed queries as strings.
 *
 * @param contextName - Name of the context (e.g., 'social-network')
 * @returns Loaded context with schema and seed content
 * @throws Error if context is not registered
 */
export function loadContext(contextName: string): LoadedContext {
  const files = contextCache.get(contextName);
  if (!files) {
    throw new Error(
      `Context '${contextName}' not found. ` +
        `Available contexts: ${Array.from(contextCache.keys()).join(', ') || 'none'}`
    );
  }

  return {
    name: contextName,
    description: '', // Description comes from context.yaml, not needed for testing
    schema: files.schema,
    seed: files.seed,
  };
}

/**
 * Check if a context is registered.
 *
 * @param contextName - Name of the context
 * @returns True if the context is available
 */
export function hasRegisteredContext(contextName: string): boolean {
  return contextCache.has(contextName);
}

/**
 * Get all registered context names.
 *
 * @returns Array of context names
 */
export function getRegisteredContexts(): string[] {
  return Array.from(contextCache.keys());
}

/**
 * Clear all registered contexts.
 * Useful for test cleanup.
 */
export function clearContexts(): void {
  contextCache.clear();
}

/**
 * Apply a context to a TypeDB database.
 * Executes the schema definition followed by seed data insertion.
 *
 * @param service - TypeDB embedded service instance
 * @param database - Database name to apply context to
 * @param context - Loaded context with schema and seed
 */
export async function applyContext(
  service: TypeDBEmbeddedService,
  database: string,
  context: LoadedContext
): Promise<void> {
  // Apply schema
  await service.executeQuery(database, context.schema, { transactionType: 'schema' });

  // Apply seed data - split into individual statements to handle match-insert patterns
  if (context.seed.trim()) {
    const statements = splitTypeQLStatements(context.seed);
    for (const statement of statements) {
      try {
        await service.executeQuery(database, statement, { transactionType: 'write' });
      } catch (e) {
        // Log but continue with other statements
        console.warn(`[context-loader] Seed statement warning:`, e);
      }
    }
  }
}

/**
 * Load and apply a context to a TypeDB database.
 * Convenience function that combines loadContext and applyContext.
 *
 * @param service - TypeDB embedded service instance
 * @param database - Database name
 * @param contextName - Name of the context to load and apply
 */
export async function loadAndApplyContext(
  service: TypeDBEmbeddedService,
  database: string,
  contextName: string
): Promise<LoadedContext> {
  const context = loadContext(contextName);
  await applyContext(service, database, context);
  return context;
}

/**
 * Create a fresh database with the specified context applied.
 * If the database already exists, it will be deleted and recreated.
 *
 * @param service - TypeDB embedded service instance
 * @param database - Database name to create
 * @param contextName - Name of the context to apply
 * @returns The loaded context that was applied
 */
export async function createDatabaseWithContext(
  service: TypeDBEmbeddedService,
  database: string,
  contextName: string
): Promise<LoadedContext> {
  // Delete if exists (ignore errors)
  try {
    await service.deleteDatabase(database);
  } catch {
    // Database doesn't exist, that's fine
  }

  // Create fresh database
  await service.createDatabase(database);

  // Load and apply context
  return loadAndApplyContext(service, database, contextName);
}
