/**
 * Connection Flow VM Integration Tests
 *
 * Tests the connection flow through the VM layer with real TypeDB WASM.
 * These are the most valuable tests - they exercise the full stack.
 *
 * STATUS: Phase 3 - Full VM integration tests working with LiveStore
 */

import { describe, test, expect, afterEach, vi } from 'vitest'
import { TypeDBEmbeddedService } from '../../services/typedb-embedded-service'
import { createVMTestContext, type VMTestContext } from '../../test/vm-test-utils'
import { events } from '../../livestore/schema'

describe('Connection Flow - Service Integration', () => {
  /**
   * These tests verify that the TypeDB service layer works correctly.
   * They form the foundation for full VM integration tests.
   */

  test('TypeDBEmbeddedService can connect and execute queries', async () => {
    const service = new TypeDBEmbeddedService()

    // Connect
    await service.connect({
      address: 'wasm://local',
      username: 'test',
      password: '',
      database: 'connection_test',
    })

    expect(service.getStatus()).toBe('connected')

    // Execute a define query
    const defineResult = await service.executeQuery(
      'connection_test',
      'define attribute name value string; entity person owns name;'
    )
    expect(defineResult.transactionType).toBe('schema')
    expect(defineResult.data.type).toBe('define')

    // Execute an insert query
    const insertResult = await service.executeQuery(
      'connection_test',
      'insert $p isa person, has name "Alice";'
    )
    expect(insertResult.transactionType).toBe('write')

    // Execute a match query
    const matchResult = await service.executeQuery(
      'connection_test',
      'match $p isa person, has name $n;'
    )
    expect(matchResult.transactionType).toBe('read')
    expect(matchResult.data.type).toBe('match')

    // Disconnect
    await service.disconnect()
    expect(service.getStatus()).toBe('disconnected')
  })

  test('service handles connection errors gracefully', async () => {
    const service = new TypeDBEmbeddedService()

    // Trying to query without connecting should fail
    await expect(
      service.executeQuery('nonexistent', 'match $x isa thing;')
    ).rejects.toMatchObject({
      code: 'DATABASE_NOT_FOUND',
    })
  })

  test('service can manage multiple databases', async () => {
    const service = new TypeDBEmbeddedService()

    await service.connect({
      address: 'wasm://local',
      username: 'test',
      password: '',
    })

    // Create databases
    await service.createDatabase('db1')
    await service.createDatabase('db2')

    const databases = await service.getDatabases()
    expect(databases.map((d) => d.name)).toContain('db1')
    expect(databases.map((d) => d.name)).toContain('db2')

    // Each database is independent
    await service.executeQuery(
      'db1',
      'define attribute name value string; entity person owns name;'
    )
    await service.executeQuery('db1', 'insert $p isa person, has name "In DB1";')

    await service.executeQuery(
      'db2',
      'define attribute title value string; entity book owns title;'
    )
    await service.executeQuery('db2', 'insert $b isa book, has title "In DB2";')

    // Query each database
    const db1Result = await service.executeQuery('db1', 'match $p isa person;')
    expect((db1Result.data as { answers: unknown[] }).answers.length).toBe(1)

    const db2Result = await service.executeQuery('db2', 'match $b isa book;')
    expect((db2Result.data as { answers: unknown[] }).answers.length).toBe(1)

    await service.disconnect()
  })
})

describe('Connection Flow - VM Integration', () => {
  /**
   * Full VM integration tests using real LiveStore with in-memory adapter.
   * These tests exercise the complete application logic through the VM layer.
   */

  let ctx: VMTestContext

  afterEach(async () => {
    if (ctx) {
      await ctx.cleanup()
    }
    vi.clearAllMocks()
  })

  test('initial state shows disconnected status', async () => {
    ctx = await createVMTestContext()

    // Query the connection status from VM
    const status = ctx.store.query(ctx.vm.topBar.connectionStatus.state$)
    expect(status).toBe('disconnected')

    // Display text should show "Not connected"
    const displayText = ctx.store.query(ctx.vm.topBar.connectionStatus.displayText$)
    expect(displayText).toBe('Not connected')

    // Beacon variant should be "error" (red)
    const beaconVariant = ctx.store.query(ctx.vm.topBar.connectionStatus.beaconVariant$)
    expect(beaconVariant).toBe('error')
  })

  test('initial page is home', async () => {
    ctx = await createVMTestContext()

    const pageState = ctx.store.query(ctx.vm.currentPage$)
    expect(pageState.page).toBe('home')
  })

  test('navigation items show only non-connected items when disconnected', async () => {
    ctx = await createVMTestContext()

    const items = ctx.store.query(ctx.vm.topBar.navigation.items$)
    const itemKeys = items.map((i) => i.key)

    // When disconnected, should only show Home and Connect
    expect(itemKeys).toContain('home')
    expect(itemKeys).toContain('connect')
    expect(itemKeys).not.toContain('query')
    expect(itemKeys).not.toContain('schema')
    expect(itemKeys).not.toContain('users')
  })

  test('logo click navigates to home and sets current page', async () => {
    ctx = await createVMTestContext()

    // Set a different page first
    ctx.store.commit(events.uiStateSet({ currentPage: 'connect' }))

    // Click logo
    ctx.vm.topBar.logoClick()

    // Should navigate to home
    expect(ctx.navigate).toHaveBeenCalledWith('/')

    // Current page should be home
    const pageState = ctx.store.query(ctx.vm.currentPage$)
    expect(pageState.page).toBe('home')
  })

  test('connection status click navigates to connect when disconnected', async () => {
    ctx = await createVMTestContext()

    // Click connection status when disconnected
    ctx.vm.topBar.connectionStatus.click()

    // Should navigate to connect
    expect(ctx.navigate).toHaveBeenCalledWith('/connect')
  })

  test('connect form validates required fields', async () => {
    ctx = await createVMTestContext()

    // Navigate to connect page to get form VM
    ctx.store.commit(events.uiStateSet({ currentPage: 'connect' }))
    const pageState = ctx.store.query(ctx.vm.currentPage$)

    if (pageState.page === 'connect') {
      const form = pageState.vm.form

      // Empty address should show disabled
      let connectDisabled = ctx.store.query(form.connectDisabled$)
      expect(connectDisabled).not.toBeNull()
      expect(connectDisabled?.displayReason).toContain('Address')

      // Fill address
      ctx.store.commit(events.uiStateSet({ connectionFormAddress: 'http://localhost:8000' }))
      connectDisabled = ctx.store.query(form.connectDisabled$)
      expect(connectDisabled?.displayReason).toContain('Username')

      // Fill username
      ctx.store.commit(events.uiStateSet({ connectionFormUsername: 'admin' }))
      connectDisabled = ctx.store.query(form.connectDisabled$)
      expect(connectDisabled?.displayReason).toContain('Password')

      // Fill password - should now be enabled
      ctx.store.commit(events.uiStateSet({ connectionFormPassword: 'admin' }))
      connectDisabled = ctx.store.query(form.connectDisabled$)
      expect(connectDisabled).toBeNull()
    }
  })

  test('database selector is hidden when disconnected', async () => {
    ctx = await createVMTestContext()

    const visible = ctx.store.query(ctx.vm.topBar.databaseSelector.visible$)
    expect(visible).toBe(false)
  })

  test('database selector is visible when connected', async () => {
    ctx = await createVMTestContext()

    // Simulate connected state
    ctx.store.commit(
      events.uiStateSet({
        connectionStatus: 'connected',
        connectionFormAddress: 'http://localhost:8000',
        connectionFormUsername: 'admin',
      })
    )

    const visible = ctx.store.query(ctx.vm.topBar.databaseSelector.visible$)
    expect(visible).toBe(true)
  })

  test('navigation items show all items when connected', async () => {
    ctx = await createVMTestContext()

    // Simulate connected state
    ctx.store.commit(events.uiStateSet({ connectionStatus: 'connected' }))

    const items = ctx.store.query(ctx.vm.topBar.navigation.items$)
    const itemKeys = items.map((i) => i.key)

    // When connected, should show all items
    expect(itemKeys).toContain('home')
    expect(itemKeys).toContain('connect')
    expect(itemKeys).toContain('query')
    expect(itemKeys).toContain('schema')
    expect(itemKeys).toContain('users')
  })

  test('home page cards disabled state reflects connection', async () => {
    ctx = await createVMTestContext()

    // Navigate to home
    ctx.store.commit(events.uiStateSet({ currentPage: 'home' }))
    const pageState = ctx.store.query(ctx.vm.currentPage$)

    if (pageState.page === 'home') {
      const cards = ctx.store.query(pageState.vm.cards$)

      // Find query card
      const queryCard = cards.find((c) => c.key === 'query')
      expect(queryCard).toBeDefined()

      // When disconnected, query card should be disabled
      const queryDisabled = ctx.store.query(queryCard!.disabled$)
      expect(queryDisabled).not.toBeNull()
      expect(queryDisabled?.displayReason).toContain('Connect')

      // Connect
      ctx.store.commit(events.uiStateSet({ connectionStatus: 'connected' }))

      // Now query card should be enabled
      const queryEnabledAfter = ctx.store.query(queryCard!.disabled$)
      expect(queryEnabledAfter).toBeNull()
    }
  })

  test('sign out clears connection and navigates to connect', async () => {
    ctx = await createVMTestContext()

    // Start connected
    ctx.store.commit(
      events.uiStateSet({
        connectionStatus: 'connected',
        activeConnectionId: 'conn_123',
        activeDatabase: 'test_db',
      })
    )

    // Verify connected
    expect(ctx.store.query(ctx.vm.topBar.connectionStatus.state$)).toBe('connected')

    // Sign out
    await ctx.vm.topBar.connectionStatus.signOut()

    // Should be disconnected
    expect(ctx.store.query(ctx.vm.topBar.connectionStatus.state$)).toBe('disconnected')

    // Should navigate to connect
    expect(ctx.navigate).toHaveBeenCalledWith('/connect')
  })

  test('query page shows placeholder when no database selected', async () => {
    ctx = await createVMTestContext()

    // Connected but no database selected
    ctx.store.commit(
      events.uiStateSet({
        connectionStatus: 'connected',
        activeDatabase: null,
        currentPage: 'query',
      })
    )

    const pageState = ctx.store.query(ctx.vm.currentPage$)

    if (pageState.page === 'query') {
      const placeholder = ctx.store.query(pageState.vm.placeholder$)
      expect(placeholder).not.toBeNull()
      expect(placeholder?.type).toBe('noDatabase')
    }
  })
})
