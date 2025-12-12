/**
 * LiveStore scope for TypeDB Studio.
 *
 * Creates the root TypeDBStudioAppVM by composing all child VMs.
 * This is the main "business logic" layer that connects LiveStore state to VM interfaces.
 */

import { computed, nanoid } from "@livestore/livestore";
import type { Queryable, Store } from "@livestore/livestore";
import {
  Home,
  Plug,
  Code,
  GitBranch,
  Users,
  type LucideIcon,
} from "lucide-react";

import { events, type schema } from "../livestore/schema";
import { uiState$, snackbarNotifications$, allConnections$ } from "../livestore/queries";

import type { TypeDBStudioAppVM, CurrentPageState } from "./app.vm";
import type { TopBarVM } from "./top-bar/top-bar.vm";
import type { NavigationVM, NavigationItemVM } from "./top-bar/navigation.vm";
import type { DatabaseSelectorVM, DatabaseOptionVM } from "./top-bar/database-selector.vm";
import type { ConnectionStatusVM } from "./top-bar/connection-status.vm";
import type { SnackbarVM } from "./snackbar.vm";
import type { DialogsVM } from "./dialogs/dialogs.vm";
import type { HomePageVM, HomeNavigationCardVM } from "./pages/home/home-page.vm";
import type { ConnectPageVM, ConnectionFormVM, SavedConnectionsListVM, SavedConnectionItemVM } from "./pages/connect/connect-page.vm";
import type { QueryPageVM } from "./pages/query/query-page.vm";
import type { QuerySidebarVM, QuerySidebarSchemaSectionVM, QuerySidebarSavedQueriesSectionVM } from "./pages/query/sidebar/query-sidebar.vm";
import type { QueryEditorVM, QueryEditorHeaderVM, QueryCodeEditorVM, AutocompleteVM, QueryChatAssistantVM, QueryEditorActionsVM } from "./pages/query/editor/query-editor.vm";
import type { QueryResultsVM, LogOutputVM, TableOutputVM, GraphOutputVM, RawOutputVM } from "./pages/query/results/query-results.vm";
import type { QueryHistoryBarVM } from "./pages/query/history/query-history-bar.vm";
import type { SchemaPageVM } from "./pages/schema/schema-page.vm";
import type { UsersPageVM } from "./pages/users/users-page.vm";
import type { DisabledState, IconComponent, FormInputVM } from "./types";
import type { SchemaTreeVM, SchemaTreeGroupVM, SchemaTreeItemVM, SchemaTreeStatus } from "./shared/schema-tree.vm";
import type { SavedQueriesTreeVM, SavedQueryTreeItemVM } from "./pages/query/sidebar/saved-queries.vm";
import type { ActiveDialogVM } from "./dialogs/dialogs.vm";
import type { AutocompleteSuggestionVM, ChatMessageVM } from "./pages/query/editor/query-editor.vm";
import type { TableStatus, TableColumnVM, TableRowVM, GraphStatus, GraphNodeVM } from "./pages/query/results/query-results.vm";
import type { HistoryEntryVM } from "./pages/query/history/query-history-bar.vm";
import type { QuerySidebarUrlImportsSectionVM } from "./pages/query/sidebar/query-sidebar.vm";
import type { SchemaGraphStatus, SchemaGraphNodeVM } from "./pages/schema/schema-page.vm";
import type { UsersPageStatus, UsersPagePlaceholder, UserRowVM } from "./pages/users/users-page.vm";

// ============================================================================
// Helpers
// ============================================================================

const createID = (prefix: string) => `${prefix}_${nanoid(12)}`;

/** Creates a queryable that always returns the same value with explicit type */
function constant<T>(value: T, label: string): Queryable<T> {
  return computed((): T => value, { label });
}

// ============================================================================
// Main Scope
// ============================================================================

export function createStudioScope(
  store: Store<typeof schema>,
  navigate: (path: string) => void
): TypeDBStudioAppVM {
  // ---------------------------------------------------------------------------
  // Derived UI State Queries
  // ---------------------------------------------------------------------------

  const currentPage$ = computed(
    (get) => get(uiState$).currentPage,
    { label: "currentPage" }
  );

  const connectionStatus$ = computed(
    (get) => get(uiState$).connectionStatus,
    { label: "connectionStatus" }
  );

  const activeDatabase$ = computed(
    (get) => get(uiState$).activeDatabase,
    { label: "activeDatabase" }
  );

  const isConnected$ = computed(
    (get) => get(connectionStatus$) === "connected",
    { label: "isConnected" }
  );

  // ---------------------------------------------------------------------------
  // Snackbar
  // ---------------------------------------------------------------------------

  const showSnackbar = (
    type: "success" | "warning" | "error",
    message: string,
    persistent = false
  ) => {
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

  // ---------------------------------------------------------------------------
  // Connection Status
  // ---------------------------------------------------------------------------

  const connectionStatusVM: ConnectionStatusVM = {
    state$: connectionStatus$,

    displayText$: computed(
      (get) => {
        const status = get(connectionStatus$);
        const ui = get(uiState$);
        switch (status) {
          case "disconnected":
            return "Not connected";
          case "connecting":
            return "Connecting...";
          case "connected":
            return `${ui.connectionFormUsername || "admin"}@${ui.connectionFormAddress || "localhost"}`;
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
      (get) => get(connectionStatus$) === "connected" || get(connectionStatus$) === "disconnected",
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

    signOut: () => {
      store.commit(
        events.uiStateSet({
          connectionStatus: "disconnected",
          activeConnectionId: null,
          activeDatabase: null,
        })
      );
      showSnackbar("success", "Signed out");
      navigate("/connect");
    },
  };

  // ---------------------------------------------------------------------------
  // Database Selector
  // ---------------------------------------------------------------------------

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
        return db ?? "Select database...";
      },
      { label: "databaseSelector.displayText" }
    ),

    hasSelection$: computed(
      (get) => get(activeDatabase$) !== null,
      { label: "databaseSelector.hasSelection" }
    ),

    isOpen$: computed(
      (get) => get(uiState$).activeDialog === "databaseSelector",
      { label: "databaseSelector.isOpen" }
    ),

    toggle: () => {
      const isOpen = store.query(uiState$).activeDialog === "databaseSelector";
      store.commit(
        events.uiStateSet({ activeDialog: isOpen ? null : "databaseSelector" })
      );
    },

    close: () => {
      store.commit(events.uiStateSet({ activeDialog: null }));
    },

    disabled$: constant<DisabledState>(null, "databaseSelector.disabled"),

    databases$: computed(
      () => {
        // Mock databases - in real app, this would come from the server
        const mockDatabases = ["typedb", "social_network", "financial_data"];

        return mockDatabases.map((name): DatabaseOptionVM => ({
          key: name,
          label: name,
          isSelected$: computed(
            (get) => get(activeDatabase$) === name,
            { label: `database.${name}.isSelected` }
          ),
          select: () => {
            store.commit(events.uiStateSet({ activeDatabase: name }));
            databaseSelectorVM.close();
            showSnackbar("success", `Now using database '${name}'`);
          },
          openDeleteDialog: () => {
            showSnackbar("warning", "Delete database not yet implemented");
          },
        }));
      },
      { label: "databaseSelector.databases" }
    ),

    createNew: () => {
      store.commit(events.uiStateSet({ activeDialog: "createDatabase" }));
    },

    refresh: () => {
      showSnackbar("success", "Database list refreshed");
    },
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
    { key: "home", label: "Home", icon: Home, path: "/", requiresConnection: false },
    { key: "connect", label: "Connect", icon: Plug, path: "/connect", requiresConnection: false },
    { key: "query", label: "Query", icon: Code, path: "/query", requiresConnection: true },
    { key: "schema", label: "Schema", icon: GitBranch, path: "/schema", requiresConnection: true },
    { key: "users", label: "Users", icon: Users, path: "/users", requiresConnection: true },
  ];

  const navigationVM: NavigationVM = {
    items$: computed(
      (get) => {
        const page = get(currentPage$);

        return navItems.map((item): NavigationItemVM => ({
          key: item.key,
          label: item.label,
          icon: item.icon as unknown as IconComponent,
          isActive$: computed(
            (get) => get(currentPage$) === item.key,
            { label: `nav.${item.key}.isActive` }
          ),
          disabled$: computed(
            (get): DisabledState => {
              if (!item.requiresConnection) return null;
              if (get(isConnected$)) return null;
              return { displayReason: "Connect to a server first" };
            },
            { label: `nav.${item.key}.disabled` }
          ),
          click: () => {
            const disabled = item.requiresConnection && !store.query(isConnected$);
            if (disabled) return;
            store.commit(events.uiStateSet({ currentPage: item.key as typeof page }));
            navigate(item.path);
          },
        }));
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
            icon: Plug as unknown as IconComponent,
            disabled$: constant<DisabledState>(null, "homeCard.connect.disabled"),
            click: () => {
              store.commit(events.uiStateSet({ currentPage: "connect" }));
              navigate("/connect");
            },
          },
          {
            key: "query",
            title: "Query Editor",
            description: "Write and execute TypeQL queries",
            icon: Code as unknown as IconComponent,
            disabled$: computed(
              (get): DisabledState => get(isConnected$) ? null : { displayReason: "Connect to a server first" },
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
            icon: GitBranch as unknown as IconComponent,
            disabled$: computed(
              (get): DisabledState => get(isConnected$) ? null : { displayReason: "Connect to a server first" },
              { label: "homeCard.schema.disabled" }
            ),
            click: () => {
              if (!store.query(isConnected$)) return;
              store.commit(events.uiStateSet({ currentPage: "schema" }));
              navigate("/schema");
            },
          },
        ];

        return cards;
      },
      { label: "homePage.cards" }
    ),

    connectionSummary$: computed(
      (get) => {
        const status = get(connectionStatus$);
        const ui = get(uiState$);
        switch (status) {
          case "disconnected":
            return "Connect to a TypeDB server to get started";
          case "connecting":
            return `Connecting to ${ui.connectionFormAddress || "server"}...`;
          case "connected":
            return `Connected to ${ui.connectionFormAddress || "localhost"}`;
          case "reconnecting":
            return `Reconnecting to ${ui.connectionFormAddress || "server"}...`;
        }
      },
      { label: "homePage.connectionSummary" }
    ),
  };

  // ---------------------------------------------------------------------------
  // Connect Page
  // ---------------------------------------------------------------------------

  const connectionFormVM: ConnectionFormVM = {
    mode$: computed(
      (get) => get(uiState$).connectionFormMode,
      { label: "connectForm.mode" }
    ),

    setMode: (mode) => {
      store.commit(events.uiStateSet({ connectionFormMode: mode }));
    },

    urlInput: {
      value$: computed(
        (get) => get(uiState$).connectionFormUrl,
        { label: "connectForm.url.value" }
      ),
      update: (value) => {
        store.commit(events.uiStateSet({ connectionFormUrl: value }));
        try {
          const url = new URL(value.replace("typedb://", "https://"));
          const address = url.origin.replace("https://", "http://");
          const username = url.username || "";
          const password = url.password || "";
          store.commit(events.uiStateSet({
            connectionFormAddress: address,
            connectionFormUsername: username,
            connectionFormPassword: password,
          }));
        } catch {
          // Invalid URL, don't sync
        }
      },
      error$: constant<string | null>(null, "connectForm.url.error"),
      placeholder: "typedb://admin:password@http://localhost:8000",
      label: "Connection URL",
    },

    addressInput: {
      value$: computed(
        (get) => get(uiState$).connectionFormAddress,
        { label: "connectForm.address.value" }
      ),
      update: (value) => {
        store.commit(events.uiStateSet({ connectionFormAddress: value }));
      },
      error$: constant<string | null>(null, "connectForm.address.error"),
      placeholder: "http://localhost:8000",
      label: "Server Address",
    },

    usernameInput: {
      value$: computed(
        (get) => get(uiState$).connectionFormUsername,
        { label: "connectForm.username.value" }
      ),
      update: (value) => {
        store.commit(events.uiStateSet({ connectionFormUsername: value }));
      },
      error$: constant<string | null>(null, "connectForm.username.error"),
      placeholder: "admin",
      label: "Username",
    },

    passwordInput: {
      value$: computed(
        (get) => get(uiState$).connectionFormPassword,
        { label: "connectForm.password.value" }
      ),
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
      store.commit(events.uiStateSet({
        connectionFormAddress: "http://localhost:8000",
        connectionFormUsername: "admin",
        connectionFormPassword: "admin",
      }));
      showSnackbar("success", "Example credentials filled");
    },

    safariHttpWarning$: computed(
      (get) => {
        const address = get(uiState$).connectionFormAddress;
        const isSafari = typeof navigator !== "undefined" &&
          /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        const isHttp = address.startsWith("http://") && !address.includes("localhost");

        return {
          visible: isSafari && isHttp,
          message: "Safari may block HTTP connections. Consider using HTTPS or a local server.",
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

      store.commit(events.uiStateSet({
        isConnecting: true,
        connectionStatus: "connecting",
      }));

      await new Promise((resolve) => setTimeout(resolve, 1500));

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
        events.uiStateSet({
          isConnecting: false,
          connectionStatus: "connected",
          activeConnectionId: connectionId,
          currentPage: "query",
        })
      );

      showSnackbar("success", `Connected to ${ui.connectionFormAddress}`);
      navigate("/query");
    },

    isConnecting$: computed(
      (get) => get(uiState$).isConnecting,
      { label: "connectForm.isConnecting" }
    ),
  };

  const savedConnectionsVM: SavedConnectionsListVM = {
    items$: computed(
      (get) => {
        const connections = get(allConnections$);
        return connections.slice(0, 10).map((conn): SavedConnectionItemVM => ({
          key: conn.id,
          nameDisplay: conn.name || conn.address,
          addressDisplay: conn.address.replace(/^https?:\/\//, ""),
          isStartupConnection$: constant(conn.isStartupConnection, `savedConn.${conn.id}.isStartup`),
          select: () => {
            store.commit(events.uiStateSet({
              connectionFormAddress: conn.address,
              connectionFormUsername: conn.username,
              connectionFormPassword: "",
            }));
          },
          remove: () => {
            store.commit(events.connectionDeleted({ id: conn.id }));
            showSnackbar("success", "Connection removed");
          },
          toggleStartup: () => {
            const allConns = store.query(allConnections$);
            for (const c of allConns) {
              if (c.isStartupConnection) {
                store.commit(events.connectionUpdated({
                  id: c.id,
                  isStartupConnection: false,
                }));
              }
            }
            store.commit(events.connectionUpdated({
              id: conn.id,
              isStartupConnection: true,
            }));
          },
        }));
      },
      { label: "savedConnections.items" }
    ),

    isEmpty$: computed(
      (get) => get(allConnections$).length === 0,
      { label: "savedConnections.isEmpty" }
    ),
  };

  const connectPageVM: ConnectPageVM = {
    form: connectionFormVM,
    savedConnections: savedConnectionsVM,
  };

  // ---------------------------------------------------------------------------
  // Query Page
  // ---------------------------------------------------------------------------

  const queryPageVM: QueryPageVM = createQueryPageVM(store, showSnackbar, navigate, databaseSelectorVM, connectionStatus$, activeDatabase$, isConnected$);

  // ---------------------------------------------------------------------------
  // Schema Page (Placeholder)
  // ---------------------------------------------------------------------------

  const schemaPageVM: SchemaPageVM = createSchemaPageVM(store, connectionStatus$, activeDatabase$);

  // ---------------------------------------------------------------------------
  // Users Page (Placeholder)
  // ---------------------------------------------------------------------------

  const usersPageVM: UsersPageVM = createUsersPageVM(store, showSnackbar, connectionStatus$);

  // ---------------------------------------------------------------------------
  // Dialogs
  // ---------------------------------------------------------------------------

  const dialogsVM: DialogsVM = {
    active$: constant<ActiveDialogVM | null>(null, "dialogs.active"),
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
        case "query":
          return { page: "query", vm: queryPageVM };
        case "schema":
          return { page: "schema", vm: schemaPageVM };
        case "users":
          return { page: "users", vm: usersPageVM };
      }
    },
    { label: "currentPageState" }
  );

  // ---------------------------------------------------------------------------
  // Root VM
  // ---------------------------------------------------------------------------

  return {
    topBar,
    snackbar,
    currentPage$: currentPageState$,
    dialogs: dialogsVM,
    _dev: {
      store,
      navigate,
    },
  };
}

// ============================================================================
// Query Page Factory
// ============================================================================

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "reconnecting";

function createQueryPageVM(
  store: Store<typeof schema>,
  showSnackbar: (type: "success" | "warning" | "error", message: string) => void,
  navigate: (path: string) => void,
  databaseSelector: DatabaseSelectorVM,
  _connectionStatus$: Queryable<ConnectionStatus>,
  _activeDatabase$: Queryable<string | null>,
  _isConnected$: Queryable<boolean>
): QueryPageVM {
  // Schema Tree placeholder - create a helper to make schema tree groups
  const emptySchemaItems: SchemaTreeItemVM[] = [];
  const createSchemaTreeGroup = (label: string, prefix: string): SchemaTreeGroupVM => ({
    label,
    count$: constant(0, `${prefix}.count`),
    collapsed$: constant(false, `${prefix}.collapsed`),
    toggleCollapsed: () => {},
    items$: constant(emptySchemaItems, `${prefix}.items`),
  });

  const schemaTree: SchemaTreeVM = {
    status$: constant<SchemaTreeStatus>("ready", "schemaTree.status"),
    statusMessage$: constant<string | null>(null, "schemaTree.statusMessage"),
    retry: () => {},
    entities: createSchemaTreeGroup("Entities", "schemaTree.entities"),
    relations: createSchemaTreeGroup("Relations", "schemaTree.relations"),
    attributes: createSchemaTreeGroup("Attributes", "schemaTree.attributes"),
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
    collapsed$: computed((get) => get(uiState$).schemaCollapsed, { label: "schemaSection.collapsed" }),
    toggleCollapsed: () => {
      const collapsed = store.query(uiState$).schemaCollapsed;
      store.commit(events.uiStateSet({ schemaCollapsed: !collapsed }));
    },
    viewMode$: computed((get) => get(uiState$).schemaViewMode, { label: "schemaSection.viewMode" }),
    setViewMode: (mode) => store.commit(events.uiStateSet({ schemaViewMode: mode })),
    linksVisibility: {
      sub$: computed((get) => get(uiState$).schemaShowSub, { label: "schemaSection.showSub" }),
      toggleSub: () => store.commit(events.uiStateSet({ schemaShowSub: !store.query(uiState$).schemaShowSub })),
      owns$: computed((get) => get(uiState$).schemaShowOwns, { label: "schemaSection.showOwns" }),
      toggleOwns: () => store.commit(events.uiStateSet({ schemaShowOwns: !store.query(uiState$).schemaShowOwns })),
      plays$: computed((get) => get(uiState$).schemaShowPlays, { label: "schemaSection.showPlays" }),
      togglePlays: () => store.commit(events.uiStateSet({ schemaShowPlays: !store.query(uiState$).schemaShowPlays })),
      relates$: computed((get) => get(uiState$).schemaShowRelates, { label: "schemaSection.showRelates" }),
      toggleRelates: () => store.commit(events.uiStateSet({ schemaShowRelates: !store.query(uiState$).schemaShowRelates })),
    },
    tree: schemaTree,
  };

  // Saved Queries Section
  const savedQueriesSection: QuerySidebarSavedQueriesSectionVM = {
    label: "Saved Queries",
    collapsed$: computed((get) => get(uiState$).savedQueriesCollapsed, { label: "savedQueriesSection.collapsed" }),
    toggleCollapsed: () => {
      const collapsed = store.query(uiState$).savedQueriesCollapsed;
      store.commit(events.uiStateSet({ savedQueriesCollapsed: !collapsed }));
    },
    tree: savedQueriesTree,
  };

  // Sidebar
  const sidebar: QuerySidebarVM = {
    width$: computed((get) => get(uiState$).querySidebarWidth, { label: "sidebar.width" }),
    setWidth: (width) => store.commit(events.uiStateSet({ querySidebarWidth: width })),
    schemaSection,
    savedQueriesSection,
    urlImportsSection$: constant<QuerySidebarUrlImportsSectionVM | null>(null, "sidebar.urlImports"),
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
    isDirty$: computed((get) => get(uiState$).hasUnsavedChanges, { label: "editor.header.isDirty" }),
    isScratch$: computed((get) => get(uiState$).currentQueryId === null, { label: "editor.header.isScratch" }),
    savedQueryName$: constant<string | null>(null, "editor.header.savedQueryName"),
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
    text$: computed((get) => get(uiState$).currentQueryText, { label: "editor.text" }),
    updateText: (text) => {
      store.commit(events.uiStateSet({ currentQueryText: text, hasUnsavedChanges: true }));
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
    sendDisabled$: constant<DisabledState>({ displayReason: "Chat not implemented" }, "chat.sendDisabled"),
    send: () => showSnackbar("warning", "Chat not implemented"),
    clear: () => {},
    isGenerating$: constant(false, "chat.isGenerating"),
  };

  // Editor Actions
  const actions: QueryEditorActionsVM = {
    newScratch: {
      click: () => {
        const hasChanges = store.query(uiState$).hasUnsavedChanges;
        if (hasChanges) {
          showSnackbar("warning", "Unsaved changes will be discarded");
        }
        store.commit(events.uiStateSet({
          currentQueryText: "",
          currentQueryId: null,
          hasUnsavedChanges: false,
        }));
      },
      needsConfirmation$: computed((get) => get(uiState$).hasUnsavedChanges, { label: "newScratch.needsConfirmation" }),
    },
    saveChanges: {
      visible$: computed(
        (get) => get(uiState$).currentQueryId !== null && get(uiState$).hasUnsavedChanges,
        { label: "saveChanges.visible" }
      ),
      click: () => {
        showSnackbar("success", "Query saved");
        store.commit(events.uiStateSet({ hasUnsavedChanges: false }));
      },
    },
    saveAsNew: {
      disabled$: computed(
        (get): DisabledState => get(uiState$).currentQueryText.trim() === ""
          ? { displayReason: "Query is empty" }
          : null,
        { label: "saveAsNew.disabled" }
      ),
      click: () => showSnackbar("success", "Opening save dialog..."),
    },
    run: {
      disabled$: computed(
        (get): DisabledState => {
          if (get(uiState$).currentQueryText.trim() === "") {
            return { displayReason: "Query is empty" };
          }
          if (get(uiState$).connectionStatus !== "connected") {
            return { displayReason: "Not connected to server" };
          }
          if (!get(uiState$).activeDatabase) {
            return { displayReason: "No database selected" };
          }
          return null;
        },
        { label: "run.disabled" }
      ),
      tooltip$: computed(
        (get): string => {
          const disabled = get(uiState$).connectionStatus !== "connected";
          return disabled ? "Connect to a server first" : "Run query (Cmd+Enter)";
        },
        { label: "run.tooltip" }
      ),
      isRunning$: constant(false, "run.isRunning"),
      click: () => showSnackbar("success", "Query executed"),
    },
  };

  // Editor
  const editor: QueryEditorVM = {
    mode$: computed((get) => get(uiState$).editorMode, { label: "editor.mode" }),
    setMode: (mode) => store.commit(events.uiStateSet({ editorMode: mode })),
    header: editorHeader,
    codeEditor,
    chatAssistant,
    actions,
  };

  // Log Output
  const log: LogOutputVM = {
    content$: constant("// Query results will appear here", "log.content"),
    hasContent$: constant(false, "log.hasContent"),
    copy: () => showSnackbar("success", "Copied to clipboard"),
    copySuccess$: constant(false, "log.copySuccess"),
    sendToAI: () => showSnackbar("success", "Sent to AI"),
    sentToAI$: constant(false, "log.sentToAI"),
    actionsDisabled$: constant<DisabledState>({ displayReason: "No content" }, "log.actionsDisabled"),
  };

  // Table Output
  const emptyColumns: TableColumnVM[] = [];
  const emptyRows: TableRowVM[] = [];
  const table: TableOutputVM = {
    status$: constant<TableStatus>("idle", "table.status"),
    statusMessage$: constant<string | null>("Run a query to see results", "table.statusMessage"),
    columns$: constant(emptyColumns, "table.columns"),
    rows$: constant(emptyRows, "table.rows"),
    isTruncated$: constant(false, "table.isTruncated"),
    totalRowCount$: constant(0, "table.totalRowCount"),
    sort$: constant<{ column: string; direction: "asc" | "desc" } | null>(null, "table.sort"),
    setSort: () => {},
  };

  // Graph Output
  const graph: GraphOutputVM = {
    status$: constant<GraphStatus>("idle", "graph.status"),
    statusMessage$: constant<string | null>("Run a query to see results", "graph.statusMessage"),
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

  // Raw Output
  const raw: RawOutputVM = {
    content$: constant("", "raw.content"),
    hasContent$: constant(false, "raw.hasContent"),
    copy: () => showSnackbar("success", "Copied to clipboard"),
    copySuccess$: constant(false, "raw.copySuccess"),
  };

  // Results
  const results: QueryResultsVM = {
    selectedTab$: computed((get) => get(uiState$).resultsActiveTab, { label: "results.selectedTab" }),
    setTab: (tab) => store.commit(events.uiStateSet({ resultsActiveTab: tab })),
    disabled$: computed(
      (get): DisabledState => get(uiState$).connectionStatus !== "connected"
        ? { displayReason: "Not connected to server" }
        : null,
      { label: "results.disabled" }
    ),
    log,
    table,
    graph,
    raw,
  };

  // History Bar
  const emptyHistoryEntries: HistoryEntryVM[] = [];
  const historyBar: QueryHistoryBarVM = {
    isExpanded$: computed((get) => get(uiState$).historyBarExpanded, { label: "history.expanded" }),
    toggle: () => {
      const expanded = store.query(uiState$).historyBarExpanded;
      store.commit(events.uiStateSet({ historyBarExpanded: !expanded }));
    },
    latest$: constant<HistoryEntryVM | null>(null, "history.latest"),
    entries$: constant(emptyHistoryEntries, "history.entries"),
    isEmpty$: constant(true, "history.isEmpty"),
    clear: () => showSnackbar("success", "History cleared"),
  };

  return {
    sidebar,
    editor,
    results,
    historyBar,
    placeholder$: computed(
      (get) => {
        const ui = get(uiState$);

        if (ui.connectionStatus !== "connected") {
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

        if (!ui.activeDatabase) {
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
// Schema Page Factory (Placeholder)
// ============================================================================

function createSchemaPageVM(
  store: Store<typeof schema>,
  _connectionStatus$: Queryable<ConnectionStatus>,
  _activeDatabase$: Queryable<string | null>
): SchemaPageVM {
  // Schema Tree helper
  const emptySchemaItems: SchemaTreeItemVM[] = [];
  const createSchemaTreeGroup = (label: string, prefix: string): SchemaTreeGroupVM => ({
    label,
    count$: constant(0, `${prefix}.count`),
    collapsed$: constant(false, `${prefix}.collapsed`),
    toggleCollapsed: () => {},
    items$: constant(emptySchemaItems, `${prefix}.items`),
  });

  const schemaTree: SchemaTreeVM = {
    status$: constant<SchemaTreeStatus>("ready", "schema.tree.status"),
    statusMessage$: constant<string | null>(null, "schema.tree.statusMessage"),
    retry: () => {},
    entities: createSchemaTreeGroup("Entities", "schema.tree.entities"),
    relations: createSchemaTreeGroup("Relations", "schema.tree.relations"),
    attributes: createSchemaTreeGroup("Attributes", "schema.tree.attributes"),
  };

  return {
    sidebar: {
      width$: constant(280, "schema.sidebar.width"),
      setWidth: () => {},
      tree: schemaTree,
      viewMode$: computed((get) => get(uiState$).schemaViewMode, { label: "schema.viewMode" }),
      setViewMode: (mode) => store.commit(events.uiStateSet({ schemaViewMode: mode })),
      linksVisibility: {
        sub$: computed((get) => get(uiState$).schemaShowSub, { label: "schema.showSub" }),
        toggleSub: () => store.commit(events.uiStateSet({ schemaShowSub: !store.query(uiState$).schemaShowSub })),
        owns$: computed((get) => get(uiState$).schemaShowOwns, { label: "schema.showOwns" }),
        toggleOwns: () => store.commit(events.uiStateSet({ schemaShowOwns: !store.query(uiState$).schemaShowOwns })),
        plays$: computed((get) => get(uiState$).schemaShowPlays, { label: "schema.showPlays" }),
        togglePlays: () => store.commit(events.uiStateSet({ schemaShowPlays: !store.query(uiState$).schemaShowPlays })),
        relates$: computed((get) => get(uiState$).schemaShowRelates, { label: "schema.showRelates" }),
        toggleRelates: () => store.commit(events.uiStateSet({ schemaShowRelates: !store.query(uiState$).schemaShowRelates })),
      },
    },
    graph: {
      status$: constant<SchemaGraphStatus>("loading", "schema.graph.status"),
      statusMessage$: constant<string | null>("Select a database to view schema", "schema.graph.statusMessage"),
      retry: () => {},
      setCanvasRef: () => {},
      zoom: {
        level$: constant(1, "schema.graph.zoom.level"),
        zoomIn: () => {},
        zoomOut: () => {},
        reset: () => {},
      },
      selectedNode$: constant<SchemaGraphNodeVM | null>(null, "schema.graph.selectedNode"),
      hoveredNode$: constant<SchemaGraphNodeVM | null>(null, "schema.graph.hoveredNode"),
      highlightFilter$: constant<string | null>(null, "schema.graph.highlightFilter"),
      setHighlightFilter: () => {},
    },
    placeholder$: computed(
      (get) => {
        const ui = get(uiState$);
        if (ui.connectionStatus !== "connected") {
          return {
            type: "noServer" as const,
            message: "Connect to a server to view schema",
            actionLabel: "Connect",
            action: () => {},
          };
        }
        if (!ui.activeDatabase) {
          return {
            type: "noDatabase" as const,
            message: "Select a database to view schema",
            actionLabel: "Select Database",
            action: () => {},
          };
        }
        return null;
      },
      { label: "schema.placeholder" }
    ),
  };
}

// ============================================================================
// Users Page Factory (Placeholder)
// ============================================================================

function createUsersPageVM(
  _store: Store<typeof schema>,
  showSnackbar: (type: "success" | "warning" | "error", message: string) => void,
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
        (get): DisabledState => get(uiState$).connectionStatus !== "connected"
          ? { displayReason: "Not connected" }
          : null,
        { label: "users.createUser.disabled" }
      ),
    },
    placeholder$: computed(
      (get): UsersPagePlaceholder | null => {
        const ui = get(uiState$);
        if (ui.connectionStatus !== "connected") {
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
