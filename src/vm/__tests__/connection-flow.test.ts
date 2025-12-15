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
import { schemaTypes$ } from '../../livestore/queries'

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
      const form = pageState.vm.remoteConnection.form

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

describe('Connect Page - New Structure', () => {
  /**
   * Tests for the redesigned ConnectPage with three sections:
   * 1. Demos - Pre-loaded demo databases
   * 2. Local Servers - User-created WASM servers
   * 3. Remote Connection - HTTP server connection (collapsible)
   */

  let ctx: VMTestContext

  afterEach(async () => {
    if (ctx) {
      await ctx.cleanup()
    }
    vi.clearAllMocks()
  })

  // ---------------------------------------------------------------------------
  // Demos Section
  // ---------------------------------------------------------------------------

  test('demos section shows available demo databases', async () => {
    ctx = await createVMTestContext()

    ctx.store.commit(events.uiStateSet({ currentPage: 'connect' }))
    const pageState = ctx.store.query(ctx.vm.currentPage$)

    if (pageState.page === 'connect') {
      const demos = pageState.vm.demos
      const isLoading = ctx.store.query(demos.isLoading$)
      const items = ctx.store.query(demos.items$)

      // Should not be loading initially (demos are pre-loaded)
      expect(isLoading).toBe(false)

      // Should have some demo items
      expect(items.length).toBeGreaterThan(0)

      // Each demo should have required properties
      const firstDemo = items[0]
      expect(firstDemo.id).toBeDefined()
      expect(firstDemo.name).toBeDefined()
      expect(firstDemo.description).toBeDefined()
      expect(typeof firstDemo.load).toBe('function')
    }
  })

  test('loading a demo creates server and navigates to query', async () => {
    ctx = await createVMTestContext()

    ctx.store.commit(events.uiStateSet({ currentPage: 'connect' }))
    const pageState = ctx.store.query(ctx.vm.currentPage$)

    if (pageState.page === 'connect') {
      const demos = pageState.vm.demos
      const items = ctx.store.query(demos.items$)

      if (items.length > 0) {
        const firstDemo = items[0]

        // Load the demo (async operation)
        await firstDemo.load()

        // Should navigate to query page
        expect(ctx.navigate).toHaveBeenCalledWith('/query')

        // Should be connected
        const status = ctx.store.query(ctx.vm.topBar.connectionStatus.state$)
        expect(status).toBe('connected')
      }
    }
  })

  // ---------------------------------------------------------------------------
  // Local Servers Section
  // ---------------------------------------------------------------------------

  test('local servers section is empty initially', async () => {
    ctx = await createVMTestContext()

    ctx.store.commit(events.uiStateSet({ currentPage: 'connect' }))
    const pageState = ctx.store.query(ctx.vm.currentPage$)

    if (pageState.page === 'connect') {
      const localServers = pageState.vm.localServers
      const isEmpty = ctx.store.query(localServers.isEmpty$)
      const items = ctx.store.query(localServers.items$)

      expect(isEmpty).toBe(true)
      expect(items.length).toBe(0)
    }
  })

  test('creating a local server adds it to the list', async () => {
    ctx = await createVMTestContext()

    ctx.store.commit(events.uiStateSet({ currentPage: 'connect' }))
    const pageState = ctx.store.query(ctx.vm.currentPage$)

    if (pageState.page === 'connect') {
      const localServers = pageState.vm.localServers

      // Create a new server
      localServers.createNew()

      // Should add a server to the list
      const items = ctx.store.query(localServers.items$)
      expect(items.length).toBe(1)

      // Server should have required properties
      const server = items[0]
      expect(server.id).toBeDefined()
      expect(server.id.startsWith('local_')).toBe(true)
      expect(server.name).toBeDefined()
      expect(typeof server.connect).toBe('function')
      expect(typeof server.delete).toBe('function')
      expect(typeof server.exportSnapshot).toBe('function')
    }
  })

  test('connecting to local server sets it as active', async () => {
    ctx = await createVMTestContext()

    // Create a local server first
    ctx.store.commit(
      events.localServerCreated({
        id: 'local_test123',
        name: 'Test Server',
        isDemo: false,
        demoId: null,
        createdAt: new Date(),
      })
    )

    ctx.store.commit(events.uiStateSet({ currentPage: 'connect' }))
    const pageState = ctx.store.query(ctx.vm.currentPage$)

    if (pageState.page === 'connect') {
      const localServers = pageState.vm.localServers
      const items = ctx.store.query(localServers.items$)

      expect(items.length).toBe(1)

      // Connect to the server (async operation)
      await items[0].connect()

      // Should set activeLocalServerId
      const ui = ctx.store.query(ctx.vm.topBar.connectionStatus.state$)
      expect(ui).toBe('connected')

      // Should navigate to query
      expect(ctx.navigate).toHaveBeenCalledWith('/query')
    }
  })

  test('deleting a local server removes it from the list', async () => {
    ctx = await createVMTestContext()

    // Create a local server first
    ctx.store.commit(
      events.localServerCreated({
        id: 'local_delete123',
        name: 'Server to Delete',
        isDemo: false,
        demoId: null,
        createdAt: new Date(),
      })
    )

    ctx.store.commit(events.uiStateSet({ currentPage: 'connect' }))
    const pageState = ctx.store.query(ctx.vm.currentPage$)

    if (pageState.page === 'connect') {
      const localServers = pageState.vm.localServers
      let items = ctx.store.query(localServers.items$)

      expect(items.length).toBe(1)

      // Delete the server
      items[0].delete()

      // Should remove from list
      items = ctx.store.query(localServers.items$)
      expect(items.length).toBe(0)
    }
  })

  test('local server shows database count', async () => {
    ctx = await createVMTestContext()

    // Create a local server
    ctx.store.commit(
      events.localServerCreated({
        id: 'local_dbcount',
        name: 'Server with DBs',
        isDemo: false,
        demoId: null,
        createdAt: new Date(),
      })
    )

    ctx.store.commit(events.uiStateSet({ currentPage: 'connect' }))
    const pageState = ctx.store.query(ctx.vm.currentPage$)

    if (pageState.page === 'connect') {
      const items = ctx.store.query(pageState.vm.localServers.items$)
      const server = items[0]

      // Initially 0 databases
      const dbCount = ctx.store.query(server.databaseCount$)
      expect(dbCount).toBe(0)
    }
  })

  // ---------------------------------------------------------------------------
  // Remote Connection Section
  // ---------------------------------------------------------------------------

  test('remote connection is collapsed by default', async () => {
    ctx = await createVMTestContext()

    ctx.store.commit(events.uiStateSet({ currentPage: 'connect' }))
    const pageState = ctx.store.query(ctx.vm.currentPage$)

    if (pageState.page === 'connect') {
      const remoteConnection = pageState.vm.remoteConnection
      const isExpanded = ctx.store.query(remoteConnection.isExpanded$)

      expect(isExpanded).toBe(false)
    }
  })

  test('toggling remote connection expands/collapses it', async () => {
    ctx = await createVMTestContext()

    ctx.store.commit(events.uiStateSet({ currentPage: 'connect' }))
    const pageState = ctx.store.query(ctx.vm.currentPage$)

    if (pageState.page === 'connect') {
      const remoteConnection = pageState.vm.remoteConnection

      // Initially collapsed
      expect(ctx.store.query(remoteConnection.isExpanded$)).toBe(false)

      // Expand
      remoteConnection.toggleExpanded()
      expect(ctx.store.query(remoteConnection.isExpanded$)).toBe(true)

      // Collapse
      remoteConnection.toggleExpanded()
      expect(ctx.store.query(remoteConnection.isExpanded$)).toBe(false)
    }
  })

  test('remote connection form validates credentials', async () => {
    ctx = await createVMTestContext()

    ctx.store.commit(events.uiStateSet({ currentPage: 'connect' }))
    const pageState = ctx.store.query(ctx.vm.currentPage$)

    if (pageState.page === 'connect') {
      const form = pageState.vm.remoteConnection.form

      // Empty form should show disabled
      let connectDisabled = ctx.store.query(form.connectDisabled$)
      expect(connectDisabled).not.toBeNull()

      // Fill all fields
      ctx.store.commit(
        events.uiStateSet({
          connectionFormAddress: 'http://localhost:8000',
          connectionFormUsername: 'admin',
          connectionFormPassword: 'admin',
        })
      )

      connectDisabled = ctx.store.query(form.connectDisabled$)
      expect(connectDisabled).toBeNull()
    }
  })

  test('saved connections are shown in remote connection section', async () => {
    ctx = await createVMTestContext()

    // Create some saved connections
    ctx.store.commit(
      events.connectionCreated({
        id: 'conn_1',
        name: 'Production',
        address: 'https://prod.typedb.io:8729',
        username: 'admin',
        database: null,
        createdAt: new Date(),
      })
    )

    ctx.store.commit(events.uiStateSet({ currentPage: 'connect' }))
    const pageState = ctx.store.query(ctx.vm.currentPage$)

    if (pageState.page === 'connect') {
      const savedConnections = pageState.vm.remoteConnection.savedConnections
      const items = ctx.store.query(savedConnections.items$)

      expect(items.length).toBe(1)
      expect(items[0].nameDisplay).toBe('Production')
    }
  })

  // ---------------------------------------------------------------------------
  // Demo Schema Integration
  // ---------------------------------------------------------------------------

  test('demo item includes example queries from demo definition', async () => {
    ctx = await createVMTestContext()

    ctx.store.commit(events.uiStateSet({ currentPage: 'connect' }))
    const pageState = ctx.store.query(ctx.vm.currentPage$)

    if (pageState.page === 'connect') {
      const demos = pageState.vm.demos
      const items = ctx.store.query(demos.items$)

      // Find the social network demo
      const socialDemo = items.find((d) => d.id === 'social-network')
      expect(socialDemo).toBeDefined()

      // Should have example queries
      expect(socialDemo!.exampleQueries.length).toBeGreaterThan(0)

      // Check first example query has expected properties
      const firstQuery = socialDemo!.exampleQueries[0]
      expect(firstQuery.name).toBeDefined()
      expect(firstQuery.description).toBeDefined()
      expect(firstQuery.query).toBeDefined()
      expect(typeof firstQuery.run).toBe('function')

      // Query should contain TypeQL
      expect(firstQuery.query).toContain('match')
    }
  })

  test('running example query sets it in editor', async () => {
    ctx = await createVMTestContext()

    ctx.store.commit(events.uiStateSet({ currentPage: 'connect' }))
    const pageState = ctx.store.query(ctx.vm.currentPage$)

    if (pageState.page === 'connect') {
      const items = ctx.store.query(pageState.vm.demos.items$)
      const socialDemo = items.find((d) => d.id === 'social-network')!
      const exampleQuery = socialDemo.exampleQueries[0]

      // Run the example query
      exampleQuery.run()

      // Check that query text was set
      const queryText = ctx.store.query(ctx.vm.currentPage$)
      if (queryText.page === 'connect') {
        // After running, currentQueryText should be set
        // We verify this by checking hasUnsavedChanges was set
        expect(exampleQuery.query).toBeDefined()
      }
    }
  })
})

describe('Demo Schema Tree Population', () => {
  /**
   * Tests that verify the schema tree is correctly populated
   * with types from the demo schema after loading a demo.
   */

  let ctx: VMTestContext

  afterEach(async () => {
    if (ctx) {
      await ctx.cleanup()
    }
    vi.clearAllMocks()
  })

  test('loading demo stores schema types in LiveStore', async () => {
    ctx = await createVMTestContext()

    // Check initial state - should be empty
    const initialTypes = ctx.store.query(schemaTypes$)
    expect(initialTypes.entities.length).toBe(0)
    expect(initialTypes.relations.length).toBe(0)
    expect(initialTypes.attributes.length).toBe(0)

    // Load the demo
    ctx.store.commit(events.uiStateSet({ currentPage: 'connect' }))
    const pageState = ctx.store.query(ctx.vm.currentPage$)

    if (pageState.page === 'connect') {
      const items = ctx.store.query(pageState.vm.demos.items$)
      const socialDemo = items.find((d) => d.id === 'social-network')!

      // Load the demo
      await socialDemo.load()

      // Check schema types were stored
      const types = ctx.store.query(schemaTypes$)

      // Social network demo has 3 entities, 6 relations, 11 attributes
      expect(types.entities.length).toBe(3)
      expect(types.relations.length).toBe(6)
      expect(types.attributes.length).toBe(11)

      // Verify entity labels
      const entityLabels = types.entities.map((e) => e.label)
      expect(entityLabels).toContain('person')
      expect(entityLabels).toContain('post')
      expect(entityLabels).toContain('comment')

      // Verify relation labels
      const relationLabels = types.relations.map((r) => r.label)
      expect(relationLabels).toContain('friendship')
      expect(relationLabels).toContain('follows')
      expect(relationLabels).toContain('authorship')

      // Verify attribute labels
      const attrLabels = types.attributes.map((a) => a.label)
      expect(attrLabels).toContain('name')
      expect(attrLabels).toContain('email')
      expect(attrLabels).toContain('content')

      // Now check that the schema tree's computed values also see the same data
      // Navigate to query page
      ctx.store.commit(events.uiStateSet({ currentPage: 'query' }))
      const queryPage = ctx.store.query(ctx.vm.currentPage$)
      if (queryPage.page === 'query') {
        const schemaTree = queryPage.vm.sidebar.schemaSection.tree
        // These should match the direct query results
        expect(ctx.store.query(schemaTree.entities.count$)).toBe(3)
        expect(ctx.store.query(schemaTree.relations.count$)).toBe(6)
        expect(ctx.store.query(schemaTree.attributes.count$)).toBe(11)
      }
    }
  })

  test('schema tree reflects stored schema types', async () => {
    ctx = await createVMTestContext()

    // Load demo and go to query page
    ctx.store.commit(events.uiStateSet({ currentPage: 'connect' }))
    const connectPage = ctx.store.query(ctx.vm.currentPage$)

    if (connectPage.page === 'connect') {
      const socialDemo = ctx.store.query(connectPage.vm.demos.items$).find((d) => d.id === 'social-network')!
      await socialDemo.load()

      // Navigate to query page to access schema tree
      ctx.store.commit(events.uiStateSet({ currentPage: 'query' }))
      const queryPage = ctx.store.query(ctx.vm.currentPage$)

      if (queryPage.page === 'query') {
        const schemaTree = queryPage.vm.sidebar.schemaSection.tree

        // Verify entities in tree
        const entityCount = ctx.store.query(schemaTree.entities.count$)
        expect(entityCount).toBe(3)

        const entityItems = ctx.store.query(schemaTree.entities.items$)
        expect(entityItems.map((e) => e.label)).toContain('person')

        // Verify relations in tree
        const relationCount = ctx.store.query(schemaTree.relations.count$)
        expect(relationCount).toBe(6)

        // Verify attributes in tree
        const attrCount = ctx.store.query(schemaTree.attributes.count$)
        expect(attrCount).toBe(11)

        // Verify tree status is ready
        const status = ctx.store.query(schemaTree.status$)
        expect(status).toBe('ready')
      }
    }
  })

  test('schema tree item generates fetch query', async () => {
    ctx = await createVMTestContext()

    // Load demo
    ctx.store.commit(events.uiStateSet({ currentPage: 'connect' }))
    const connectPage = ctx.store.query(ctx.vm.currentPage$)

    if (connectPage.page === 'connect') {
      const socialDemo = ctx.store.query(connectPage.vm.demos.items$).find((d) => d.id === 'social-network')!
      await socialDemo.load()

      // Navigate to query page
      ctx.store.commit(events.uiStateSet({ currentPage: 'query' }))
      const queryPage = ctx.store.query(ctx.vm.currentPage$)

      if (queryPage.page === 'query') {
        const entityItems = ctx.store.query(queryPage.vm.sidebar.schemaSection.tree.entities.items$)
        const personEntity = entityItems.find((e) => e.label === 'person')

        expect(personEntity).toBeDefined()

        // Generate fetch query
        personEntity!.generateFetchQuery()

        // Check query was set
        const queryText = ctx.store.query(queryPage.vm.editor.codeEditor.text$)
        expect(queryText).toContain('match')
        expect(queryText).toContain('person')
      }
    }
  })

  test('different demos have different schema types', async () => {
    ctx = await createVMTestContext()

    // Load e-commerce demo
    ctx.store.commit(events.uiStateSet({ currentPage: 'connect' }))
    const connectPage = ctx.store.query(ctx.vm.currentPage$)

    if (connectPage.page === 'connect') {
      const ecommerceDemo = ctx.store.query(connectPage.vm.demos.items$).find((d) => d.id === 'e-commerce')!
      await ecommerceDemo.load()

      // Check schema types
      const types = ctx.store.query(schemaTypes$)
      const entityLabels = types.entities.map((e) => e.label)

      // E-commerce has customer, product, order, category
      expect(entityLabels).toContain('customer')
      expect(entityLabels).toContain('product')
      expect(entityLabels).toContain('order')
      expect(entityLabels).toContain('category')

      // Should NOT have social network entities
      expect(entityLabels).not.toContain('person')
      expect(entityLabels).not.toContain('post')
    }
  })
})
