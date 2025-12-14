# TypeDB Web Studio - Implementation Status

## Architecture

The project uses a **View Model (VM) architecture** with LiveStore for reactive state management:

- **VM Layer**: TypeScript interfaces defining the contract between business logic and UI
- **LiveStore**: Event-sourcing state management with SQLite storage
- **Components**: React components consuming VMs
- **Scope**: Main factory function (`src/vm/scope.ts`) that orchestrates all VMs
- **Services**: Backend integration layer (to be implemented)

---

## What's Built

### Infrastructure (Complete)

- [x] LiveStore schema with tables, events, materializers
- [x] VM type definitions for all pages
- [x] React component structure
- [x] Routing (TanStack Router)
- [x] Snackbar notification system

### UI Components (Complete)

- [x] Top bar with navigation, database selector, connection status
- [x] Home page with navigation cards
- [x] Connect page with connection form (URL/credentials modes)
- [x] Query page layout (sidebar, editor, results, history bar)
- [x] Schema page layout (sidebar, graph canvas)
- [x] Users page layout (table with actions)

### State Management (Complete)

- [x] Connection status tracking
- [x] Navigation state (current page, route-aware)
- [x] UI preferences (sidebar widths, collapsed states)
- [x] Form state synchronization
- [x] Saved connections (CRUD in local state)

---

## What's Stubbed (UI Exists, Backend Missing)

### Query Page

- [ ] **Query execution** - "Run" button shows toast but doesn't execute
- [ ] **Code editor** - Text input only, no TypeQL syntax highlighting
- [ ] **Autocomplete** - Returns empty suggestions
- [ ] **Results (Log)** - Shows placeholder text
- [ ] **Results (Table)** - No columns/rows rendered
- [ ] **Results (Graph)** - No visualization library
- [ ] **Results (Raw)** - Empty JSON
- [ ] **Query history** - Schema exists, no loading
- [ ] **Saved queries tree** - Always empty

### Schema Page

- [ ] **Schema tree** - Groups defined but always empty (no fetching)
- [ ] **Schema graph** - Canvas exists but no visualization
- [ ] **Schema editing** - No define/undefine operations

### Users Page

- [ ] **User list** - Table structure but always empty
- [ ] **Create user** - Shows toast, no dialog
- [ ] **Edit password** - Shows toast, no action
- [ ] **Delete user** - Shows toast, no action

### Database Management

- [ ] **Database list** - Mock data only (`["typedb", "social_network", "financial_data"]`)
- [ ] **Create database** - Opens placeholder dialog
- [ ] **Delete database** - Disabled with message
- [ ] **Refresh list** - Shows toast, no server fetch

### Connection

- [ ] **Actual connection** - Simulated with 1.5s timeout (no real auth)
- [ ] **Token-based auth** - Not implemented

---

## What's Missing Entirely

### Backend Integration (Priority: Critical)

- [ ] **TypeDB Service** - Interface defined at `src/services/typedb-service.ts`
- [ ] **HTTP Driver Integration** - Wire up `@typedb/driver-http`
- [ ] **Mock Service** - For development without real server

### Transaction Model (Priority: Critical)

- [ ] **Transaction type selector** - read / write / schema
- [ ] **Operation mode selector** - auto / manual
- [ ] **Query type heuristics** - Auto-detect appropriate transaction type
- [ ] **Transaction state display** - Show open transaction, uncommitted changes

### Query Execution (Priority: High)

- [ ] **Execute query against server**
- [ ] **Stream/paginate results**
- [ ] **Handle query errors**
- [ ] **Display results in table format**
- [ ] **Display results in graph visualization**
- [ ] **Query cancellation**
- [ ] **Query timeout handling**

### Schema Operations (Priority: High)

- [ ] **Fetch schema from database**
- [ ] **Parse schema into tree structure**
- [ ] **Render schema graph (D3.js or similar)**
- [ ] **Schema text view (TypeQL)**

### Query Editor Features (Priority: Medium)

- [ ] **TypeQL syntax highlighting** (CodeMirror/Monaco)
- [ ] **Autocomplete from schema**
- [ ] **Error underlining**
- [ ] **Query formatting**

### Data Persistence (Priority: Medium)

- [ ] **IndexedDB/SQLite persistence for LiveStore**
- [ ] **Sync saved queries**
- [ ] **Persist query history**
- [ ] **Persist UI preferences**

### Dialogs (Priority: Medium)

- [ ] **Create database dialog**
- [ ] **Delete database confirmation**
- [ ] **Create user dialog**
- [ ] **Edit password dialog**
- [ ] **Delete user confirmation**
- [ ] **Save query dialog**
- [ ] **Unsaved changes confirmation**

---

## Implementation Plan

### Phase 1: Core Backend Integration

1. **Create mock TypeDB service** implementing `TypeDBService` interface
   - Return fake data for development
   - Simulate delays and errors

2. **Wire up service to scope.ts**
   - Replace mock database list with service calls
   - Connect status to real service state

3. **Implement transaction UI**
   - Add transaction type selector to query editor
   - Add operation mode toggle (auto/manual)
   - Display current transaction state

### Phase 2: Query Execution

1. **Implement `executeQuery` in service**
   - Open transaction
   - Run query
   - Commit/close based on mode

2. **Query type heuristics**
   - Use `detectQueryType()` from service interface
   - Show detected type with option to override

3. **Results rendering**
   - Table: Map concept maps to rows/columns
   - Log: Format query + timing info
   - Raw: JSON stringify results

### Phase 3: Schema & Graph

1. **Schema fetching**
   - Call `getDatabaseSchema()` on database selection
   - Populate schema tree

2. **Schema visualization**
   - Integrate D3.js or similar
   - Render entity/relation/attribute nodes
   - Show inheritance and relationship edges

### Phase 4: Real Driver Integration

1. **Replace mock service with HTTP driver**
   - Implement `TypeDBService` using `@typedb/driver-http`
   - Handle authentication
   - Handle errors

2. **User management**
   - Fetch real user list
   - Implement CRUD operations

---

## Transaction Model Reference

From the previous studio (`studio/src/service/driver-state.service.ts`):

### Transaction Types
- `"read"` - Read-only queries (match, fetch)
- `"write"` - Data modification (insert, delete)
- `"schema"` - Schema changes (define, undefine, redefine)

### Operation Modes
- `"auto"` - Per-query transaction lifecycle:
  - Opens transaction before query
  - For read: closes after query
  - For write/schema: commits on success, closes on failure
- `"manual"` - User controls:
  - Explicit open transaction
  - Run multiple queries
  - Explicit commit or close

### Query Type Detection
```typescript
// Schema keywords (highest priority)
"define", "undefine", "redefine" → schema transaction

// Write keywords
"insert", "delete" → write transaction

// Read keywords (default)
"match", "fetch" → read transaction
```

---

## Files Reference

```
src/
├── services/
│   └── typedb-service.ts       # Service interface (NEW)
├── vm/
│   ├── scope.ts                # Main VM factory
│   ├── app.vm.ts               # Root VM type
│   ├── top-bar/                # Navigation, DB selector, status
│   ├── pages/
│   │   ├── home/               # Home page VM
│   │   ├── connect/            # Connection form VM
│   │   ├── query/              # Query page VMs (editor, results, sidebar)
│   │   ├── schema/             # Schema page VM
│   │   └── users/              # Users page VM
│   └── shared/                 # Shared VMs (schema tree)
├── components/
│   ├── app/                    # TopBar, Snackbar, StudioApp
│   └── pages/                  # Page components
├── livestore/
│   ├── schema.ts               # Tables, events, materializers
│   └── queries.ts              # Computed queries
└── routes/                     # Page routes
```

---

## Notes

- The VM layer is well-designed and mostly complete
- Focus implementation on the service layer and wiring it to scope.ts
- The query editor should eventually use CodeMirror with TypeQL grammar from `studio/src/framework/codemirror-lang-typeql/`
