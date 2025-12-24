/**
 * LiveStore schema for TypeDB Studio.
 *
 * Defines tables (state), events (changes), and materializers (event→state).
 * Based on the domain model in studio/docs/DATA-STRUCTURES.md
 */

import {
  Events,
  Schema,
  SessionIdSymbol,
  State,
  makeSchema,
} from "@livestore/livestore";

// ============================================================================
// Tables (State)
// ============================================================================

export const tables = {
  // -------------------------------------------------------------------------
  // Profiles (Interactive Learning)
  // -------------------------------------------------------------------------

  /**
   * User profiles for the interactive learning environment.
   * Profile ID is the universal isolation boundary for all learning state.
   */
  profiles: State.SQLite.table({
    name: "profiles",
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      displayName: State.SQLite.text({ nullable: true }),
      createdAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
      lastActiveAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
    },
  }),

  /**
   * Reading progress tracks which curriculum sections/headings have been viewed.
   * Composite key: `${profileId}:${sectionId}:${headingId ?? "root"}`
   */
  readingProgress: State.SQLite.table({
    name: "readingProgress",
    columns: {
      /** Composite key: profileId:sectionId:headingId */
      id: State.SQLite.text({ primaryKey: true }),
      profileId: State.SQLite.text({}),
      sectionId: State.SQLite.text({}),
      /** Heading ID within section, null means the section root */
      headingId: State.SQLite.text({ nullable: true }),
      /** Whether explicitly marked as read by user */
      markedRead: State.SQLite.boolean({ default: false }),
      firstViewedAt: State.SQLite.integer({
        nullable: true,
        schema: Schema.DateFromNumber,
      }),
      lastViewedAt: State.SQLite.integer({
        nullable: true,
        schema: Schema.DateFromNumber,
      }),
    },
  }),

  /**
   * Tracks example code block executions from curriculum content.
   * Records whether examples were run from docs or REPL.
   */
  exampleExecutions: State.SQLite.table({
    name: "exampleExecutions",
    columns: {
      /** Composite key: profileId:exampleId:executionIndex */
      id: State.SQLite.text({ primaryKey: true }),
      profileId: State.SQLite.text({}),
      /** Example ID from curriculum markdown */
      exampleId: State.SQLite.text({}),
      /** Whether the execution succeeded */
      succeeded: State.SQLite.boolean({ default: false }),
      /** Source of execution: 'docs-run' | 'docs-copy' | 'repl-direct' */
      source: State.SQLite.text({ default: "repl-direct" }),
      executedAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
      /** Execution duration in milliseconds */
      durationMs: State.SQLite.integer({ nullable: true }),
      /** Error message if failed */
      errorMessage: State.SQLite.text({ nullable: true }),
    },
  }),

  /**
   * User annotations/notes on curriculum content.
   * Allows users to add personal notes to sections.
   */
  annotations: State.SQLite.table({
    name: "annotations",
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      profileId: State.SQLite.text({}),
      sectionId: State.SQLite.text({}),
      /** Optional heading ID for more specific placement */
      headingId: State.SQLite.text({ nullable: true }),
      /** The annotation text content */
      content: State.SQLite.text({ default: "" }),
      createdAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
      updatedAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
    },
  }),

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
      lastUsedAt: State.SQLite.integer({
        nullable: true,
        schema: Schema.DateFromNumber,
      }),
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
      deletedAt: State.SQLite.integer({
        nullable: true,
        schema: Schema.DateFromNumber,
      }),
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
      lastRunAt: State.SQLite.integer({
        nullable: true,
        schema: Schema.DateFromNumber,
      }),
      createdAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
      updatedAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
      deletedAt: State.SQLite.integer({
        nullable: true,
        schema: Schema.DateFromNumber,
      }),
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
      /** Last time this server was used/connected */
      lastUsedAt: State.SQLite.integer({
        nullable: true,
        schema: Schema.DateFromNumber,
      }),
      /** When this server was created */
      createdAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
    },
  }),

  // -------------------------------------------------------------------------
  // Connection Session (Client Document - Session-scoped)
  // -------------------------------------------------------------------------

  /**
   * Active connection session state.
   * Mirrors the real TypeDB service status and replaces ad-hoc uiState fields.
   * This is the source of truth for "are we connected?" and "what are we connected to?"
   */
  connectionSession: State.SQLite.clientDocument({
    name: "connectionSession",
    schema: Schema.Struct({
      // Connection mode and target
      mode: Schema.NullOr(Schema.Literal("wasm", "http")),
      address: Schema.NullOr(Schema.String),
      username: Schema.NullOr(Schema.String),

      // Reference to saved connection config (if using a saved connection)
      savedConnectionId: Schema.NullOr(Schema.String),
      savedLocalServerId: Schema.NullOr(Schema.String),

      // Connection status (mirrors service provider state)
      status: Schema.Literal(
        "disconnected",
        "connecting",
        "connected",
        "reconnecting"
      ),

      // Active database within the session
      activeDatabase: Schema.NullOr(Schema.String),

      // Timestamps for diagnostics
      connectedAt: Schema.NullOr(Schema.Number),
      lastStatusChange: Schema.Number,
      lastDisconnectedAt: Schema.NullOr(Schema.Number),
    }),
    default: {
      id: SessionIdSymbol,
      value: {
        mode: null,
        address: null,
        username: null,
        savedConnectionId: null,
        savedLocalServerId: null,
        status: "disconnected",
        activeDatabase: null,
        connectedAt: null,
        lastStatusChange: Date.now(),
        lastDisconnectedAt: null,
      },
    },
  }),

  // -------------------------------------------------------------------------
  // Lesson Context (Client Document - Session-scoped)
  // -------------------------------------------------------------------------

  /**
   * Tracks the current lesson context state for the Learn page.
   * This is the reactive source of truth for which context is loaded.
   */
  lessonContext: State.SQLite.clientDocument({
    name: "lessonContext",
    schema: Schema.Struct({
      /** Currently loaded context name, or null if none */
      currentContext: Schema.NullOr(Schema.String),
      /** Whether a context is currently being loaded */
      isLoading: Schema.Boolean,
      /** Last error message, or null if no error */
      lastError: Schema.NullOr(Schema.String),
      /** Timestamp when context was last loaded */
      lastLoadedAt: Schema.NullOr(Schema.Number),
    }),
    default: {
      id: SessionIdSymbol,
      value: {
        currentContext: null,
        isLoading: false,
        lastError: null,
        lastLoadedAt: null,
      },
    },
  }),

  // -------------------------------------------------------------------------
  // Demo Context (Client Document - Session-scoped)
  // -------------------------------------------------------------------------

  /**
   * Tracks the current demo state for demos loaded from the Connect page.
   * This is the reactive source of truth for which demo database is active.
   * Demos are ephemeral databases (demo_*) that exist alongside regular databases.
   */
  demoContext: State.SQLite.clientDocument({
    name: "demoContext",
    schema: Schema.Struct({
      /** Currently loaded demo ID, or null if none */
      currentDemo: Schema.NullOr(Schema.String),
      /** Whether a demo is currently being loaded */
      isLoading: Schema.Boolean,
      /** Last error message, or null if no error */
      lastError: Schema.NullOr(Schema.String),
      /** Timestamp when demo was last loaded */
      lastLoadedAt: Schema.NullOr(Schema.Number),
    }),
    default: {
      id: SessionIdSymbol,
      value: {
        currentDemo: null,
        isLoading: false,
        lastError: null,
        lastLoadedAt: null,
      },
    },
  }),

  // -------------------------------------------------------------------------
  // UI State (Client Document - Session-scoped)
  // -------------------------------------------------------------------------

  /**
   * Client-only UI state that doesn't need to sync.
   * NOTE: Connection-related state has been moved to connectionSession.
   */
  uiState: State.SQLite.clientDocument({
    name: "uiState",
    schema: Schema.Struct({
      // Current page
      currentPage: Schema.Literal(
        "home",
        "connect",
        "learn",
        "query",
        "schema",
        "users"
      ),

      // Connection form state (form inputs only, not connection status)
      connectionFormMode: Schema.Literal("url", "credentials"),
      connectionFormUrl: Schema.String,
      connectionFormAddress: Schema.String,
      connectionFormUsername: Schema.String,
      connectionFormPassword: Schema.String,
      isConnecting: Schema.Boolean,

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
      querySidebarLearnCollapsed: Schema.Boolean,
      schemaCollapsed: Schema.Boolean,
      savedQueriesCollapsed: Schema.Boolean,

      // Schema tree view settings
      schemaViewMode: Schema.Literal("flat", "hierarchical"),
      schemaShowSub: Schema.Boolean,
      schemaShowOwns: Schema.Boolean,
      schemaShowPlays: Schema.Boolean,
      schemaShowRelates: Schema.Boolean,
      schemaEntitiesCollapsed: Schema.Boolean,
      schemaRelationsCollapsed: Schema.Boolean,
      schemaAttributesCollapsed: Schema.Boolean,

      // Results tab
      resultsActiveTab: Schema.Literal("log", "table", "graph", "raw"),

      // History bar
      historyBarExpanded: Schema.Boolean,

      // Active dialog
      activeDialog: Schema.NullOr(Schema.String),

      // Learn sidebar state
      learnSectionCollapsed: Schema.Boolean,
      referenceSectionCollapsed: Schema.Boolean,
      learnExpandedFolders: Schema.Array(Schema.String),

      // Learn viewer state
      learnCurrentSectionId: Schema.NullOr(Schema.String),
      learnViewerVisible: Schema.Boolean,

      // Query page docs viewer state
      queryDocsViewerVisible: Schema.Boolean,
      queryDocsCurrentSectionId: Schema.NullOr(Schema.String),

      // Query page schema graph panel state
      querySchemaViewerVisible: Schema.Boolean,
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
        remoteConnectionExpanded: false,
        currentQueryText: "",
        currentQueryId: null,
        hasUnsavedChanges: false,
        editorMode: "code",
        querySidebarWidth: 280,
        querySidebarCollapsed: false,
        querySidebarLearnCollapsed: false,
        schemaCollapsed: false,
        savedQueriesCollapsed: false,
        schemaViewMode: "hierarchical",
        schemaShowSub: true,
        schemaShowOwns: true,
        schemaShowPlays: true,
        schemaShowRelates: true,
        schemaEntitiesCollapsed: false,
        schemaRelationsCollapsed: false,
        schemaAttributesCollapsed: false,
        resultsActiveTab: "log",
        historyBarExpanded: false,
        activeDialog: null,
        learnSectionCollapsed: false,
        referenceSectionCollapsed: true,
        learnExpandedFolders: [],
        learnCurrentSectionId: null,
        learnViewerVisible: true,
        queryDocsViewerVisible: false,
        queryDocsCurrentSectionId: null,
        querySchemaViewerVisible: false,
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

  /**
   * Current query results (ephemeral, session-scoped).
   * Updated after each query execution.
   */
  queryResults: State.SQLite.clientDocument({
    name: "queryResults",
    schema: Schema.Struct({
      /** Whether a query is currently running */
      isRunning: Schema.Boolean,
      /** The query that was executed */
      query: Schema.NullOr(Schema.String),
      /** Transaction type used */
      transactionType: Schema.NullOr(Schema.Literal("read", "write", "schema")),
      /** Execution time in milliseconds */
      executionTimeMs: Schema.NullOr(Schema.Number),
      /** Timestamp when query completed */
      completedAt: Schema.NullOr(Schema.Number),
      /** Error message if query failed */
      errorMessage: Schema.NullOr(Schema.String),
      /** Result type */
      resultType: Schema.NullOr(
        Schema.Literal(
          "match",
          "fetch",
          "insert",
          "delete",
          "define",
          "undefine",
          "redefine",
          "aggregate"
        )
      ),
      /** Number of results (rows/documents/etc) */
      resultCount: Schema.NullOr(Schema.Number),
      /** Raw JSON results for display */
      rawJson: Schema.NullOr(Schema.String),
      /** Log output lines */
      logLines: Schema.Array(Schema.String),
      /** Table data - columns */
      tableColumns: Schema.Array(Schema.String),
      /** Table data - rows (each row is JSON-encoded object) */
      tableRows: Schema.Array(Schema.String),
    }),
    default: {
      id: SessionIdSymbol,
      value: {
        isRunning: false,
        query: null,
        transactionType: null,
        executionTimeMs: null,
        completedAt: null,
        errorMessage: null,
        resultType: null,
        resultCount: null,
        rawJson: null,
        logLines: [],
        tableColumns: [],
        tableRows: [],
      },
    },
  }),

  /**
   * Session-scoped database catalog.
   * Tracks available databases for the current connection session with staleness info.
   * Cleared/marked stale when session disconnects to prevent data leaking between sessions.
   */
  sessionDatabases: State.SQLite.clientDocument({
    name: "sessionDatabases",
    schema: Schema.Struct({
      /** Whether database list is currently loading */
      isLoading: Schema.Boolean,
      /** Whether the cached data is stale (e.g., after disconnect or fetch error) */
      isStale: Schema.Boolean,
      /** Database entries with per-database metadata */
      databases: Schema.Array(
        Schema.Struct({
          name: Schema.String,
          lastSeenAt: Schema.Number,
        })
      ),
      /** Last successful refresh timestamp */
      lastRefreshedAt: Schema.NullOr(Schema.Number),
      /** Connection timestamp when this data was fetched (to detect reconnects) */
      fetchedForConnectionAt: Schema.NullOr(Schema.Number),
      /** Error message if last fetch failed */
      lastError: Schema.NullOr(Schema.String),
      /** Backoff: last refresh attempt timestamp (success or failure) */
      lastRefreshAttemptAt: Schema.NullOr(Schema.Number),
      /** Backoff: consecutive failure count (resets to 0 on success) */
      refreshRetryCount: Schema.Number,
      /** Backoff: earliest time when next refresh is allowed */
      nextAllowedRefreshAt: Schema.NullOr(Schema.Number),
    }),
    default: {
      id: SessionIdSymbol,
      value: {
        isLoading: false,
        isStale: true, // Start as stale until first fetch
        databases: [],
        lastRefreshedAt: null,
        fetchedForConnectionAt: null,
        lastError: null,
        lastRefreshAttemptAt: null,
        refreshRetryCount: 0,
        nextAllowedRefreshAt: null,
      },
    },
  }),
};

// ============================================================================
// Events
// ============================================================================

export const events = {
  // -------------------------------------------------------------------------
  // Profile Events (Interactive Learning)
  // -------------------------------------------------------------------------

  profileCreated: Events.synced({
    name: "v1.ProfileCreated",
    schema: Schema.Struct({
      id: Schema.String,
      displayName: Schema.NullOr(Schema.String),
      createdAt: Schema.Date,
      lastActiveAt: Schema.Date,
    }),
  }),

  profileUpdated: Events.synced({
    name: "v1.ProfileUpdated",
    schema: Schema.Struct({
      id: Schema.String,
      displayName: Schema.optional(Schema.NullOr(Schema.String)),
      lastActiveAt: Schema.optional(Schema.Date),
    }),
  }),

  profileDeleted: Events.synced({
    name: "v1.ProfileDeleted",
    schema: Schema.Struct({ id: Schema.String }),
  }),

  // -------------------------------------------------------------------------
  // Reading Progress Events
  // -------------------------------------------------------------------------

  readingProgressMarked: Events.synced({
    name: "v1.ReadingProgressMarked",
    schema: Schema.Struct({
      profileId: Schema.String,
      sectionId: Schema.String,
      headingId: Schema.NullOr(Schema.String),
      markedRead: Schema.Boolean,
      viewedAt: Schema.Date,
    }),
  }),

  readingProgressCleared: Events.synced({
    name: "v1.ReadingProgressCleared",
    schema: Schema.Struct({
      profileId: Schema.String,
      sectionId: Schema.optional(Schema.String), // If omitted, clears all for profile
    }),
  }),

  // -------------------------------------------------------------------------
  // Example Execution Events
  // -------------------------------------------------------------------------

  exampleExecuted: Events.synced({
    name: "v1.ExampleExecuted",
    schema: Schema.Struct({
      profileId: Schema.String,
      exampleId: Schema.String,
      succeeded: Schema.Boolean,
      source: Schema.Literal("docs-run", "docs-copy", "repl-direct"),
      executedAt: Schema.Date,
      durationMs: Schema.NullOr(Schema.Number),
      errorMessage: Schema.NullOr(Schema.String),
    }),
  }),

  // -------------------------------------------------------------------------
  // Annotation Events
  // -------------------------------------------------------------------------

  annotationCreated: Events.synced({
    name: "v1.AnnotationCreated",
    schema: Schema.Struct({
      id: Schema.String,
      profileId: Schema.String,
      sectionId: Schema.String,
      headingId: Schema.NullOr(Schema.String),
      content: Schema.String,
      createdAt: Schema.Date,
    }),
  }),

  annotationUpdated: Events.synced({
    name: "v1.AnnotationUpdated",
    schema: Schema.Struct({
      id: Schema.String,
      content: Schema.String,
      updatedAt: Schema.Date,
    }),
  }),

  annotationDeleted: Events.synced({
    name: "v1.AnnotationDeleted",
    schema: Schema.Struct({ id: Schema.String }),
  }),

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
  // Connection Session Events (Client-only)
  // -------------------------------------------------------------------------

  connectionSessionSet: tables.connectionSession.set,

  // -------------------------------------------------------------------------
  // Lesson Context Events (Client-only)
  // -------------------------------------------------------------------------

  lessonContextSet: tables.lessonContext.set,

  // -------------------------------------------------------------------------
  // Demo Context Events (Client-only)
  // -------------------------------------------------------------------------

  demoContextSet: tables.demoContext.set,

  // -------------------------------------------------------------------------
  // UI State Events (Client-only)
  // -------------------------------------------------------------------------

  uiStateSet: tables.uiState.set,
  snackbarSet: tables.snackbarNotifications.set,
  schemaTypesSet: tables.schemaTypes.set,
  queryResultsSet: tables.queryResults.set,
  sessionDatabasesSet: tables.sessionDatabases.set,
};

// ============================================================================
// Materializers
// ============================================================================

const materializers = State.SQLite.materializers(events, {
  // Profile materializers
  "v1.ProfileCreated": ({ id, displayName, createdAt, lastActiveAt }) =>
    tables.profiles.insert({ id, displayName, createdAt, lastActiveAt }),

  "v1.ProfileUpdated": ({ id, ...updates }) =>
    tables.profiles.update(updates).where({ id }),

  "v1.ProfileDeleted": ({ id }) => [
    tables.profiles.delete().where({ id }),
    tables.readingProgress.delete().where({ profileId: id }),
    tables.exampleExecutions.delete().where({ profileId: id }),
    tables.annotations.delete().where({ profileId: id }),
  ],

  // Reading progress materializers
  // Using delete + insert pattern since LiveStore doesn't have upsert
  "v1.ReadingProgressMarked": (
    { profileId, sectionId, headingId, markedRead, viewedAt },
    ctx
  ) => {
    const id = `${profileId}:${sectionId}:${headingId ?? "root"}`;
    const existing = ctx.query(
      tables.readingProgress.where({ id }).first({ behaviour: "undefined" })
    );
    return [
      tables.readingProgress.delete().where({ id }),
      tables.readingProgress.insert({
        id,
        profileId,
        sectionId,
        headingId,
        markedRead,
        firstViewedAt: existing?.firstViewedAt ?? viewedAt,
        lastViewedAt: viewedAt,
      }),
    ];
  },

  "v1.ReadingProgressCleared": ({ profileId, sectionId }) => {
    if (sectionId) {
      return tables.readingProgress.delete().where({ profileId, sectionId });
    }
    return tables.readingProgress.delete().where({ profileId });
  },

  // Example execution materializers
  "v1.ExampleExecuted": ({
    profileId,
    exampleId,
    succeeded,
    source,
    executedAt,
    durationMs,
    errorMessage,
  }) => {
    // Generate a unique ID for each execution
    const id = `${profileId}:${exampleId}:${executedAt.getTime()}`;
    return tables.exampleExecutions.insert({
      id,
      profileId,
      exampleId,
      succeeded,
      source,
      executedAt,
      durationMs,
      errorMessage,
    });
  },

  // Annotation materializers
  "v1.AnnotationCreated": ({
    id,
    profileId,
    sectionId,
    headingId,
    content,
    createdAt,
  }) =>
    tables.annotations.insert({
      id,
      profileId,
      sectionId,
      headingId,
      content,
      createdAt,
      updatedAt: createdAt,
    }),

  "v1.AnnotationUpdated": ({ id, content, updatedAt }) =>
    tables.annotations.update({ content, updatedAt }).where({ id }),

  "v1.AnnotationDeleted": ({ id }) => tables.annotations.delete().where({ id }),

  // Connection materializers
  "v1.ConnectionCreated": ({
    id,
    name,
    address,
    username,
    database,
    createdAt,
  }) =>
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

  "v1.ConnectionDeleted": ({ id }) => tables.connections.delete().where({ id }),

  // Local server materializers
  "v1.LocalServerCreated": ({ id, name, createdAt }) =>
    tables.localServers.insert({
      id,
      name,
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
  "v1.QueryCreated": ({
    id,
    folderId,
    name,
    queryText,
    description,
    sortOrder,
    createdAt,
  }) =>
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
  "v1.HistoryEntryAdded": (entry) => tables.queryHistory.insert(entry),

  "v1.HistoryCleared": () => tables.queryHistory.delete().where({}),
});

// ============================================================================
// Schema Export
// ============================================================================

const state = State.SQLite.makeState({
  tables,
  materializers: objMap(materializers, (name, fn) => (...args: any[]) => {
    console.group(`%c${name} (materializing)`, "background: yellow; color: black; padding: 2px 4px; border-radius: 2px", ...args);
    try {
      return (fn as any)(...args) as any;
    } finally {
      console.groupEnd();
    }
  }) as typeof materializers,
});

export const schema = makeSchema({ events, state });

function objMap<T extends Record<string, any>, U>(
  template: T,
  eachKey: <P extends Extract<keyof T, string>>(name: P, value: T[P]) => U
): {
  [P in Extract<keyof T, string>]: U;
} {
  // @ts-ignore
  return Object.fromEntries(
    Object.entries(template)
      .filter(([name]) => typeof name === "string")
      .map(([name, value]) => {
        // @ts-ignore
        return [name, eachKey(name, value)];
      })
  );
}
