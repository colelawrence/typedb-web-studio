# LiveStore Common Mistakes

This document captures common pitfalls when working with LiveStore's reactive primitives.

## Missing `deps` Array for Computed Values with Dynamic IDs

### The Problem

When creating `computed()` values inside loops (`.map()`, `.forEach()`, etc.) with dynamic labels, the computed value may not be uniquely cached. This can cause all items to share the same cached value, leading to incorrect UI state.

### Bad Example

```typescript
const items = data.map((item) => ({
  isActive$: computed(
    (get) => get(currentId$) === item.id,
    { label: `item.${item.id}.isActive` }  // ❌ Missing deps
  ),
}));
```

Even though the label includes the dynamic ID, LiveStore uses the `deps` array (not the label) to determine cache uniqueness. Without `deps`, all computed values may resolve to the same cached instance.

### Good Example

```typescript
const items = data.map((item) => ({
  isActive$: computed(
    (get) => get(currentId$) === item.id,
    { label: `item.${item.id}.isActive`, deps: [item.id] }  // ✅ Unique cache per item
  ),
}));
```

### What Goes in `deps`

The `deps` array should contain **all closed-over values** that:
1. Affect the computation result
2. Could potentially change between different instances

Think of `deps` as capturing the closure's external values. If the computed function uses a variable from outside its body, that variable should be in `deps`.

```typescript
// Example: Multiple captured values
const examples = section.examples.map((example) => {
  const exampleKey = `${profileId}:${example.id}`;
  const requiredContext = section.context;
  const hasContextManager = !!contextManager;

  return {
    // deps captures ALL closed-over values that affect this computation
    isReady$: computed(
      (get) => {
        if (!requiredContext) return true;
        const session = get(connectionSession$);
        return session.activeDatabase === expectedDbFor(requiredContext);
      },
      {
        label: `example.isReady:${exampleKey}`,
        deps: [exampleKey, requiredContext]  // ✅ Captures both closure values
      }
    ),

    // deps should include ALL values that affect the result
    canRun$: computed(
      (get) => {
        if (!isInteractive) return false;  // uses isInteractive from closure
        if (requiredContext && !hasContextManager) return false;  // uses both
        return get(executionState$).type !== "running";
      },
      {
        label: `example.canRun:${exampleKey}`,
        deps: [exampleKey, isInteractive, requiredContext, hasContextManager]  // ✅ All captured values
      }
    ),
  };
});
```

### When You Need `deps`

Add a `deps` array when:
- The `computed()` is created inside a loop or `.map()`
- The computed function uses variables from the enclosing scope (closure)
- Multiple instances of the computed value should have independent caches

### When You Don't Need `deps`

Skip `deps` when:
- The `computed()` is created once at the top level of a scope
- The function only uses `get()` to read other queryables (no closed-over values)
- There's only ever one instance of this computed value

### Rule of Thumb

**Include in `deps` every variable from outside the function body that affects the computation.** The computed function's result should be deterministic given:
1. The values returned by `get()` calls
2. The values in `deps`

---

## Duplicate `deps` Arrays Causing Signal Conflicts

### The Problem

When two different computed signals have **identical** `deps` arrays, LiveStore may incorrectly conflate them in the reactive graph. This can cause:
- Stack overflow errors (`Maximum call stack size exceeded` in `markSuperCompDirtyRec`)
- Signals that work via React subscription but crash on direct `store.query()`
- Unknown atom errors (`getAtom (unknown atom with ID=undefined)`)

### Bad Example

```typescript
// ❌ Two different computeds with identical deps
const canRun$ = computed(
  (get) => get(runDisabledReason$) === null,
  { label: `example.canRun:${exampleKey}`, deps: [exampleKey] }
);

const runReadiness$ = computed(
  (get) => {
    if (!get(canRun$)) return "blocked";
    return "ready";
  },
  { label: `example.runReadiness:${exampleKey}`, deps: [exampleKey] }  // ❌ Same deps as canRun$!
);
```

Even though the labels are different, the `deps: [exampleKey]` is identical. This can corrupt the dependency graph when `runReadiness$` tries to read `canRun$`.

### Good Example

```typescript
// ✅ Each computed has unique deps that reflect its behavior
const canRun$ = computed(
  (get) => get(runDisabledReason$) === null,
  { label: `example.canRun:${exampleKey}`, deps: [exampleKey] }
);

const runReadiness$ = computed(
  (get) => {
    const canRunNow = get(canRun$);
    const canLoad = get(canLoadContext$);
    if (canRunNow) return "ready";
    if (canLoad) return "needs-context";
    return "blocked";
  },
  {
    label: `example.runReadiness:${exampleKey}`,
    deps: [exampleKey, requiredContext, hasContextManager ? 1 : 0]  // ✅ Unique deps
  }
);
```

### Rule of Thumb

**No two computed signals in the same scope should have identical `deps` arrays.**

If you find yourself with multiple computeds using the same `deps`, add distinguishing factors:
- Add configuration values that affect behavior (`requiredContext`, `hasContextManager`)
- Add a type discriminator (`"canRun"` vs `"runReadiness"`)
- Include any closed-over values that differ between computeds

### Debugging This Issue

If you see `Maximum call stack size exceeded` in LiveStore's reactive internals:
1. Find computeds with identical `deps` arrays
2. Add distinguishing values to make each `deps` unique
3. Verify by testing each signal individually with `store.query()`

See [LIVESTORE_DEPS_POSTMORTEM.md](./LIVESTORE_DEPS_POSTMORTEM.md) for a detailed case study of this bug.

---

## Using Signals for Temporary, Non-Persisted State

### The Pattern

Use `signal()` with `store.setSignal()` for ephemeral state that shouldn't be persisted to the eventlog. This is ideal for:

- Execution state (loading, success, error)
- Transient results (query output, API responses)
- UI state that resets on page refresh

This is conceptually similar to UI state documents in LiveStore, but signals are lighter weight for simple values.

### Bad Example

```typescript
// ❌ Using mutable variables with computed() - reactivity won't work
let executionState: ExecutionState = { type: "idle" };
const executionState$ = computed(
  () => executionState,
  { label: "executionState" }
);

// Mutating doesn't trigger reactivity
executionState = { type: "running" };  // ❌ UI won't update
```

### Good Example

```typescript
import { signal } from "@livestore/livestore";

// ✅ Using signal() for reactive, non-persisted state
const executionState$ = signal<ExecutionState>(
  { type: "idle" },
  { label: "executionState" }
);

const currentResult$ = signal<QueryResult | null>(
  null,
  { label: "currentResult" }
);

// Update with store.setSignal() - triggers reactivity
const run = async () => {
  store.setSignal(executionState$, { type: "running" });
  store.setSignal(currentResult$, null);

  const result = await executeQuery();

  store.setSignal(executionState$, { type: "success" });
  store.setSignal(currentResult$, result);
};
```

### When to Use Signals vs clientDocument vs Persisted Tables

| `signal()` | `clientDocument` (UI state) | Persisted tables |
|------------|----------------------------|------------------|
| Loading/running states | Sidebar collapsed states | Reading progress |
| Transient query results | Current page/tab selection | Saved queries |
| Form validation errors | Editor mode preferences | Connection configs |
| In-flight execution state | Panel widths/positions | User annotations |
| **Resets on refresh** | **Session-scoped, not synced** | **Synced across devices** |

**Choose based on lifetime:**

1. **`signal()`** - Ephemeral, resets every page load. Use for execution state, loading indicators, transient results.

2. **`clientDocument`** (e.g., `uiState`) - Survives refresh but is session/device-specific. Use for view configurations, collapsed states, current selections. See `tables.uiState` in schema.ts.

3. **Persisted tables** (with `profileId`) - Synced and permanent. Use for user content, preferences that should roam, progress tracking. See `tables.readingProgress`, `tables.annotations`.

### Key Points

1. **Signals reset on page refresh** - they're in-memory only
2. **Use `store.setSignal(signal$, value)`** - not direct assignment
3. **Signals are reactive** - UI components will re-render when values change
4. **No schema needed** - unlike events, signals don't need schema definitions
