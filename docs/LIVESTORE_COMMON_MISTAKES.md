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
