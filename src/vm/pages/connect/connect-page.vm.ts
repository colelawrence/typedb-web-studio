/**
 * Connect page view model.
 *
 * Provides the connection form and saved connections list.
 * Supports both URL-based and credential-based connection methods.
 */

import type { Queryable } from "../../types";
import type { FormInputVM, PasswordInputVM, DisabledState } from "../../types";

/**
 * Connect page VM.
 *
 * **Layout:**
 * ```
 * ┌──────────────────────────────────────────────────┐
 * │  Connect to TypeDB Server                        │
 * │                                                  │
 * │  ┌────────────────────────────────────────────┐  │
 * │  │         Connection Form                    │  │
 * │  │  [URL mode] / [Credentials mode]           │  │
 * │  │  ┌────────────────────────────────────┐    │  │
 * │  │  │ Input fields based on mode         │    │  │
 * │  │  └────────────────────────────────────┘    │  │
 * │  │  [Fill Example]           [Connect]        │  │
 * │  └────────────────────────────────────────────┘  │
 * │                                                  │
 * │  Recent Connections                              │
 * │  ┌────────────────────────────────────────────┐  │
 * │  │ connection-1    │ localhost:8729          │  │
 * │  │ connection-2    │ production.example.com  │  │
 * │  └────────────────────────────────────────────┘  │
 * └──────────────────────────────────────────────────┘
 * ```
 */
export interface ConnectPageVM {
  /**
   * Connection form for entering server details.
   */
  form: ConnectionFormVM;

  /**
   * List of previously saved connections.
   * Click to auto-fill the form.
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
