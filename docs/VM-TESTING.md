# View Model Testing Guide

This document describes patterns for testing View Models in TypeDB Web Studio.

## Philosophy

**VM integration tests are the PRIMARY form of testing.** We test the application through its VM interfaces, not React components.

```
┌─────────────────────────────────────────────────────────────┐
│                  VM INTEGRATION TESTS                       │  ← 90%
│  Full flows: VM ↔ LiveStore ↔ TypeDB WASM                  │
├─────────────────────────────────────────────────────────────┤
│              Service/Utility Tests                          │  ← 10%
│  Isolated logic: query detection, value conversion          │
├─────────────────────────────────────────────────────────────┤
│           React Component Tests                             │  ← 0%
│           (Not needed - covered by VM tests)                │
└─────────────────────────────────────────────────────────────┘
```

Why this works:
1. VMs contain all business logic and state management
2. VMs are stable interfaces - view implementations can change freely
3. Tests exercise the full stack without DOM overhead
4. Tests are deterministic and fast

## Test Infrastructure

### Key Files

```
src/test/
├── bootstrap-studio.ts    # Full app bootstrap for E2E tests
├── vm-test-helpers.ts     # Stateless helper functions
├── vm-test-utils.ts       # Test context creation
├── fixtures/              # Reusable test data
└── __tests__/             # Studio-level E2E tests
```

### Bootstrapping the Full App

For end-to-end tests that need the complete application:

```typescript
import { bootstrapStudioForTest } from "../bootstrap-studio";
import { waitForPage, clickNavItem, waitForItem } from "../vm-test-helpers";

test("full user flow", async () => {
  const { app, query, navigate, cleanup } = await bootstrapStudioForTest();
  try {
    // Navigate via VM
    clickNavItem(app, query, "Connect");
    await waitForPage(app, query, "connect");
    
    // Create resources
    const { key } = await app.pages.connect.localServers.createNew();
    await waitForItem(query, app.pages.connect.localServers.items$, key);
    
    // Verify navigation
    expect(navigate).toHaveBeenCalledWith("/query");
  } finally {
    await cleanup();
  }
});
```

### Testing Isolated VM Scopes

For unit-level tests of a specific VM:

```typescript
import { createStore, provideOtel } from "@livestore/livestore";
import { makeInMemoryAdapter } from "@livestore/adapter-web";
import { Effect } from "effect";

async function createTestStore() {
  return await Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        return yield* createStore({
          schema,
          storeId: `test-${Date.now()}`,
          adapter: makeInMemoryAdapter(),
        });
      })
    ).pipe(provideOtel({}))
  );
}

test("document viewer loads section", async () => {
  const store = await createTestStore();
  const { vm } = createDocumentViewerScope({
    store,
    profileId: "test",
    sections: MOCK_SECTIONS,
    replBridge: createMockReplBridge(),
  });

  vm.openSection("first-queries");
  const section = store.query(vm.currentSection$);
  expect(section?.title).toBe("Your First Queries");
});
```

## Core Patterns

### 1. Query VM State

Read reactive values using the store's query function:

```typescript
const status = store.query(vm.connectionStatus.state$);
expect(status).toBe("disconnected");
```

### 2. Trigger VM Actions

Call VM methods directly - they update state internally:

```typescript
vm.topBar.logoClick();
expect(navigate).toHaveBeenCalledWith("/");
```

### 3. Wait for Async Changes

Use `waitFor` for polling state changes:

```typescript
import { waitFor } from "../vm-test-helpers";

await waitFor(
  () => query(vm.currentPage$),
  (page) => page.page === "query",
  { label: "navigate to query", timeoutMs: 2000 }
);
```

### 4. Returning Keys from Mutations (The Promise Pattern)

When VM mutations create resources, return `{ key }` for testability while keeping UI handlers fire-and-forget:

```typescript
// VM interface
interface LocalServersSectionVM {
  /**
   * Creates a new local server.
   * 
   * Returns: The new server's key for finding it in items$.
   * UI components should call as () => void vm.createNew() (fire-and-forget).
   * Tests can await to get the key for assertions.
   */
  createNew(): Promise<{ key: string }>;
}
```

**In UI (fire-and-forget, respects Rule 4):**
```tsx
<Button onClick={() => void vm.createNew()}>Create</Button>
```

**In tests (await for assertions):**
```typescript
const { key } = await vm.createNew();
await waitForItem(query, vm.items$, key);
const server = query(vm.items$).find(s => s.key === key);
expect(server?.name).toContain("Local Server");
```

This respects the view model guidelines:
- The UI doesn't handle the promise result (Rule 4: handlers are opaque)
- Tests get the information they need to assert on the created item
- The key becomes the stable identifier for finding the item in reactive lists

### 5. Testing Through Navigation

Never manipulate internal state directly. Navigate like a user:

```typescript
// ✅ Good: Navigate through VM
clickNavItem(app, query, "Connect");
const connectState = await waitForPage(app, query, "connect");
const { key } = await connectState.vm.localServers.createNew();

// ❌ Bad: Manipulate store directly
store.commit(events.localServerCreated({ ... }));  // Skip this
```

### 6. Verifying Reactive Updates

Check that computed values update after actions:

```typescript
// Get initial count
const initialCount = query(vm.localServers.items$).length;

// Perform action
const { key } = await vm.localServers.createNew();

// Verify count increased
const newCount = query(vm.localServers.items$).length;
expect(newCount).toBe(initialCount + 1);
```

### 7. Testing Stable VM References

Verify VM instances are cached (not recreated on each query):

```typescript
const section1 = store.query(viewer.currentSection$);
const section2 = store.query(viewer.currentSection$);

expect(section1).toBe(section2);  // Same instance
expect(section1.contentBlocks).toBe(section2.contentBlocks);  // Same array
```

## Helper Functions Reference

### `waitFor<T>(queryFn, predicate, options)`

Polls until predicate returns true. Essential for async state transitions.

```typescript
await waitFor(
  () => query(vm.items$).length,
  (count) => count > 0,
  { timeoutMs: 2000, intervalMs: 10, label: "items to appear" }
);
```

### `waitForPage(app, query, page)`

Type-safe navigation wait. Returns the correctly-typed page state:

```typescript
const connectState = await waitForPage(app, query, "connect");
// connectState is { page: "connect", vm: ConnectPageVM }
```

### `waitForItem(query, items$, key)`

Waits for an item with a specific key to appear in a reactive list:

```typescript
const server = await waitForItem(query, vm.localServers.items$, key);
expect(server.name).toContain("Local Server");
```

### `clickNavItem(app, query, label)`

Finds and clicks a navigation item by label:

```typescript
clickNavItem(app, query, "Learn");
// Throws if label not found, shows available labels in error
```

## Test Structure

### Describe Blocks

Group by feature area, then by behavior:

```typescript
describe("DocumentViewerScope", () => {
  describe("Visibility", () => {
    it("starts visible by default", () => { ... });
    it("can be hidden", () => { ... });
    it("toggles visibility", () => { ... });
  });

  describe("Section Loading", () => {
    it("starts with no section loaded", () => { ... });
    it("loads a section by ID", () => { ... });
    it("returns null for unknown section", () => { ... });
  });

  describe("Reading Progress", () => { ... });
});
```

### Setup/Teardown

Always cleanup test contexts:

```typescript
describe("My Feature", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestContext();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  it("does something", () => { ... });
});
```

## Writing New Tests

### 1. Start with the User Flow

Think about what sequence of actions a user would take:

1. Bootstrap app
2. Navigate to relevant page
3. Perform action
4. Observe result

### 2. Use Only VM Methods

If you find yourself needing to commit events directly, consider:
- Does the VM need a new method?
- Is there a navigation path that would achieve the same state?

### 3. Keep Tests Focused

Each test should verify one behavior. If setup is complex, extract to helpers.

### 4. Log Progress in E2E Tests

For long E2E flows, add console.log checkpoints:

```typescript
console.log(`[E2E] Created server: ${server.name}`);
console.log(`[E2E] Connected, navigating to Learn...`);
```

This helps debug failures in CI.

## Anti-Patterns

### ❌ Testing React Components

```typescript
// Don't do this
render(<DocumentViewer vm={mockVm} />);
expect(screen.getByText("Title")).toBeInTheDocument();
```

### ❌ Mocking VM Methods

```typescript
// Don't do this
const vm = { openSection: vi.fn() };
```

### ❌ Accessing Internal State

```typescript
// Don't do this
expect(vm._internal.cache.size).toBe(3);
```

### ❌ Ignoring Cleanup

```typescript
// Don't do this
test("leaky test", async () => {
  const ctx = await createTestContext();
  // ... no cleanup
});
```

## Running Tests

```bash
pnpm test           # Run all tests (browser mode)
pnpm test:watch     # Watch mode for development
```

Tests run in Chromium via Vitest browser mode because TypeDB WASM requires browser APIs.
