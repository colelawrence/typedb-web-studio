# Creating Scopes in TypeDB Web Studio

This document captures patterns and pitfalls for creating VM scopes based on real refactoring experience.

## Scope Pattern Overview

Scopes are factory functions that create View Models (VMs) and Services from LiveStore state. They follow this pattern:

```typescript
export function createXYZScope(options: XYZScopeOptions): { vm: XYZVM; service: XYZService } {
  // ... implementation
  return { vm, service };
}
```

**Key distinction:**
- **VM** - For UI consumption. Contains `Queryable<T>` values and actions that update UI state.
- **Service** - For programmatic control by other scopes. Contains imperative methods.

## Common Type Pitfalls

### 1. Status Enums Must Match Exactly

VM interfaces define strict status unions. Don't invent your own values:

```typescript
// BAD - "loading" and "ready" are not valid TableStatus values
if (results.isRunning) return "loading";  // ❌
if (results.tableRows.length > 0) return "ready";  // ❌

// GOOD - use exact values from the type
if (results.isRunning) return "running";  // ✅
if (results.tableRows.length > 0) return "success";  // ✅
```

Always check the type definition:
```typescript
export type TableStatus = "idle" | "running" | "success" | "empty" | "notApplicable" | "error";
```

### 2. Queryable Properties Require `computed()` or `constant()`

VM interfaces use `Queryable<T>` for reactive values. These must be created properly:

```typescript
// BAD - plain value is not Queryable
isSorted$: false,  // ❌

// GOOD - use constant() for static values
isSorted$: constant(false, "column.isSorted"),  // ✅

// GOOD - use computed() for derived values
isSorted$: computed(
  (get) => get(sortState$)?.column === columnKey,
  { label: "column.isSorted" }
),  // ✅
```

### 3. IconComponent Is a Function Type

`IconComponent` is a callable interface, not a React element:

```typescript
// The type definition
export interface IconComponent {
  (props: { className?: string }): React.ReactNode;
}

// Implementation - use function components
const SuccessIcon: IconComponent = () => null;  // Placeholder
const ErrorIcon: IconComponent = ({ className }) => <X className={className} />;
```

### 4. `null` vs `undefined` in Interfaces

Be precise about nullability. Most VM interfaces use `null`, not `undefined`:

```typescript
// BAD - interface expects null
errorMessage: entry.errorMessage ?? undefined,  // ❌

// GOOD
errorMessage: entry.errorMessage ?? null,  // ✅
```

### 5. Required Functions Cannot Be Conditional

If the interface declares a method, it must always be present:

```typescript
// BAD - interface requires showErrorDetails()
showErrorDetails: entry.errorMessage ? () => { ... } : undefined,  // ❌

// GOOD - always provide the function
showErrorDetails: () => {
  if (entry.errorMessage) {
    showSnackbar("error", entry.errorMessage);
  }
},  // ✅
```

### 6. Schema Literals Must Include All Possible Values

When the backend can return values, the schema must accept them:

```typescript
// BAD - SDK returns "undefine" and "redefine" but schema doesn't accept them
resultType: Schema.Literal("match", "fetch", "insert", "delete", "define", "aggregate"),  // ❌

// GOOD - include all possible values
resultType: Schema.Literal("match", "fetch", "insert", "delete", "define", "undefine", "redefine", "aggregate"),  // ✅
```

## Implementing VM Interfaces

### Step 1: Read the Interface Carefully

Before implementing, read every property and its JSDoc comments:

```typescript
export interface HistoryEntryVM {
  key: string;
  type: "query" | "transaction";  // Don't miss this!
  statusIcon: IconComponent;       // Needs a function component
  status: "success" | "error" | "running";
  summary: string;                 // Truncated display text
  fullQueryText: string | null;    // Full text, nullable
  timeAgo$: Queryable<string>;     // Must be Queryable!
  timestampDisplay: string;        // Static string
  durationDisplay: string | null;  // Formatted, nullable
  loadInEditor(): void;            // Required method
  showErrorDetails(): void;        // Required method (not optional!)
  errorMessage: string | null;     // null, not undefined
}
```

### Step 2: Create Helper Functions

Extract formatting and transformation logic:

```typescript
const formatTimeAgo = (date: Date): string => {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  // ...
};

const formatDuration = (ms: number | null): string | null => {
  if (ms === null) return null;
  if (ms < 1000) return `${ms}ms`;
  // ...
};
```

### Step 3: Create Factory Functions for Complex Objects

When creating many similar objects, use a factory:

```typescript
const createHistoryEntryVM = (entry: QueryHistoryEntry): HistoryEntryVM => {
  const date = new Date(entry.executedAt);
  const status = entry.status as "success" | "error";
  return {
    key: entry.id,
    type: "query",
    statusIcon: getStatusIcon(status),
    status,
    summary: entry.queryText.slice(0, 40) + (entry.queryText.length > 40 ? "..." : ""),
    fullQueryText: entry.queryText,
    timeAgo$: constant(formatTimeAgo(date), `history.${entry.id}.timeAgo`),
    timestampDisplay: formatTimestamp(date),
    durationDisplay: formatDuration(entry.durationMs),
    loadInEditor: () => { /* ... */ },
    showErrorDetails: () => { /* ... */ },
    errorMessage: entry.errorMessage ?? null,
  };
};
```

### Step 4: Use Type Annotations on Computed Returns

Help TypeScript verify your implementation:

```typescript
// Explicit return type catches mismatches early
latest$: computed(
  (get): HistoryEntryVM | null => {  // ← Type annotation here
    const history = get(queryHistory$);
    if (history.length === 0) return null;
    return createHistoryEntryVM(history[0]);
  },
  { label: "history.latest" }
),
```

## Service vs VM Separation

### What Goes in the Service

Services contain methods other scopes need to call programmatically:

```typescript
export interface DocumentViewerService {
  openSection(sectionId: string): void;
  closeSection(): void;
  getCurrentSectionId(): string | null;
  markSectionRead(sectionId: string): void;
}
```

### What Goes in the VM

VMs contain reactive state and UI-driven actions:

```typescript
export interface DocumentViewerVM {
  isVisible$: Queryable<boolean>;
  show(): void;
  hide(): void;
  toggle(): void;
  currentSection$: Queryable<DocumentSectionVM | null>;
  openSection(sectionId: string): void;  // Can overlap with service
  // ...
}
```

### Implementation Sharing

The same implementation can back both VM and service methods:

```typescript
const openSection = (sectionId: string) => {
  store.commit(events.uiStateSet({ currentSectionId: sectionId, visible: true }));
};

const vm: DocumentViewerVM = {
  openSection,  // Same function
  // ...
};

const service: DocumentViewerService = {
  openSection,  // Same function
  // ...
};

return { vm, service };
```

## Testing Scopes

### Destructure Return Values

When testing scopes that return `{ vm, service }`:

```typescript
// BAD
const viewerVM = createDocumentViewerScope(options);  // ❌ Returns { vm, service }

// GOOD
const { vm: viewerVM, service: viewerService } = createDocumentViewerScope(options);  // ✅
```

### Mock Dependencies Completely

Ensure mocks match interface requirements exactly:

```typescript
// BAD - missing isLoading
getStatus: () => ({
  isReady: true,
  name: "test",
  error: null,
}),  // ❌

// GOOD - all fields present
getStatus: () => ({
  isReady: true,
  isLoading: false,  // Don't forget this!
  name: "test",
  error: null,
}),  // ✅
```

## Import Checklist

When implementing a scope, ensure you import:

- [ ] `computed`, `nanoid` from `@livestore/livestore`
- [ ] Type imports for all VM interfaces
- [ ] `IconComponent` from `./types` if using icons
- [ ] `DisabledState` from `./types` if using disabled states
- [ ] Status types like `TableStatus`, `GraphStatus` if needed
- [ ] Events and queries from `../livestore/schema` and `../livestore/queries`

```typescript
import { computed } from "@livestore/livestore";
import type { DisabledState, IconComponent } from "./types";
import type { TableStatus, TableColumnVM } from "./pages/query/results/query-results.vm";
```

## Service Subscriptions and Teardown

When a scope subscribes to external service events, return a `teardown` function:

```typescript
export function createStudioScope(
  store: Store<typeof schema>,
  navigate: (path: string) => void
): { vm: VM; services: Services; teardown: () => void } {
  // Subscribe to service events
  const unsubscribeStatus = subscribeToStatusChange((status) => {
    // Handle status change, commit to LiveStore
    store.commit(events.connectionSessionSet({ status }));
  });

  const unsubscribeMode = subscribeToModeChange((mode) => {
    // Handle mode change
    store.commit(events.connectionSessionSet({ mode }));
  });

  // ... scope implementation ...

  const teardown = () => {
    console.log("[scope] Teardown: unsubscribing from service events");
    unsubscribeStatus();
    unsubscribeMode();
  };

  return { vm, services, teardown };
}
```

**Usage in tests:**
```typescript
afterEach(async () => {
  ctx.teardown?.();  // Clean up subscriptions
  await ctx.cleanup();
});
```

**Usage at HMR boundaries:**
```typescript
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    currentScope?.teardown();
  });
}
```

## Quick Reference

| Issue | Wrong | Correct |
|-------|-------|---------|
| Status value | `"loading"` | `"running"` |
| Status value | `"ready"` | `"success"` |
| Nullable | `?? undefined` | `?? null` |
| Optional method | `fn: condition ? () => {} : undefined` | `fn: () => { if (condition) {...} }` |
| Queryable static | `value: false` | `value$: constant(false, "label")` |
| Return type | `createScope(): VM` | `createScope(): { vm: VM; service: Service }` |
| Missing teardown | No cleanup for subscriptions | Return `teardown` function |
