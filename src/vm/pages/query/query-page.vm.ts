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
import type { DocumentViewerVM } from "../../learn/document-viewer.vm";

/**
 * Query page VM.
 *
 * **Layout (with docs pane open):**
 * ```
 * ┌──────────────┬───────────────────────┬─────────────┐
 * │   Sidebar    │  Query Editor         │  Docs Pane  │
 * │   (resize)   │  ┌───────────────────┐│ (resizable) │
 * │              │  │ [code] [run]      ││             │
 * │ ┌──────────┐ │  ├───────────────────┤│ ┌─────────┐│
 * │ │ Learn    │ │  │ TypeQL editor     ││ │ Doc     ││
 * │ │ (collapse)│ │  │                   ││ │ content ││
 * │ └──────────┘ │  └───────────────────┘│ └─────────┘│
 * │              │  Results              │             │
 * │ ┌──────────┐ │  ┌───────────────────────────────┐ │
 * │ │ Schema   │ │  │ [log|table|graph|raw]        │ │
 * │ │ (collapse)│ │  │ Output content               │ │
 * │ └──────────┘ │  └───────────────────────────────┘ │
 * │              │  History Bar                       │
 * │ ┌──────────┐ └────────────────────────────────────┘
 * │ │ Saved    │
 * │ │ Queries  │
 * │ └──────────┘
 * └──────────────┘
 * ```
 *
 * **Resizing:**
 * - Sidebar width is resizable (drag handle on right edge)
 * - Editor/Docs split is resizable when docs pane is open
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
   * Documentation viewer shown in a split pane alongside the editor.
   * Opens when user clicks Learn/Reference items in the sidebar.
   * Stays open even when interacting with other sidebar sections.
   */
  docsViewer: DocumentViewerVM;

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
