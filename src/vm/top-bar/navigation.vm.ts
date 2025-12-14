/**
 * Main navigation view model.
 *
 * Renders as horizontal tabs in the top bar.
 * Items are conditionally shown based on connection state.
 */

import type { Queryable } from "../types";
import type { IconComponent } from "../types";

/**
 * Navigation tabs VM.
 *
 * **Conditional visibility by connection state:**
 * - Disconnected: Home, Connect
 * - Connected: Home, Connect, Query, Schema, Users
 *
 * **Tab order:** Items appear in a fixed order when visible.
 * **Keyboard navigation:** Arrow keys move between tabs, Enter/Space activates.
 */
export interface NavigationVM {
  /**
   * Navigation items in display order.
   * Items are dynamically shown/hidden based on connection state.
   * The order is always: Home, Connect, Query, Schema, Users (when visible).
   */
  items$: Queryable<NavigationItemVM[]>;
}

/**
 * Individual navigation tab item.
 *
 * Items are only present in the items$ array when they should be visible.
 * There is no disabled state - items are either shown or hidden.
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
   * Navigates to this tab's route.
   * No-op if already on this tab.
   */
  click(): void;
}
