# Post-Mortem: LiveStore Computed Signal `deps` Array Bug

**Date**: 2025-12-19
**Bug**: Play button clickable on Query page when context not loaded
**Root Cause**: Incorrect `deps` array in `runReadiness$` computed signal
**Impact**: UI showed enabled button when it should have been disabled

## The Bug

Users could click the play button on example blocks in the Query page's documentation panel, even when the required lesson context wasn't loaded. The guard correctly blocked execution, but the button should have been **disabled** in the UI.

Console logs showed:
```
[ExampleBlock.run] Pre-flight check:
  exampleId: tour-find-people
  runDisabledReason: Requires "social-network" lesson context (open Learn page to load it)
  hasContextManager: false
[ExampleBlock.run] Cannot run: Requires "social-network" lesson context...
```

The guard worked, but user asked: "How am I even able to hit the run button?"

## Investigation Process

### Step 1: Understand the UI Logic

The `ExampleBlock.tsx` component disables the button based on `runReadiness$`:

```tsx
<Queryable query={vm.runReadiness$}>
  {(runReadiness) => (
    <RunButton
      disabled={runReadiness === "blocked" || isRunning}
      // ...
    />
  )}
</Queryable>
```

So if `runReadiness$ !== "blocked"`, the button stays enabled.

### Step 2: Create E2E Test

Created `src/test/__tests__/query-page-example-block-disabled.test.ts` to reproduce the issue using the full app bootstrap.

### Step 3: Test Intermediate Signals

The test showed these signals worked correctly:
```
[Test] canRun$: false           ✓
[Test] runDisabledReason$: Requires "social-network"...  ✓
[Test] isLessonReady$: false    ✓
[Test] canLoadContext$: false   ✓
```

But when trying to query `runReadiness$`:
```
[Test] About to query runReadiness$...
Error: Maximum call stack size exceeded
  at markSuperCompDirtyRec (reactive.js)
  at markSuperCompDirtyRec (reactive.js)
  ... (infinite recursion)
```

### Step 4: Identify the Pattern

Looking at the `deps` arrays for the computed signals:

```typescript
// These worked fine:
isLessonReady$:     { deps: [exampleKey, requiredContext] }
canLoadContext$:    { deps: [exampleKey, requiredContext] }
runDisabledReason$: { deps: [exampleKey, requiredContext, hasContextManager ? 1 : 0, isInteractive ? 1 : 0] }
canRun$:            { deps: [exampleKey] }

// This caused stack overflow:
runReadiness$:      { deps: [exampleKey] }  // <-- PROBLEM
```

`canRun$` and `runReadiness$` had **identical** `deps` arrays!

### Step 5: The Fix

Updated `runReadiness$` to include all factors that affect its identity:

```typescript
// Before
{ label: `example.runReadiness:${exampleKey}`, deps: [exampleKey] }

// After
{ label: `example.runReadiness:${exampleKey}`, deps: [exampleKey, requiredContext, hasContextManager ? 1 : 0] }
```

After this fix:
```
[Test] runReadiness$: blocked  ✓
```

## Root Cause Analysis

### What `deps` Does in LiveStore

The `deps` array in LiveStore computed signals serves as a **cache key** for signal deduplication. When you call `computed()` with the same `deps` values, LiveStore may return a cached/existing signal instead of creating a new one.

### Why This Caused Issues

1. `canRun$` was created with `deps: [exampleKey]`
2. `runReadiness$` was created with `deps: [exampleKey]` (same!)
3. LiveStore's internal tracking may have conflated these signals
4. When `runReadiness$` tried to read `canRun$`, the dependency graph got corrupted
5. This caused infinite recursion in `markSuperCompDirtyRec`

### Why It Worked in React but Failed in Direct Query

React's `useQuery` hook sets up subscriptions differently than `store.query()`. The subscription-based approach may have avoided the problematic code path, allowing the UI to (incorrectly) show a non-blocked state while direct queries crashed.

## Rule of Thumb

### When Creating Computed Signals in LiveStore:

**The `deps` array must include ALL factors that make this signal unique.**

This includes:
1. Any IDs that identify the entity (e.g., `exampleKey`, `sectionId`)
2. Any configuration that affects behavior (e.g., `requiredContext`, `hasContextManager`)
3. Any boolean flags that change the logic path (e.g., `isInteractive`)

### Pattern to Follow

```typescript
const mySignal$ = computed(
  (get) => {
    // Signal logic here
  },
  {
    label: `prefix.mySignal:${uniqueId}`,
    deps: [
      uniqueId,           // Entity identity
      configValue,        // Configuration that affects behavior
      boolFlag ? 1 : 0,   // Boolean flags (convert to numbers)
    ]
  }
);
```

### Why Convert Booleans to Numbers?

LiveStore compares `deps` arrays for equality. Using `1` and `0` instead of `true`/`false` ensures consistent comparison behavior.

### Warning Signs

If you see these errors, suspect `deps` array issues:
- `Maximum call stack size exceeded` in `markSuperCompDirtyRec`
- `getAtom (unknown atom with ID=undefined expected=...)`
- Signals that work via React subscription but crash on direct `store.query()`

## Test Coverage

The fix is verified by `src/test/__tests__/query-page-example-block-disabled.test.ts`:

1. **Query page (no contextManager)**: Examples requiring context have `runReadiness$ = "blocked"`
2. **Learn page (with contextManager)**: Examples can run (contextManager auto-loads context)
3. **Guard verification**: `run()` is blocked when `runDisabledReason$` is set

## Files Changed

- `src/vm/learn/document-viewer-scope.ts` - Fixed `deps` array for `runReadiness$`
- `src/test/__tests__/query-page-example-block-disabled.test.ts` - New E2E test

## Lessons Learned

1. **E2E tests reveal integration bugs** - Unit tests with mocks wouldn't have caught this
2. **Test intermediate signals** - When a computed fails, test its dependencies individually
3. **LiveStore `deps` is a cache key** - Not just documentation, it affects signal identity
4. **Different query methods have different behaviors** - `useQuery` vs `store.query()` may expose different bugs
