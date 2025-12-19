/**
 * LiveStore scope for TypeDB Studio.
 *
 * Creates the root TypeDBStudioAppVM by composing all child VMs.
 * This is the main "business logic" layer that connects LiveStore state to VM interfaces.
 */

import { computed, nanoid, signal } from "@livestore/livestore";
import type { Queryable, Store } from "@livestore/livestore";
import {
  Home,
  Plug,
  Code,
  GitBranch,
  Users,
  Box,
  Diamond,
  Tag,
  BookOpen,
  type LucideIcon,
} from "lucide-react";

import { events, tables, type schema } from "../livestore/schema";
import {
  connectionSession$,
  uiState$,
  snackbarNotifications$,
  allConnections$,
  localServers$,
  schemaTypes$,
  queryResults$,
  sessionDatabases$,
  queryHistory$,
  lessonContext$,
} from "../livestore/queries";
import {
  getService,
  quickConnectWasm,
  disconnect as disconnectService,
  detectQueryType,
  getConnectionStatus,
  onStatusChange as subscribeToStatusChange,
  onModeChange as subscribeToModeChange,
  type QueryResponse,
  type ServiceMode,
} from "../services";
import { TypeDBEmbeddedService } from "../services/typedb-embedded-service";
import { DEMOS, getDemoById } from "../demos";
import { parseSchema } from "../services/schema-parser";
import { generateFetchQuery } from "../services/query-generator";

import type { TypeDBStudioAppVM, CurrentPageState } from "./app.vm";
import type { TopBarVM } from "./top-bar/top-bar.vm";
import type { NavigationVM, NavigationItemVM } from "./top-bar/navigation.vm";
import type {
  DatabaseSelectorVM,
  DatabaseOptionVM,
} from "./top-bar/database-selector.vm";
import type { ConnectionStatusVM } from "./top-bar/connection-status.vm";
import type { SnackbarVM } from "./snackbar.vm";
import type {
  DialogsVM,
  ActiveDialogVM,
  CreateDatabaseDialogVM,
} from "./dialogs/dialogs.vm";
import type {
  HomePageVM,
  HomeNavigationCardVM,
} from "./pages/home/home-page.vm";
import type {
  ConnectPageVM,
  DemosSectionVM,
  DemoItemVM,
  DemoExampleQueryVM,
  LocalServersSectionVM,
  LocalServerItemVM,
  RemoteConnectionSectionVM,
  ConnectionFormVM,
  SavedConnectionsListVM,
  SavedConnectionItemVM,
} from "./pages/connect/connect-page.vm";
import type { QueryPageVM } from "./pages/query/query-page.vm";
import type {
  QuerySidebarVM,
  QuerySidebarSchemaSectionVM,
  QuerySidebarSavedQueriesSectionVM,
  QuerySidebarLearnSectionVM,
} from "./pages/query/sidebar/query-sidebar.vm";
import type {
  QueryEditorVM,
  QueryEditorHeaderVM,
  QueryCodeEditorVM,
  AutocompleteVM,
  QueryChatAssistantVM,
  QueryEditorActionsVM,
} from "./pages/query/editor/query-editor.vm";
import type {
  QueryResultsVM,
  LogOutputVM,
  TableOutputVM,
  GraphOutputVM,
  RawOutputVM,
} from "./pages/query/results/query-results.vm";
import type { QueryHistoryBarVM } from "./pages/query/history/query-history-bar.vm";
import type { UsersPageVM } from "./pages/users/users-page.vm";
import type { DisabledState, FormInputVM, IconComponent } from "./types";
import type {
  SchemaTreeVM,
  SchemaTreeGroupVM,
  SchemaTreeItemVM,
  SchemaTreeChildItemVM,
  SchemaTreeStatus,
} from "./shared/schema-tree.vm";
import type {
  SavedQueriesTreeVM,
  SavedQueryTreeItemVM,
} from "./pages/query/sidebar/saved-queries.vm";
import type {
  AutocompleteSuggestionVM,
  ChatMessageVM,
} from "./pages/query/editor/query-editor.vm";
import type {
  TableStatus,
  TableColumnVM,
  TableRowVM,
  GraphStatus,
  GraphNodeVM,
} from "./pages/query/results/query-results.vm";
import type { HistoryEntryVM } from "./pages/query/history/query-history-bar.vm";
import type { QuerySidebarUrlImportsSectionVM } from "./pages/query/sidebar/query-sidebar.vm";
import type {
  SchemaGraphPanelVM,
  SchemaGraphStatus,
  SchemaGraphNodeVM,
} from "./shared/schema-graph-panel.vm";
import type {
  UsersPageStatus,
  UsersPagePlaceholder,
  UserRowVM,
} from "./pages/users/users-page.vm";
import type { LearnPageVM } from "./pages/learn/learn-page.vm";
import { createLearnSidebarScope } from "./learn/sidebar-scope";
import { createDocumentViewerScope } from "./learn/document-viewer-scope";
import { createNavigationScope } from "./learn/navigation-scope";
import { createReplBridge } from "../learn/repl-bridge";
import {
  sections as curriculumSections,
  contexts as curriculumContexts,
  loadedContexts as curriculumLoadedContexts,
} from "../curriculum/content";
import type {
  ParsedSection,
  CurriculumMeta,
  SectionMeta,
} from "../curriculum/types";
import {
  createContextManager,
  createContextDatabaseAdapter,
  LESSON_DB_PREFIX,
  type ContextManager,
} from "../curriculum";
import { constant } from "./learn/constant";

// ============================================================================
// Service Interfaces
// ============================================================================

/**
 * Service for showing snackbar/toast notifications.
 * Extracted from VM layer to allow sharing across scopes.
 */
export interface SnackbarService {
  /** Show a notification. Error notifications are always persistent. */
  show(
    type: "success" | "warning" | "error",
    message: string,
    persistent?: boolean
  ): void;
  /** Dismiss a notification by ID. */
  dismiss(id: string): void;
}

/**
 * Service for managing TypeDB connections.
 * Handles connect/disconnect and status updates.
 */
export interface ConnectionService {
  /** Connect to TypeDB via WASM (embedded). */
  connectWasm(databaseName?: string): Promise<void>;
  /** Connect to TypeDB via HTTP (remote server). */
  connectHttp(
    address: string,
    username: string,
    password: string
  ): Promise<void>;
  /** Disconnect from current connection. */
  disconnect(): Promise<void>;
  /** Get current connection status. */
  getStatus(): "disconnected" | "connecting" | "connected" | "reconnecting";
}

/**
 * Service for database operations.
 * Handles listing, selecting, and refreshing databases.
 */
export interface DatabaseService {
  /** Refresh the list of available databases. */
  refreshList(): Promise<void>;
  /** Select a database as active. */
  select(databaseName: string): void;
  /** Refresh schema for the active database. */
  refreshSchema(databaseName: string): Promise<void>;
}

/**
 * Service for loading demo content.
 */
export interface DemoService {
  /** Load a demo's schema and sample data. */
  loadDemo(demoId: string, databaseName: string): Promise<void>;
}

/**
 * Service for executing queries.
 */
export interface QueryExecutionService {
  /** Execute a query and return results. */
  execute(queryText: string): Promise<{
    success: boolean;
    resultCount?: number;
    error?: string;
    executionTimeMs: number;
  }>;
  /** Check if ready to execute queries. */
  isReady(): boolean;
}

/**
 * All services returned by createStudioScope.
 */
export interface StudioServices {
  snackbar: SnackbarService;
  connection: ConnectionService;
  database: DatabaseService;
  demo: DemoService;
  queryExecution: QueryExecutionService;
}

// ============================================================================
// Helpers
// ============================================================================

const createID = (prefix: string) => `${prefix}_${nanoid(12)}`;

// ============================================================================
// Query Execution Types and Helpers
// ============================================================================

/**
 * Result type for query execution with results panel update.
 */
type QueryExecutionResult = {
  success: boolean;
  resultCount?: number;
  error?: string;
  executionTimeMs: number;
  /** Result rows formatted as JSON strings (for display in examples) */
  resultRows?: string[];
  /** Log lines for human-readable output */
  logLines?: string[];
};

/**
 * Process query response into display-friendly formats.
 * Module-level helper for reuse across scopes.
 */
function processQueryResults(
  response: QueryResponse
): {
  logLines: string[];
  tableColumns: string[];
  tableRows: string[];
  resultCount: number;
} {
  const logLines: string[] = [];
  const tableColumns: string[] = [];
  const tableRows: string[] = [];
  let resultCount = 0;

  logLines.push(`Query: ${response.query}`);
  logLines.push(`Transaction: ${response.transactionType}`);
  logLines.push(`Time: ${response.executionTimeMs}ms`);
  logLines.push("");

  switch (response.data.type) {
    case "match": {
      const answers = response.data.answers;
      resultCount = answers.length;
      logLines.push(
        `Results: ${resultCount} row${resultCount !== 1 ? "s" : ""}`
      );
      logLines.push("");

      // Extract columns from first result
      if (answers.length > 0) {
        const firstRow = answers[0];
        tableColumns.push(...Object.keys(firstRow));
      }

      // Format each row
      for (const answer of answers) {
        const row: Record<string, unknown> = {};
        for (const [key, concept] of Object.entries(answer)) {
          if (concept.value !== undefined) {
            row[key] = concept.value;
          } else if (concept.iid) {
            row[key] = `${concept.type}:${concept.iid.slice(0, 8)}`;
          } else {
            row[key] = concept.type;
          }
        }
        tableRows.push(JSON.stringify(row));
        logLines.push(JSON.stringify(row));
      }
      break;
    }

    case "fetch": {
      const documents = response.data.documents;
      resultCount = documents.length;
      logLines.push(
        `Results: ${resultCount} document${resultCount !== 1 ? "s" : ""}`
      );
      logLines.push("");

      // Extract columns from first document
      if (documents.length > 0) {
        tableColumns.push(...Object.keys(documents[0]));
      }

      // Format each document
      for (const doc of documents) {
        tableRows.push(JSON.stringify(doc));
        logLines.push(JSON.stringify(doc, null, 2));
      }
      break;
    }

    case "insert": {
      const inserted = response.data.inserted;
      resultCount = inserted.length;
      logLines.push(
        `Inserted: ${resultCount} concept${resultCount !== 1 ? "s" : ""}`
      );
      break;
    }

    case "delete": {
      resultCount = response.data.deletedCount;
      logLines.push(
        `Deleted: ${resultCount} concept${resultCount !== 1 ? "s" : ""}`
      );
      break;
    }

    case "define":
    case "undefine":
    case "redefine": {
      resultCount = response.data.success ? 1 : 0;
      logLines.push(
        response.data.success
          ? "Schema updated successfully"
          : "Schema update failed"
      );
      break;
    }

    case "aggregate": {
      resultCount = 1;
      logLines.push(`Result: ${response.data.value}`);
      tableColumns.push("value");
      tableRows.push(JSON.stringify({ value: response.data.value }));
      break;
    }
  }

  return { logLines, tableColumns, tableRows, resultCount };
}

/**
 * Arguments for query execution.
 */
interface ExecuteQueryArgs {
  /** The TypeQL query to execute */
  query: string;
  /** Optional database to run against (overrides active database) */
  database?: string | null;
}

/**
 * Factory to create a shared query execution function that:
 * 1. Executes queries against TypeDB
 * 2. Updates the results panel (queryResults state)
 * 3. Records query history
 * 4. Shows snackbar notifications
 *
 * This is used by both Learn page and Query page to ensure consistent behavior.
 */
function createExecuteQueryAndUpdateResults(
  store: Store<typeof schema>,
  showSnackbar: (type: "success" | "warning" | "error", message: string) => void,
  refreshSchemaForDatabase: (database: string) => Promise<void>
): (args: ExecuteQueryArgs) => Promise<QueryExecutionResult> {
  return async function executeQueryAndUpdateResults(
    args: ExecuteQueryArgs
  ): Promise<QueryExecutionResult> {
    const { query: queryText, database: overrideDatabase } = args;
    const session = store.query(connectionSession$);
    // Use override database if provided, otherwise fall back to active database
    const database = overrideDatabase ?? session.activeDatabase;

    if (!database) {
      showSnackbar("error", "No database selected");
      return { success: false, error: "No database selected", executionTimeMs: 0 };
    }

    // Set running state
    store.commit(
      events.queryResultsSet({
        isRunning: true,
        query: queryText,
        errorMessage: null,
      })
    );

    const startTime = Date.now();

    try {
      const service = getService();
      const detection = detectQueryType(queryText);
      const response = await service.executeQuery(database, queryText, {
        transactionType: detection.transactionType,
      });

      // Process results and update state
      const { logLines, tableColumns, tableRows, resultCount } =
        processQueryResults(response);

      store.commit(
        events.queryResultsSet({
          isRunning: false,
          query: queryText,
          transactionType: response.transactionType,
          executionTimeMs: response.executionTimeMs,
          completedAt: Date.now(),
          errorMessage: null,
          resultType: response.data.type,
          resultCount,
          rawJson: JSON.stringify(response.data, null, 2),
          logLines,
          tableColumns,
          tableRows,
        })
      );

      // Add to history
      store.commit(
        events.historyEntryAdded({
          id: createID("hist"),
          connectionId: session.savedConnectionId,
          databaseName: database,
          queryText,
          executedAt: new Date(),
          status: "success",
          durationMs: response.executionTimeMs,
          rowCount: resultCount,
          errorMessage: null,
        })
      );

      // Refresh schema after schema changes
      if (
        (response.data.type === "define" ||
          response.data.type === "undefine" ||
          response.data.type === "redefine") &&
        response.data.success
      ) {
        refreshSchemaForDatabase(database);
      }

      // Show success notification
      const typeLabel =
        response.data.type === "define"
          ? "Schema updated"
          : response.data.type === "insert"
          ? "Data inserted"
          : response.data.type === "delete"
          ? "Data deleted"
          : `${resultCount} result${resultCount !== 1 ? "s" : ""}`;
      showSnackbar("success", `${typeLabel} (${response.executionTimeMs}ms)`);

      return {
        success: true,
        resultCount,
        executionTimeMs: response.executionTimeMs,
        resultRows: tableRows,
        logLines,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : (error as { message?: string })?.message || String(error);

      store.commit(
        events.queryResultsSet({
          isRunning: false,
          query: queryText,
          transactionType: null,
          executionTimeMs: Date.now() - startTime,
          completedAt: Date.now(),
          errorMessage,
          resultType: null,
          resultCount: null,
          rawJson: null,
          logLines: [`Error: ${errorMessage}`],
          tableColumns: [],
          tableRows: [],
        })
      );

      // Add failed entry to history
      store.commit(
        events.historyEntryAdded({
          id: createID("hist"),
          connectionId: session.savedConnectionId,
          databaseName: database,
          queryText,
          executedAt: new Date(),
          status: "error",
          durationMs: Date.now() - startTime,
          rowCount: null,
          errorMessage,
        })
      );

      showSnackbar("error", `Query failed: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
        executionTimeMs: Date.now() - startTime,
        resultRows: [],
        logLines: [`Error: ${errorMessage}`],
      };
    }
  };
}

// ============================================================================
// Result type for createStudioScope
// ============================================================================

export interface StudioScopeResult {
  vm: TypeDBStudioAppVM;
  services: StudioServices;
  teardown: () => void;
}

// ============================================================================
// Disconnect Handler Helper
// ============================================================================

/**
 * Handles service disconnection by clearing session state and marking catalogs stale.
 * Consolidates all disconnect-related state updates into a single place.
 * Enforces invariant: status !== "connected" => activeDatabase === null
 */
function handleServiceDisconnected(store: Store<typeof schema>): void {
  const now = Date.now();
  console.log(
    "[scope] Handling service disconnection - clearing session state"
  );

  store.commit(
    events.connectionSessionSet({
      status: "disconnected",
      activeDatabase: null,
      lastStatusChange: now,
      lastDisconnectedAt: now,
    })
  );

  store.commit(
    events.sessionDatabasesSet({
      isStale: true,
      lastError: null,
      // Clear the databases array to prevent showing stale entries after reconnect
      databases: [],
      // Reset refresh state so next refresh attempt starts fresh
      refreshRetryCount: 0,
      nextAllowedRefreshAt: null,
    })
  );

  store.commit(
    events.schemaTypesSet({
      entities: [],
      relations: [],
      attributes: [],
    })
  );

  // Clear lesson context since the database no longer exists after disconnect.
  // TypeDB WASM runs in-memory, so lesson databases are lost on disconnect/refresh.
  // Without this, LiveStore could retain stale lessonContext claiming a context
  // is loaded when the underlying database doesn't exist, causing "database not found"
  // errors when running ExampleBlocks.
  store.commit(
    events.lessonContextSet({
      currentContext: null,
      isLoading: false,
      lastError: null,
      lastLoadedAt: null,
    })
  );
}

/**
 * Schedules an async auto-reconnect attempt using the persisted session hint.
 * Called when LiveStore has a "connected" state but the WASM service is fresh.
 */
function scheduleAutoReconnect(
  store: Store<typeof schema>,
  serverInfo: { id: string; name: string; isDemo: boolean; demoId: string | null },
  activeDatabase: string | null,
  lessonContext: string | null
): void {
  // Use setTimeout(0) to schedule after the current sync completes
  setTimeout(async () => {
    const now = Date.now();

    console.log(
      `[scope] Auto-reconnect: Starting reconnection attempt`,
      `\n  Server: ${serverInfo.name} (${serverInfo.id})`,
      `\n  isDemo: ${serverInfo.isDemo}, demoId: ${serverInfo.demoId}`,
      `\n  activeDatabase: ${activeDatabase}`,
      `\n  lessonContext: ${lessonContext}`
    );

    // Show "reconnecting" status
    store.commit(
      events.connectionSessionSet({
        status: "reconnecting",
        mode: "wasm",
        lastStatusChange: now,
      })
    );

    try {
      // Determine what database to create/connect to
      const databaseToConnect = serverInfo.isDemo && serverInfo.demoId
        ? serverInfo.demoId
        : (activeDatabase || "playground");

      console.log(`[scope] Auto-reconnect: Connecting to database '${databaseToConnect}'`);

      // Connect via WASM
      await quickConnectWasm(databaseToConnect);

      // If this was a demo, reload the demo data
      if (serverInfo.isDemo && serverInfo.demoId) {
        const demo = getDemoById(serverInfo.demoId);
        if (demo) {
          console.log(`[scope] Auto-reconnect: Reloading demo data for '${demo.name}'`);

          // Parse and load schema
          const parsedSchema = parseSchema(demo.schema);
          store.commit(
            events.schemaTypesSet({
              entities: parsedSchema.entities.map((e) => ({
                label: e.label,
                isAbstract: e.isAbstract,
                supertype: e.supertype,
                ownedAttributes: e.ownedAttributes,
                playedRoles: e.playedRoles,
              })),
              relations: parsedSchema.relations.map((r) => ({
                label: r.label,
                isAbstract: r.isAbstract,
                supertype: r.supertype,
                ownedAttributes: r.ownedAttributes,
                relatedRoles: r.relatedRoles,
              })),
              attributes: parsedSchema.attributes.map((a) => ({
                label: a.label,
                valueType: a.valueType,
              })),
            })
          );

          // Load schema definition
          const service = getService();
          const cleanSchema = demo.schema
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0 && !line.startsWith("#"))
            .join("\n");

          try {
            await service.executeQuery(databaseToConnect, cleanSchema, {
              transactionType: "schema",
            });
          } catch (e) {
            console.warn(`[scope] Auto-reconnect: Schema loading warning:`, e);
          }

          // Load sample data
          const dataStatements = demo.sampleData
            .split(/;\s*\n/)
            .map((s) => s.trim())
            .filter((s) => s.length > 0 && !s.startsWith("#"));

          for (const statement of dataStatements) {
            if (statement.trim()) {
              try {
                await service.executeQuery(databaseToConnect, statement + ";", {
                  transactionType: "write",
                });
              } catch (e) {
                console.warn(`[scope] Auto-reconnect: Data statement warning:`, e);
              }
            }
          }

          console.log(`[scope] Auto-reconnect: Demo '${demo.name}' reloaded successfully`);
        }
      }

      // Restore the session state
      store.commit(
        events.connectionSessionSet({
          status: "connected",
          mode: "wasm",
          savedLocalServerId: serverInfo.id,
          activeDatabase: databaseToConnect,
          connectedAt: now,
          lastStatusChange: Date.now(),
        }),
        events.localServerUpdated({
          id: serverInfo.id,
          lastUsedAt: new Date(),
        })
      );

      // If there was a lesson context, try to restore it
      if (lessonContext) {
        console.log(`[scope] Auto-reconnect: Will restore lesson context '${lessonContext}' (requires Learn page logic)`);
        // Note: Full lesson context restoration would require calling the Learn page's
        // context loading logic. For now, we just note that it should be restored.
        // The Learn page will handle this when it mounts.
      }

      console.log(`[scope] Auto-reconnect: SUCCESS - Reconnected to ${serverInfo.name}`);

      // Show success snackbar (using same pattern as showSnackbar in createStudioScope)
      const successSnackId = `snack_${nanoid(12)}`;
      const successNotifications = store.query(snackbarNotifications$).notifications;
      store.commit(
        events.snackbarSet({
          notifications: [
            ...successNotifications,
            {
              id: successSnackId,
              type: "success" as const,
              message: `Restored session: ${serverInfo.name}`,
              persistent: false,
              createdAt: Date.now(),
            },
          ],
        })
      );

      // Auto-dismiss after 4 seconds (same pattern as dismissSnackbar)
      setTimeout(() => {
        const currentNotifications = store.query(snackbarNotifications$).notifications;
        store.commit(
          events.snackbarSet({
            notifications: currentNotifications.filter((n) => n.id !== successSnackId),
          })
        );
      }, 4000);

    } catch (error) {
      console.error(`[scope] Auto-reconnect: FAILED -`, error);

      // Reset to disconnected state
      store.commit(
        events.connectionSessionSet({
          status: "disconnected",
          lastStatusChange: Date.now(),
        })
      );

      // Show warning snackbar
      const warningSnackId = `snack_${nanoid(12)}`;
      const warningNotifications = store.query(snackbarNotifications$).notifications;
      store.commit(
        events.snackbarSet({
          notifications: [
            ...warningNotifications,
            {
              id: warningSnackId,
              type: "warning" as const,
              message: `Could not restore previous session. Please reconnect.`,
              persistent: false,
              createdAt: Date.now(),
            },
          ],
        })
      );

      // Auto-dismiss warning after 4 seconds
      setTimeout(() => {
        const currentNotifications = store.query(snackbarNotifications$).notifications;
        store.commit(
          events.snackbarSet({
            notifications: currentNotifications.filter((n) => n.id !== warningSnackId),
          })
        );
      }, 4000);
    }
  }, 0);
}

// ============================================================================
// Main Scope
// ============================================================================

export function createStudioScope(
  store: Store<typeof schema>,
  navigate: (path: string) => void
): StudioScopeResult {
  // ---------------------------------------------------------------------------
  // Derived UI State Queries
  // ---------------------------------------------------------------------------

  const currentPage$ = computed((get) => get(uiState$).currentPage, {
    label: "currentPage",
  });

  // Connection session derived queries (from connectionSession$, not uiState$)
  const connectionStatus$ = computed((get) => get(connectionSession$).status, {
    label: "connectionStatus",
  });

  const activeDatabase$ = computed(
    (get) => get(connectionSession$).activeDatabase,
    { label: "activeDatabase" }
  );

  const isConnected$ = computed(
    (get) => get(connectionStatus$) === "connected",
    { label: "isConnected" }
  );

  // ---------------------------------------------------------------------------
  // Service Provider Event Subscriptions
  // ---------------------------------------------------------------------------
  // Subscribe to service provider events to keep connectionSession in sync
  // with the actual service state. This makes the service the source of truth.

  // Subscribe and keep unsubscribe handles for potential future cleanup
  // (prefixed with _ since they're not used in this app's lifecycle)
  const _unsubscribeStatusChange = subscribeToStatusChange((status) => {
    const currentSession = store.query(connectionSession$);
    // Only update if status actually changed to avoid unnecessary commits
    if (currentSession.status !== status) {
      console.log(
        `[scope] Service status changed: ${currentSession.status} -> ${status}`
      );

      if (status === "disconnected") {
        handleServiceDisconnected(store);
      } else {
        const now = Date.now();
        store.commit(
          events.connectionSessionSet({
            status,
            lastStatusChange: now,
            ...(status === "connected" && !currentSession.connectedAt
              ? { connectedAt: now }
              : {}),
          })
        );
      }
    }
  });

  // ---------------------------------------------------------------------------
  // Initial Service Status Sync + Auto-Reconnect
  // ---------------------------------------------------------------------------
  // On page load, LiveStore may restore "connected" state from persistence.
  // But the TypeDB WASM service starts fresh (in-memory, no databases).
  //
  // Strategy:
  // 1. Capture the persisted session as a "resume hint" before clearing
  // 2. Sync LiveStore to actual service status (disconnected)
  // 3. Attempt to auto-reconnect using the resume hint
  // 4. On success, restore the session; on failure, show connect page
  {
    const actualStatus = getConnectionStatus();
    const storedSession = store.query(connectionSession$);
    const storedLessonContext = store.query(lessonContext$);
    console.log(
      `[scope] Initial state check:`,
      `\n  Service status: ${actualStatus}`,
      `\n  LiveStore connectionSession.status: ${storedSession.status}`,
      `\n  LiveStore lessonContext.currentContext: ${storedLessonContext.currentContext}`,
      `\n  LiveStore connectionSession.activeDatabase: ${storedSession.activeDatabase}`,
      `\n  LiveStore connectionSession.savedLocalServerId: ${storedSession.savedLocalServerId}`
    );

    if (storedSession.status !== actualStatus) {
      // Capture resume hint BEFORE clearing state
      const resumeHint = {
        savedLocalServerId: storedSession.savedLocalServerId,
        activeDatabase: storedSession.activeDatabase,
        mode: storedSession.mode,
        lessonContext: storedLessonContext.currentContext,
      };

      console.log(
        `[scope] Initial status sync: LiveStore says '${storedSession.status}' but service is '${actualStatus}'`,
        `\n  Resume hint captured:`,
        `\n    savedLocalServerId: ${resumeHint.savedLocalServerId}`,
        `\n    activeDatabase: ${resumeHint.activeDatabase}`,
        `\n    mode: ${resumeHint.mode}`,
        `\n    lessonContext: ${resumeHint.lessonContext}`
      );

      if (actualStatus === "disconnected") {
        handleServiceDisconnected(store);

        // Check if we have a resume hint for auto-reconnect
        if (resumeHint.savedLocalServerId && resumeHint.mode === "wasm") {
          // Look up the server info to determine if it's a demo
          const serverInfo = store.query(
            tables.localServers.where({ id: resumeHint.savedLocalServerId }).first({ behaviour: "undefined" })
          );

          console.log(
            `[scope] Auto-reconnect: Found server info:`,
            serverInfo
              ? `\n    name: ${serverInfo.name}, isDemo: ${serverInfo.isDemo}, demoId: ${serverInfo.demoId}`
              : `\n    (server not found in localServers table)`
          );

          if (serverInfo) {
            // Schedule auto-reconnect (async, after sync completes)
            scheduleAutoReconnect(
              store,
              serverInfo,
              resumeHint.activeDatabase,
              resumeHint.lessonContext
            );
          }
        }
      } else {
        store.commit(
          events.connectionSessionSet({
            status: actualStatus,
            lastStatusChange: Date.now(),
          })
        );
      }

      // Log the state after sync
      const afterSync = store.query(connectionSession$);
      const afterSyncContext = store.query(lessonContext$);
      console.log(
        `[scope] After sync:`,
        `\n  connectionSession.status: ${afterSync.status}`,
        `\n  lessonContext.currentContext: ${afterSyncContext.currentContext}`
      );
    } else {
      console.log(`[scope] Initial status already in sync (${actualStatus})`);
    }
  }

  const _unsubscribeModeChange = subscribeToModeChange((mode: ServiceMode) => {
    const currentSession = store.query(connectionSession$);
    // Only update if mode actually changed
    if (currentSession.mode !== mode) {
      console.log(
        `[scope] Service mode changed: ${currentSession.mode} -> ${mode}`
      );
      store.commit(
        events.connectionSessionSet({
          mode,
          // When mode changes, we're typically starting a new connection
          address: mode === "wasm" ? "wasm://local" : currentSession.address,
          username: mode === "wasm" ? "browser" : currentSession.username,
        })
      );
    }
  });

  // ---------------------------------------------------------------------------
  // Snackbar
  // ---------------------------------------------------------------------------

  const showSnackbar = (
    type: "success" | "warning" | "error",
    message: string,
    persistent = false
  ) => {
    console.log(`[scope] Showing snackbar: [${type}] ${message}`);
    const notifications = store.query(snackbarNotifications$).notifications;
    const newNotification = {
      id: createID("snack"),
      type,
      message,
      persistent: type === "error" ? true : persistent,
      createdAt: Date.now(),
    };
    store.commit(
      events.snackbarSet({
        notifications: [...notifications, newNotification],
      })
    );

    // Auto-dismiss non-persistent notifications
    if (!newNotification.persistent) {
      setTimeout(() => {
        dismissSnackbar(newNotification.id);
      }, 4000);
    }
  };

  const dismissSnackbar = (id: string) => {
    const notifications = store.query(snackbarNotifications$).notifications;
    store.commit(
      events.snackbarSet({
        notifications: notifications.filter((n) => n.id !== id),
      })
    );
  };

  const snackbar: SnackbarVM = {
    current$: computed(
      (get) => {
        const { notifications } = get(snackbarNotifications$);
        if (notifications.length === 0) return null;
        const current = notifications[0];
        return {
          key: current.id,
          message: current.message,
          variant: current.type,
          persistent: current.persistent,
          dismiss: () => dismissSnackbar(current.id),
        };
      },
      { label: "snackbar.current" }
    ),
  };

  // Snackbar Service (for use by other scopes)
  const snackbarService: SnackbarService = {
    show: showSnackbar,
    dismiss: dismissSnackbar,
  };

  // ---------------------------------------------------------------------------
  // Connection Status
  // ---------------------------------------------------------------------------

  const connectionStatusVM: ConnectionStatusVM = {
    state$: connectionStatus$,

    displayText$: computed(
      (get) => {
        const session = get(connectionSession$);
        switch (session.status) {
          case "disconnected":
            return "Not connected";
          case "connecting":
            return "Connecting...";
          case "connected": {
            const user = session.username || "admin";
            const addr =
              session.address ||
              (session.mode === "wasm" ? "wasm://local" : "localhost");
            return `${user}@${addr}`;
          }
          case "reconnecting":
            return "Reconnecting...";
        }
      },
      { label: "connectionStatus.displayText" }
    ),

    beaconVariant$: computed(
      (get) => {
        const status = get(connectionStatus$);
        switch (status) {
          case "disconnected":
            return "error";
          case "connected":
            return "ok";
          default:
            return "warn";
        }
      },
      { label: "connectionStatus.beaconVariant" }
    ),

    beaconTooltip$: computed(
      (get) => {
        const status = get(connectionStatus$);
        return status.charAt(0).toUpperCase() + status.slice(1);
      },
      { label: "connectionStatus.beaconTooltip" }
    ),

    isClickable$: computed(
      (get) =>
        get(connectionStatus$) === "connected" ||
        get(connectionStatus$) === "disconnected",
      { label: "connectionStatus.isClickable" }
    ),

    click: () => {
      const status = store.query(connectionStatus$);
      if (status === "disconnected") {
        navigate("/connect");
      } else if (status === "connected") {
        connectionStatusVM.signOut();
      }
    },

    signOut: async () => {
      try {
        await disconnectService();
      } catch (e) {
        console.warn("[scope] Error disconnecting:", e);
      }
      store.commit(
        events.connectionSessionSet({
          status: "disconnected",
          activeDatabase: null,
          lastStatusChange: Date.now(),
          lastDisconnectedAt: Date.now(),
        })
      );
      showSnackbar("success", "Signed out");
      navigate("/connect");
    },
  };

  // Connection Service (for use by other scopes)
  const connectionService: ConnectionService = {
    async connectWasm(databaseName?: string) {
      store.commit(
        events.connectionSessionSet({
          status: "connecting",
          mode: "wasm",
          address: "wasm://local",
          username: "browser",
          lastStatusChange: Date.now(),
        })
      );
      try {
        await quickConnectWasm(databaseName);
        store.commit(
          events.connectionSessionSet({
            status: "connected",
            activeDatabase: databaseName ?? null,
            connectedAt: Date.now(),
            lastStatusChange: Date.now(),
          })
        );
      } catch (error) {
        store.commit(
          events.connectionSessionSet({
            status: "disconnected",
            lastStatusChange: Date.now(),
          })
        );
        throw error;
      }
    },
    async connectHttp(address: string, username: string, password: string) {
      store.commit(
        events.connectionSessionSet({
          status: "connecting",
          mode: "http",
          address,
          username,
          lastStatusChange: Date.now(),
        })
      );
      try {
        const service = getService();
        await service.connect({ address, username, password });
        store.commit(
          events.connectionSessionSet({
            status: "connected",
            connectedAt: Date.now(),
            lastStatusChange: Date.now(),
          })
        );
      } catch (error) {
        store.commit(
          events.connectionSessionSet({
            status: "disconnected",
            lastStatusChange: Date.now(),
          })
        );
        throw error;
      }
    },
    async disconnect() {
      try {
        await disconnectService();
      } catch (e) {
        console.warn("[scope] Error disconnecting:", e);
      }
      handleServiceDisconnected(store);
    },
    getStatus() {
      return store.query(connectionStatus$);
    },
  };

  // ---------------------------------------------------------------------------
  // Database Selector
  // ---------------------------------------------------------------------------

  /** Maximum backoff delay in milliseconds (30 seconds) */
  const MAX_BACKOFF_MS = 30_000;

  /**
   * Calculates exponential backoff delay: 1000 * 2^retryCount, capped at MAX_BACKOFF_MS
   */
  const calculateBackoffMs = (retryCount: number): number => {
    return Math.min(1000 * Math.pow(2, retryCount), MAX_BACKOFF_MS);
  };

  /**
   * Refreshes the list of available databases from the service.
   * Updates the session-scoped database catalog with staleness tracking.
   * @param bypassBackoff - If true, ignores backoff timing (for manual retry)
   */
  const refreshDatabaseList = async (bypassBackoff = false): Promise<void> => {
    const session = store.query(connectionSession$);

    // Don't refresh if not connected
    if (session.status !== "connected") {
      console.log("[scope] Skipping database refresh - not connected");
      return;
    }

    const catalog = store.query(sessionDatabases$);
    const now = Date.now();

    // Check backoff unless bypassed (manual retry)
    if (
      !bypassBackoff &&
      catalog.nextAllowedRefreshAt &&
      now < catalog.nextAllowedRefreshAt
    ) {
      const waitSeconds = Math.ceil(
        (catalog.nextAllowedRefreshAt - now) / 1000
      );
      console.log(
        `[scope] Skipping database refresh - backoff active, retry in ${waitSeconds}s`
      );
      return;
    }

    store.commit(
      events.sessionDatabasesSet({
        isLoading: true,
        lastError: null,
        lastRefreshAttemptAt: now,
      })
    );

    try {
      const service = getService();
      const databases = await service.getDatabases();
      const successTime = Date.now();

      store.commit(
        events.sessionDatabasesSet({
          isLoading: false,
          isStale: false,
          databases: databases.map((db) => ({
            name: db.name,
            lastSeenAt: successTime,
          })),
          lastRefreshedAt: successTime,
          fetchedForConnectionAt: session.connectedAt,
          lastError: null,
          refreshRetryCount: 0,
          nextAllowedRefreshAt: null,
        })
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("[scope] Failed to refresh databases:", error);

      const newRetryCount = catalog.refreshRetryCount + 1;
      const backoffMs = calculateBackoffMs(newRetryCount);
      const nextAllowed = Date.now() + backoffMs;

      store.commit(
        events.sessionDatabasesSet({
          isLoading: false,
          isStale: true,
          lastError: errorMessage,
          refreshRetryCount: newRetryCount,
          nextAllowedRefreshAt: nextAllowed,
        })
      );
      showSnackbar("error", `Failed to refresh databases: ${errorMessage}`);
    }
  };

  /**
   * Refreshes schema for a specific database.
   * Called when a database is selected.
   */
  const refreshSchemaForDatabase = async (
    databaseName: string
  ): Promise<void> => {
    try {
      const service = getService();

      // For WASM/embedded mode, use the schema introspection API
      if (service instanceof TypeDBEmbeddedService) {
        const schema = await service.getMetaGraphSchema(databaseName);
        store.commit(
          events.schemaTypesSet({
            entities: schema.entities.map((e: { typeName: string; attributes: string[] }) => ({
              label: e.typeName,
              isAbstract: false,
              supertype: null,
              ownedAttributes: e.attributes,
              playedRoles: [],
            })),
            relations: schema.relations.map((r: { typeName: string; roles: { roleName: string }[] }) => ({
              label: r.typeName,
              isAbstract: false,
              supertype: null,
              ownedAttributes: [],
              relatedRoles: r.roles.map((role: { roleName: string }) => role.roleName),
            })),
            attributes: schema.attributes.map((a: { typeName: string; kind: string }) => ({
              label: a.typeName,
              valueType: a.kind === "unknown" ? null : a.kind,
            })),
          })
        );
        return;
      }

      // For HTTP/remote mode, use the schema text parsing approach
      const schemaText = await service.getDatabaseSchemaText(databaseName);
      if (schemaText && !schemaText.startsWith("#")) {
        const parsedSchema = parseSchema(schemaText);
        store.commit(
          events.schemaTypesSet({
            entities: parsedSchema.entities.map((e) => ({
              label: e.label,
              isAbstract: e.isAbstract,
              supertype: e.supertype,
              ownedAttributes: e.ownedAttributes,
              playedRoles: e.playedRoles,
            })),
            relations: parsedSchema.relations.map((r) => ({
              label: r.label,
              isAbstract: r.isAbstract,
              supertype: r.supertype,
              ownedAttributes: r.ownedAttributes,
              relatedRoles: r.relatedRoles,
            })),
            attributes: parsedSchema.attributes.map((a) => ({
              label: a.label,
              valueType: a.valueType,
            })),
          })
        );
      }
    } catch (e) {
      // Schema fetch failed - this is okay for embedded mode
      console.warn("[scope] Schema fetch not available:", e);
    }
  };

  // Helper for creating database options (used by both databases$ and groupedDatabases$)
  const createDatabaseOption = (entry: { name: string }): DatabaseOptionVM => {
    const isLessonDatabase = entry.name.startsWith(LESSON_DB_PREFIX);
    const lessonContextName = isLessonDatabase
      ? entry.name.slice(LESSON_DB_PREFIX.length)
      : null;

    return {
      key: entry.name,
      label: entry.name,
      isLessonDatabase,
      lessonContextName,
      isSelected$: computed(
        (get) => get(activeDatabase$) === entry.name,
        { label: `database.${entry.name}.isSelected`, deps: [entry.name] }
      ),
      select: () => {
        store.commit(
          events.connectionSessionSet({ activeDatabase: entry.name })
        );
        databaseSelectorVM.close();
        showSnackbar("success", `Now using database '${entry.name}'`);
        refreshSchemaForDatabase(entry.name);
      },
      openDeleteDialog: () => {
        showSnackbar("warning", "Delete database not yet implemented");
      },
    };
  };

  // Shared computed for the database list
  const databases$ = computed(
    (get) => {
      const catalog = get(sessionDatabases$);
      return catalog.databases.map(createDatabaseOption);
    },
    { label: "databaseSelector.databases" }
  );

  const databaseSelectorVM: DatabaseSelectorVM = {
    visible$: computed(
      (get) => {
        const status = get(connectionStatus$);
        return status === "connected" || status === "reconnecting";
      },
      { label: "databaseSelector.visible" }
    ),

    displayText$: computed(
      (get) => {
        const db = get(activeDatabase$);
        // Prioritize showing the active database name if we have one
        if (db) return db;
        const catalog = get(sessionDatabases$);
        if (catalog.isLoading) return "Loading...";
        return "Select database...";
      },
      { label: "databaseSelector.displayText" }
    ),

    hasSelection$: computed((get) => get(activeDatabase$) !== null, {
      label: "databaseSelector.hasSelection",
    }),

    isOpen$: computed(
      (get) => get(uiState$).activeDialog === "databaseSelector",
      { label: "databaseSelector.isOpen" }
    ),

    toggle: () => {
      const isOpen = store.query(uiState$).activeDialog === "databaseSelector";
      if (!isOpen) {
        // Refresh database list when opening (if connected)
        // Also refresh if catalog is stale even if we have cached data
        const catalog = store.query(sessionDatabases$);
        if (catalog.isStale || catalog.databases.length === 0) {
          refreshDatabaseList();
        }
      }
      store.commit(
        events.uiStateSet({ activeDialog: isOpen ? null : "databaseSelector" })
      );
    },

    close: () => {
      store.commit(events.uiStateSet({ activeDialog: null }));
    },

    disabled$: computed(
      (get): DisabledState => {
        const catalog = get(sessionDatabases$);
        if (catalog.isLoading) {
          return { displayReason: "Loading databases..." };
        }
        if (catalog.isStale && catalog.lastError) {
          return { displayReason: `Refresh failed: ${catalog.lastError}` };
        }
        return null;
      },
      { label: "databaseSelector.disabled" }
    ),

    databases$,

    groupedDatabases$: computed(
      (get) => {
        const allDatabases = get(databases$);
        return {
          regularDatabases: allDatabases.filter((db) => !db.isLessonDatabase),
          lessonDatabases: allDatabases.filter((db) => db.isLessonDatabase),
        };
      },
      { label: "databaseSelector.groupedDatabases" }
    ),

    createNew: () => {
      store.commit(events.uiStateSet({ activeDialog: "createDatabase" }));
    },

    refresh: () => {
      refreshDatabaseList();
    },
  };

  // Database Service (for use by other scopes)
  const databaseService: DatabaseService = {
    refreshList: refreshDatabaseList,
    select: (databaseName: string) => {
      store.commit(
        events.connectionSessionSet({ activeDatabase: databaseName })
      );
      refreshSchemaForDatabase(databaseName);
    },
    refreshSchema: refreshSchemaForDatabase,
  };

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  type NavItem = {
    key: string;
    label: string;
    icon: LucideIcon;
    path: string;
    requiresConnection: boolean;
  };

  const navItems: NavItem[] = [
    {
      key: "home",
      label: "Home",
      icon: Home,
      path: "/",
      requiresConnection: false,
    },
    {
      key: "connect",
      label: "Connect",
      icon: Plug,
      path: "/connect",
      requiresConnection: false,
    },
    {
      key: "learn",
      label: "Learn",
      icon: BookOpen,
      path: "/learn",
      requiresConnection: false,
    },
    {
      key: "query",
      label: "Query",
      icon: Code,
      path: "/query",
      requiresConnection: true,
    },
    // {
    //   key: "schema",
    //   label: "Schema",
    //   icon: GitBranch,
    //   path: "/schema",
    //   requiresConnection: true,
    // },
    {
      key: "users",
      label: "Users",
      icon: Users,
      path: "/users",
      requiresConnection: true,
    },
  ];

  const navigationVM: NavigationVM = {
    items$: computed(
      (get) => {
        const page = get(currentPage$);
        const connected = get(isConnected$);

        // Filter items based on connection state:
        // - When disconnected: only show items that don't require connection
        // - When connected: show all items
        const visibleItems = navItems.filter(
          (item) => !item.requiresConnection || connected
        );

        return visibleItems.map(
          (item): NavigationItemVM => ({
            key: item.key,
            label: item.label,
            icon: item.icon,
            isActive$: computed((get) => get(currentPage$) === item.key, {
              label: `nav.${item.key}.isActive`,
              deps: [item.key],
            }),
            click: () => {
              store.commit(
                events.uiStateSet({ currentPage: item.key as typeof page })
              );
              navigate(item.path);
            },
          })
        );
      },
      { label: "navigation.items" }
    ),
  };

  // ---------------------------------------------------------------------------
  // Top Bar
  // ---------------------------------------------------------------------------

  const topBar: TopBarVM = {
    logoClick: () => {
      store.commit(events.uiStateSet({ currentPage: "home" }));
      navigate("/");
    },
    navigation: navigationVM,
    databaseSelector: databaseSelectorVM,
    connectionStatus: connectionStatusVM,
  };

  // ---------------------------------------------------------------------------
  // Home Page
  // ---------------------------------------------------------------------------

  const homePageVM: HomePageVM = {
    cards$: computed(
      () => {
        const cards: HomeNavigationCardVM[] = [
          {
            key: "connect",
            title: "Connect to Server",
            description: "Connect to a TypeDB server to start querying",
            icon: Plug,
            disabled$: constant<DisabledState>(
              null,
              "homeCard.connect.disabled"
            ),
            click: () => {
              store.commit(events.uiStateSet({ currentPage: "connect" }));
              navigate("/connect");
            },
          },
          {
            key: "query",
            title: "Query Editor",
            description: "Write and execute TypeQL queries",
            icon: Code,
            disabled$: computed(
              (get): DisabledState =>
                get(isConnected$)
                  ? null
                  : { displayReason: "Connect to a server first" },
              { label: "homeCard.query.disabled" }
            ),
            click: () => {
              if (!store.query(isConnected$)) return;
              store.commit(events.uiStateSet({ currentPage: "query" }));
              navigate("/query");
            },
          },
          {
            key: "schema",
            title: "Schema Explorer",
            description: "Visualize and explore your database schema",
            icon: GitBranch,
            disabled$: computed(
              (get): DisabledState =>
                get(isConnected$)
                  ? null
                  : { displayReason: "Connect to a server first" },
              { label: "homeCard.schema.disabled" }
            ),
            click: () => {
              if (!store.query(isConnected$)) return;
              // Navigate to query page and open schema panel
              store.commit(events.uiStateSet({
                currentPage: "query",
                querySchemaViewerVisible: true,
              }));
              navigate("/query");
            },
          },
        ];

        return cards;
      },
      { label: "homePage.cards" }
    ),

    connectionSummary$: computed(
      (get) => {
        const session = get(connectionSession$);
        const address =
          session.address ||
          (session.mode === "wasm" ? "wasm://local" : "server");
        switch (session.status) {
          case "disconnected":
            return "Connect to a TypeDB server to get started";
          case "connecting":
            return `Connecting to ${address}...`;
          case "connected":
            return `Connected to ${address}`;
          case "reconnecting":
            return `Reconnecting to ${address}...`;
        }
      },
      { label: "homePage.connectionSummary" }
    ),
  };

  // ---------------------------------------------------------------------------
  // Connect Page
  // ---------------------------------------------------------------------------

  // Helper to format relative time
  const formatRelativeTime = (date: Date | null): string => {
    if (!date) return "Never used";
    const now = Date.now();
    const diff = now - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  /**
   * Loads a demo's schema and sample data into the database.
   */
  const loadDemoData = async (
    demoId: string,
    databaseName: string
  ): Promise<void> => {
    const demo = getDemoById(demoId);
    if (!demo) {
      throw new Error(`Demo not found: ${demoId}`);
    }

    const service = getService();

    // Parse schema for the schema tree
    console.log(`[scope] Parsing schema for ${demo.name}...`);
    const parsedSchema = parseSchema(demo.schema);

    // Store parsed schema types
    store.commit(
      events.schemaTypesSet({
        entities: parsedSchema.entities.map((e) => ({
          label: e.label,
          isAbstract: e.isAbstract,
          supertype: e.supertype,
          ownedAttributes: e.ownedAttributes,
          playedRoles: e.playedRoles,
        })),
        relations: parsedSchema.relations.map((r) => ({
          label: r.label,
          isAbstract: r.isAbstract,
          supertype: r.supertype,
          ownedAttributes: r.ownedAttributes,
          relatedRoles: r.relatedRoles,
        })),
        attributes: parsedSchema.attributes.map((a) => ({
          label: a.label,
          valueType: a.valueType,
        })),
      })
    );
    console.log(
      `[scope] Stored ${parsedSchema.entities.length} entities, ${parsedSchema.relations.length} relations, ${parsedSchema.attributes.length} attributes`
    );

    // Load schema - send entire define block as one statement
    console.log(`[scope] Loading schema for ${demo.name}...`);
    const cleanSchema = demo.schema
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"))
      .join("\n");

    try {
      await service.executeQuery(databaseName, cleanSchema, {
        transactionType: "schema",
      });
      console.log(`[scope] Schema loaded successfully`);
    } catch (e) {
      console.warn(`[scope] Schema loading warning:`, e);
    }

    // Load sample data (insert statements)
    console.log(`[scope] Loading sample data for ${demo.name}...`);
    const dataStatements = demo.sampleData
      .split(/;\s*\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("#"));

    for (const statement of dataStatements) {
      if (statement.trim()) {
        try {
          await service.executeQuery(databaseName, statement + ";", {
            transactionType: "write",
          });
        } catch (e) {
          console.warn(`[scope] Data statement warning:`, e);
          // Continue with other statements
        }
      }
    }

    console.log(`[scope] Demo ${demo.name} loaded successfully`);
  };

  // Demo Service (for use by other scopes)
  const demoService: DemoService = {
    loadDemo: loadDemoData,
  };

  // Query Execution Service (for use by other scopes, including ReplBridge)
  const queryExecutionService: QueryExecutionService = {
    async execute(queryText: string) {
      const session = store.query(connectionSession$);

      if (session.status !== "connected") {
        return {
          success: false,
          error: "Not connected to TypeDB",
          executionTimeMs: 0,
        };
      }

      const database = session.activeDatabase;
      if (!database) {
        return {
          success: false,
          error: "No database selected",
          executionTimeMs: 0,
        };
      }

      const startTime = Date.now();
      try {
        const service = getService();
        const detection = detectQueryType(queryText);
        const response = await service.executeQuery(database, queryText, {
          transactionType: detection.transactionType,
        });

        // Calculate result count based on response type
        let resultCount = 0;
        switch (response.data.type) {
          case "match":
            resultCount = response.data.answers.length;
            break;
          case "fetch":
            resultCount = response.data.documents.length;
            break;
          case "insert":
            resultCount = response.data.inserted.length;
            break;
          case "delete":
            resultCount = response.data.deletedCount;
            break;
          case "aggregate":
            resultCount = 1;
            break;
          case "define":
          case "undefine":
          case "redefine":
            resultCount = response.data.success ? 1 : 0;
            // Refresh schema after schema changes
            if (response.data.success) {
              refreshSchemaForDatabase(database);
            }
            break;
        }

        return {
          success: true,
          resultCount,
          executionTimeMs: response.executionTimeMs,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : (error as { message?: string })?.message || String(error);
        return {
          success: false,
          error: errorMessage.replace(
            /"((?:[^\\"]|\\")+)"/g,
            (_, content) => `\`${content.replace(/\\([n"])/g, "$1")}\``
          ),
          executionTimeMs: Date.now() - startTime,
        };
      }
    },
    isReady() {
      const session = store.query(connectionSession$);
      return session.status === "connected" && session.activeDatabase !== null;
    },
  };

  // Demos Section
  const demosSectionVM: DemosSectionVM = {
    isLoading$: constant(false, "demos.isLoading"),

    items$: computed(
      () => {
        return DEMOS.map(
          (demo): DemoItemVM => ({
            key: `demo-${demo.id}`,
            id: demo.id,
            name: demo.name,
            description: demo.description,
            icon: demo.icon,
            exampleQueries: demo.exampleQueries.map(
              (eq, idx): DemoExampleQueryVM => ({
                key: `${demo.id}-query-${idx}`,
                name: eq.name,
                description: eq.description,
                query: eq.query,
                run: () => {
                  store.commit(
                    events.uiStateSet({
                      currentQueryText: eq.query,
                      hasUnsavedChanges: true,
                    })
                  );
                  showSnackbar("success", `Loaded: ${eq.name}`);
                },
              })
            ),
            isLoading$: constant(false, `demo.${demo.id}.isLoading`),
            isActive$: computed(
              (get) => {
                const session = get(connectionSession$);
                return (
                  session.status === "connected" &&
                  session.activeDatabase === demo.id
                );
              },
              { label: `demo.${demo.id}.isActive`, deps: [demo.id] }
            ),
            load: async () => {
              // Check if already active
              const session = store.query(connectionSession$);
              if (
                session.status === "connected" &&
                session.activeDatabase === demo.id
              ) {
                // Already on this demo, just navigate to query page
                showSnackbar("success", `Continuing with ${demo.name}`);
                store.commit(events.uiStateSet({ currentPage: "query" }));
                navigate("/query");
                return;
              }

              try {
                showSnackbar("success", `Loading ${demo.name}...`);

                // Create a demo server entry
                const serverId = createID("demo");
                store.commit(
                  events.localServerCreated({
                    id: serverId,
                    name: demo.name,
                    isDemo: true,
                    demoId: demo.id,
                    createdAt: new Date(),
                  })
                );

                // Connect via WASM (creates the database)
                await quickConnectWasm(demo.id);

                // Load the demo schema and data
                await loadDemoData(demo.id, demo.id);

                store.commit(
                  events.connectionSessionSet({
                    status: "connected",
                    savedLocalServerId: serverId,
                    activeDatabase: demo.id,
                    connectedAt: Date.now(),
                    lastStatusChange: Date.now(),
                  }),
                  events.uiStateSet({
                    currentPage: "query",
                  }),
                  events.localServerUpdated({
                    id: serverId,
                    lastUsedAt: new Date(),
                  })
                );

                showSnackbar(
                  "success",
                  `${demo.name} ready! Try the example queries.`
                );
                navigate("/query");
              } catch (error) {
                console.error("[scope] Failed to load demo:", error);
                showSnackbar("error", `Failed to load demo: ${error}`);
              }
            },
          })
        );
      },
      { label: "demos.items" }
    ),
  };

  // Local Servers Section
  const localServersSectionVM: LocalServersSectionVM = {
    items$: computed(
      (get) => {
        const servers = get(localServers$);
        return servers.map(
          (server): LocalServerItemVM => ({
            key: server.id,
            id: server.id,
            name: server.name,
            databaseCount$: constant(0, `server.${server.id}.dbCount`), // TODO: Track actual DB count
            lastUsedAt: server.lastUsedAt,
            lastUsedDisplay: formatRelativeTime(server.lastUsedAt),
            isActive$: computed(
              (get) => get(connectionSession$).savedLocalServerId === server.id,
              { label: `server.${server.id}.isActive`, deps: [server.id] }
            ),
            connect: async () => {
              try {
                store.commit(
                  events.connectionSessionSet({
                    status: "connecting",
                    mode: "wasm",
                    lastStatusChange: Date.now(),
                  })
                );

                // Create a default "playground" database for the local server
                // This gives users something to work with immediately
                // Note: The database is called "playground", NOT the server name
                const defaultDatabaseName = "playground";
                await quickConnectWasm(defaultDatabaseName);

                store.commit(
                  events.connectionSessionSet({
                    status: "connected",
                    savedLocalServerId: server.id,
                    activeDatabase: defaultDatabaseName,
                    connectedAt: Date.now(),
                    lastStatusChange: Date.now(),
                  }),
                  events.uiStateSet({
                    currentPage: "query",
                  }),
                  events.localServerUpdated({
                    id: server.id,
                    lastUsedAt: new Date(),
                  })
                );

                showSnackbar("success", `Connected to ${server.name}`);
                navigate("/query");
              } catch (error) {
                console.error("[scope] Failed to connect to server:", error);
                store.commit(
                  events.connectionSessionSet({
                    status: "disconnected",
                    lastStatusChange: Date.now(),
                  })
                );
                showSnackbar("error", `Failed to connect: ${error}`);
              }
            },
            exportSnapshot: async () => {
              showSnackbar("warning", "Snapshot export not yet implemented");
            },
            delete: () => {
              store.commit(events.localServerDeleted({ id: server.id }));
              showSnackbar("success", `Deleted ${server.name}`);
            },
            rename: () => {
              showSnackbar("warning", "Rename not yet implemented");
            },
          })
        );
      },
      { label: "localServers.items" }
    ),

    isEmpty$: computed((get) => get(localServers$).length === 0, {
      label: "localServers.isEmpty",
    }),

    createNew: async (): Promise<{ key: string }> => {
      const serverCount = store.query(localServers$).length;
      const serverId = createID("local");
      const serverName = `Local Server ${serverCount + 1}`;

      store.commit(
        events.localServerCreated({
          id: serverId,
          name: serverName,
          isDemo: false,
          demoId: null,
          createdAt: new Date(),
        })
      );

      showSnackbar("success", `Created ${serverName}`);

      // Return key for tests to find the new item in items$
      return { key: serverId };
    },

    createDisabled$: constant<DisabledState>(
      null,
      "localServers.createDisabled"
    ),

    importSnapshot: () => {
      showSnackbar("warning", "Snapshot import not yet implemented");
    },
  };

  // Connection Form (for remote connections)
  const connectionFormVM: ConnectionFormVM = {
    mode$: computed((get) => get(uiState$).connectionFormMode, {
      label: "connectForm.mode",
    }),

    setMode: (mode) => {
      store.commit(events.uiStateSet({ connectionFormMode: mode }));
    },

    urlInput: {
      value$: computed((get) => get(uiState$).connectionFormUrl, {
        label: "connectForm.url.value",
      }),
      update: (value) => {
        store.commit(events.uiStateSet({ connectionFormUrl: value }));
        try {
          const url = new URL(value.replace("typedb://", "https://"));
          const address = url.origin.replace("https://", "http://");
          const username = url.username || "";
          const password = url.password || "";
          store.commit(
            events.uiStateSet({
              connectionFormAddress: address,
              connectionFormUsername: username,
              connectionFormPassword: password,
            })
          );
        } catch {
          // Invalid URL, don't sync
        }
      },
      error$: constant<string | null>(null, "connectForm.url.error"),
      placeholder: "typedb://admin:password@http://localhost:8000",
      label: "Connection URL",
    },

    addressInput: {
      value$: computed((get) => get(uiState$).connectionFormAddress, {
        label: "connectForm.address.value",
      }),
      update: (value) => {
        store.commit(events.uiStateSet({ connectionFormAddress: value }));
      },
      error$: constant<string | null>(null, "connectForm.address.error"),
      placeholder: "http://localhost:8000",
      label: "Server Address",
    },

    usernameInput: {
      value$: computed((get) => get(uiState$).connectionFormUsername, {
        label: "connectForm.username.value",
      }),
      update: (value) => {
        store.commit(events.uiStateSet({ connectionFormUsername: value }));
      },
      error$: constant<string | null>(null, "connectForm.username.error"),
      placeholder: "admin",
      label: "Username",
    },

    passwordInput: {
      value$: computed((get) => get(uiState$).connectionFormPassword, {
        label: "connectForm.password.value",
      }),
      update: (value) => {
        store.commit(events.uiStateSet({ connectionFormPassword: value }));
      },
      error$: constant<string | null>(null, "connectForm.password.error"),
      placeholder: "password",
      label: "Password",
      showPassword$: constant(false, "connectForm.password.showPassword"),
      toggleVisibility: () => {},
    },

    fillExample: () => {
      store.commit(
        events.uiStateSet({
          connectionFormAddress: "http://localhost:8000",
          connectionFormUsername: "admin",
          connectionFormPassword: "admin",
        })
      );
      showSnackbar("success", "Example credentials filled");
    },

    safariHttpWarning$: computed(
      (get) => {
        const address = get(uiState$).connectionFormAddress;
        const isSafari =
          typeof navigator !== "undefined" &&
          /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        const isHttp =
          address.startsWith("http://") && !address.includes("localhost");

        return {
          visible: isSafari && isHttp,
          message:
            "Safari may block HTTP connections. Consider using HTTPS or a local server.",
        };
      },
      { label: "connectForm.safariWarning" }
    ),

    connectDisabled$: computed(
      (get): DisabledState => {
        const ui = get(uiState$);
        if (!ui.connectionFormAddress) {
          return { displayReason: "Address is required" };
        }
        if (!ui.connectionFormUsername) {
          return { displayReason: "Username is required" };
        }
        if (!ui.connectionFormPassword) {
          return { displayReason: "Password is required" };
        }
        if (ui.isConnecting) {
          return { displayReason: "Connection in progress" };
        }
        return null;
      },
      { label: "connectForm.connectDisabled" }
    ),

    connect: async () => {
      const ui = store.query(uiState$);

      store.commit(
        events.uiStateSet({ isConnecting: true }),
        events.connectionSessionSet({
          status: "connecting",
          mode: "http",
          address: ui.connectionFormAddress,
          username: ui.connectionFormUsername,
          lastStatusChange: Date.now(),
        })
      );

      try {
        // HTTP mode - connect to real server
        const service = getService();
        await service.connect({
          address: ui.connectionFormAddress,
          username: ui.connectionFormUsername,
          password: ui.connectionFormPassword,
        });

        const connectionId = createID("conn");
        store.commit(
          events.connectionCreated({
            id: connectionId,
            name: ui.connectionFormAddress,
            address: ui.connectionFormAddress,
            username: ui.connectionFormUsername,
            database: null,
            createdAt: new Date(),
          }),
          events.connectionUpdated({
            id: connectionId,
            lastUsedAt: new Date(),
          }),
          events.connectionSessionSet({
            status: "connected",
            savedConnectionId: connectionId,
            savedLocalServerId: null,
            activeDatabase: null,
            connectedAt: Date.now(),
            lastStatusChange: Date.now(),
          }),
          events.uiStateSet({
            isConnecting: false,
            currentPage: "query",
          })
        );

        showSnackbar("success", `Connected to ${ui.connectionFormAddress}`);
        navigate("/query");
      } catch (error) {
        console.error("[scope] Connection failed:", error);
        store.commit(
          events.uiStateSet({ isConnecting: false }),
          events.connectionSessionSet({
            status: "disconnected",
            lastStatusChange: Date.now(),
          })
        );
        showSnackbar("error", `Connection failed: ${error}`);
      }
    },

    isConnecting$: computed((get) => get(uiState$).isConnecting, {
      label: "connectForm.isConnecting",
    }),
  };

  // Saved Connections (for remote connections)
  const savedConnectionsVM: SavedConnectionsListVM = {
    items$: computed(
      (get) => {
        const connections = get(allConnections$);
        return connections.slice(0, 10).map(
          (conn): SavedConnectionItemVM => ({
            key: conn.id,
            nameDisplay: conn.name || conn.address,
            addressDisplay: conn.address.replace(/^https?:\/\//, ""),
            isStartupConnection$: constant(
              conn.isStartupConnection,
              `savedConn.${conn.id}.isStartup`
            ),
            select: () => {
              store.commit(
                events.uiStateSet({
                  connectionFormAddress: conn.address,
                  connectionFormUsername: conn.username,
                  connectionFormPassword: "",
                  remoteConnectionExpanded: true,
                })
              );
            },
            remove: () => {
              store.commit(events.connectionDeleted({ id: conn.id }));
              showSnackbar("success", "Connection removed");
            },
            toggleStartup: () => {
              const allConns = store.query(allConnections$);
              for (const c of allConns) {
                if (c.isStartupConnection) {
                  store.commit(
                    events.connectionUpdated({
                      id: c.id,
                      isStartupConnection: false,
                    })
                  );
                }
              }
              store.commit(
                events.connectionUpdated({
                  id: conn.id,
                  isStartupConnection: true,
                })
              );
            },
          })
        );
      },
      { label: "savedConnections.items" }
    ),

    isEmpty$: computed((get) => get(allConnections$).length === 0, {
      label: "savedConnections.isEmpty",
    }),
  };

  // Remote Connection Section
  const remoteConnectionSectionVM: RemoteConnectionSectionVM = {
    isExpanded$: computed((get) => get(uiState$).remoteConnectionExpanded, {
      label: "remoteConnection.isExpanded",
    }),

    toggleExpanded: () => {
      const expanded = store.query(uiState$).remoteConnectionExpanded;
      store.commit(events.uiStateSet({ remoteConnectionExpanded: !expanded }));
    },

    form: connectionFormVM,
    savedConnections: savedConnectionsVM,
  };

  // Complete Connect Page VM
  const connectPageVM: ConnectPageVM = {
    demos: demosSectionVM,
    localServers: localServersSectionVM,
    remoteConnection: remoteConnectionSectionVM,
  };

  // ---------------------------------------------------------------------------
  // Shared Curriculum Data (used by Learn Page and Query Page)
  // ---------------------------------------------------------------------------

  // Build sections map from curriculum content
  const curriculumSectionsData: Record<string, ParsedSection> = {};
  for (const section of curriculumSections) {
    curriculumSectionsData[section.id] = section;
  }

  // Get profile ID from localStorage or generate one
  const getProfileId = (): string => {
    const PROFILE_KEY = "typedb_studio_profile";
    let profileId = localStorage.getItem(PROFILE_KEY);
    if (!profileId) {
      profileId = `profile_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      localStorage.setItem(PROFILE_KEY, profileId);
    }
    return profileId;
  };
  const sharedProfileId = getProfileId();

  // ---------------------------------------------------------------------------
  // Shared Query Execution Helper
  // ---------------------------------------------------------------------------

  // Create shared execute function that updates results panel + history
  const executeQueryAndUpdateResults = createExecuteQueryAndUpdateResults(
    store,
    showSnackbar,
    refreshSchemaForDatabase
  );

  // ---------------------------------------------------------------------------
  // Shared Context Manager (used by both Learn and Query pages)
  // ---------------------------------------------------------------------------

  const contextDatabaseOps = createContextDatabaseAdapter({
    getService,
    store,
    refreshDatabaseList,
    quickConnectWasm,
  });

  const sharedContextManager = createContextManager({
    contexts: curriculumLoadedContexts,
    dbOps: contextDatabaseOps,
    onContextChanged: (contextName) => {
      if (contextName) {
        showSnackbar("success", `Loaded context: ${contextName}`);
      }
    },
    onStateUpdate: (state) => {
      store.commit(events.lessonContextSet(state));
    },
  });

  // ---------------------------------------------------------------------------
  // Learn Page
  // ---------------------------------------------------------------------------

  const learnPageVM: LearnPageVM = createLearnPageVM(
    store,
    navigate,
    showSnackbar,
    curriculumSectionsData,
    sharedProfileId,
    executeQueryAndUpdateResults,
    sharedContextManager
  );

  // ---------------------------------------------------------------------------
  // Query Page
  // ---------------------------------------------------------------------------

  // Build curriculum meta from parsed sections (shared with Learn page)
  const sectionsByFolder = new Map<string, ParsedSection[]>();
  for (const section of curriculumSections) {
    const folder = section.sourceFile.split("/")[0] || "default";
    const existing = sectionsByFolder.get(folder) || [];
    existing.push(section);
    sectionsByFolder.set(folder, existing);
  }
  const formatFolderTitle = (folder: string): string => {
    return folder
      .replace(/^\d+-/, "")
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };
  const sharedCurriculumMeta: CurriculumMeta = {
    name: "TypeQL Learning",
    version: "1.0.0",
    sections: Array.from(sectionsByFolder.entries()).map(
      ([folder, folderSections]): SectionMeta => ({
        id: folder,
        title: formatFolderTitle(folder),
        path: folder,
        lessons: folderSections.map((s) => ({
          id: s.id,
          title: s.title,
          file: s.sourceFile,
          context: s.context,
        })),
      })
    ),
    contexts: curriculumContexts,
  };

  const queryPageVM: QueryPageVM = createQueryPageVM(
    store,
    showSnackbar,
    navigate,
    databaseSelectorVM,
    connectionStatus$,
    activeDatabase$,
    isConnected$,
    curriculumSectionsData,
    sharedProfileId,
    sharedCurriculumMeta,
    executeQueryAndUpdateResults,
    refreshSchemaForDatabase,
    sharedContextManager
  );

  // ---------------------------------------------------------------------------
  // Users Page (Placeholder)
  // ---------------------------------------------------------------------------

  const usersPageVM: UsersPageVM = createUsersPageVM(
    store,
    showSnackbar,
    connectionStatus$
  );

  // ---------------------------------------------------------------------------
  // Dialogs
  // ---------------------------------------------------------------------------

  // Signals for create database dialog state
  const createDatabaseName$ = signal<string>("", { label: "createDatabase.name" });
  const createDatabaseError$ = signal<string | null>(null, { label: "createDatabase.error" });
  const createDatabaseIsCreating$ = signal<boolean>(false, { label: "createDatabase.isCreating" });

  // Create database dialog VM (reusable instance)
  const createDatabaseDialogVM: CreateDatabaseDialogVM = {
    nameInput: {
      value$: createDatabaseName$,
      update: (value: string) => {
        store.setSignal(createDatabaseName$, value);
        // Clear error when user types
        store.setSignal(createDatabaseError$, null);
      },
      error$: createDatabaseError$,
      placeholder: "my_database",
      label: "Database Name",
    },
    createDisabled$: computed(
      (get): DisabledState => {
        const name = get(createDatabaseName$);
        if (!name.trim()) {
          return { displayReason: "Name is required" };
        }
        // Validate database name format
        if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name)) {
          return { displayReason: "Must start with letter, only letters/numbers/underscores" };
        }
        if (get(createDatabaseIsCreating$)) {
          return { displayReason: "Creating..." };
        }
        return null;
      },
      { label: "createDatabase.disabled" }
    ),
    isCreating$: createDatabaseIsCreating$,
    cancel: () => {
      store.commit(events.uiStateSet({ activeDialog: null }));
      // Reset state
      store.setSignal(createDatabaseName$, "");
      store.setSignal(createDatabaseError$, null);
      store.setSignal(createDatabaseIsCreating$, false);
    },
    create: async () => {
      const name = store.query(createDatabaseName$).trim();
      if (!name) return;

      store.setSignal(createDatabaseIsCreating$, true);
      store.setSignal(createDatabaseError$, null);

      try {
        const service = getService();
        await service.createDatabase(name);

        // Success - close dialog, select new database, refresh list
        store.commit(
          events.uiStateSet({ activeDialog: null }),
          events.connectionSessionSet({ activeDatabase: name })
        );
        store.setSignal(createDatabaseName$, "");
        store.setSignal(createDatabaseIsCreating$, false);

        showSnackbar("success", `Database '${name}' created`);
        refreshDatabaseList();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        store.setSignal(createDatabaseError$, errorMessage);
        store.setSignal(createDatabaseIsCreating$, false);
        showSnackbar("error", `Failed to create database: ${errorMessage}`);
      }
    },
  };

  const dialogsVM: DialogsVM = {
    active$: computed(
      (get): ActiveDialogVM | null => {
        const activeDialog = get(uiState$).activeDialog;
        if (!activeDialog) return null;

        switch (activeDialog) {
          case "createDatabase":
            return { type: "createDatabase", vm: createDatabaseDialogVM };
          // Other dialog types would be added here as needed
          default:
            return null;
        }
      },
      { label: "dialogs.active" }
    ),
    closeAll: () => {
      store.commit(events.uiStateSet({ activeDialog: null }));
    },
  };

  // ---------------------------------------------------------------------------
  // Current Page Composition
  // ---------------------------------------------------------------------------

  const currentPageState$: Queryable<CurrentPageState> = computed(
    (get) => {
      const page = get(currentPage$);
      switch (page) {
        case "home":
          return { page: "home", vm: homePageVM };
        case "connect":
          return { page: "connect", vm: connectPageVM };
        case "learn":
          return { page: "learn", vm: learnPageVM };
        case "query":
          return { page: "query", vm: queryPageVM };
        case "users":
          return { page: "users", vm: usersPageVM };
        case "schema":
          // Schema page has been removed - redirect to query page
          return { page: "query", vm: queryPageVM };
      }
    },
    { label: "currentPageState" }
  );

  // ---------------------------------------------------------------------------
  // Root VM
  // ---------------------------------------------------------------------------

  const vm: TypeDBStudioAppVM = {
    topBar,
    snackbar,
    currentPage$: currentPageState$,
    dialogs: dialogsVM,
    _dev: {
      store,
      navigate,
    },
  };

  const services: StudioServices = {
    snackbar: snackbarService,
    connection: connectionService,
    database: databaseService,
    demo: demoService,
    queryExecution: queryExecutionService,
  };

  const teardown = () => {
    console.log("[scope] Teardown: unsubscribing from service events");
    _unsubscribeStatusChange();
    _unsubscribeModeChange();
  };

  return { vm, services, teardown };
}

// ============================================================================
// Query Page Factory
// ============================================================================

type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting";

function createQueryPageVM(
  store: Store<typeof schema>,
  showSnackbar: (
    type: "success" | "warning" | "error",
    message: string
  ) => void,
  navigate: (path: string) => void,
  databaseSelector: DatabaseSelectorVM,
  _connectionStatus$: Queryable<ConnectionStatus>,
  _activeDatabase$: Queryable<string | null>,
  _isConnected$: Queryable<boolean>,
  curriculumSectionsData: Record<string, ParsedSection>,
  profileId: string,
  curriculumMeta: CurriculumMeta,
  executeQueryAndUpdateResults: (args: ExecuteQueryArgs) => Promise<QueryExecutionResult>,
  refreshSchemaForDatabase: (database: string) => Promise<void>,
  contextManager: ContextManager
): QueryPageVM {
  // Helper to create schema tree item VMs
  const emptyChildren: SchemaTreeChildItemVM[] = [];

  const createEntityItem = (entity: {
    label: string;
    isAbstract: boolean;
    ownedAttributes: readonly string[];
  }): SchemaTreeItemVM => ({
    key: entity.label,
    label: entity.label,
    icon: Box,
    kind: "entity",
    isAbstract: entity.isAbstract,
    level: 0,
    hasChildren$: constant(
      entity.ownedAttributes.length > 0,
      `entity.${entity.label}.hasChildren`
    ),
    expanded$: constant(
      false as boolean | null,
      `entity.${entity.label}.expanded`
    ),
    toggleExpanded: () => {},
    children$: constant(
      entity.ownedAttributes.map(
        (attr): SchemaTreeChildItemVM => ({
          key: `${entity.label}.${attr}`,
          label: attr,
          kind: "attribute",
          typeInfo: null,
          generateQuery: () => {
            const query = `match $x isa ${entity.label}, has ${attr} $a;\nfetch { "value": $a };`;
            store.commit(
              events.uiStateSet({
                currentQueryText: query,
                hasUnsavedChanges: true,
              })
            );
            showSnackbar(
              "success",
              `Generated query for ${entity.label}.${attr}`
            );
          },
        })
      ),
      `entity.${entity.label}.children`
    ),
    showPlayOnHover: true,
    runFetchQuery: async () => {
      const query = generateFetchQuery({
        label: entity.label,
        kind: "entity",
        ownedAttributes: entity.ownedAttributes,
      });
      store.commit(
        events.uiStateSet({ currentQueryText: query, hasUnsavedChanges: false })
      );
      // Execute and update results panel
      await executeQueryAndUpdateResults({ query });
    },
  });

  const createRelationItem = (relation: {
    label: string;
    isAbstract: boolean;
    ownedAttributes: readonly string[];
    relatedRoles: readonly string[];
  }): SchemaTreeItemVM => ({
    key: relation.label,
    label: relation.label,
    icon: Diamond,
    kind: "relation",
    isAbstract: relation.isAbstract,
    level: 0,
    hasChildren$: constant(
      relation.relatedRoles.length > 0 || relation.ownedAttributes.length > 0,
      `relation.${relation.label}.hasChildren`
    ),
    expanded$: constant(
      false as boolean | null,
      `relation.${relation.label}.expanded`
    ),
    toggleExpanded: () => {},
    children$: constant(
      [
        ...relation.relatedRoles.map(
          (role): SchemaTreeChildItemVM => ({
            key: `${relation.label}.role.${role}`,
            label: role,
            kind: "role",
            typeInfo: null,
            generateQuery: () => {
              const query = `match ($role: $player) isa ${relation.label};\nfetch { "${role}": $player };`;
              store.commit(
                events.uiStateSet({
                  currentQueryText: query,
                  hasUnsavedChanges: true,
                })
              );
              showSnackbar(
                "success",
                `Generated query for ${relation.label}:${role}`
              );
            },
          })
        ),
        ...relation.ownedAttributes.map(
          (attr): SchemaTreeChildItemVM => ({
            key: `${relation.label}.attr.${attr}`,
            label: attr,
            kind: "attribute",
            typeInfo: null,
            generateQuery: () => {
              const query = `match $r isa ${relation.label}, has ${attr} $a;\nfetch { "value": $a };`;
              store.commit(
                events.uiStateSet({
                  currentQueryText: query,
                  hasUnsavedChanges: true,
                })
              );
              showSnackbar(
                "success",
                `Generated query for ${relation.label}.${attr}`
              );
            },
          })
        ),
      ],
      `relation.${relation.label}.children`
    ),
    showPlayOnHover: true,
    runFetchQuery: async () => {
      const query = generateFetchQuery({
        label: relation.label,
        kind: "relation",
        ownedAttributes: relation.ownedAttributes,
        relatedRoles: relation.relatedRoles,
      });
      store.commit(
        events.uiStateSet({ currentQueryText: query, hasUnsavedChanges: false })
      );
      // Execute and update results panel
      await executeQueryAndUpdateResults({ query });
    },
  });

  const createAttributeItem = (attribute: {
    label: string;
    valueType: string | null;
  }): SchemaTreeItemVM => ({
    key: attribute.label,
    label: attribute.label,
    icon: Tag,
    kind: "attribute",
    isAbstract: false,
    level: 0,
    hasChildren$: constant(false, `attribute.${attribute.label}.hasChildren`),
    expanded$: constant(
      null as boolean | null,
      `attribute.${attribute.label}.expanded`
    ),
    toggleExpanded: () => {},
    children$: constant(emptyChildren, `attribute.${attribute.label}.children`),
    showPlayOnHover: true,
    runFetchQuery: async () => {
      const query = generateFetchQuery({
        label: attribute.label,
        kind: "attribute",
      });
      store.commit(
        events.uiStateSet({ currentQueryText: query, hasUnsavedChanges: false })
      );
      // Execute and update results panel
      await executeQueryAndUpdateResults({ query });
    },
  });

  // Create schema tree groups using stored schema types
  const entitiesGroup: SchemaTreeGroupVM = {
    label: "Entities",
    count$: computed((get) => get(schemaTypes$)?.entities?.length ?? 0, {
      label: "schemaTree.entities.count",
    }),
    collapsed$: computed((get) => get(uiState$).schemaEntitiesCollapsed, {
      label: "schemaTree.entities.collapsed",
    }),
    toggleCollapsed: () => {
      const collapsed = store.query(uiState$).schemaEntitiesCollapsed;
      store.commit(events.uiStateSet({ schemaEntitiesCollapsed: !collapsed }));
    },
    items$: computed(
      (get) => get(schemaTypes$)?.entities?.map(createEntityItem) ?? [],
      { label: "schemaTree.entities.items" }
    ),
  };

  const relationsGroup: SchemaTreeGroupVM = {
    label: "Relations",
    count$: computed((get) => get(schemaTypes$)?.relations?.length ?? 0, {
      label: "schemaTree.relations.count",
    }),
    collapsed$: computed((get) => get(uiState$).schemaRelationsCollapsed, {
      label: "schemaTree.relations.collapsed",
    }),
    toggleCollapsed: () => {
      const collapsed = store.query(uiState$).schemaRelationsCollapsed;
      store.commit(events.uiStateSet({ schemaRelationsCollapsed: !collapsed }));
    },
    items$: computed(
      (get) => get(schemaTypes$)?.relations?.map(createRelationItem) ?? [],
      { label: "schemaTree.relations.items" }
    ),
  };

  const attributesGroup: SchemaTreeGroupVM = {
    label: "Attributes",
    count$: computed((get) => get(schemaTypes$)?.attributes?.length ?? 0, {
      label: "schemaTree.attributes.count",
    }),
    collapsed$: computed((get) => get(uiState$).schemaAttributesCollapsed, {
      label: "schemaTree.attributes.collapsed",
    }),
    toggleCollapsed: () => {
      const collapsed = store.query(uiState$).schemaAttributesCollapsed;
      store.commit(events.uiStateSet({ schemaAttributesCollapsed: !collapsed }));
    },
    items$: computed(
      (get) => get(schemaTypes$)?.attributes?.map(createAttributeItem) ?? [],
      { label: "schemaTree.attributes.items" }
    ),
  };

  const schemaTree: SchemaTreeVM = {
    status$: computed(
      (get) => {
        const types = get(schemaTypes$);
        const totalTypes =
          (types?.entities?.length ?? 0) +
          (types?.relations?.length ?? 0) +
          (types?.attributes?.length ?? 0);
        if (totalTypes === 0) {
          return "empty" as SchemaTreeStatus;
        }
        return "ready" as SchemaTreeStatus;
      },
      { label: "schemaTree.status" }
    ),
    statusMessage$: computed(
      (get) => {
        const types = get(schemaTypes$);
        const totalTypes =
          (types?.entities?.length ?? 0) +
          (types?.relations?.length ?? 0) +
          (types?.attributes?.length ?? 0);
        if (totalTypes === 0) {
          return "No schema types defined. Load a demo or define schema." as string;
        }
        return null;
      },
      { label: "schemaTree.statusMessage" }
    ),
    retry: () => {},
    entities: entitiesGroup,
    relations: relationsGroup,
    attributes: attributesGroup,
  };

  // Saved Queries Tree placeholder
  const emptySavedQueryItems: SavedQueryTreeItemVM[] = [];
  const savedQueriesTree: SavedQueriesTreeVM = {
    items$: constant(emptySavedQueryItems, "savedQueries.items"),
    isEmpty$: constant(true, "savedQueries.isEmpty"),
    search: {
      text$: constant("", "savedQueries.search.text"),
      update: () => {},
      clear: () => {},
      isActive$: constant(false, "savedQueries.search.isActive"),
      resultCount$: constant(0, "savedQueries.search.resultCount"),
    },
    createFolder: () => showSnackbar("success", "Create folder"),
    createQuery: () => showSnackbar("success", "Create query"),
    exportAll: () => showSnackbar("success", "Export all"),
    openImportDialog: () => showSnackbar("success", "Import"),
  };

  // Schema Section
  const schemaSection: QuerySidebarSchemaSectionVM = {
    label: "Schema",
    collapsed$: computed((get) => get(uiState$).schemaCollapsed, {
      label: "schemaSection.collapsed",
    }),
    toggleCollapsed: () => {
      const collapsed = store.query(uiState$).schemaCollapsed;
      store.commit(events.uiStateSet({ schemaCollapsed: !collapsed }));
    },
    viewMode$: computed((get) => get(uiState$).schemaViewMode, {
      label: "schemaSection.viewMode",
    }),
    setViewMode: (mode) =>
      store.commit(events.uiStateSet({ schemaViewMode: mode })),
    linksVisibility: {
      sub$: computed((get) => get(uiState$).schemaShowSub, {
        label: "schemaSection.showSub",
      }),
      toggleSub: () =>
        store.commit(
          events.uiStateSet({
            schemaShowSub: !store.query(uiState$).schemaShowSub,
          })
        ),
      owns$: computed((get) => get(uiState$).schemaShowOwns, {
        label: "schemaSection.showOwns",
      }),
      toggleOwns: () =>
        store.commit(
          events.uiStateSet({
            schemaShowOwns: !store.query(uiState$).schemaShowOwns,
          })
        ),
      plays$: computed((get) => get(uiState$).schemaShowPlays, {
        label: "schemaSection.showPlays",
      }),
      togglePlays: () =>
        store.commit(
          events.uiStateSet({
            schemaShowPlays: !store.query(uiState$).schemaShowPlays,
          })
        ),
      relates$: computed((get) => get(uiState$).schemaShowRelates, {
        label: "schemaSection.showRelates",
      }),
      toggleRelates: () =>
        store.commit(
          events.uiStateSet({
            schemaShowRelates: !store.query(uiState$).schemaShowRelates,
          })
        ),
    },
    tree: schemaTree,
  };

  // Saved Queries Section
  const savedQueriesSection: QuerySidebarSavedQueriesSectionVM = {
    label: "Saved Queries",
    collapsed$: computed((get) => get(uiState$).savedQueriesCollapsed, {
      label: "savedQueriesSection.collapsed",
    }),
    toggleCollapsed: () => {
      const collapsed = store.query(uiState$).savedQueriesCollapsed;
      store.commit(events.uiStateSet({ savedQueriesCollapsed: !collapsed }));
    },
    tree: savedQueriesTree,
  };

  // Docs Viewer - created early so Learn Sidebar can reference it
  // Using createReplBridge for consistent behavior
  const queryReplBridge = createReplBridge({
    store,
    events,
    navigate,
    executeQuery: executeQueryAndUpdateResults,
    showSnackbar,
  });

  const { vm: docsViewerVM, service: docsViewerService } =
    createDocumentViewerScope({
      store,
      profileId,
      sections: curriculumSectionsData,
      replBridge: queryReplBridge,
      contextManager,
      stateKeys: {
        visibleKey: "queryDocsViewerVisible",
        sectionIdKey: "queryDocsCurrentSectionId",
        labelPrefix: "queryDocsViewer",
      },
      navigate,
      toggleDatabaseSelector: () => databaseSelector.toggle(),
    });

  // Schema Graph Panel VM
  const schemaViewerVM: SchemaGraphPanelVM = {
    isVisible$: computed((get) => get(uiState$).querySchemaViewerVisible, {
      label: "schemaViewer.isVisible",
    }),
    show: () =>
      store.commit(events.uiStateSet({ querySchemaViewerVisible: true })),
    hide: () =>
      store.commit(events.uiStateSet({ querySchemaViewerVisible: false })),
    toggle: () => {
      const visible = store.query(uiState$).querySchemaViewerVisible;
      store.commit(events.uiStateSet({ querySchemaViewerVisible: !visible }));
    },
    graph: {
      status$: computed(
        (get): SchemaGraphStatus => {
          const session = get(connectionSession$);
          if (session.status !== "connected") return "loading";
          if (!session.activeDatabase) return "loading";
          const types = get(schemaTypes$);
          if (
            types.entities.length === 0 &&
            types.relations.length === 0 &&
            types.attributes.length === 0
          ) {
            return "empty";
          }
          return "ready";
        },
        { label: "schemaViewer.graph.status" }
      ),
      statusMessage$: computed(
        (get): string | null => {
          const session = get(connectionSession$);
          if (session.status !== "connected") {
            return "Connect to a server to view schema";
          }
          if (!session.activeDatabase) {
            return "Select a database to view schema";
          }
          const types = get(schemaTypes$);
          if (
            types.entities.length === 0 &&
            types.relations.length === 0 &&
            types.attributes.length === 0
          ) {
            return "No schema types defined. Use 'define' queries to create types.";
          }
          return null;
        },
        { label: "schemaViewer.graph.statusMessage" }
      ),
      retry: () => {
        // Trigger schema refresh
        const session = store.query(connectionSession$);
        if (session.status === "connected" && session.activeDatabase) {
          refreshSchemaForDatabase(session.activeDatabase);
        }
      },
      setCanvasRef: () => {
        // Graph rendering not yet implemented
      },
      zoom: {
        level$: constant(1, "schemaViewer.graph.zoom.level"),
        zoomIn: () => {},
        zoomOut: () => {},
        reset: () => {},
      },
      selectedNode$: constant<SchemaGraphNodeVM | null>(
        null,
        "schemaViewer.graph.selectedNode"
      ),
      hoveredNode$: constant<SchemaGraphNodeVM | null>(
        null,
        "schemaViewer.graph.hoveredNode"
      ),
      highlightFilter$: constant<string | null>(
        null,
        "schemaViewer.graph.highlightFilter"
      ),
      setHighlightFilter: () => {},
    },
  };

  // Create Learn Sidebar for Query Page (with navigation to docs viewer)
  const queryLearnSidebar = createLearnSidebarScope({
    store,
    profileId,
    curriculumMeta,
    sections: curriculumSectionsData,
    navigate: (sectionId, _headingId) => {
      // Open the docs viewer in the query page instead of navigating to /learn
      docsViewerService.openSection(sectionId);
    },
    // Use the Query page's docs state keys so sidebar highlighting stays in sync
    sectionIdKey: "queryDocsCurrentSectionId",
  });

  // Learn Section for Query Sidebar
  const learnSection: QuerySidebarLearnSectionVM = {
    label: "Learn",
    collapsed$: computed((get) => get(uiState$).querySidebarLearnCollapsed, {
      label: "querySidebar.learn.collapsed",
    }),
    toggleCollapsed: () => {
      const collapsed = store.query(uiState$).querySidebarLearnCollapsed;
      store.commit(
        events.uiStateSet({ querySidebarLearnCollapsed: !collapsed })
      );
    },
    curriculum: queryLearnSidebar.learnSection,
    reference: queryLearnSidebar.referenceSection,
    openFullLearnPage: () => navigate("/learn"),
  };

  // Sidebar
  const sidebar: QuerySidebarVM = {
    width$: computed((get) => get(uiState$).querySidebarWidth, {
      label: "sidebar.width",
    }),
    setWidth: (width) =>
      store.commit(events.uiStateSet({ querySidebarWidth: width })),
    learnSection,
    schemaSection,
    savedQueriesSection,
    urlImportsSection$: constant<QuerySidebarUrlImportsSectionVM | null>(
      null,
      "sidebar.urlImports"
    ),
  };

  // Editor Header
  const editorHeader: QueryEditorHeaderVM = {
    titleDisplay$: computed(
      (get): string => {
        const queryId = get(uiState$).currentQueryId;
        const hasChanges = get(uiState$).hasUnsavedChanges;
        if (!queryId) {
          return "Query";
        }
        return hasChanges ? "Query - Untitled*" : "Query - Untitled";
      },
      { label: "editor.header.title" }
    ),
    isDirty$: computed((get) => get(uiState$).hasUnsavedChanges, {
      label: "editor.header.isDirty",
    }),
    isScratch$: computed((get) => get(uiState$).currentQueryId === null, {
      label: "editor.header.isScratch",
    }),
    savedQueryName$: constant<string | null>(
      null,
      "editor.header.savedQueryName"
    ),
  };

  // Autocomplete
  const emptySuggestions: AutocompleteSuggestionVM[] = [];
  const autocomplete: AutocompleteVM = {
    isOpen$: constant(false, "autocomplete.isOpen"),
    suggestions$: constant(emptySuggestions, "autocomplete.suggestions"),
    selectedIndex$: constant(-1, "autocomplete.selectedIndex"),
    open: () => {},
    close: () => {},
    selectNext: () => {},
    selectPrevious: () => {},
    confirmSelection: () => {},
  };

  // Code Editor
  const codeEditor: QueryCodeEditorVM = {
    text$: computed((get) => get(uiState$).currentQueryText, {
      label: "editor.text",
    }),
    updateText: (text) => {
      store.commit(
        events.uiStateSet({ currentQueryText: text, hasUnsavedChanges: true })
      );
    },
    cursorPosition$: constant({ line: 1, column: 1 }, "editor.cursor"),
    setCursorPosition: () => {},
    autocomplete,
    onKeyDown: () => false,
  };

  // Chat input
  const chatInput: FormInputVM = {
    value$: constant("", "chat.input.value"),
    update: () => {},
    error$: constant<string | null>(null, "chat.input.error"),
    placeholder: "Ask about TypeQL...",
    label: "Message",
  };

  // Chat Assistant
  const emptyChatMessages: ChatMessageVM[] = [];
  const chatAssistant: QueryChatAssistantVM = {
    messages$: constant(emptyChatMessages, "chat.messages"),
    input: chatInput,
    sendDisabled$: constant<DisabledState>(
      { displayReason: "Chat not implemented" },
      "chat.sendDisabled"
    ),
    send: () => showSnackbar("warning", "Chat not implemented"),
    clear: () => {},
    isGenerating$: constant(false, "chat.isGenerating"),
  };

  // Note: executeQueryAndUpdateResults and processQueryResults are now
  // defined at module level and passed in as a parameter.

  // Editor Actions
  const actions: QueryEditorActionsVM = {
    newScratch: {
      click: () => {
        const hasChanges = store.query(uiState$).hasUnsavedChanges;
        if (hasChanges) {
          showSnackbar("warning", "Unsaved changes will be discarded");
        }
        store.commit(
          events.uiStateSet({
            currentQueryText: "",
            currentQueryId: null,
            hasUnsavedChanges: false,
          })
        );
      },
      needsConfirmation$: computed((get) => get(uiState$).hasUnsavedChanges, {
        label: "newScratch.needsConfirmation",
      }),
    },
    saveChanges: {
      visible$: computed(
        (get) =>
          get(uiState$).currentQueryId !== null &&
          get(uiState$).hasUnsavedChanges,
        { label: "saveChanges.visible" }
      ),
      click: () => {
        showSnackbar("success", "Query saved");
        store.commit(events.uiStateSet({ hasUnsavedChanges: false }));
      },
    },
    saveAsNew: {
      disabled$: computed(
        (get): DisabledState =>
          get(uiState$).currentQueryText.trim() === ""
            ? { displayReason: "Query is empty" }
            : null,
        { label: "saveAsNew.disabled" }
      ),
      click: () => showSnackbar("success", "Opening save dialog..."),
    },
    run: {
      disabled$: computed(
        (get): DisabledState => {
          if (get(queryResults$).isRunning) {
            return { displayReason: "Query is running" };
          }
          if (get(uiState$).currentQueryText.trim() === "") {
            return { displayReason: "Query is empty" };
          }
          if (get(connectionSession$).status !== "connected") {
            return { displayReason: "Not connected to server" };
          }
          if (!get(connectionSession$).activeDatabase) {
            return { displayReason: "No database selected" };
          }
          return null;
        },
        { label: "run.disabled" }
      ),
      tooltip$: computed(
        (get): string => {
          const disabled = get(connectionSession$).status !== "connected";
          return disabled
            ? "Connect to a server first"
            : "Run query (Cmd+Enter)";
        },
        { label: "run.tooltip" }
      ),
      isRunning$: computed((get) => get(queryResults$).isRunning, {
        label: "run.isRunning",
      }),
      click: () => {
        const queryText = store.query(uiState$).currentQueryText;
        executeQueryAndUpdateResults({ query: queryText });
      },
    },
  };

  // Editor
  const editor: QueryEditorVM = {
    mode$: computed((get) => get(uiState$).editorMode, {
      label: "editor.mode",
    }),
    setMode: (mode) => store.commit(events.uiStateSet({ editorMode: mode })),
    header: editorHeader,
    codeEditor,
    chatAssistant,
    actions,
  };

  // Log Output - reads from queryResults$
  const log: LogOutputVM = {
    content$: computed(
      (get) => {
        const results = get(queryResults$);
        if (results.errorMessage) {
          return `Error: ${results.errorMessage}`;
        }
        if (results.logLines.length === 0) {
          return "// Query results will appear here";
        }
        return results.logLines.join("\n");
      },
      { label: "log.content" }
    ),
    hasContent$: computed(
      (get) => {
        const results = get(queryResults$);
        return results.logLines.length > 0 || results.errorMessage !== null;
      },
      { label: "log.hasContent" }
    ),
    copy: () => {
      const results = store.query(queryResults$);
      const content = results.logLines.join("\n");
      navigator.clipboard.writeText(content);
      showSnackbar("success", "Copied to clipboard");
    },
    copySuccess$: constant(false, "log.copySuccess"),
    sendToAI: () => showSnackbar("warning", "Send to AI not yet implemented"),
    sentToAI$: constant(false, "log.sentToAI"),
    actionsDisabled$: computed(
      (get): DisabledState => {
        const results = get(queryResults$);
        if (results.logLines.length === 0 && !results.errorMessage) {
          return { displayReason: "No content" };
        }
        return null;
      },
      { label: "log.actionsDisabled" }
    ),
  };

  // Table Output - reads from queryResults$
  const table: TableOutputVM = {
    status$: computed(
      (get): TableStatus => {
        const results = get(queryResults$);
        if (results.isRunning) return "running";
        if (results.errorMessage) return "error";
        if (results.tableRows.length > 0) return "success";
        return "idle";
      },
      { label: "table.status" }
    ),
    statusMessage$: computed(
      (get): string | null => {
        const results = get(queryResults$);
        if (results.isRunning) return "Running query...";
        if (results.errorMessage) return results.errorMessage;
        if (results.tableRows.length === 0 && results.completedAt)
          return "No table data for this query";
        if (results.tableRows.length === 0) return "Run a query to see results";
        return null;
      },
      { label: "table.statusMessage" }
    ),
    columns$: computed(
      (get): TableColumnVM[] => {
        const results = get(queryResults$);
        return results.tableColumns.map((col) => ({
          key: col,
          label: col,
          isSorted$: constant(false, `table.column.${col}.isSorted`),
          sortDirection$: constant<"asc" | "desc" | null>(
            null,
            `table.column.${col}.sortDirection`
          ),
        }));
      },
      { label: "table.columns" }
    ),
    rows$: computed(
      (get): TableRowVM[] => {
        const results = get(queryResults$);
        return results.tableRows.map((rowJson, index) => {
          const data = JSON.parse(rowJson);
          return {
            key: `row-${index}`,
            cells: Object.fromEntries(
              Object.entries(data).map(([col, val]) => [col, String(val)])
            ),
          };
        });
      },
      { label: "table.rows" }
    ),
    isTruncated$: constant(false, "table.isTruncated"),
    totalRowCount$: computed((get) => get(queryResults$).resultCount ?? 0, {
      label: "table.totalRowCount",
    }),
    sort$: constant<{ column: string; direction: "asc" | "desc" } | null>(
      null,
      "table.sort"
    ),
    setSort: () => {},
  };

  // Graph Output - reads from queryResults$ (placeholder for graph visualization)
  const graph: GraphOutputVM = {
    status$: computed(
      (get): GraphStatus => {
        const results = get(queryResults$);
        if (results.isRunning) return "running";
        if (results.errorMessage) return "error";
        // Graph requires special data, currently only show idle
        return "idle";
      },
      { label: "graph.status" }
    ),
    statusMessage$: computed(
      (get): string | null => {
        const results = get(queryResults$);
        if (results.isRunning) return "Running query...";
        if (results.errorMessage) return results.errorMessage;
        return "Graph visualization not yet implemented";
      },
      { label: "graph.statusMessage" }
    ),
    setCanvasRef: () => {},
    zoom: {
      level$: constant(1, "graph.zoom.level"),
      zoomIn: () => {},
      zoomOut: () => {},
      reset: () => {},
    },
    selectedNode$: constant<GraphNodeVM | null>(null, "graph.selectedNode"),
    hoveredNode$: constant<GraphNodeVM | null>(null, "graph.hoveredNode"),
  };

  // Raw Output - reads from queryResults$
  const raw: RawOutputVM = {
    content$: computed(
      (get) => {
        const results = get(queryResults$);
        if (results.errorMessage) {
          return JSON.stringify({ error: results.errorMessage }, null, 2);
        }
        return results.rawJson ?? "";
      },
      { label: "raw.content" }
    ),
    hasContent$: computed(
      (get) => {
        const results = get(queryResults$);
        return results.rawJson !== null || results.errorMessage !== null;
      },
      { label: "raw.hasContent" }
    ),
    copy: () => {
      const results = store.query(queryResults$);
      const content = results.rawJson ?? "";
      navigator.clipboard.writeText(content);
      showSnackbar("success", "Copied to clipboard");
    },
    copySuccess$: constant(false, "raw.copySuccess"),
  };

  // Results
  const results: QueryResultsVM = {
    selectedTab$: computed((get) => get(uiState$).resultsActiveTab, {
      label: "results.selectedTab",
    }),
    setTab: (tab) => store.commit(events.uiStateSet({ resultsActiveTab: tab })),
    disabled$: computed(
      (get): DisabledState =>
        get(connectionSession$).status !== "connected"
          ? { displayReason: "Not connected to server" }
          : null,
      { label: "results.disabled" }
    ),
    log,
    table,
    graph,
    raw,
  };

  // Helper functions for history entry formatting
  const formatTimeAgo = (date: Date): string => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const formatTimestamp = (date: Date): string => {
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const formatDuration = (ms: number | null): string | null => {
    if (ms === null) return null;
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${secs}s`;
  };

  // Placeholder status icons (simple function components)
  const SuccessIcon: IconComponent = () => null; // View will render actual icon
  const ErrorIcon: IconComponent = () => null;
  const RunningIcon: IconComponent = () => null;

  const getStatusIcon = (
    status: "success" | "error" | "running"
  ): IconComponent => {
    switch (status) {
      case "success":
        return SuccessIcon;
      case "error":
        return ErrorIcon;
      case "running":
        return RunningIcon;
    }
  };

  // Helper to create HistoryEntryVM from history record
  type QueryHistoryEntry = {
    id: string;
    queryText: string;
    executedAt: Date;
    status: string;
    durationMs: number | null;
    errorMessage: string | null;
  };
  const createHistoryEntryVM = (entry: QueryHistoryEntry): HistoryEntryVM => {
    const date = new Date(entry.executedAt);
    const status = entry.status as "success" | "error";
    return {
      key: entry.id,
      type: "query",
      statusIcon: getStatusIcon(status),
      status,
      summary:
        entry.queryText.slice(0, 40) +
        (entry.queryText.length > 40 ? "..." : ""),
      fullQueryText: entry.queryText,
      timeAgo$: constant(formatTimeAgo(date), `history.${entry.id}.timeAgo`),
      timestampDisplay: formatTimestamp(date),
      durationDisplay: formatDuration(entry.durationMs),
      loadInEditor: () => {
        store.commit(
          events.uiStateSet({
            currentQueryText: entry.queryText,
            hasUnsavedChanges: true,
          })
        );
        showSnackbar("success", "Query loaded into editor");
      },
      showErrorDetails: () => {
        if (entry.errorMessage) {
          showSnackbar("error", entry.errorMessage);
        }
      },
      errorMessage: entry.errorMessage ?? null,
    };
  };

  // History Bar - reads from queryHistory$ table
  const historyBar: QueryHistoryBarVM = {
    isExpanded$: computed((get) => get(uiState$).historyBarExpanded, {
      label: "history.expanded",
    }),
    toggle: () => {
      const expanded = store.query(uiState$).historyBarExpanded;
      store.commit(events.uiStateSet({ historyBarExpanded: !expanded }));
    },
    latest$: computed(
      (get): HistoryEntryVM | null => {
        const history = get(queryHistory$);
        if (history.length === 0) return null;
        return createHistoryEntryVM(history[0]);
      },
      { label: "history.latest" }
    ),
    entries$: computed(
      (get): HistoryEntryVM[] => {
        const history = get(queryHistory$);
        return history.map(createHistoryEntryVM);
      },
      { label: "history.entries" }
    ),
    isEmpty$: computed((get) => get(queryHistory$).length === 0, {
      label: "history.isEmpty",
    }),
    clear: () => {
      store.commit(events.historyCleared({}));
      showSnackbar("success", "History cleared");
    },
  };

  return {
    sidebar,
    editor,
    results,
    historyBar,
    docsViewer: docsViewerVM,
    schemaViewer: schemaViewerVM,
    placeholder$: computed(
      (get) => {
        const session = get(connectionSession$);

        if (session.status !== "connected") {
          return {
            type: "noServer" as const,
            message: "Connect to a server to start querying",
            actionLabel: "Connect",
            action: () => {
              store.commit(events.uiStateSet({ currentPage: "connect" }));
              navigate("/connect");
            },
          };
        }

        if (!session.activeDatabase) {
          return {
            type: "noDatabase" as const,
            message: "Select a database to start querying",
            actionLabel: "Select Database",
            action: () => databaseSelector.toggle(),
          };
        }

        return null;
      },
      { label: "queryPage.placeholder" }
    ),
  };
}

// ============================================================================
// Users Page Factory (Placeholder)
// ============================================================================

function createUsersPageVM(
  _store: Store<typeof schema>,
  showSnackbar: (
    type: "success" | "warning" | "error",
    message: string
  ) => void,
  _connectionStatus$: Queryable<ConnectionStatus>
): UsersPageVM {
  const emptyUsers: UserRowVM[] = [];
  return {
    status$: constant<UsersPageStatus>("ready", "users.status"),
    errorMessage$: constant<string | null>(null, "users.errorMessage"),
    retry: () => {},
    users$: constant(emptyUsers, "users.users"),
    isEmpty$: constant(true, "users.isEmpty"),
    createUser: {
      click: () => showSnackbar("success", "Opening create user dialog..."),
      disabled$: computed(
        (get): DisabledState =>
          get(connectionSession$).status !== "connected"
            ? { displayReason: "Not connected" }
            : null,
        { label: "users.createUser.disabled" }
      ),
    },
    placeholder$: computed(
      (get): UsersPagePlaceholder | null => {
        const session = get(connectionSession$);
        if (session.status !== "connected") {
          return {
            type: "noServer" as const,
            message: "Connect to a server to manage users",
            actionLabel: "Connect",
            action: () => {},
          };
        }
        return null;
      },
      { label: "users.placeholder" }
    ),
  };
}

// ============================================================================
// Learn Page Factory
// ============================================================================

function createLearnPageVM(
  store: Store<typeof schema>,
  navigate: (path: string) => void,
  showSnackbar: (
    type: "success" | "warning" | "error",
    message: string
  ) => void,
  sections: Record<string, ParsedSection>,
  profileId: string,
  executeQueryWithResults: (args: { query: string; database?: string | null }) => Promise<{
    success: boolean;
    resultCount?: number;
    error?: string;
    executionTimeMs: number;
  }>,
  contextManager: ContextManager
): LearnPageVM {
  // Group sections by folder path for curriculum structure
  const sectionsByFolder = new Map<string, ParsedSection[]>();
  for (const section of curriculumSections) {
    // Extract folder from sourceFile (e.g., "01-foundations/03-first-queries.md" -> "01-foundations")
    const folder = section.sourceFile.split("/")[0] || "default";
    const existing = sectionsByFolder.get(folder) || [];
    existing.push(section);
    sectionsByFolder.set(folder, existing);
  }

  // Build curriculum meta from parsed sections
  const curriculumMeta: CurriculumMeta = {
    name: "TypeQL Learning",
    version: "1.0.0",
    sections: Array.from(sectionsByFolder.entries()).map(
      ([folder, folderSections]): SectionMeta => ({
        id: folder,
        title: formatFolderTitle(folder),
        path: folder,
        lessons: folderSections.map((s) => ({
          id: s.id,
          title: s.title,
          file: s.sourceFile,
          context: s.context,
        })),
      })
    ),
    contexts: curriculumContexts,
  };

  // Helper to format folder names (e.g., "01-foundations" -> "Foundations")
  function formatFolderTitle(folder: string): string {
    return folder
      .replace(/^\d+-/, "") // Remove leading number prefix
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  // Create REPL bridge using the shared factory
  const replBridge = createReplBridge({
    store,
    events,
    navigate,
    executeQuery: executeQueryWithResults,
    showSnackbar,
  });

  // Create document viewer scope first (navigation needs viewerService)
  const { vm: viewerVM, service: viewerService } = createDocumentViewerScope({
    store,
    profileId,
    sections,
    replBridge,
    contextManager,
    navigate,
  });

  // Create navigation scope - drives viewerService.openSection for section changes
  const navigationVM = createNavigationScope({
    store,
    navigate,
    onSectionOpened: (sectionId, _headingId) => {
      // Source of truth for section state goes through DocumentViewerService
      // which updates uiState.learnCurrentSectionId
      viewerService.openSection(sectionId);
    },
    onReferenceOpened: (_refId, _headingId) => {
      // Reference opening - can be handled similarly via viewerService
    },
    useBrowserHistory: false, // Let the app handle history
    initialTarget: null,
  });

  // Create sidebar scope
  const sidebarVM = createLearnSidebarScope({
    store,
    profileId,
    curriculumMeta,
    sections,
    navigate: (sectionId, headingId) => {
      viewerService.openSection(sectionId);
      if (headingId) {
        // Navigate to heading within section
        navigationVM.navigateToSection(sectionId, headingId);
      }
    },
  });

  return {
    sidebar: sidebarVM,
    viewer: viewerVM,
    navigation: navigationVM,
  };
}
