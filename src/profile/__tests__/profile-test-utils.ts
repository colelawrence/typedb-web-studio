/**
 * Profile Test Utilities
 *
 * Provides utilities for testing profile-related functionality.
 * Builds on top of the VM test utilities to provide profile-specific helpers.
 */

import { vi } from 'vitest'
import { createStore, provideOtel, queryDb, type Store } from '@livestore/livestore'
import { makeInMemoryAdapter } from '@livestore/adapter-web'
import { Effect } from 'effect'
import { schema, events, tables } from '../../livestore/schema'
import {
  readingProgressForProfile$,
  executionsForProfile$,
  annotationsForProfile$,
  profileById$,
  isSectionRead$,
} from '../../livestore/queries'

/**
 * Test profile context containing store and helpers for profile testing.
 */
export interface TestProfileContext {
  /** Unique profile ID for this test */
  profileId: string
  /** The LiveStore instance */
  store: Store<typeof schema>
  /** Cleanup function - removes all profile data and destroys store */
  cleanup: () => Promise<void>
}

// Counter for unique store IDs
let profileStoreIdCounter = 0

/**
 * Generates a unique test profile ID.
 * Format: test_{timestamp}_{random}
 */
export function generateTestProfileId(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).slice(2, 8)
  return `test_${timestamp}_${random}`
}

/**
 * Creates a test profile context with a fresh store and profile.
 *
 * Usage:
 * ```ts
 * const profile = await createTestProfile()
 * try {
 *   // Test profile-related functionality
 *   await markSectionRead(profile.store, profile.profileId, 'match-basics', 'variables')
 *   const progress = await getReadingProgress(profile.store, profile.profileId)
 *   expect(progress).toContain('match-basics')
 * } finally {
 *   await profile.cleanup()
 * }
 * ```
 */
export async function createTestProfile(): Promise<TestProfileContext> {
  const profileId = generateTestProfileId()
  const random = Math.random().toString(36).slice(2, 10)
  const storeId = `profile-test-${++profileStoreIdCounter}-${Date.now()}-${random}`

  // Create in-memory store using Effect.gen pattern with OTel tracing
  // This matches how vm-test-utils.ts creates stores
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
  const store = await Effect.runPromise(
    Effect.scoped(storeEffect).pipe(
      provideOtel({}),
      Effect.catchAllCause((cause) => {
        console.error('[Profile Test Utils] Store creation failed:', cause)
        return Effect.fail(new Error(`Store creation failed: ${cause}`))
      })
    )
  )

  // Create the profile
  const now = new Date()
  store.commit(
    events.profileCreated({
      id: profileId,
      displayName: null,
      createdAt: now,
      lastActiveAt: now,
    })
  )

  // Cleanup removes all profile data
  const cleanup = async () => {
    try {
      store.commit(events.profileDeleted({ id: profileId }))
    } catch {
      // Store may already be shut down, ignore
    }
  }

  return {
    profileId,
    store,
    cleanup,
  }
}

// ============================================================================
// Profile Helper Functions
// ============================================================================

/**
 * Marks a section or heading as read for a profile.
 */
export function markSectionRead(
  store: Store<typeof schema>,
  profileId: string,
  sectionId: string,
  headingId?: string
): void {
  store.commit(
    events.readingProgressMarked({
      profileId,
      sectionId,
      headingId: headingId ?? null,
      markedRead: true,
      viewedAt: new Date(),
    })
  )
}

/**
 * Records an example execution for a profile.
 */
export function recordExecution(
  store: Store<typeof schema>,
  profileId: string,
  exampleId: string,
  succeeded: boolean,
  source: 'docs-run' | 'docs-copy' | 'repl-direct' = 'docs-run'
): void {
  store.commit(
    events.exampleExecuted({
      profileId,
      exampleId,
      succeeded,
      source,
      executedAt: new Date(),
      durationMs: null,
      errorMessage: null,
    })
  )
}

/**
 * Checks if a section/heading is marked as read.
 */
export function isSectionRead(
  store: Store<typeof schema>,
  profileId: string,
  sectionId: string,
  headingId?: string
): boolean {
  const results = store.query(isSectionRead$(profileId, sectionId, headingId))
  return results.length > 0 && results[0].markedRead
}

/**
 * Gets all reading progress entries for a profile.
 */
export function getReadingProgress(
  store: Store<typeof schema>,
  profileId: string
): Array<{ sectionId: string; headingId: string | null; markedRead: boolean }> {
  const progress = store.query(readingProgressForProfile$(profileId))
  return progress.map((p) => ({
    sectionId: p.sectionId,
    headingId: p.headingId,
    markedRead: p.markedRead,
  }))
}

/**
 * Gets all example IDs that have been executed by a profile.
 */
export function getExecutedExamples(
  store: Store<typeof schema>,
  profileId: string
): string[] {
  const executions = store.query(executionsForProfile$(profileId))
  // Return unique example IDs
  return [...new Set(executions.map((e) => e.exampleId))]
}

/**
 * Gets all annotations for a profile.
 */
export function getAnnotations(
  store: Store<typeof schema>,
  profileId: string
): Array<{ sectionId: string; headingId: string | null; content: string }> {
  const annotations = store.query(annotationsForProfile$(profileId))
  return annotations.map((a) => ({
    sectionId: a.sectionId,
    headingId: a.headingId,
    content: a.content,
  }))
}

/**
 * Creates an annotation for a profile.
 */
export function createAnnotation(
  store: Store<typeof schema>,
  profileId: string,
  sectionId: string,
  content: string,
  headingId?: string
): string {
  const id = `${profileId}:annotation:${Date.now()}`
  const now = new Date()
  store.commit(
    events.annotationCreated({
      id,
      profileId,
      sectionId,
      headingId: headingId ?? null,
      content,
      createdAt: now,
    })
  )
  return id
}

/**
 * Gets a profile by ID.
 */
export function getProfile(
  store: Store<typeof schema>,
  profileId: string
): { id: string; displayName: string | null } | null {
  const profiles = store.query(profileById$(profileId))
  if (profiles.length === 0) return null
  const profile = profiles[0]
  return {
    id: profile.id,
    displayName: profile.displayName,
  }
}

/**
 * Updates a profile's last active time.
 */
export function updateProfileLastActive(
  store: Store<typeof schema>,
  profileId: string
): void {
  store.commit(
    events.profileUpdated({
      id: profileId,
      lastActiveAt: new Date(),
    })
  )
}

// ============================================================================
// Profile Initialization (for production use)
// ============================================================================

const PROFILE_STORAGE_KEY = 'typedb_studio_profile'

/**
 * Gets or creates a profile ID from localStorage.
 * This is the production function for initializing profiles.
 */
export function getOrCreateProfileId(): string {
  // Try to get existing profile ID
  const existingId = typeof localStorage !== 'undefined'
    ? localStorage.getItem(PROFILE_STORAGE_KEY)
    : null

  if (existingId) {
    return existingId
  }

  // Generate new profile ID
  const newId = generateTestProfileId().replace('test_', 'user_')

  // Store in localStorage if available
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(PROFILE_STORAGE_KEY, newId)
  }

  return newId
}

/**
 * Initializes a profile in the store, creating if needed.
 * Returns the profile ID.
 */
export function initializeProfile(store: Store<typeof schema>): string {
  const profileId = getOrCreateProfileId()

  // Check if profile exists
  const existing = store.query(profileById$(profileId))

  if (existing.length === 0) {
    // Create new profile
    const now = new Date()
    store.commit(
      events.profileCreated({
        id: profileId,
        displayName: null,
        createdAt: now,
        lastActiveAt: now,
      })
    )
  } else {
    // Update last active
    store.commit(
      events.profileUpdated({
        id: profileId,
        lastActiveAt: new Date(),
      })
    )
  }

  return profileId
}
