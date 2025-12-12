/**
 * Connection status indicator view model.
 *
 * Shows a visual beacon and text indicating current connection state.
 * Provides quick access to sign out when connected.
 */

import type { Queryable } from "../types";

/**
 * Connection status indicator VM.
 *
 * **Visual representation:**
 * ```
 * [●] Connected to admin@localhost:8729
 * ```
 *
 * The beacon color and text change based on connection state.
 */
export interface ConnectionStatusVM {
  /**
   * Current connection state.
   *
   * **State transitions:**
   * - disconnected → connecting: User submits connection form
   * - connecting → connected: Server responds successfully
   * - connecting → disconnected: Connection fails (shows error toast)
   * - connected → reconnecting: Network interruption detected
   * - reconnecting → connected: Connection restored (shows success toast)
   * - reconnecting → disconnected: Reconnection fails after 3 retries
   * - connected → disconnected: User signs out (may require confirmation)
   *
   * **Timeout:** connecting state auto-fails after 10 seconds.
   */
  state$: Queryable<ConnectionState>;

  /**
   * User-facing display text for the connection status.
   *
   * **Format by state:**
   * - disconnected: "Not connected"
   * - connecting: "Connecting..."
   * - connected: "{username}@{serverAddress}" (e.g., "admin@localhost:8729")
   * - reconnecting: "Reconnecting..."
   *
   * **Accessibility:** Announced by screen readers when state changes.
   */
  displayText$: Queryable<string>;

  /**
   * Beacon visual class for CSS styling.
   *
   * **Color mapping:**
   * - `"error"` (red): disconnected state
   * - `"ok"` (green): connected state
   * - `"warn"` (amber): connecting or reconnecting state
   *
   * **Animation:** "warn" state includes subtle pulse animation.
   */
  beaconVariant$: Queryable<"error" | "ok" | "warn">;

  /**
   * Tooltip text for the beacon on hover.
   * Capitalizes state: "Disconnected", "Connecting", "Connected", "Reconnecting"
   *
   * **Touch devices:** Show as visible text instead of tooltip.
   */
  beaconTooltip$: Queryable<string>;

  /**
   * Whether clicking the status area opens a menu/action.
   *
   * - `true` when connected (can sign out)
   * - `false` otherwise (clicking navigates to /connect instead)
   *
   * **Visual:** Pointer cursor and hover highlight when true.
   */
  isClickable$: Queryable<boolean>;

  /**
   * Handles click on the status area.
   *
   * **Behavior by state:**
   * - disconnected: Navigate to /connect page
   * - connecting: No-op (connection in progress)
   * - connected: Open sign-out confirmation or menu
   * - reconnecting: No-op (reconnection in progress)
   */
  click(): void;

  /**
   * Signs out from the current server.
   *
   * **Confirmation flow:**
   * - If no uncommitted changes: Signs out immediately
   * - If uncommitted changes: Opens confirmation dialog first
   *
   * **Post-sign-out:**
   * - Connection state → disconnected
   * - Cached data cleared (database list, schema, query results)
   * - Navigate to /connect page
   * - Show toast "Signed out"
   *
   * **Preserved data:** Saved queries and connection history remain in localStorage.
   */
  signOut(): void;
}

/**
 * Connection state enum.
 */
export type ConnectionState = "disconnected" | "connecting" | "connected" | "reconnecting";
