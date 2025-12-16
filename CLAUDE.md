# Claude Code Instructions for TypeDB Web Studio

This document establishes principles and patterns for AI agents working on this codebase.

## Architecture Overview

This is a TypeDB web IDE using:
- **TanStack Start** (React meta-framework)
- **LiveStore** (reactive state management with OPFS persistence)
- **View Model Pattern** (VMs drive all UI logic)
- **TypeDB WASM** (embedded database for testing)

```
LiveStore (State) → VM Scope (Logic) → React UI (Presentation)
```

## Testing Principles

### DO: Test View Models

**VM integration tests are the PRIMARY form of testing (90%)**. The meaningful tests happen at the VM level because:

1. VMs contain all business logic and state management
2. VMs are stable interfaces - view implementations can change freely
3. Tests exercise the full stack without DOM overhead
4. Tests are deterministic and fast

```typescript
// GOOD: Test VM state and actions
test('connection status updates correctly', async () => {
  const ctx = await createVMTestContext()

  // Query VM computed values
  const status = ctx.store.query(ctx.vm.topBar.connectionStatus.state$)
  expect(status).toBe('disconnected')

  // Trigger VM actions
  ctx.store.commit(events.uiStateSet({ connectionStatus: 'connected' }))

  // Assert computed values update
  const items = ctx.store.query(ctx.vm.topBar.navigation.items$)
  expect(items.map(i => i.key)).toContain('query')
})
```

### DON'T: Test React Components

React components are "dumb views" - they render VM state and call VM methods. Component tests add little value:
- If the VM works correctly, the view will work correctly
- Component tests are brittle and break on style/layout changes
- The rendering layer is the smallest part of the stack

```typescript
// BAD: Don't test React components
test('button renders correctly', () => {
  render(<ConnectionButton />)  // DON'T DO THIS
  expect(screen.getByText('Connect')).toBeInTheDocument()
})
```

### When to Write Tests

Write VM tests for:
- **User flows** - Connection, query execution, navigation
- **State transitions** - Form validation, status changes
- **Business logic** - Computed values, conditional behavior
- **Error handling** - Service errors, edge cases

Skip tests for:
- React component rendering
- CSS/styling
- Static content

### How Much to Test

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

## Test Infrastructure

### Key Files

- `src/test/bootstrap-studio.ts` - Full app bootstrap for E2E tests
- `src/test/vm-test-helpers.ts` - Stateless helpers (`waitFor`, `clickNavItem`, etc.)
- `src/test/vm-test-utils.ts` - Test context creation, re-exports above
- `src/vm/__tests__/` - VM integration tests
- `src/services/__tests__/` - Service-level tests

### Creating Test Context (E2E Style)

For full app E2E tests, use `bootstrapStudioForTest`:

```typescript
import { bootstrapStudioForTest } from '../../test/bootstrap-studio'
import { waitForPage, clickNavItem } from '../../test/vm-test-helpers'

test('full user flow', async () => {
  const { app, query, navigate, cleanup } = await bootstrapStudioForTest()
  try {
    // Navigate via VM methods only
    clickNavItem(app, query, "Connect")
    const connectState = await waitForPage(app, query, "connect")
    
    // Create resources via VM
    const { key } = await connectState.vm.localServers.createNew()
    
    // Verify navigation was called
    expect(navigate).toHaveBeenCalledWith("/query")
  } finally {
    await cleanup()
  }
})
```

### LiveStore in Tests

LiveStore requires Effect runtime with OpenTelemetry tracing:

```typescript
import { createStore, provideOtel } from '@livestore/livestore'
import { makeInMemoryAdapter } from '@livestore/adapter-web'
import { Effect } from 'effect'

const store = await Effect.runPromise(
  Effect.scoped(
    Effect.gen(function* () {
      return yield* createStore({
        schema,
        storeId: 'test',
        adapter: makeInMemoryAdapter(),
      })
    })
  ).pipe(provideOtel({}))  // Required for tests
)
```

### TypeDB WASM in Tests

Tests run against real TypeDB WASM - no mocks:

```typescript
const service = new TypeDBEmbeddedService()
await service.connect({ address: 'wasm://local', database: 'test' })
await service.executeQuery('test', 'define entity person;')
await service.executeQuery('test', 'insert $p isa person;')
const result = await service.executeQuery('test', 'match $p isa person;')
```

## Running Tests

```bash
pnpm test        # Run all tests (browser mode via Playwright)
pnpm test:watch  # Watch mode
```

Tests run in Chromium via Vitest browser mode because TypeDB WASM requires browser APIs.

## File Structure

```
src/
├── vm/                    # View Model interfaces and scope
│   ├── __tests__/        # VM integration tests (PRIMARY)
│   ├── scope.ts          # VM implementation
│   └── app.vm.ts         # Root VM types
├── services/
│   ├── __tests__/        # Service tests (SECONDARY)
│   └── typedb-embedded-service.ts
├── test/
│   └── vm-test-utils.ts  # Test utilities
└── components/           # React components (NO TESTS)
```

## Detailed Documentation

- **[docs/VM-TESTING.md](./docs/VM-TESTING.md)** - Practical VM testing guide with patterns
- **[TESTING-PLAN.md](./TESTING-PLAN.md)** - Full testing philosophy and migration status
