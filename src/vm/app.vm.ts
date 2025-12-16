/**
 * Root application view model for TypeDB Studio.
 *
 * This is the top-level VM that composes all page and global VMs.
 * The structure mirrors the application shell layout:
 * - Top bar (logo, navigation, database selector, connection status)
 * - Snackbar notifications
 * - Page content (routed based on current URL)
 * - Modal dialogs (overlays on top of page content)
 */

import type { Queryable } from "./types";
import type { TopBarVM } from "./top-bar/top-bar.vm";
import type { SnackbarVM } from "./snackbar.vm";
import type { HomePageVM } from "./pages/home/home-page.vm";
import type { ConnectPageVM } from "./pages/connect/connect-page.vm";
import type { QueryPageVM } from "./pages/query/query-page.vm";
import type { UsersPageVM } from "./pages/users/users-page.vm";
import type { LearnPageVM } from "./pages/learn/learn-page.vm";
import type { DialogsVM } from "./dialogs/dialogs.vm";

/**
 * Root VM for the entire TypeDB Studio application.
 *
 * **Layout Structure:**
 * ```
 * ┌─────────────────────────────────────────────────────┐
 * │ TopBar: Logo | Navigation | DB Selector | Status   │
 * ├─────────────────────────────────────────────────────┤
 * │                                                     │
 * │                  Page Content                       │
 * │           (based on currentPage$)                   │
 * │                                                     │
 * └─────────────────────────────────────────────────────┘
 * [Snackbar notifications at bottom]
 * [Modal dialogs as overlays]
 * ```
 */
export interface TypeDBStudioAppVM {
  /**
   * Top bar containing logo, navigation, database selector, and connection status.
   * Always visible regardless of current page.
   */
  topBar: TopBarVM;

  /**
   * Snackbar/toast notification system.
   * Shows success, warning, and error messages at the bottom of the screen.
   */
  snackbar: SnackbarVM;

  /**
   * Currently active page based on route.
   *
   * **Page types:**
   * - `"home"`: Landing page with navigation cards
   * - `"connect"`: Server connection form and saved connections
   * - `"query"`: Query editor, results, saved queries
   * - `"schema"`: Schema tree and graph visualization
   * - `"users"`: User management table
   *
   * **Routing:** Page changes are triggered by navigation clicks or URL changes.
   * The VM layer doesn't control routing directly - it receives the current page.
   */
  currentPage$: Queryable<CurrentPageState>;

  /**
   * Modal dialog system.
   * Only one dialog can be open at a time.
   * Dialogs render as overlays on top of the current page.
   */
  dialogs: DialogsVM;

  /**
   * Debug information for development tools.
   * Contains internal state useful for debugging but not for UI rendering.
   * Structure is intentionally opaque - don't rely on specific fields.
   */
  _dev: Record<string, unknown>;
}

/**
 * Discriminated union of all possible page states.
 * Each page has its own VM type containing all page-specific state and actions.
 *
 * Note: Schema page has been removed - schema is now shown as a panel
 * in the Query page reference panel.
 */
export type CurrentPageState =
  | { page: "home"; vm: HomePageVM }
  | { page: "connect"; vm: ConnectPageVM }
  | { page: "query"; vm: QueryPageVM }
  | { page: "users"; vm: UsersPageVM }
  | { page: "learn"; vm: LearnPageVM };
