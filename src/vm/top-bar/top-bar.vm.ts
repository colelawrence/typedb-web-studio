/**
 * Top bar view model containing global navigation and status.
 *
 * The top bar is always visible and contains:
 * - Logo (clickable, navigates to home)
 * - Navigation tabs (Home, Connect, Query, Schema, Users)
 * - Database selector (when connected)
 * - Connection status indicator
 */

import type { NavigationVM } from "./navigation.vm";
import type { DatabaseSelectorVM } from "./database-selector.vm";
import type { ConnectionStatusVM } from "./connection-status.vm";

/**
 * Top bar VM composing all header components.
 *
 * **Layout (left to right):**
 * ```
 * [Logo] [Home] [Connect] [Query] [Schema] [Users] ... [DB Selector ▼] [● Status]
 * ```
 *
 * **Responsive behavior:**
 * - On narrow screens, navigation collapses to hamburger menu
 * - Database selector and status remain visible
 */
export interface TopBarVM {
  /**
   * Logo click handler.
   * Navigates to home page ("/").
   *
   * **Visual:** Logo should have hover state (slight scale or opacity change).
   * **Accessibility:** aria-label="TypeDB Studio Home"
   */
  logoClick(): void;

  /**
   * Main navigation tabs.
   */
  navigation: NavigationVM;

  /**
   * Database selector dropdown.
   * Only visible when connected to a server.
   */
  databaseSelector: DatabaseSelectorVM;

  /**
   * Connection status indicator.
   * Shows current connection state with visual beacon.
   */
  connectionStatus: ConnectionStatusVM;
}

// Re-export child VMs for convenience
export type { NavigationVM } from "./navigation.vm";
export type { DatabaseSelectorVM } from "./database-selector.vm";
export type { ConnectionStatusVM } from "./connection-status.vm";
