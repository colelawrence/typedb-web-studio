Interesting artifacts and learnings must be written back to this document.

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

## Phase 3 – Curriculum Context Manager Integration

### Objectives, Scope, Dependencies
- **Objectives:** Provide the document viewer and curriculum tooling a real `ContextManager` backed by the new database service so “Run/Copy to REPL” commands can enforce the expected database state.
- **Scope:** Curriculum context manager wiring, REPL bridge readiness checks, and UI prompts for context switching.
- **Dependencies:** Phases 1–2 must be complete (session-aware state, reliable database selection).

### Tasks & Acceptance Criteria
1. **Implement `ContextDatabaseOps` adapter**
   - Uses `databaseService` to create/reset databases and updates the current session’s `activeDatabase`.
   - Persists bookkeeping (e.g., context metadata) as session-level attributes to decide when to reload.
2. **Inject context manager into scopes**
   - Pass adapter to `createDocumentViewerScope` instances (Learn page and Query page). Remove fallback code paths that assumed absence.
   - Ensure context switch prompts track the session’s active database.
3. **Synchronize REPL readiness**
   - `createReplBridge.isReady` now checks the session record plus context manager readiness; display actionable errors when context missing.
   - `executeQuery` paths ensure they wait for context setup when invoked from curriculum actions.
4. **Curriculum telemetry/bookkeeping**
   - Record which context created which database without assuming the database still exists; use session/database metadata to decide when to re-seed.

Acceptance criteria: curriculum sections can load/reset contexts reliably, REPL commands launched from docs ensure the expected database exists, and context prompts accurately reflect session state after disconnect/reconnect.

### Verification
- **Test Scenarios:** context manager adapter tests (`src/curriculum/__tests__/context-manager-adapter.test.ts`), document viewer scope integration tests with real context switches (`src/vm/learn/__tests__/document-viewer-context.test.ts`), and REPL bridge readiness tests (`src/learn/__tests__/repl-bridge-context.test.ts`).
- **Coverage Requirements:** Exercise context load/reset/clear flows, ensure database selection occurs, and validate error messaging when contexts are missing or the service disconnects mid-operation.
- **Pass/Fail Criteria:** Tests fail if context load leaves the session without an active database, if REPL readiness returns true while no database is selected, or if prompts don’t update after context changes. Tests live in-codebase and must be rerunnable.

## Phase 4 – Resilience, Observability, and Cleanup

### Objectives, Scope, Dependencies
- **Objectives:** Harden the system against service churn, expose diagnostics, and remove deprecated fields or APIs left over from the old approach.
- **Scope:** Error handling, snackbar messaging, telemetry logging, and documentation updates (including this plan).
- **Dependencies:** Phases 1–3 completed to avoid conflicting migrations.

### Tasks & Acceptance Criteria
1. **Resilience enhancements**
   - Add automatic stale-state detection when `onStatusChange` reports `disconnected`; selector and REPL surfaces communicate the loss gracefully.
   - Provide retry hooks for refreshing database/schema caches with exponential backoff metadata stored per session.
2. **Observability**
   - Emit structured logs or analytics events whenever session/database state changes, capturing whether the data was derived from TypeDB or local bookkeeping.
   - Surface these insights via developer tooling (e.g., a debug pane fed by the new tables).
3. **Cleanup & documentation**
   - Remove legacy fields/methods replaced in earlier phases.
   - Update `CREATING_SCOPES.md`, `docs/INTERACTIVE_LEARNING_ARCHITECTURE.md`, and this plan with learnings gathered during implementation.

Acceptance criteria: the app remains usable through transient disconnects, developers can inspect state provenance, and no dead code references the old `uiState` connection fields.

### Verification
- **Test Scenarios:** fault-injection tests for disconnect/reconnect loops (`src/vm/__tests__/connection-resilience.test.ts`), logging/telemetry unit tests ensuring payloads include provenance fields (`src/services/__tests__/diagnostics-logger.test.ts`), and documentation lint/check tasks verifying plan updates (`docs/__tests__/documentation-regression.test.ts` if applicable).
- **Coverage Requirements:** Include both graceful recovery and failure notification paths, ensuring retries back off and state flags become stale when expected.
- **Pass/Fail Criteria:** Tests fail if disconnects leave stale “connected” indicators, if retries never mark caches stale, or if documentation automation detects missing updates. All verification artifacts must be maintained in-repo and rerunnable.
