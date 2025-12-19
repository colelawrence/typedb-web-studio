Interesting artifacts and learnings must be written back to this document.

---

## Implementation Notes & Learnings (Updated after Phases I–IV)

### Schema Design Decisions

**`connectionSession` as clientDocument (not table):**
- We implemented `connectionSession` as a `State.SQLite.clientDocument` rather than a normalized table.
- This is appropriate because there's exactly one active session per browser tab.
- Contains: `mode`, `address`, `username`, `status`, `activeDatabase`, timestamps.

**`sessionDatabases` as clientDocument (not per-row table):**
- Originally planned as `{ sessionId, name, lastSeenAt, isStale }` rows.
- Actually implemented as a single clientDocument blob:
  ```ts
  { isLoading, isStale, databases: { name, lastSeenAt }[], lastRefreshedAt, fetchedForConnectionAt, lastError,
    lastRefreshAttemptAt, refreshRetryCount, nextAllowedRefreshAt }
  ```
- Trade-off: Simpler mutations, but no per-database queryability.
- Acceptable for current scope; reconsider if multi-session support is needed.
- **Phase IV addition**: Added backoff fields for exponential retry on failures.

### Bugs Fixed in Phase IV

1. ✅ **`activeDatabase` not cleared on disconnect**: Fixed in `handleServiceDisconnected()` helper which now clears `activeDatabase: null` on all disconnect paths.

2. ✅ **Legacy `uiState` coupling**: Migrated `homePageVM.connectionSummary$` and `connectionStatusVM.displayText$` to read from `connectionSession` instead of `uiState.connectionFormAddress`.

3. ✅ **Service subscriptions never cleaned up**: Added `teardown()` function to `StudioScopeResult` that calls both unsubscribe handlers.

4. ✅ **QueryExecutionService.execute not guarded**: Added connection status check (`status !== "connected"`) before database check.

### Patterns Established

- **Service event → LiveStore commit**: All TypeDB service status/mode changes flow through `subscribeToStatusChange`/`subscribeToModeChange` handlers that commit to `connectionSession`.
- **Staleness on disconnect**: When status becomes `"disconnected"`, we mark `sessionDatabases.isStale = true` and clear `schemaTypes`.
- **Refresh on selector open**: `databaseSelectorVM.toggle()` triggers `refreshDatabaseList()` if catalog is stale or empty.
- **Disconnect handler consolidation**: `handleServiceDisconnected(store)` centralizes all disconnect state updates to enforce invariants.
- **Backoff on refresh failures**: `refreshDatabaseList()` respects exponential backoff (1s, 2s, 4s... up to 30s) on failures; manual retry bypasses backoff once.
- **Scope teardown pattern**: Scopes that subscribe to external events return `{ vm, services, teardown }` for cleanup in tests/HMR.

### Phase 3 Additions

- **ContextDatabaseOps adapter**: `src/curriculum/context-database-adapter.ts` implements the interface to connect `ContextManager` to real TypeDB operations.
- **Auto-connect on context load**: When loading a lesson context, the adapter auto-connects to WASM mode if not already connected, enabling a seamless learning experience.
- **Build-time context loading**: The Vite plugin (`src/curriculum/vite-plugin.ts`) now reads schema.tql and seed.tql files at build time, exporting `curriculumLoadedContexts` with the actual content.
- **Lesson database naming**: Context databases use the pattern `learn_[context_name]` (e.g., `learn_social_network`).

---

## Phase 1 – Rationalize LiveStore Connection State

### Objectives, Scope, Dependencies
- **Objectives:** Introduce an explicit connection-session record that mirrors the real TypeDB service status and replaces the ad-hoc `uiState` fields. Guarantee that UI consumers can distinguish “we think we’re connected” from “the service reports connected.”
- **Scope:** LiveStore schema updates, service-provider wiring (`src/services/index.ts`), and VM queries that consume connection state. No UI polish yet.
- **Dependencies:** Existing TypeDB service events (`onStatusChange`, `onModeChange`, `onServiceReady`). Downstream phases rely on the new state shape.

### Tasks & Acceptance Criteria
1. **Add `connectionSessions` table**
   - Schema stores session id, mode, address, credentials metadata (without secrets), `status`, timestamps, and active database name.
   - Default row reflects the current ephemeral session and replaces `uiState.activeConnectionId`, `uiState.connectionStatus`, and `uiState.activeDatabase`.
2. **Refactor `uiState`**
   - Remove connection-specific fields or convert them to references to the new table.
   - Ensure all VMs query `connectionSessions` via new LiveStore queries.
3. **Wire service-provider events**
   - Subscribe to `onStatusChange`, `onModeChange`, and `onServiceReady`.
   - Update the current `connectionSession` row on each event and persist timestamps (`lastStatusChange`, etc.).
4. **Adapt connection service helpers**
   - `connectionService.connectWasm`/`connectHttp` create or update a session row; they no longer set `uiState` flags directly.
   - Disconnect clears the session record (status `disconnected`, clears active database) and timestamped `lastDisconnectedAt`.

Acceptance criteria: all LiveStore queries and VMs compile against the new schema; connection status indicators reflect real service events even if the service disconnects unexpectedly; there are no orphan references to removed `uiState` fields.

### Verification
- **Test Scenarios:** unit tests for schema migrations (`src/livestore/__tests__/connection-sessions.test.ts`), service wiring tests (`src/services/__tests__/connection-provider.test.ts`), and VM-level integration tests exercising connection transitions (`src/vm/__tests__/connection-status.vm.test.ts`).
- **Coverage Requirements:** Validate creation/update of session rows, event-driven status propagation, and UI queryables reacting to state changes.
- **Pass/Fail Criteria:** Tests fail if any connection status change is not reflected in LiveStore, or if VMs still reference deprecated `uiState` fields. All tests must live in the repository, follow the `*.test.ts` naming convention, and be re-runnable to guard against regressions.

## Phase 2 – Session-Scoped Database Catalog & Selector Rebuild

### Objectives, Scope, Dependencies
- **Objectives:** Track database listings per connection session, prevent stale data from leaking between sessions, and ensure selecting a database coordinates with the live TypeDB service.
- **Scope:** LiveStore schema for cached databases, database selector VM, snackbar flows, and schema caching resets.
- **Dependencies:** Phase 1 session records. Requires the service provider to know which session is active.

### Tasks & Acceptance Criteria
1. **Introduce `sessionDatabases` table**
   - Records: `{ sessionId, name, lastSeenAt, isStale }`.
   - Helper query returns databases for the active session; clearing on disconnect marks rows stale.
2. **Update database refresh flow**
   - `refreshDatabaseList` fetches databases from the service, upserts rows keyed by session, and sets `isStale=false`.
   - Errors mark the cache as stale and surface via selector disabled state.
3. **Rebuild `databaseSelectorVM`**
   - `visible$` depends on session status, not `uiState`.
   - Selecting a database calls a new `databaseService.select` that validates existence (creating if necessary when triggered by curriculum contexts) before updating the session’s `activeDatabase`.
   - Dropdown messaging differentiates between “no databases returned” and “cache stale/unavailable.”
4. **Schema cache invalidation**
   - `schemaTypes` keyed by `{ sessionId, database }` and cleared when selection changes or session disconnects.
   - `refreshSchemaForDatabase` writes to the correct cache entry.

Acceptance criteria: selecting a database updates only the current session, stale data never shows across sessions, and schema view reacts to per-session caches. Manual disconnect/reconnect cycles produce consistent dropdown content.

### Verification
- **Test Scenarios:** database cache behavior (`src/livestore/__tests__/session-databases.test.ts`), selector VM tests simulating session switches (`src/vm/top-bar/__tests__/database-selector.vm.test.ts`), and schema cache invalidation tests (`src/livestore/__tests__/schema-types-cache.test.ts`).
- **Coverage Requirements:** Ensure fetch success/failure paths, stale cache states, database selection side effects, and schema refresh triggers are exercised.
- **Pass/Fail Criteria:** Tests must fail if databases leak between sessions, if stale caches remain visible, or if schema caches are not reset on selection change. All verification code lives in-repo under the existing testing structure and is rerunnable.

## Phase 3 – Curriculum Context Manager Integration ✅ COMPLETED

### Objectives, Scope, Dependencies
- **Objectives:** Provide the document viewer and curriculum tooling a real `ContextManager` backed by the new database service so "Run/Copy to REPL" commands can enforce the expected database state.
- **Scope:** Curriculum context manager wiring, REPL bridge readiness checks, and UI prompts for context switching.
- **Dependencies:** Phases 1–2 must be complete (session-aware state, reliable database selection).

### Implementation Summary

**Completed Tasks:**

1. ✅ **Implemented `ContextDatabaseOps` adapter** (`src/curriculum/context-database-adapter.ts`)
   - `createDatabase(name)`: Deletes existing database if present, then creates fresh
   - `executeSchema(db, schema)`: Executes with `transactionType: "schema"`
   - `executeWrite(db, query)`: Executes with `transactionType: "write"`
   - `getActiveDatabase()`: Queries `connectionSession$.activeDatabase` from LiveStore
   - `setActiveDatabase(name)`: Commits to LiveStore and refreshes database list
   - **Auto-connect to WASM**: If not connected, calls `quickConnectWasm()` before operations

2. ✅ **Injected context manager into Learn page** (`src/vm/scope.ts`)
   - Updated `createLearnPageVM()` signature to accept `contextDeps` parameter
   - Created `contextDatabaseOps` adapter with service dependencies
   - Created `contextManager` using `curriculumLoadedContexts`
   - Passed `contextManager` to `createDocumentViewerScope()`
   - Added snackbar notification on context load

3. ✅ **Updated Vite plugin to load context content** (`src/curriculum/vite-plugin.ts`)
   - Modified `loadContexts()` to read schema.tql and seed.tql files at build time
   - Added `curriculumLoadedContexts` export with `Record<string, LoadedContext>`
   - Updated virtual module type declarations

4. ✅ **Added exports and types**
   - `src/curriculum/content.ts`: Exported `loadedContexts`
   - `src/curriculum/index.ts`: Re-exported adapter and types
   - `src/curriculum/virtual-curriculum.d.ts`: Added `curriculumLoadedContexts` type

5. ✅ **Wired UI component** (`src/components/learn/DocumentViewer.tsx`)
   - Imported `ContextSwitchPrompt` component
   - Passed `vm.contextSwitchPrompt` to `DocumentContent`
   - Rendered `ContextSwitchPrompt` at top of article content

**Database Naming Convention:**
- Lesson databases: `learn_[context_name]` (hyphens → underscores)
- Example: `"S1"` → `"learn_social_network"`

**Flow:**
1. User opens lesson requiring context (e.g., "S1")
2. Context switch prompt appears in document viewer
3. Clicking "Load Context" triggers `contextManager.loadContext("S1")`
4. Adapter auto-connects to WASM if disconnected
5. Creates database `learn_social_network`
6. Applies schema and seed data
7. Sets as active database, refreshes database list
8. Snackbar shows "Loaded context: S1"

### Verification
- **Test file:** `src/curriculum/__tests__/context-database-adapter.test.ts` (12 tests)
- **Coverage:** Database creation, schema/seed execution, auto-connect, active database updates
- **All 580 tests pass** including new adapter tests

## Phase 4 – Resilience, Observability, and Cleanup

### Objectives, Scope, Dependencies
- **Objectives:** Harden the system against service churn, expose diagnostics, and remove deprecated fields or APIs left over from the old approach.
- **Scope:** Error handling, snackbar messaging, telemetry logging, and documentation updates (including this plan).
- **Dependencies:** Phases 1–3 completed to avoid conflicting migrations.

---

### Detailed Tasks & Prioritized Refactoring

Based on Oracle review of Phases I–II implementation, the following concrete work items are organized by priority:

#### 4.1 Bug Fixes (High Priority – Must Do)

1. **Clear `activeDatabase` on disconnect** (S)
   - **Location:** `src/vm/scope.ts` – `subscribeToStatusChange` handler
   - **Issue:** Handler sets `lastDisconnectedAt` but doesn't clear `activeDatabase`, violating Phase I invariant
   - **Fix:** Add `activeDatabase: null` to the `connectionSessionSet` commit when `status === "disconnected"`
   - **Invariant to enforce:** `status !== "connected"` ⟹ `activeDatabase === null`

2. **Migrate `connectionSummary$` off legacy `uiState`** (S)
   - **Location:** `src/vm/scope.ts` – `homePageVM.connectionSummary$`
   - **Issue:** Reads `uiState.connectionFormAddress` instead of `connectionSession.address`
   - **Fix:** Replace with `connectionSession$.address` / `connectionSession$.mode` lookup

3. **Guard `QueryExecutionService.execute` with connection check** (S)
   - **Location:** `src/vm/scope.ts` – `queryExecutionService`
   - **Issue:** `execute()` only checks `activeDatabase`, not `status === "connected"`
   - **Fix:** Update `isReady()` to check both; early-return from `execute()` if `!isReady()`

#### 4.2 Resilience Enhancements (Medium Priority)

4. **Extract disconnect handler into named helper** (S)
   - **Location:** `src/vm/scope.ts`
   - **Purpose:** Consolidate session clearing, catalog staleness, and schema cache clearing
   - **Pattern:**
     ```ts
     function handleServiceDisconnected(store: Store<typeof schema>) {
       const now = Date.now();
       store.commit(events.connectionSessionSet({
         status: "disconnected",
         activeDatabase: null,
         lastStatusChange: now,
         lastDisconnectedAt: now,
       }));
       store.commit(events.sessionDatabasesSet({ isStale: true, lastError: null }));
       store.commit(events.schemaTypesSet({ entities: [], relations: [], attributes: [] }));
     }
     ```
   - **Benefit:** Single place to enforce disconnect invariants; easier to test

5. **Add backoff metadata to `sessionDatabases`** (M)
   - **Location:** `src/livestore/schema.ts` – `sessionDatabases` clientDocument
   - **New fields:**
     ```ts
     lastRefreshAttemptAt: Schema.NullOr(Schema.Number),
     refreshRetryCount: Schema.Number,  // resets to 0 on success
     nextAllowedRefreshAt: Schema.NullOr(Schema.Number),
     ```
   - **Helper:** Create `refreshDatabasesWithBackoff()` that:
     - Checks if `now >= nextAllowedRefreshAt` before refreshing
     - On success: reset `refreshRetryCount = 0`, clear `nextAllowedRefreshAt`
     - On failure: increment count, compute `backoffMs = 1000 * 2^retryCount` (capped at 30s), set `nextAllowedRefreshAt`
   - **UI:** "Retry now" button in selector bypasses backoff once (manual override)

6. **Add teardown path for service subscriptions** (S)
   - **Location:** `src/vm/scope.ts` – `createStudioScope` return value
   - **Change:** Return `{ vm, services, teardown: () => { ... } }` that calls unsubscribe functions
   - **Usage:** Call in test cleanup and HMR boundary

#### 4.3 Observability (Medium Priority – Optional for MVP)

7. **Introduce diagnostics table** (M)
   - **Location:** `src/livestore/schema.ts`
   - **Schema:**
     ```ts
     diagnosticsEvents: State.SQLite.table({
       name: "diagnosticsEvents",
       columns: {
         id: State.SQLite.text({ primaryKey: true }),
         timestamp: State.SQLite.integer({ schema: Schema.DateFromNumber }),
         type: State.SQLite.text(),   // "connection" | "database" | "schema" | "query"
         event: State.SQLite.text(),  // e.g., "statusChanged", "dbListRefreshFailed"
         source: State.SQLite.text(), // "service" | "user" | "curriculum"
         payload: State.SQLite.text({ nullable: true }), // JSON.stringify of details
       },
     })
     ```
   - **Helper:** `logDiagnostics(type, event, source, payload?)` that inserts and prunes old entries (keep last 200)

8. **Replace console.log with diagnostics calls** (S per site)
   - **Locations:** `onStatusChange`, `onModeChange`, `refreshDatabaseList`, `refreshSchemaForDatabase`
   - **Pattern:** Keep console.log for dev, but also call `logDiagnostics()` for persistent trace

9. **Debug pane VM (optional)** (M)
   - **Location:** New `src/vm/debug/debug-pane.vm.ts`
   - **Purpose:** Lists last N diagnostics events for developer builds
   - **Gate:** Only show in dev mode via `import.meta.env.DEV`

#### 4.4 Cleanup (Low Priority – Polish)

10. **Remove unused `uiState` connection fields** (S)
    - **Location:** `src/livestore/schema.ts` – `uiState` clientDocument
    - **Fields to remove (if no longer referenced):**
      - `connectionFormAddress` (if fully migrated to `connectionSession.address`)
      - Any other connection-specific fields that moved to `connectionSession`
    - **Verification:** `grep -r "connectionFormAddress" src/` should return only form-input usages

11. **Document schema discrepancies** (S)
    - **Location:** This document
    - **Done:** See "Implementation Notes" section at top of this document

12. **Update related docs** (S)
    - `CREATING_SCOPES.md` – Add note about service subscriptions and teardown pattern
    - `docs/INTERACTIVE_LEARNING_ARCHITECTURE.md` – Reference new `connectionSession` as source of truth

---

### Acceptance Criteria

1. **Invariants enforced:** After any disconnect (user-initiated or service-initiated), `connectionSession.activeDatabase === null` and `sessionDatabases.isStale === true`
2. **Query execution guarded:** `QueryExecutionService.execute()` returns error if `!isReady()` (not connected or no database)
3. **Backoff works:** Repeated refresh failures increase delay; manual retry bypasses once
4. **No dead code:** No remaining references to removed `uiState` fields
5. **Diagnostics logged:** Key state transitions appear in `diagnosticsEvents` table with provenance

### Verification

- **Test Scenarios:**
  - `src/vm/__tests__/connection-resilience.test.ts` – Disconnect/reconnect loops verify invariants
  - `src/vm/__tests__/query-execution-guard.test.ts` – Execute fails gracefully when not connected
  - `src/services/__tests__/database-refresh-backoff.test.ts` – Retry logic with exponential delay
  
- **Coverage Requirements:**
  - All disconnect paths clear `activeDatabase`
  - Backoff respects `nextAllowedRefreshAt`
  - Diagnostics include `source` field distinguishing service vs user actions

- **Pass/Fail Criteria:**
  - Tests fail if disconnect leaves `activeDatabase` non-null
  - Tests fail if `execute()` attempts service call when `status !== "connected"`
  - Tests fail if backoff doesn't increase delay on repeated failures

### Effort Estimate

| Task | Size | Notes |
|------|------|-------|
| 4.1 Bug fixes (items 1-3) | S | ~1 hour |
| 4.2 Extract handler + backoff (items 4-6) | M | ~2-3 hours |
| 4.3 Diagnostics table + logging (items 7-8) | M | ~2-3 hours |
| 4.3 Debug pane (item 9) | M | Optional, ~2 hours |
| 4.4 Cleanup (items 10-12) | S | ~1 hour |
| **Total** | | **~6-10 hours** |
