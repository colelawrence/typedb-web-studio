/**
 * LiveStore schema for TypeDB Studio.
 *
 * Defines tables (state), events (changes), and materializers (event→state).
 * Based on the domain model in studio/docs/DATA-STRUCTURES.md
 */

import { Events, Schema, SessionIdSymbol, State, makeSchema } from "@livestore/livestore";

// ============================================================================
// Tables (State)
// ============================================================================

export const tables = {
  // -------------------------------------------------------------------------
  // Connections
  // -------------------------------------------------------------------------

  /**
   * Saved connection configurations.
   * Persists connection details (except password) for quick reconnection.
   */
  connections: State.SQLite.table({
    name: "connections",
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      name: State.SQLite.text({ default: "" }),
      address: State.SQLite.text({ default: "" }),
      username: State.SQLite.text({ default: "" }),
      database: State.SQLite.text({ nullable: true }),
      isStartupConnection: State.SQLite.boolean({ default: false }),
      lastUsedAt: State.SQLite.integer({ nullable: true, schema: Schema.DateFromNumber }),
      createdAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
    },
  }),

  // -------------------------------------------------------------------------
  // Saved Queries
  // -------------------------------------------------------------------------

  /**
   * Folders for organizing saved queries.
   */
  savedQueryFolders: State.SQLite.table({
    name: "savedQueryFolders",
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      name: State.SQLite.text({ default: "" }),
      parentId: State.SQLite.text({ nullable: true }),
      importKey: State.SQLite.text({ nullable: true }),
      sortOrder: State.SQLite.integer({ default: 0 }),
      createdAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
      updatedAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
      deletedAt: State.SQLite.integer({ nullable: true, schema: Schema.DateFromNumber }),
    },
  }),

  /**
   * Saved queries with their content and metadata.
   */
  savedQueries: State.SQLite.table({
    name: "savedQueries",
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      folderId: State.SQLite.text({ nullable: true }),
      name: State.SQLite.text({ default: "" }),
      queryText: State.SQLite.text({ default: "" }),
      description: State.SQLite.text({ nullable: true }),
      importKey: State.SQLite.text({ nullable: true }),
      sortOrder: State.SQLite.integer({ default: 0 }),
      lastRunAt: State.SQLite.integer({ nullable: true, schema: Schema.DateFromNumber }),
      createdAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
      updatedAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
      deletedAt: State.SQLite.integer({ nullable: true, schema: Schema.DateFromNumber }),
    },
  }),

  // -------------------------------------------------------------------------
  // Query History
  // -------------------------------------------------------------------------

  /**
   * Query execution history (max 50 entries).
   */
  queryHistory: State.SQLite.table({
    name: "queryHistory",
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      connectionId: State.SQLite.text({ nullable: true }),
      databaseName: State.SQLite.text({ nullable: true }),
      queryText: State.SQLite.text({ default: "" }),
      executedAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
      status: State.SQLite.text({ default: "success" }), // "success" | "error"
      durationMs: State.SQLite.integer({ nullable: true }),
      rowCount: State.SQLite.integer({ nullable: true }),
      errorMessage: State.SQLite.text({ nullable: true }),
    },
  }),

  // -------------------------------------------------------------------------
  // Local WASM Servers
  // -------------------------------------------------------------------------

  /**
   * User-created local WASM servers.
   * Each server runs in-browser via @typedb/embedded and can contain multiple databases.
   * Server data is persisted via snapshots stored in IndexedDB/OPFS.
   */
  localServers: State.SQLite.table({
    name: "localServers",
    columns: {
      /** Unique server ID (format: "local_{nanoid}") */
      id: State.SQLite.text({ primaryKey: true }),
      /** User-provided or auto-generated name */
      name: State.SQLite.text({ default: "" }),
      /** Whether this is a demo server (read-only, pre-loaded data) */
      isDemo: State.SQLite.boolean({ default: false }),
      /** Demo identifier if isDemo=true (e.g., "social-network") */
      demoId: State.SQLite.text({ nullable: true }),
      /** Last time this server was used/connected */
      lastUsedAt: State.SQLite.integer({ nullable: true, schema: Schema.DateFromNumber }),
      /** When this server was created */
      createdAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
    },
  }),

  // -------------------------------------------------------------------------
  // UI State (Client Document - Session-scoped)
  // -------------------------------------------------------------------------

  /**
   * Client-only UI state that doesn't need to sync.
   */
  uiState: State.SQLite.clientDocument({
    name: "uiState",
    schema: Schema.Struct({
      // Current page
      currentPage: Schema.Literal("home", "connect", "query", "schema", "users"),

      // Connection form state
      connectionFormMode: Schema.Literal("url", "credentials"),
      connectionFormUrl: Schema.String,
      connectionFormAddress: Schema.String,
      connectionFormUsername: Schema.String,
      connectionFormPassword: Schema.String,
      isConnecting: Schema.Boolean,

      // Active connection session (not persisted)
      activeConnectionId: Schema.NullOr(Schema.String),
      activeLocalServerId: Schema.NullOr(Schema.String),
      activeDatabase: Schema.NullOr(Schema.String),
      connectionStatus: Schema.Literal("disconnected", "connecting", "connected", "reconnecting"),

      // Remote connection form expanded state
      remoteConnectionExpanded: Schema.Boolean,

      // Query editor state
      currentQueryText: Schema.String,
      currentQueryId: Schema.NullOr(Schema.String), // null = scratch query
      hasUnsavedChanges: Schema.Boolean,
      editorMode: Schema.Literal("code", "chat"),

      // Sidebar state
      querySidebarWidth: Schema.Number,
      querySidebarCollapsed: Schema.Boolean,
      schemaCollapsed: Schema.Boolean,
      savedQueriesCollapsed: Schema.Boolean,

      // Schema tree view settings
      schemaViewMode: Schema.Literal("flat", "hierarchical"),
      schemaShowSub: Schema.Boolean,
      schemaShowOwns: Schema.Boolean,
      schemaShowPlays: Schema.Boolean,
      schemaShowRelates: Schema.Boolean,

      // Results tab
      resultsActiveTab: Schema.Literal("log", "table", "graph", "raw"),

      // History bar
      historyBarExpanded: Schema.Boolean,

      // Active dialog
      activeDialog: Schema.NullOr(Schema.String),
    }),
    default: {
      id: SessionIdSymbol,
      value: {
        currentPage: "home",
        connectionFormMode: "credentials",
        connectionFormUrl: "",
        connectionFormAddress: "",
        connectionFormUsername: "",
        connectionFormPassword: "",
        isConnecting: false,
        activeConnectionId: null,
        activeLocalServerId: null,
        activeDatabase: null,
        connectionStatus: "disconnected",
        remoteConnectionExpanded: false,
        currentQueryText: "",
        currentQueryId: null,
        hasUnsavedChanges: false,
        editorMode: "code",
        querySidebarWidth: 280,
        querySidebarCollapsed: false,
        schemaCollapsed: false,
        savedQueriesCollapsed: false,
        schemaViewMode: "hierarchical",
        schemaShowSub: true,
        schemaShowOwns: true,
        schemaShowPlays: true,
        schemaShowRelates: true,
        resultsActiveTab: "log",
        historyBarExpanded: false,
        activeDialog: null,
      },
    },
  }),

  /**
   * Snackbar notifications queue.
   */
  snackbarNotifications: State.SQLite.clientDocument({
    name: "snackbarNotifications",
    schema: Schema.Struct({
      notifications: Schema.Array(
        Schema.Struct({
          id: Schema.String,
          type: Schema.Literal("success", "warning", "error"),
          message: Schema.String,
          persistent: Schema.Boolean,
          createdAt: Schema.Number,
        })
      ),
    }),
    default: {
      id: SessionIdSymbol,
      value: { notifications: [] },
    },
  }),

  /**
   * Parsed schema types for the current database.
   * Populated when a demo is loaded or schema is refreshed.
   */
  schemaTypes: State.SQLite.clientDocument({
    name: "schemaTypes",
    schema: Schema.Struct({
      entities: Schema.Array(
        Schema.Struct({
          label: Schema.String,
          isAbstract: Schema.Boolean,
          supertype: Schema.NullOr(Schema.String),
          ownedAttributes: Schema.Array(Schema.String),
          playedRoles: Schema.Array(Schema.String),
        })
      ),
      relations: Schema.Array(
        Schema.Struct({
          label: Schema.String,
          isAbstract: Schema.Boolean,
          supertype: Schema.NullOr(Schema.String),
          ownedAttributes: Schema.Array(Schema.String),
          relatedRoles: Schema.Array(Schema.String),
        })
      ),
      attributes: Schema.Array(
        Schema.Struct({
          label: Schema.String,
          valueType: Schema.NullOr(Schema.String),
        })
      ),
    }),
    default: {
      id: SessionIdSymbol,
      value: {
        entities: [],
        relations: [],
        attributes: [],
      },
    },
  }),
};

// ============================================================================
// Events
// ============================================================================

export const events = {
  // -------------------------------------------------------------------------
  // Connection Events
  // -------------------------------------------------------------------------

  connectionCreated: Events.synced({
    name: "v1.ConnectionCreated",
    schema: Schema.Struct({
      id: Schema.String,
      name: Schema.String,
      address: Schema.String,
      username: Schema.String,
      database: Schema.NullOr(Schema.String),
      createdAt: Schema.Date,
    }),
  }),

  connectionUpdated: Events.synced({
    name: "v1.ConnectionUpdated",
    schema: Schema.Struct({
      id: Schema.String,
      name: Schema.optional(Schema.String),
      address: Schema.optional(Schema.String),
      username: Schema.optional(Schema.String),
      database: Schema.optional(Schema.NullOr(Schema.String)),
      isStartupConnection: Schema.optional(Schema.Boolean),
      lastUsedAt: Schema.optional(Schema.Date),
    }),
  }),

  connectionDeleted: Events.synced({
    name: "v1.ConnectionDeleted",
    schema: Schema.Struct({ id: Schema.String }),
  }),

  // -------------------------------------------------------------------------
  // Local Server Events
  // -------------------------------------------------------------------------

  localServerCreated: Events.synced({
    name: "v1.LocalServerCreated",
    schema: Schema.Struct({
      id: Schema.String,
      name: Schema.String,
      isDemo: Schema.Boolean,
      demoId: Schema.NullOr(Schema.String),
      createdAt: Schema.Date,
    }),
  }),

  localServerUpdated: Events.synced({
    name: "v1.LocalServerUpdated",
    schema: Schema.Struct({
      id: Schema.String,
      name: Schema.optional(Schema.String),
      lastUsedAt: Schema.optional(Schema.Date),
    }),
  }),

  localServerDeleted: Events.synced({
    name: "v1.LocalServerDeleted",
    schema: Schema.Struct({ id: Schema.String }),
  }),

  // -------------------------------------------------------------------------
  // Saved Query Folder Events
  // -------------------------------------------------------------------------

  folderCreated: Events.synced({
    name: "v1.FolderCreated",
    schema: Schema.Struct({
      id: Schema.String,
      name: Schema.String,
      parentId: Schema.NullOr(Schema.String),
      sortOrder: Schema.Number,
      createdAt: Schema.Date,
    }),
  }),

  folderUpdated: Events.synced({
    name: "v1.FolderUpdated",
    schema: Schema.Struct({
      id: Schema.String,
      name: Schema.optional(Schema.String),
      parentId: Schema.optional(Schema.NullOr(Schema.String)),
      sortOrder: Schema.optional(Schema.Number),
      updatedAt: Schema.Date,
    }),
  }),

  folderDeleted: Events.synced({
    name: "v1.FolderDeleted",
    schema: Schema.Struct({
      id: Schema.String,
      deletedAt: Schema.Date,
    }),
  }),

  // -------------------------------------------------------------------------
  // Saved Query Events
  // -------------------------------------------------------------------------

  queryCreated: Events.synced({
    name: "v1.QueryCreated",
    schema: Schema.Struct({
      id: Schema.String,
      folderId: Schema.NullOr(Schema.String),
      name: Schema.String,
      queryText: Schema.String,
      description: Schema.NullOr(Schema.String),
      sortOrder: Schema.Number,
      createdAt: Schema.Date,
    }),
  }),

  queryUpdated: Events.synced({
    name: "v1.QueryUpdated",
    schema: Schema.Struct({
      id: Schema.String,
      folderId: Schema.optional(Schema.NullOr(Schema.String)),
      name: Schema.optional(Schema.String),
      queryText: Schema.optional(Schema.String),
      description: Schema.optional(Schema.NullOr(Schema.String)),
      sortOrder: Schema.optional(Schema.Number),
      lastRunAt: Schema.optional(Schema.Date),
      updatedAt: Schema.Date,
    }),
  }),

  queryDeleted: Events.synced({
    name: "v1.QueryDeleted",
    schema: Schema.Struct({
      id: Schema.String,
      deletedAt: Schema.Date,
    }),
  }),

  // -------------------------------------------------------------------------
  // Query History Events
  // -------------------------------------------------------------------------

  historyEntryAdded: Events.synced({
    name: "v1.HistoryEntryAdded",
    schema: Schema.Struct({
      id: Schema.String,
      connectionId: Schema.NullOr(Schema.String),
      databaseName: Schema.NullOr(Schema.String),
      queryText: Schema.String,
      executedAt: Schema.Date,
      status: Schema.Literal("success", "error"),
      durationMs: Schema.NullOr(Schema.Number),
      rowCount: Schema.NullOr(Schema.Number),
      errorMessage: Schema.NullOr(Schema.String),
    }),
  }),

  historyCleared: Events.synced({
    name: "v1.HistoryCleared",
    schema: Schema.Struct({}),
  }),

  // -------------------------------------------------------------------------
  // UI State Events (Client-only)
  // -------------------------------------------------------------------------

  uiStateSet: tables.uiState.set,
  snackbarSet: tables.snackbarNotifications.set,
  schemaTypesSet: tables.schemaTypes.set,
};

// ============================================================================
// Materializers
// ============================================================================

const materializers = State.SQLite.materializers(events, {
  // Connection materializers
  "v1.ConnectionCreated": ({ id, name, address, username, database, createdAt }) =>
    tables.connections.insert({
      id,
      name,
      address,
      username,
      database,
      isStartupConnection: false,
      lastUsedAt: null,
      createdAt,
    }),

  "v1.ConnectionUpdated": ({ id, ...updates }) =>
    tables.connections.update(updates).where({ id }),

  "v1.ConnectionDeleted": ({ id }) =>
    tables.connections.delete().where({ id }),

  // Local server materializers
  "v1.LocalServerCreated": ({ id, name, isDemo, demoId, createdAt }) =>
    tables.localServers.insert({
      id,
      name,
      isDemo,
      demoId,
      lastUsedAt: null,
      createdAt,
    }),

  "v1.LocalServerUpdated": ({ id, ...updates }) =>
    tables.localServers.update(updates).where({ id }),

  "v1.LocalServerDeleted": ({ id }) =>
    tables.localServers.delete().where({ id }),

  // Folder materializers
  "v1.FolderCreated": ({ id, name, parentId, sortOrder, createdAt }) =>
    tables.savedQueryFolders.insert({
      id,
      name,
      parentId,
      sortOrder,
      importKey: null,
      createdAt,
      updatedAt: createdAt,
      deletedAt: null,
    }),

  "v1.FolderUpdated": ({ id, updatedAt, ...updates }) =>
    tables.savedQueryFolders.update({ ...updates, updatedAt }).where({ id }),

  "v1.FolderDeleted": ({ id, deletedAt }) =>
    tables.savedQueryFolders.update({ deletedAt }).where({ id }),

  // Query materializers
  "v1.QueryCreated": ({ id, folderId, name, queryText, description, sortOrder, createdAt }) =>
    tables.savedQueries.insert({
      id,
      folderId,
      name,
      queryText,
      description,
      sortOrder,
      importKey: null,
      lastRunAt: null,
      createdAt,
      updatedAt: createdAt,
      deletedAt: null,
    }),

  "v1.QueryUpdated": ({ id, updatedAt, ...updates }) =>
    tables.savedQueries.update({ ...updates, updatedAt }).where({ id }),

  "v1.QueryDeleted": ({ id, deletedAt }) =>
    tables.savedQueries.update({ deletedAt }).where({ id }),

  // History materializers
  "v1.HistoryEntryAdded": (entry) =>
    tables.queryHistory.insert(entry),

  "v1.HistoryCleared": () =>
    tables.queryHistory.delete().where({}),
});

// ============================================================================
// Schema Export
// ============================================================================

const state = State.SQLite.makeState({ tables, materializers });

export const schema = makeSchema({ events, state });
