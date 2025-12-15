/**
 * TypeDB Embedded Service Tests
 *
 * Tests the TypeDBEmbeddedService implementation against real TypeDB WASM.
 * These tests run in browser mode via Vitest + Playwright.
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { Database } from '@typedb/embedded'
import { TypeDBEmbeddedService, createEmbeddedService } from '../typedb-embedded-service'
import {
  createSocialNetworkDb,
  socialNetworkExpected,
} from '../../test/fixtures'

describe('TypeDBEmbeddedService', () => {
  let service: TypeDBEmbeddedService

  beforeEach(() => {
    service = createEmbeddedService()
  })

  afterEach(async () => {
    await service.disconnect()
  })

  describe('Connection', () => {
    test('initial state is disconnected', () => {
      expect(service.getStatus()).toBe('disconnected')
    })

    test('connect creates database and updates status', async () => {
      await service.connect({
        address: 'embedded://local',
        username: 'test',
        password: '',
        database: 'test_db',
      })

      expect(service.getStatus()).toBe('connected')

      const databases = await service.getDatabases()
      expect(databases).toContainEqual({ name: 'test_db' })
    })

    test('disconnect clears all databases', async () => {
      await service.connect({
        address: 'embedded://local',
        username: 'test',
        password: '',
        database: 'test_db',
      })

      await service.disconnect()

      expect(service.getStatus()).toBe('disconnected')
      const databases = await service.getDatabases()
      expect(databases).toHaveLength(0)
    })

    test('checkHealth returns true when connected', async () => {
      await service.connect({
        address: 'embedded://local',
        username: 'test',
        password: '',
      })

      expect(await service.checkHealth()).toBe(true)
    })
  })

  describe('Database Management', () => {
    beforeEach(async () => {
      await service.connect({
        address: 'embedded://local',
        username: 'test',
        password: '',
      })
    })

    test('createDatabase adds new database', async () => {
      await service.createDatabase('new_db')

      const databases = await service.getDatabases()
      expect(databases).toContainEqual({ name: 'new_db' })
    })

    test('createDatabase is idempotent (reuses existing database)', async () => {
      await service.createDatabase('dup_db')

      // Second call should succeed without error (idempotent)
      await expect(service.createDatabase('dup_db')).resolves.toBeUndefined()

      // Should still only have one database entry
      const databases = await service.getDatabases()
      expect(databases.filter(d => d.name === 'dup_db').length).toBe(1)
    })

    test('deleteDatabase removes database', async () => {
      await service.createDatabase('to_delete')
      await service.deleteDatabase('to_delete')

      const databases = await service.getDatabases()
      expect(databases).not.toContainEqual({ name: 'to_delete' })
    })
  })

  describe('Query Execution', () => {
    beforeEach(async () => {
      await service.connect({
        address: 'embedded://local',
        username: 'test',
        password: '',
        database: 'query_test',
      })
    })

    test('define schema succeeds', async () => {
      const result = await service.executeQuery(
        'query_test',
        `
        define
        attribute name value string;
        entity person owns name;
      `
      )

      expect(result.transactionType).toBe('schema')
      expect(result.data.type).toBe('define')
      expect((result.data as { success: boolean }).success).toBe(true)
    })

    test('insert data succeeds', async () => {
      // Define schema first
      await service.executeQuery(
        'query_test',
        `
        define
        attribute name value string;
        entity person owns name;
      `
      )

      // Insert data
      const result = await service.executeQuery(
        'query_test',
        'insert $p isa person, has name "Alice";'
      )

      expect(result.transactionType).toBe('write')
      expect(result.data.type).toBe('insert')
    })

    test('match query returns results', async () => {
      // Define schema
      await service.executeQuery(
        'query_test',
        `
        define
        attribute name value string;
        entity person owns name;
      `
      )

      // Insert data
      await service.executeQuery(
        'query_test',
        'insert $p isa person, has name "Alice";'
      )
      await service.executeQuery(
        'query_test',
        'insert $p isa person, has name "Bob";'
      )

      // Query
      const result = await service.executeQuery(
        'query_test',
        'match $p isa person;'
      )

      expect(result.transactionType).toBe('read')
      expect(result.data.type).toBe('match')
      expect((result.data as { answers: unknown[] }).answers).toHaveLength(2)
    })

    test('invalid query throws error', async () => {
      await expect(
        service.executeQuery('query_test', 'this is not valid typeql')
      ).rejects.toMatchObject({
        code: 'QUERY_ERROR',
      })
    })
  })

  describe('Snapshot Export/Import', () => {
    // TODO: exportSnapshot/importSnapshot not yet available in linked @typedb/embedded
    test.skip('export and import snapshot preserves data', async () => {
      await service.connect({
        address: 'embedded://local',
        username: 'test',
        password: '',
        database: 'snapshot_test',
      })

      // Define schema and insert data
      await service.executeQuery(
        'snapshot_test',
        `
        define
        attribute name value string;
        entity person owns name;
      `
      )
      await service.executeQuery(
        'snapshot_test',
        'insert $p isa person, has name "Alice";'
      )

      // Export snapshot
      const snapshot = await service.exportSnapshot('snapshot_test')
      expect(snapshot).toBeInstanceOf(Uint8Array)
      expect(snapshot.length).toBeGreaterThan(0)

      // Create new service and import
      const service2 = createEmbeddedService()
      await service2.connect({
        address: 'embedded://local',
        username: 'test',
        password: '',
        database: 'snapshot_import',
      })
      await service2.importSnapshot('snapshot_import', snapshot)

      // Query to verify data
      const result = await service2.executeQuery(
        'snapshot_import',
        'match $p isa person, has name $n;'
      )

      expect((result.data as { answers: unknown[] }).answers).toHaveLength(1)

      await service2.disconnect()
    })
  })

  describe('Attach Pre-populated Database', () => {
    test('attachDatabase allows using pre-created database', async () => {
      // Create database directly with @typedb/embedded
      const db = await Database.open('prepopulated')
      await db.define(`
        define
        attribute name value string;
        entity person owns name;
      `)
      await db.execute('insert $p isa person, has name "Direct";')

      // Attach to service
      service.attachDatabase('prepopulated', db)

      // Set connected status manually
      await service.connect({
        address: 'embedded://local',
        username: 'test',
        password: '',
      })

      // Query via service
      const result = await service.executeQuery(
        'prepopulated',
        'match $p isa person, has name $n;'
      )

      expect((result.data as { answers: unknown[] }).answers).toHaveLength(1)
    })
  })
})

describe('Social Network Fixture', () => {
  test('creates database with expected data', async () => {
    const db = await createSocialNetworkDb('social_test')

    // Query people
    const people = await db.query('match $p isa person;')
    expect(people.rowCount).toBe(socialNetworkExpected.personCount)

    // Query companies
    const companies = await db.query('match $c isa company;')
    expect(companies.rowCount).toBe(socialNetworkExpected.companyCount)

    // Query employments
    const employments = await db.query('match $e isa employment;')
    expect(employments.rowCount).toBe(socialNetworkExpected.employmentCount)

    // Note: db.close() not available in linked @typedb/embedded yet
  })

  test('can query person with name', async () => {
    const db = await createSocialNetworkDb('social_query_test')

    const result = await db.query('match $p isa person, has name "Alice";')
    expect(result.rowCount).toBe(1)

    // Note: db.close() not available in linked @typedb/embedded yet
  })

  // TODO: exportSnapshot/importSnapshot not yet available in linked @typedb/embedded
  test.skip('fixture supports snapshot export/import', async () => {
    const db1 = await createSocialNetworkDb('fixture_export')
    const snapshot = await db1.exportSnapshot()

    const db2 = await Database.open('fixture_import')
    await db2.importSnapshot(snapshot)

    const result = await db2.query('match $p isa person;')
    expect(result.rowCount).toBe(socialNetworkExpected.personCount)

    await db1.close()
    await db2.close()
  })
})
