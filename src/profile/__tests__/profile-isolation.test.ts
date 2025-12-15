/**
 * Profile Isolation Tests
 *
 * Verifies that profile data is properly isolated between different profiles.
 * This is a critical requirement for the interactive learning environment.
 *
 * Note: Tests must run sequentially because LiveStore stores can interfere
 * when created/destroyed in parallel within the same process.
 *
 * @see INTERACTIVE_LEARNING_ARCHITECTURE.md Phase 1
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  createTestProfile,
  markSectionRead,
  recordExecution,
  isSectionRead,
  getReadingProgress,
  getExecutedExamples,
  createAnnotation,
  getAnnotations,
  getProfile,
  type TestProfileContext,
} from './profile-test-utils'

describe('Profile Isolation', () => {
  let profileA: TestProfileContext
  let profileB: TestProfileContext

  beforeEach(async () => {
    profileA = await createTestProfile()
    profileB = await createTestProfile()
  })

  afterEach(async () => {
    await profileA.cleanup()
    await profileB.cleanup()
  })

  it('profiles have unique IDs', () => {
    expect(profileA.profileId).not.toBe(profileB.profileId)
    expect(profileA.profileId).toMatch(/^test_\d+_[a-z0-9]+$/)
    expect(profileB.profileId).toMatch(/^test_\d+_[a-z0-9]+$/)
  })

  it('reading progress is isolated between profiles', () => {
    // Mark section read in profile A
    markSectionRead(profileA.store, profileA.profileId, 'match-basics', 'variables')

    // Profile A should see it as read
    const isReadA = isSectionRead(profileA.store, profileA.profileId, 'match-basics', 'variables')
    expect(isReadA).toBe(true)

    // Profile B should NOT see it as read
    const isReadB = isSectionRead(profileB.store, profileB.profileId, 'match-basics', 'variables')
    expect(isReadB).toBe(false)
  })

  it('example executions are isolated between profiles', () => {
    // Record execution in profile A
    recordExecution(profileA.store, profileA.profileId, 'first-match', true, 'docs-run')

    // Profile A should see it
    const executedA = getExecutedExamples(profileA.store, profileA.profileId)
    expect(executedA).toContain('first-match')

    // Profile B should NOT see it
    const executedB = getExecutedExamples(profileB.store, profileB.profileId)
    expect(executedB).not.toContain('first-match')
  })

  it('annotations are isolated between profiles', () => {
    // Create annotation in profile A
    createAnnotation(
      profileA.store,
      profileA.profileId,
      'match-basics',
      'This is my note about pattern matching',
      'variables'
    )

    // Profile A should see it
    const annotationsA = getAnnotations(profileA.store, profileA.profileId)
    expect(annotationsA).toHaveLength(1)
    expect(annotationsA[0].content).toBe('This is my note about pattern matching')

    // Profile B should NOT see it
    const annotationsB = getAnnotations(profileB.store, profileB.profileId)
    expect(annotationsB).toHaveLength(0)
  })

  it('cleanup removes all profile data', async () => {
    // Add various data to profile A
    markSectionRead(profileA.store, profileA.profileId, 'match-basics')
    markSectionRead(profileA.store, profileA.profileId, 'first-queries', 'variables')
    recordExecution(profileA.store, profileA.profileId, 'first-match', true, 'docs-run')
    recordExecution(profileA.store, profileA.profileId, 'find-alice', true, 'repl-direct')
    createAnnotation(profileA.store, profileA.profileId, 'match-basics', 'Test note')

    // Verify data exists
    expect(getReadingProgress(profileA.store, profileA.profileId).length).toBeGreaterThan(0)
    expect(getExecutedExamples(profileA.store, profileA.profileId).length).toBeGreaterThan(0)
    expect(getAnnotations(profileA.store, profileA.profileId).length).toBeGreaterThan(0)

    // Cleanup
    await profileA.cleanup()

    // All data should be gone
    const progress = getReadingProgress(profileA.store, profileA.profileId)
    const executions = getExecutedExamples(profileA.store, profileA.profileId)
    const annotations = getAnnotations(profileA.store, profileA.profileId)

    expect(progress).toHaveLength(0)
    expect(executions).toHaveLength(0)
    expect(annotations).toHaveLength(0)
  })

  it('profile B data persists after profile A cleanup', async () => {
    // Add data to both profiles
    markSectionRead(profileA.store, profileA.profileId, 'match-basics')
    markSectionRead(profileB.store, profileB.profileId, 'first-queries')

    // Cleanup profile A
    await profileA.cleanup()

    // Profile B data should still exist
    const progressB = getReadingProgress(profileB.store, profileB.profileId)
    expect(progressB.length).toBeGreaterThan(0)
    expect(progressB[0].sectionId).toBe('first-queries')
  })
})

describe('Profile Creation', () => {
  let profile: TestProfileContext

  beforeEach(async () => {
    profile = await createTestProfile()
  })

  afterEach(async () => {
    await profile.cleanup()
  })

  it('profile is created with correct initial state', () => {
    const profileData = getProfile(profile.store, profile.profileId)

    expect(profileData).not.toBeNull()
    expect(profileData?.id).toBe(profile.profileId)
    expect(profileData?.displayName).toBeNull()
  })

  it('profile has no initial progress', () => {
    const progress = getReadingProgress(profile.store, profile.profileId)
    expect(progress).toHaveLength(0)
  })

  it('profile has no initial executions', () => {
    const executions = getExecutedExamples(profile.store, profile.profileId)
    expect(executions).toHaveLength(0)
  })

  it('profile has no initial annotations', () => {
    const annotations = getAnnotations(profile.store, profile.profileId)
    expect(annotations).toHaveLength(0)
  })
})

describe('Reading Progress', () => {
  let profile: TestProfileContext

  beforeEach(async () => {
    profile = await createTestProfile()
  })

  afterEach(async () => {
    await profile.cleanup()
  })

  it('can mark section root as read', () => {
    markSectionRead(profile.store, profile.profileId, 'match-basics')

    const isRead = isSectionRead(profile.store, profile.profileId, 'match-basics')
    expect(isRead).toBe(true)
  })

  it('can mark specific heading as read', () => {
    markSectionRead(profile.store, profile.profileId, 'match-basics', 'variables')

    // Heading should be read
    const headingRead = isSectionRead(profile.store, profile.profileId, 'match-basics', 'variables')
    expect(headingRead).toBe(true)

    // Section root should NOT automatically be read
    const rootRead = isSectionRead(profile.store, profile.profileId, 'match-basics')
    expect(rootRead).toBe(false)
  })

  it('can track multiple sections', () => {
    markSectionRead(profile.store, profile.profileId, 'match-basics')
    markSectionRead(profile.store, profile.profileId, 'first-queries')
    markSectionRead(profile.store, profile.profileId, 'variables')

    const progress = getReadingProgress(profile.store, profile.profileId)
    expect(progress).toHaveLength(3)

    const sectionIds = progress.map((p) => p.sectionId)
    expect(sectionIds).toContain('match-basics')
    expect(sectionIds).toContain('first-queries')
    expect(sectionIds).toContain('variables')
  })

  it('re-marking does not duplicate entries', () => {
    markSectionRead(profile.store, profile.profileId, 'match-basics', 'variables')
    markSectionRead(profile.store, profile.profileId, 'match-basics', 'variables')
    markSectionRead(profile.store, profile.profileId, 'match-basics', 'variables')

    const progress = getReadingProgress(profile.store, profile.profileId)
    const variablesProgress = progress.filter(
      (p) => p.sectionId === 'match-basics' && p.headingId === 'variables'
    )
    expect(variablesProgress).toHaveLength(1)
  })
})

describe('Example Executions', () => {
  let profile: TestProfileContext

  beforeEach(async () => {
    profile = await createTestProfile()
  })

  afterEach(async () => {
    await profile.cleanup()
  })

  it('can record successful execution', () => {
    recordExecution(profile.store, profile.profileId, 'first-match', true, 'docs-run')

    const executed = getExecutedExamples(profile.store, profile.profileId)
    expect(executed).toContain('first-match')
  })

  it('can record failed execution', () => {
    recordExecution(profile.store, profile.profileId, 'bad-syntax', false, 'docs-run')

    const executed = getExecutedExamples(profile.store, profile.profileId)
    expect(executed).toContain('bad-syntax')
  })

  it('can record multiple executions of same example', async () => {
    // Execute same example multiple times (simulating retry)
    // Space out to avoid store lifecycle issues
    recordExecution(profile.store, profile.profileId, 'first-match', false, 'docs-run')
    await new Promise((r) => setTimeout(r, 10))
    recordExecution(profile.store, profile.profileId, 'first-match', false, 'docs-run')
    await new Promise((r) => setTimeout(r, 10))
    recordExecution(profile.store, profile.profileId, 'first-match', true, 'docs-run')

    // Should still appear in executed list
    const executed = getExecutedExamples(profile.store, profile.profileId)
    expect(executed).toContain('first-match')
    // getExecutedExamples returns unique IDs
    expect(executed.filter((e) => e === 'first-match')).toHaveLength(1)
  })

  it('tracks different execution sources', () => {
    recordExecution(profile.store, profile.profileId, 'example-1', true, 'docs-run')
    recordExecution(profile.store, profile.profileId, 'example-2', true, 'docs-copy')
    recordExecution(profile.store, profile.profileId, 'example-3', true, 'repl-direct')

    const executed = getExecutedExamples(profile.store, profile.profileId)
    expect(executed).toHaveLength(3)
  })
})

describe('Annotations', () => {
  let profile: TestProfileContext

  beforeEach(async () => {
    profile = await createTestProfile()
  })

  afterEach(async () => {
    await profile.cleanup()
  })

  it('can create annotation on section', () => {
    createAnnotation(profile.store, profile.profileId, 'match-basics', 'My note')

    const annotations = getAnnotations(profile.store, profile.profileId)
    expect(annotations).toHaveLength(1)
    expect(annotations[0].content).toBe('My note')
    expect(annotations[0].sectionId).toBe('match-basics')
    expect(annotations[0].headingId).toBeNull()
  })

  it('can create annotation on heading', () => {
    createAnnotation(profile.store, profile.profileId, 'match-basics', 'Note on variables', 'variables')

    const annotations = getAnnotations(profile.store, profile.profileId)
    expect(annotations).toHaveLength(1)
    expect(annotations[0].headingId).toBe('variables')
  })

  it('can create multiple annotations', async () => {
    // Space out annotation creation to avoid store lifecycle issues
    createAnnotation(profile.store, profile.profileId, 'match-basics', 'Note 1')
    await new Promise((r) => setTimeout(r, 10))
    createAnnotation(profile.store, profile.profileId, 'match-basics', 'Note 2', 'variables')
    await new Promise((r) => setTimeout(r, 10))
    createAnnotation(profile.store, profile.profileId, 'first-queries', 'Note 3')

    const annotations = getAnnotations(profile.store, profile.profileId)
    expect(annotations).toHaveLength(3)
  })
})

describe('Parallel Test Safety', () => {
  it('multiple profiles in same test can be created independently', async () => {
    // Create 5 profiles
    const profiles = await Promise.all([
      createTestProfile(),
      createTestProfile(),
      createTestProfile(),
      createTestProfile(),
      createTestProfile(),
    ])

    try {
      // All should have unique IDs
      const ids = profiles.map((p) => p.profileId)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(5)

      // Add data to each
      profiles.forEach((p, i) => {
        markSectionRead(p.store, p.profileId, `section-${i}`)
      })

      // Each should only see their own data
      profiles.forEach((p, i) => {
        const progress = getReadingProgress(p.store, p.profileId)
        expect(progress).toHaveLength(1)
        expect(progress[0].sectionId).toBe(`section-${i}`)
      })
    } finally {
      // Cleanup all
      await Promise.all(profiles.map((p) => p.cleanup()))
    }
  })
})
