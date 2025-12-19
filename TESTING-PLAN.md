# TypeDB Web Studio - WASM Testing Plan

## Overview

This plan establishes a comprehensive testing strategy that leverages TypeDB WASM for deterministic, server-free testing. The key value proposition is that we can test the full stack (VM → Service → TypeDB) without needing a running TypeDB server.

## Testing Philosophy: VM-First

**View Model (VM) Integration Tests are our PRIMARY form of testing.** This is the most valuable testing approach because:

1. **Tests the actual application** - VMs contain all business logic, state management, and user flows
2. **No need for React Testing Library** - We don't test React components directly; we test the VMs that drive them
3. **Realistic scenarios** - Tests exercise the full path from user action → VM → Service → TypeDB WASM
4. **Fast feedback** - No DOM rendering overhead, just pure logic testing
5. **Maintainable** - VM interfaces are stable; view implementations can change freely

### Why Not React Component Tests?

React components in this architecture are "dumb views" - they simply render VM state and call VM methods. Testing them adds little value:
- If the VM works correctly, the view will work correctly
- Component tests are brittle and break on style/layout changes
- The rendering layer is the smallest, simplest part of the stack

### Testing Pyramid (Inverted)

```
┌─────────────────────────────────────────────────────────────┐
│                  VM INTEGRATION TESTS                        │  ← PRIMARY (90%)
│  Test full flows: VM ↔ Service ↔ TypeDB WASM                │
│  Most realistic, most valuable                               │
├─────────────────────────────────────────────────────────────┤
│              Service/Utility Tests                           │  ← SECONDARY (10%)
│  Query detection, value conversion, etc.                     │
├─────────────────────────────────────────────────────────────┤
│           React Component Tests (NONE)                       │  ← NOT NEEDED
│           Visual tests via Storybook if needed               │
└─────────────────────────────────────────────────────────────┘
```

## Goals

1. **Test VMs against real TypeDB operations** - Not mocks, real WASM database
2. **Create reusable database fixtures** - Pre-populated databases for different test scenarios
3. **Enable fast, deterministic tests** - No network, no server dependencies
4. **Support browser test environment** - WASM requires browser APIs

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Test Harness                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────┐│
│  │  Fixtures   │  │  Test Store  │  │  TypeDB Service (WASM)  ││
│  │  (schemas   │→ │  (LiveStore  │→ │  @typedb/embedded       ││
│  │   + data)   │  │   in-memory) │  │                         ││
│  └─────────────┘  └──────────────┘  └─────────────────────────┘│
│         ↓                 ↓                      ↓              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    View Model Tests                          ││
│  │  - Connect/disconnect flows                                  ││
│  │  - Query execution + results                                 ││
│  │  - Schema tree population                                    ││
│  │  - Error handling                                            ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Steps

### Step 1: Add @typedb/embedded as Dependency

```bash
pnpm add @typedb/embedded@link:../sdk/embedded
```

Update `vite.config.ts` to exclude from optimization:
```ts
optimizeDeps: {
  exclude: ['@typedb/embedded', ...]
}
```

### Step 2: Create Test Infrastructure

#### 2.1 Test Service Adapter

Create `src/services/typedb-embedded-service.ts`:
- Implements `TypeDBService` interface using `@typedb/embedded`
- Wraps `Database` class from `@typedb/embedded`
- Cleaner API than raw wasm-playground

```typescript
import { Database } from '@typedb/embedded';
import type { TypeDBService, QueryResponse } from './typedb-service';

export class TypeDBEmbeddedService implements TypeDBService {
  private db: Database | null = null;

  async connect(params: ConnectionParams): Promise<void> {
    this.db = await Database.open(params.database || 'test');
  }

  async executeQuery(database: string, query: string): Promise<QueryResponse> {
    // Use db.query() for reads, db.execute() for writes, db.define() for schema
    const detection = detectQueryType(query);
    if (detection.type === 'schema') {
      await this.db!.define(query);
      return { type: 'define', success: true };
    } else if (detection.type === 'write') {
      const count = await this.db!.execute(query);
      return { type: 'insert', inserted: count };
    } else {
      const result = await this.db!.query(query);
      return { type: 'match', answers: this.convertResult(result) };
    }
  }
  // ... other methods
}
```

#### 2.2 Database Fixtures

Create `src/test/fixtures/` directory with reusable schemas and data:

```typescript
// src/test/fixtures/S1.ts
export const socialNetworkSchema = `
  define
  attribute name value string;
  attribute email value string;
  attribute age value integer;
  entity person owns name, owns email @key, owns age;
  entity company owns name;
  relation employment relates employee, relates employer;
  person plays employment:employee;
  company plays employment:employer;
`;

export const socialNetworkData = [
  'insert $p isa person, has name "Alice", has email "alice@example.com", has age 30;',
  'insert $p isa person, has name "Bob", has email "bob@example.com", has age 25;',
  'insert $c isa company, has name "Acme Corp";',
  // ... relations
];

export async function createSocialNetworkDb(): Promise<Database> {
  const db = await Database.open('social_network_test');
  await db.define(socialNetworkSchema);
  for (const query of socialNetworkData) {
    await db.execute(query);
  }
  return db;
}
```

#### 2.3 LiveStore Test Utilities

Create `src/test/utils/test-store.ts`:

```typescript
import { makeStore } from '@livestore/livestore';
import { schema, events } from '../../livestore/schema';
import type { TypeDBService } from '../../services/typedb-service';

export interface TestContext {
  store: Store<typeof schema>;
  service: TypeDBService;
  navigate: (path: string) => void;
  currentPath: string;
}

export async function createTestContext(
  service: TypeDBService
): Promise<TestContext> {
  let currentPath = '/';

  // Create in-memory LiveStore (no persistence)
  const store = makeStore({
    schema,
    // ... in-memory adapter config
  });

  return {
    store,
    service,
    navigate: (path) => { currentPath = path; },
    get currentPath() { return currentPath; },
  };
}
```

### Step 3: Configure Vitest for Browser Tests

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    fs: {
      allow: ['.', path.resolve(__dirname, '..')],
    },
  },
  test: {
    // Browser mode for WASM
    browser: {
      enabled: true,
      provider: 'playwright',
      instances: [{ browser: 'chromium' }],
      headless: true,
    },
    include: ['src/**/*.test.ts'],
    testTimeout: 30000,
  },
  optimizeDeps: {
    exclude: ['@typedb/embedded', '@livestore/livestore'],
  },
});
```

### Step 4: Write VM Tests

#### 4.1 Connection Flow Tests

`src/vm/__tests__/connection.test.ts`:

```typescript
import { describe, test, expect, beforeEach } from 'vitest';
import { Database } from '@typedb/embedded';
import { TypeDBEmbeddedService } from '../../services/typedb-embedded-service';
import { createStudioScope } from '../scope';
import { createTestContext } from '../../test/utils/test-store';

describe('Connection Flow', () => {
  let ctx: TestContext;
  let appVM: TypeDBStudioAppVM;

  beforeEach(async () => {
    const service = new TypeDBEmbeddedService();
    ctx = await createTestContext(service);
    appVM = createStudioScope(ctx.store, ctx.navigate);
  });

  test('initial state shows disconnected', () => {
    const status = ctx.store.query(connectionStatus$);
    expect(status).toBe('disconnected');

    const statusVM = appVM.topBar.connectionStatus;
    expect(ctx.store.query(statusVM.state$)).toBe('disconnected');
    expect(ctx.store.query(statusVM.displayText$)).toBe('Not connected');
  });

  test('connect creates database and updates status', async () => {
    // Fill form
    ctx.store.commit(events.uiStateSet({
      connectionFormAddress: 'wasm://local',
      connectionFormUsername: 'admin',
      connectionFormPassword: 'admin',
    }));

    // Trigger connection
    await appVM.pages.connect.form.connect();

    // Verify connected state
    expect(ctx.store.query(connectionStatus$)).toBe('connected');
    expect(ctx.currentPath).toBe('/query');
  });

  test('disconnect clears state', async () => {
    // Connect first
    await appVM.pages.connect.form.connect();
    expect(ctx.store.query(connectionStatus$)).toBe('connected');

    // Disconnect
    await appVM.topBar.connectionStatus.signOut();

    expect(ctx.store.query(connectionStatus$)).toBe('disconnected');
    expect(ctx.currentPath).toBe('/connect');
  });
});
```

#### 4.2 Query Execution Tests

`src/vm/__tests__/query-execution.test.ts`:

```typescript
import { describe, test, expect, beforeEach } from 'vitest';
import { createSocialNetworkDb } from '../../test/fixtures/S1';

describe('Query Execution', () => {
  let ctx: TestContext;
  let appVM: TypeDBStudioAppVM;
  let db: Database;

  beforeEach(async () => {
    // Create pre-populated database
    db = await createSocialNetworkDb();
    const service = new TypeDBEmbeddedService();
    await service.connectToDatabase(db);

    ctx = await createTestContext(service);
    appVM = createStudioScope(ctx.store, ctx.navigate);

    // Set connected state
    ctx.store.commit(events.uiStateSet({
      connectionStatus: 'connected',
      activeDatabase: 'social_network_test',
    }));
  });

  test('match query returns results', async () => {
    const queryPage = appVM.pages.query;

    // Enter query
    queryPage.editor.codeEditor.updateText('match $p isa person;');

    // Execute
    await queryPage.editor.actions.run.click();

    // Check results
    const tableStatus = ctx.store.query(queryPage.results.table.status$);
    expect(tableStatus).toBe('ready');

    const rowCount = ctx.store.query(queryPage.results.table.totalRowCount$);
    expect(rowCount).toBe(2); // Alice and Bob
  });

  test('schema query updates schema tree', async () => {
    await queryPage.editor.codeEditor.updateText(
      'define entity department owns name;'
    );
    await queryPage.editor.actions.run.click();

    // Verify schema tree updated
    const entities = ctx.store.query(
      queryPage.sidebar.schemaSection.tree.entities.items$
    );
    expect(entities.find(e => e.label === 'department')).toBeDefined();
  });

  test('parse error shows in snackbar', async () => {
    queryPage.editor.codeEditor.updateText('this is not valid typeql');
    await queryPage.editor.actions.run.click();

    const snackbar = ctx.store.query(appVM.snackbar.current$);
    expect(snackbar?.variant).toBe('error');
    expect(snackbar?.message).toContain('Parse error');
  });
});
```

#### 4.3 Schema Page Tests

`src/vm/__tests__/schema-page.test.ts`:

```typescript
describe('Schema Page', () => {
  test('loads schema tree from database', async () => {
    const db = await createSocialNetworkDb();
    // ... setup

    const schemaPage = appVM.pages.schema;

    // Verify schema tree populated
    const entities = ctx.store.query(schemaPage.sidebar.tree.entities.items$);
    expect(entities.length).toBe(2); // person, company

    const relations = ctx.store.query(schemaPage.sidebar.tree.relations.items$);
    expect(relations.length).toBe(1); // employment

    const attributes = ctx.store.query(schemaPage.sidebar.tree.attributes.items$);
    expect(attributes.length).toBeGreaterThan(0);
  });

  test('clicking entity shows details', async () => {
    const entities = ctx.store.query(schemaPage.sidebar.tree.entities.items$);
    const personEntity = entities.find(e => e.label === 'person');

    personEntity.click();

    const selectedNode = ctx.store.query(schemaPage.graph.selectedNode$);
    expect(selectedNode?.label).toBe('person');
  });
});
```

### Step 5: Create Fixture Export/Import System

For complex test scenarios, allow exporting database snapshots:

```typescript
// src/test/fixtures/index.ts
import { Database } from '@typedb/embedded';

export async function exportFixture(db: Database): Promise<Uint8Array> {
  return await db.exportSnapshot();
}

export async function importFixture(
  name: string,
  snapshot: Uint8Array
): Promise<Database> {
  const db = await Database.open(name);
  await db.importSnapshot(snapshot);
  return db;
}

// Pre-built fixtures as Uint8Array (can be stored in files)
export const FIXTURES = {
  socialNetwork: null as Uint8Array | null,
  emptyDb: null as Uint8Array | null,
  largeSchema: null as Uint8Array | null,
};

// Build fixtures on first run
export async function ensureFixtures() {
  if (!FIXTURES.socialNetwork) {
    const db = await createSocialNetworkDb();
    FIXTURES.socialNetwork = await db.exportSnapshot();
  }
  // ... other fixtures
}
```

### Step 6: Add Test Scripts to package.json

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
  }
}
```

## Test Categories

### PRIMARY: VM Integration Tests (90% of tests)
These are the most important tests. They test the actual application behavior.

- **Connection flows** - Connect, disconnect, reconnect, error states
- **Query page** - Enter query, execute, view results, handle errors
- **Schema page** - Load schema tree, select items, view details
- **Database management** - Create, delete, switch databases
- **History tracking** - Query history, saved queries
- **User management** - List users, create, delete (when connected to server)

Each VM test:
1. Sets up a TypeDB WASM database with fixtures
2. Creates the VM scope with the embedded service
3. Exercises VM methods and observes state changes
4. Asserts on computed values and side effects

### SECONDARY: Service/Utility Tests (10% of tests)
Quick tests for isolated logic that doesn't need WASM.

- Query type detection (`detectQueryType`)
- Value conversion utilities
- Error parsing/formatting

### NOT NEEDED: React Component Tests
We don't test React components directly. The VM tests cover all behavior.
Use Storybook for visual documentation if needed.

## Benefits

1. **Deterministic** - Same database state every time
2. **Fast** - No network latency, WASM is ~50-100ms for queries
3. **Isolated** - Each test gets fresh database
4. **Realistic** - Testing against real TypeDB, not mocks
5. **Fixtures** - Share complex scenarios across tests
6. **CI-friendly** - No server setup required
7. **Maintainable** - Tests don't break when views change

## Migration Path

### Phase 1: Infrastructure ✅ COMPLETE
- [x] Add @typedb/embedded dependency
- [x] Create TypeDBEmbeddedService
- [x] Set up vitest with browser mode
- [x] Create test utilities and fixtures
- [x] Basic service integration tests (14 passing)

### Phase 2: VM Test Infrastructure ✅ COMPLETE
- [x] Create VM test utilities (test context, store setup)
- [x] Explore existing VM structure in codebase
- [x] Write first VM integration test

### Phase 3: Core VM Integration Tests ✅ COMPLETE
- [x] Connection flow VM tests (15 tests)
- [x] Navigation and page state tests
- [x] Form validation tests
- [x] Sign out flow tests

### Phase 4: Expand VM Coverage (ONGOING)
- [ ] Query page execution tests
- [ ] Schema page VM tests
- [ ] Database management tests
- [ ] Add more fixtures for edge cases

## Example Test Run

```bash
$ pnpm test

 ✓ |chromium| src/services/__tests__/typedb-embedded.test.ts (16 tests | 2 skipped) 1230ms
 ✓ |chromium| src/vm/__tests__/connection-flow.test.ts (15 tests) 299ms

 Test Files  2 passed (2)
      Tests  29 passed | 2 skipped (31)
   Duration  2.61s
```

## Working Code Patterns

These are the actual patterns used in the codebase. Use these as reference.

### Creating a VM Test Context

```typescript
// src/test/vm-test-utils.ts
import { vi } from 'vitest'
import { createStore, provideOtel, type Store } from '@livestore/livestore'
import { makeInMemoryAdapter } from '@livestore/adapter-web'
import { Effect } from 'effect'
import { schema, events } from '../livestore/schema'
import { createStudioScope } from '../vm/scope'

export async function createVMTestContext(): Promise<VMTestContext> {
  const service = new TypeDBEmbeddedService()
  const storeId = `test-store-${++storeIdCounter}-${Date.now()}`

  // LiveStore requires Effect runtime with Scope and OtelTracer
  const storeEffect = Effect.gen(function* () {
    const store = yield* createStore({
      schema,
      storeId,
      adapter: makeInMemoryAdapter(),
      debug: { instanceId: storeId },
    })
    return store
  })

  // provideOtel({}) provides noop tracing for tests
  const store = await Effect.runPromise(
    Effect.scoped(storeEffect).pipe(provideOtel({}))
  )

  const navigate = vi.fn()
  const vm = createStudioScope(store, navigate)

  return { vm, store, navigate, service, cleanup: async () => {} }
}
```

### Writing a VM Test

```typescript
// Pattern: Query VM state, trigger actions, assert results
test('initial state shows disconnected status', async () => {
  const ctx = await createVMTestContext()
  try {
    // Query computed values via store.query()
    const status = ctx.store.query(ctx.vm.topBar.connectionStatus.state$)
    expect(status).toBe('disconnected')

    const displayText = ctx.store.query(ctx.vm.topBar.connectionStatus.displayText$)
    expect(displayText).toBe('Not connected')
  } finally {
    await ctx.cleanup()
  }
})

test('navigation works correctly', async () => {
  const ctx = await createVMTestContext()
  try {
    // Trigger VM action
    ctx.vm.topBar.logoClick()

    // Assert navigation was called
    expect(ctx.navigate).toHaveBeenCalledWith('/')
  } finally {
    await ctx.cleanup()
  }
})

test('state changes reflect in computed values', async () => {
  const ctx = await createVMTestContext()
  try {
    // Commit state change
    ctx.store.commit(events.uiStateSet({ connectionStatus: 'connected' }))

    // Query updated computed values
    const items = ctx.store.query(ctx.vm.topBar.navigation.items$)
    expect(items.map(i => i.key)).toContain('query')
  } finally {
    await ctx.cleanup()
  }
})
```

### Testing with TypeDB WASM

```typescript
test('service executes real TypeDB queries', async () => {
  const service = new TypeDBEmbeddedService()

  await service.connect({
    address: 'wasm://local',
    username: 'test',
    password: '',
    database: 'test_db',
  })

  // Define schema
  await service.executeQuery('test_db',
    'define attribute name value string; entity person owns name;'
  )

  // Insert data
  await service.executeQuery('test_db',
    'insert $p isa person, has name "Alice";'
  )

  // Query data
  const result = await service.executeQuery('test_db',
    'match $p isa person, has name $n;'
  )
  expect(result.data.answers.length).toBe(1)

  await service.disconnect()
})
```
