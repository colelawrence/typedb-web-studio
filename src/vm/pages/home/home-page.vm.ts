/**
 * Home page view model.
 *
 * Simple landing page with navigation cards and connection status summary.
 * Primary purpose is to guide users to the main features.
 */

import type { Queryable } from "../../types";
import type { IconComponent, DisabledState } from "../../types";

/**
 * Home page VM.
 *
 * **Layout:**
 * ```
 * ┌─────────────────────────────────────────┐
 * │        Welcome to TypeDB Studio         │
 * │          {connectionSummary}            │
 * │                                         │
 * │  ┌─────────┐ ┌─────────┐ ┌─────────┐   │
 * │  │ Connect │ │  Query  │ │ Schema  │   │
 * │  │  Card   │ │  Card   │ │  Card   │   │
 * │  └─────────┘ └─────────┘ └─────────┘   │
 * └─────────────────────────────────────────┘
 * ```
 */
export interface HomePageVM {
  /**
   * Navigation cards for main features.
   *
   * **Card order:** Connect, Query, Schema
   * **Responsive:** Cards stack vertically on narrow screens.
   */
  cards$: Queryable<HomeNavigationCardVM[]>;

  /**
   * Connection status summary text.
   *
   * **Format:**
   * - When disconnected: "Connect to a TypeDB server to get started"
   * - When connected: "Connected to {serverAddress}"
   * - When reconnecting: "Reconnecting to {serverAddress}..."
   */
  connectionSummary$: Queryable<string>;
}

/**
 * Navigation card on the home page.
 */
export interface HomeNavigationCardVM {
  /** Unique key for React rendering */
  key: string;

  /**
   * Card title.
   * @example "Connect to Server", "Query Editor", "Schema Explorer"
   */
  title: string;

  /**
   * Card description explaining the feature.
   * @example "Connect to a TypeDB server to start querying"
   */
  description: string;

  /**
   * Icon representing the feature.
   * Displayed prominently on the card.
   */
  icon: IconComponent;

  /**
   * Disabled state with reason.
   *
   * **Disabled conditions:**
   * - Query card: "Connect to a server first" (when disconnected)
   * - Schema card: "Connect to a server first" (when disconnected)
   * - Connect card: Never disabled
   *
   * **Visual:** Disabled cards have reduced opacity and no hover effect.
   */
  disabled$: Queryable<DisabledState>;

  /**
   * Navigates to the feature's page.
   * No-op if card is disabled.
   *
   * **Routes:**
   * - Connect → /connect
   * - Query → /query
   * - Schema → /schema
   */
  click(): void;
}
