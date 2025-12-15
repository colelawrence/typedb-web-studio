/**
 * VM Test Utilities
 *
 * Provides utilities for testing View Models with real TypeDB WASM.
 * This is the primary testing approach for the application.
 */

import { vi, expect } from 'vitest'
import { createStore, provideOtel, type Store } from '@livestore/livestore'
import { makeInMemoryAdapter } from '@livestore/adapter-web'
import { Effect } from 'effect'
import { schema, events } from '../livestore/schema'
import { createStudioScope } from '../vm/scope'
import type { TypeDBStudioAppVM } from '../vm/app.vm'
import { TypeDBEmbeddedService } from '../services/typedb-embedded-service'

/**
 * Test context containing everything needed to test VMs.
 */
export interface VMTestContext {
  /** The root application VM */
  vm: TypeDBStudioAppVM
  /** The LiveStore instance */
  store: Store<typeof schema>
  /** Mock navigate function - tracks navigation calls */
  navigate: ReturnType<typeof vi.fn>
  /** The TypeDB service instance */
  service: TypeDBEmbeddedService
  /** Helper to query store values */
  query: <T>(queryable: import("@/vm").Queryable<T>) => T
  /** Helper to commit events */
  commit: typeof events
  /** Cleanup function - call after test */
  cleanup: () => Promise<void>
}

// Counter for unique store IDs
let storeIdCounter = 0

// Module-level service instance for mocking
let testService: TypeDBEmbeddedService | null = null

/**
 * Creates a VM test context with fresh store and mocked service.
 *
 * Usage:
 * ```ts
 * const ctx = await createVMTestContext()
 * try {
 *   // Test VM methods and state
 *   ctx.vm.topBar.logoClick()
 *   expect(ctx.navigate).toHaveBeenCalledWith('/')
 * } finally {
 *   await ctx.cleanup()
 * }
 * ```
 */
export async function createVMTestContext(): Promise<VMTestContext> {
  // Create embedded service for testing
  const service = new TypeDBEmbeddedService()
  testService = service

  // Create a unique store ID for each test
  const storeId = `test-store-${++storeIdCounter}-${Date.now()}`

  // Create in-memory store using Effect.gen pattern with OTel tracing
  // This matches how LiveStore creates stores internally
  const storeEffect = Effect.gen(function* () {
    const store = yield* createStore({
      schema,
      storeId,
      adapter: makeInMemoryAdapter(),
      debug: { instanceId: storeId },
    })
    return store
  })

  // Run with scoped to handle the Scope requirement
  // provideOtel provides the OpenTelemetry tracing layer required by LiveStore
  let store: Store<typeof schema>
  try {
    store = await Effect.runPromise(
      Effect.scoped(storeEffect).pipe(
        provideOtel({}),
        Effect.catchAllCause((cause) => {
          console.error('[VM Test Utils] Store creation failed:', cause)
          return Effect.fail(new Error(`Store creation failed: ${cause}`))
        })
      )
    )
  } catch (error) {
    console.error('[VM Test Utils] Store creation error:', error)
    throw error
  }

  // Mock navigate function
  const navigate = vi.fn()

  // Create the VM scope
  const { vm, services } = createStudioScope(store, navigate)

  // Cleanup function
  const cleanup = async () => {
    testService = null
    // Store cleanup is handled by Effect.scoped
  }

  return {
    vm,
    store,
    navigate,
    service,
    query: (queryable) => store.query(queryable),
    commit: events,
    cleanup,
  }
}

/**
 * Get the current test service instance.
 * Used for testing service-related functionality.
 */
export function getTestService(): TypeDBEmbeddedService | null {
  return testService
}

/**
 * Sets up a connected state with a database.
 * Call after createVMTestContext() to simulate being connected.
 */
export async function setupConnectedState(
  ctx: VMTestContext,
  databaseName = 'test_db'
): Promise<void> {
  // Create database in service
  await ctx.service.connect({
    address: 'wasm://local',
    username: 'test',
    password: '',
    database: databaseName,
  })

  // Update store to reflect connected state
  ctx.store.commit(
    events.uiStateSet({
      connectionStatus: 'connected',
      activeDatabase: databaseName,
      connectionFormAddress: 'wasm://local',
      connectionFormUsername: 'test',
    })
  )
}

/**
 * Defines schema and inserts data in the test database.
 */
export async function setupDatabaseFixture(
  ctx: VMTestContext,
  databaseName: string,
  schemaQuery: string,
  dataQueries: string[] = []
): Promise<void> {
  // Ensure connected
  await ctx.service.connect({
    address: 'wasm://local',
    username: 'test',
    password: '',
    database: databaseName,
  })

  // Define schema
  await ctx.service.executeQuery(databaseName, schemaQuery)

  // Insert data
  for (const query of dataQueries) {
    await ctx.service.executeQuery(databaseName, query)
  }
}

/**
 * Waits for async effects to settle.
 * Use after triggering async VM actions.
 */
export async function waitForEffects(ms = 10): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Asserts the current page.
 */
export function assertCurrentPage(
  ctx: VMTestContext,
  expectedPage: 'home' | 'connect' | 'query' | 'schema' | 'users'
): void {
  const pageState = ctx.store.query(ctx.vm.currentPage$)
  if (pageState.page !== expectedPage) {
    throw new Error(`Expected page '${expectedPage}' but got '${pageState.page}'`)
  }
}

/**
 * Asserts navigation was called with path.
 */
export function assertNavigatedTo(ctx: VMTestContext, path: string): void {
  expect(ctx.navigate).toHaveBeenCalledWith(path)
}

/**
 * Gets the current snackbar message if any.
 */
export function getSnackbarMessage(ctx: VMTestContext): string | null {
  const snackbar = ctx.store.query(ctx.vm.snackbar.current$)
  return snackbar?.message ?? null
}
