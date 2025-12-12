/**
 * Main navigation view model.
 *
 * Renders as horizontal tabs in the top bar.
 * Some items may be disabled based on connection state.
 */

import type { Queryable } from "../types";
import type { IconComponent, DisabledState } from "../types";

/**
 * Navigation tabs VM.
 *
 * **Tab order:** Home, Connect, Query, Schema, Users
 * **Keyboard navigation:** Arrow keys move between tabs, Enter/Space activates.
 */
export interface NavigationVM {
  /**
   * Navigation items in display order.
   * Order is fixed; items are never added/removed dynamically.
   */
  items$: Queryable<NavigationItemVM[]>;
}

/**
 * Individual navigation tab item.
 */
export interface NavigationItemVM {
  /** Unique key for React rendering */
  key: string;

  /**
   * Display label for the tab.
   * @example "Home", "Connect", "Query", "Schema", "Users"
   */
  label: string;

  /**
   * Icon component to show before the label.
   * Icons help with quick visual recognition.
   */
  icon: IconComponent;

  /**
   * Whether this tab is currently active (matches current route).
   *
   * **Visual:** Active tab has highlighted/underlined style.
   * **Accessibility:** aria-current="page" when active.
   */
  isActive$: Queryable<boolean>;

  /**
   * Disabled state with reason.
   *
   * **Disabled conditions by tab:**
   * - Home: Never disabled
   * - Connect: Never disabled
   * - Query: "Connect to a server first" (when disconnected)
   * - Schema: "Connect to a server first" (when disconnected)
   * - Users: "Connect to a server first" (when disconnected)
   *
   * **Visual:** Disabled tabs are grayed out with reduced opacity.
   * **Interaction:** Clicking disabled tab shows tooltip with reason.
   */
  disabled$: Queryable<DisabledState>;

  /**
   * Navigates to this tab's route.
   * No-op if already on this tab or if disabled.
   */
  click(): void;
}
