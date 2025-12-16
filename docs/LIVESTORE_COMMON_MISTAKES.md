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

### When You Need `deps`

Add a `deps` array when:
- The `computed()` is created inside a loop or `.map()`
- The label contains dynamic values (template literals with `${...}`)
- Multiple instances of the computed value should have independent caches

### When You Don't Need `deps`

Skip `deps` when:
- The `computed()` is created once at the top level of a scope
- The label is static (no template literal variables)
- There's only ever one instance of this computed value

### Rule of Thumb

**If your label has `${dynamicValue}`, you probably need `deps: [dynamicValue]`.**

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
