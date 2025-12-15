/**
 * Connect page view model.
 *
 * Provides three connection options:
 * 1. **Demos** - Pre-loaded demo databases for exploration (WASM)
 * 2. **Local Servers** - User-created in-memory servers (WASM)
 * 3. **Remote Connection** - Connect to TypeDB server via HTTP
 *
 * Local servers support:
 * - Creation with unique IDs
 * - Deletion
 * - Snapshot export/import for persistence
 */

import type { Queryable } from "../../types";
import type { FormInputVM, PasswordInputVM, DisabledState } from "../../types";

/**
 * Connect page VM.
 *
 * **Layout:**
 * ```
 * ┌──────────────────────────────────────────────────────────────────┐
 * │  Welcome to TypeDB Studio                                        │
 * │                                                                  │
 * │  ┌─────────────────────┐ ┌─────────────────────┐                │
 * │  │   Explore Demos     │ │   Create New        │                │
 * │  │   ───────────────   │ │   ───────────────   │                │
 * │  │   Social Network    │ │   + New Local       │                │
 * │  │   E-Commerce        │ │     Server          │                │
 * │  │   Knowledge Graph   │ │                     │                │
 * │  └─────────────────────┘ └─────────────────────┘                │
 * │                                                                  │
 * │  Your Local Servers                                              │
 * │  ┌────────────────────────────────────────────────────────────┐ │
 * │  │ my-project    │ 3 databases │ [Export] [Delete]           │ │
 * │  │ testing       │ 1 database  │ [Export] [Delete]           │ │
 * │  └────────────────────────────────────────────────────────────┘ │
 * │                                                                  │
 * │  ─── or connect to remote server ───                            │
 * │  [Expand Remote Connection Form]                                 │
 * └──────────────────────────────────────────────────────────────────┘
 * ```
 */
export interface ConnectPageVM {
  /**
   * Section for exploring pre-loaded demo databases.
   */
  demos: DemosSectionVM;

  /**
   * Section for user's local WASM servers.
   */
  localServers: LocalServersSectionVM;

  /**
   * Remote connection form (collapsible, for connecting to HTTP servers).
   */
  remoteConnection: RemoteConnectionSectionVM;
}

// =============================================================================
// Demos Section
// =============================================================================

/**
 * Demos section - pre-loaded databases for exploration.
 *
 * These are built-in demo databases that showcase TypeDB features.
 * Each demo loads instantly (WASM) and comes with sample data + queries.
 */
export interface DemosSectionVM {
  /**
   * List of available demo databases.
   */
  items$: Queryable<DemoItemVM[]>;

  /**
   * Whether demos are loading (fetching demo catalog).
   */
  isLoading$: Queryable<boolean>;
}

/**
 * Individual demo database item.
 */
export interface DemoItemVM {
  /** Unique key for React rendering */
  key: string;

  /**
   * Demo identifier (e.g., "social-network", "e-commerce").
   */
  id: string;

  /**
   * Display name (e.g., "Social Network", "E-Commerce").
   */
  name: string;

  /**
   * Short description of what the demo showcases.
   * @example "Explore relationships between people, posts, and interactions"
   */
  description: string;

  /**
   * Icon identifier for the demo.
   * Can be a Lucide icon name or custom icon.
   */
  icon: string;

  /**
   * Example queries that showcase this demo's features.
   * These are displayed in the query sidebar when demo is active.
   */
  exampleQueries: DemoExampleQueryVM[];

  /**
   * Loads this demo and navigates to query page.
   *
   * If demo is already active, just navigates to query page without reloading.
   *
   * **Flow:**
   * 1. If already active, just navigate to /query
   * 2. Otherwise: Create WASM server with demo name
   * 3. Load demo schema and data
   * 4. Navigate to /query
   * 5. Show welcome toast with demo tips
   */
  load(): Promise<void>;

  /**
   * Whether this demo is currently loading.
   */
  isLoading$: Queryable<boolean>;

  /**
   * Whether this demo is currently active (connected and selected).
   *
   * **Visual:** Active demos show a checkmark or "Active" badge.
   * Clicking an active demo just navigates to the query page.
   */
  isActive$: Queryable<boolean>;
}

/**
 * Example query for a demo database.
 */
export interface DemoExampleQueryVM {
  /** Unique key for React rendering */
  key: string;

  /** Query name (e.g., "All Users", "Popular Posts") */
  name: string;

  /** Description of what this query does */
  description: string;

  /** TypeQL query text */
  query: string;

  /** Runs this query (sets it in the editor) */
  run(): void;
}

// =============================================================================
// Local Servers Section
// =============================================================================

/**
 * Local servers section - user's in-memory WASM servers.
 *
 * Each server:
 * - Has a unique ID
 * - Can contain multiple databases
 * - Persists via LiveStore (metadata) + snapshots (data)
 * - Can be deleted
 */
export interface LocalServersSectionVM {
  /**
   * List of user's local servers.
   * Sorted by last used date.
   */
  items$: Queryable<LocalServerItemVM[]>;

  /**
   * Whether the list is empty.
   */
  isEmpty$: Queryable<boolean>;

  /**
   * Creates a new local server.
   *
   * **Flow:**
   * 1. Generate unique server ID
   * 2. Prompt for server name (or auto-generate)
   * 3. Create WASM server instance
   * 4. Save to LiveStore
   * 5. Navigate to /query with new server active
   */
  createNew(): void;

  /**
   * Disabled state for create button.
   * May be disabled if max servers reached.
   */
  createDisabled$: Queryable<DisabledState>;

  /**
   * Imports a server from a snapshot file.
   *
   * **Flow:**
   * 1. Open file picker for .typedb-snapshot file
   * 2. Validate snapshot format
   * 3. Create new server with imported data
   * 4. Save to LiveStore
   */
  importSnapshot(): void;
}

/**
 * Individual local server item.
 */
export interface LocalServerItemVM {
  /** Unique key for React rendering */
  key: string;

  /**
   * Unique server identifier.
   * Format: "local_{nanoid}"
   */
  id: string;

  /**
   * User-provided or auto-generated name.
   * @example "my-project", "testing", "Local Server 1"
   */
  name: string;

  /**
   * Number of databases in this server.
   */
  databaseCount$: Queryable<number>;

  /**
   * Last time this server was used.
   */
  lastUsedAt: Date | null;

  /**
   * Human-readable last used time.
   * @example "2 hours ago", "Yesterday", "Dec 15, 2025"
   */
  lastUsedDisplay: string;

  /**
   * Connects to this server and navigates to query page.
   */
  connect(): void;

  /**
   * Exports this server's data as a snapshot file.
   *
   * **Flow:**
   * 1. Export all databases to snapshot
   * 2. Trigger browser download
   * 3. Show success toast
   */
  exportSnapshot(): void;

  /**
   * Deletes this server permanently.
   *
   * **Flow:**
   * 1. Show confirmation dialog
   * 2. On confirm: delete from LiveStore
   * 3. Clear any cached WASM data
   * 4. Show success toast
   */
  delete(): void;

  /**
   * Opens rename dialog for this server.
   */
  rename(): void;

  /**
   * Whether this server is currently connected.
   */
  isActive$: Queryable<boolean>;
}

// =============================================================================
// Remote Connection Section
// =============================================================================

/**
 * Remote connection section - connect to TypeDB HTTP server.
 *
 * Collapsible section for connecting to remote servers.
 * Hidden by default to emphasize local/demo options.
 */
export interface RemoteConnectionSectionVM {
  /**
   * Whether the remote connection form is expanded.
   */
  isExpanded$: Queryable<boolean>;

  /**
   * Toggles the expanded state.
   */
  toggleExpanded(): void;

  /**
   * The connection form (same as before).
   */
  form: ConnectionFormVM;

  /**
   * Saved remote connections.
   */
  savedConnections: SavedConnectionsListVM;
}

/**
 * Connection form VM.
 *
 * Supports two modes:
 * - URL mode: Single input for typedb://user:pass@host:port/database
 * - Credentials mode: Separate inputs for address, username, password
 *
 * The modes auto-sync: editing one updates the other.
 */
export interface ConnectionFormVM {
  /**
   * Current input mode.
   *
   * **Default:** "credentials" (more explicit for first-time users)
   *
   * **Sync behavior:**
   * - Switching modes preserves entered data where possible
   * - Invalid URL in URL mode shows validation error but still populates credential fields
   */
  mode$: Queryable<"url" | "credentials">;

  /**
   * Switches between URL and credentials input modes.
   * Triggers sync of values between modes.
   */
  setMode(mode: "url" | "credentials"): void;

  /**
   * URL mode input field.
   *
   * **Format:** typedb://username:password@http://host:port/database
   *
   * **Validation errors:**
   * - "Invalid URL format"
   * - "Missing username"
   * - "Missing password"
   *
   * **Paste detection:** Pasting a URL into any field auto-fills all fields and switches to URL mode.
   */
  urlInput: FormInputVM;

  /**
   * Server address input (credentials mode).
   *
   * **Format:** http://host:port or https://host:port
   * **Default placeholder:** "http://localhost:8000"
   *
   * **Validation errors:**
   * - "Address is required"
   * - "Invalid address format"
   */
  addressInput: FormInputVM;

  /**
   * Username input (credentials mode).
   *
   * **Default placeholder:** "admin"
   *
   * **Validation errors:**
   * - "Username is required"
   */
  usernameInput: FormInputVM;

  /**
   * Password input (credentials mode).
   *
   * **Security:** Password is never persisted to localStorage.
   * Only the connection name and address are saved.
   */
  passwordInput: PasswordInputVM;

  /**
   * Fills the form with example connection details.
   *
   * **Example values:**
   * - Address: http://localhost:8000
   * - Username: admin
   * - Password: admin
   *
   * **Use case:** Quick start for local development servers.
   */
  fillExample(): void;

  /**
   * Safari-specific HTTP warning.
   *
   * **Shown when:**
   * - Browser is Safari AND
   * - Address uses HTTP (not HTTPS)
   *
   * **Warning message:** Explains Safari's stricter security for HTTP connections.
   */
  safariHttpWarning$: Queryable<{ visible: boolean; message: string }>;

  /**
   * Disabled state for the Connect button.
   *
   * **Disabled conditions (checked in order):**
   * - "Address is required" - No address entered
   * - "Username is required" - No username entered
   * - "Password is required" - No password entered
   * - "Invalid URL format" - URL mode with malformed URL
   */
  connectDisabled$: Queryable<DisabledState>;

  /**
   * Initiates connection to the server.
   *
   * **Flow:**
   * 1. Validate all fields
   * 2. Set isConnecting$ = true
   * 3. Attempt connection (10s timeout)
   * 4. On success:
   *    - Save to connection history
   *    - Navigate to /query
   *    - Show toast "Connected to {serverAddress}"
   * 5. On failure:
   *    - Set isConnecting$ = false
   *    - Show persistent error toast with reason
   *    - Keep form populated for retry
   */
  connect(): void;

  /**
   * Whether a connection attempt is in progress.
   *
   * **Visual:**
   * - Connect button shows spinner
   * - All inputs are disabled
   * - "Connecting..." text shown
   */
  isConnecting$: Queryable<boolean>;
}

/**
 * Saved connections list VM.
 */
export interface SavedConnectionsListVM {
  /**
   * List of saved connection entries.
   *
   * **Order:** Most recently used first.
   * **Limit:** Last 10 connections.
   */
  items$: Queryable<SavedConnectionItemVM[]>;

  /**
   * Whether the list is empty.
   *
   * **Empty state message:** "No recent connections"
   */
  isEmpty$: Queryable<boolean>;
}

/**
 * Individual saved connection item.
 */
export interface SavedConnectionItemVM {
  /** Unique key for React rendering */
  key: string;

  /**
   * Display name for the connection.
   * User-provided or auto-generated from address.
   */
  nameDisplay: string;

  /**
   * Server address summary.
   * @example "localhost:8000", "production.typedb.com:8729"
   */
  addressDisplay: string;

  /**
   * Whether this connection auto-connects on app startup.
   * Visual: Star icon or "Startup" badge.
   */
  isStartupConnection$: Queryable<boolean>;

  /**
   * Selects this connection and fills the form.
   *
   * **Behavior:**
   * - Fills address and username
   * - Does NOT fill password (security)
   * - Focuses password field for quick entry
   */
  select(): void;

  /**
   * Removes this connection from saved list.
   * Shows confirmation dialog first.
   */
  remove(): void;

  /**
   * Toggles startup connection status.
   * Only one connection can be the startup connection.
   */
  toggleStartup(): void;
}
