/**
 * Query page view model.
 *
 * The main workspace for writing and executing TypeQL queries.
 * Contains editor, results pane, sidebar, and history bar.
 */

import type { Queryable } from "../../types";
import type { QuerySidebarVM } from "./sidebar/query-sidebar.vm";
import type { QueryEditorVM } from "./editor/query-editor.vm";
import type { QueryResultsVM } from "./results/query-results.vm";
import type { QueryHistoryBarVM } from "./history/query-history-bar.vm";

/**
 * Query page VM.
 *
 * **Layout:**
 * ```
 * ┌──────────────┬─────────────────────────────────────┐
 * │   Sidebar    │  Query Editor                       │
 * │   (resize)   │  ┌─────────────────────────────────┐│
 * │              │  │ [code|chat] [new][save][run]    ││
 * │ ┌──────────┐ │  ├─────────────────────────────────┤│
 * │ │ Schema   │ │  │ TypeQL code editor              ││
 * │ │ (collapse)│ │  │                                 ││
 * │ └──────────┘ │  └─────────────────────────────────┘│
 * │              │  Results                            │
 * │ ┌──────────┐ │  ┌─────────────────────────────────┐│
 * │ │ Saved    │ │  │ [log|table|graph|raw]          ││
 * │ │ Queries  │ │  │                                 ││
 * │ │ (collapse)│ │  │ Output content                  ││
 * │ └──────────┘ │  └─────────────────────────────────┘│
 * │              │  History Bar (compact, expandable)  │
 * └──────────────┴─────────────────────────────────────┘
 * ```
 *
 * **Resizing:**
 * - Sidebar width is resizable (drag handle on right edge)
 * - Editor/Results split is resizable (drag handle between them)
 * - Minimum widths prevent collapsing to unusable sizes
 */
export interface QueryPageVM {
  /**
   * Left sidebar containing schema tree and saved queries.
   */
  sidebar: QuerySidebarVM;

  /**
   * Query editor with code/chat modes and action buttons.
   */
  editor: QueryEditorVM;

  /**
   * Query results display with multiple output formats.
   */
  results: QueryResultsVM;

  /**
   * Compact history bar at the bottom.
   */
  historyBar: QueryHistoryBarVM;

  /**
   * Placeholder state when page cannot function.
   *
   * **Placeholder types:**
   * - `"noServer"`: Not connected to any server
   *   - Shows: "Connect to a server to start querying"
   *   - Action: Navigate to /connect
   * - `"noDatabase"`: Connected but no database selected
   *   - Shows: "Select a database to start querying"
   *   - Action: Open database selector dropdown
   *
   * **Visual:** Placeholder overlays the main content area.
   * Sidebar remains visible but schema section shows skeleton/empty.
   */
  placeholder$: Queryable<QueryPagePlaceholder | null>;
}

/**
 * Placeholder state for the query page.
 */
export type QueryPagePlaceholder =
  | { type: "noServer"; message: string; actionLabel: string; action: () => void }
  | { type: "noDatabase"; message: string; actionLabel: string; action: () => void };

// Re-export child VMs
export type { QuerySidebarVM } from "./sidebar/query-sidebar.vm";
export type { QueryEditorVM } from "./editor/query-editor.vm";
export type { QueryResultsVM } from "./results/query-results.vm";
export type { QueryHistoryBarVM } from "./history/query-history-bar.vm";
