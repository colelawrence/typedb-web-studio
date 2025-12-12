/**
 * Query results view model.
 *
 * Displays query output in multiple formats: log, table, graph, raw JSON.
 */

import type { Queryable } from "../../../types";
import type { DisabledState } from "../../../types";

/**
 * Query results VM.
 *
 * **Layout:**
 * ```
 * ┌─────────────────────────────────────────────────────┐
 * │ [Log] [Table] [Graph] [Raw]                        │
 * ├─────────────────────────────────────────────────────┤
 * │                                                     │
 * │  (Output content based on selected tab)             │
 * │                                                     │
 * └─────────────────────────────────────────────────────┘
 * ```
 */
export interface QueryResultsVM {
  /**
   * Currently selected output tab.
   *
   * **Default:** "log"
   * **Persistence:** Selection is session-only.
   */
  selectedTab$: Queryable<"log" | "table" | "graph" | "raw">;

  /**
   * Changes the selected output tab.
   */
  setTab(tab: "log" | "table" | "graph" | "raw"): void;

  /**
   * Disabled state for the entire results pane.
   *
   * **Disabled when:**
   * - Not connected to server
   */
  disabled$: Queryable<DisabledState>;

  /**
   * Log output view.
   */
  log: LogOutputVM;

  /**
   * Table output view.
   */
  table: TableOutputVM;

  /**
   * Graph output view.
   */
  graph: GraphOutputVM;

  /**
   * Raw JSON output view.
   */
  raw: RawOutputVM;
}

/**
 * Log output view model.
 *
 * Shows formatted text output with timestamps and status.
 */
export interface LogOutputVM {
  /**
   * Formatted log content.
   *
   * **Format:**
   * ```
   * ## Running> match $p isa person; fetch $p: name;
   *
   * ## Timestamp> 2024-01-15T10:30:45.123Z
   *
   * ## Result> Success (245ms)
   *
   * [Query results formatted as text]
   * ```
   *
   * **Empty state:** Empty string when no query has run.
   */
  content$: Queryable<string>;

  /**
   * Whether there is content to display.
   */
  hasContent$: Queryable<boolean>;

  /**
   * Copies log content to clipboard.
   *
   * **Feedback:**
   * - Icon changes: copy → check (3 seconds)
   * - No toast needed (inline feedback sufficient)
   *
   * **Error:** Shows error toast if clipboard API fails.
   */
  copy(): void;

  /**
   * Whether copy was recently successful.
   * True for 3 seconds after copy, then false.
   */
  copySuccess$: Queryable<boolean>;

  /**
   * Sends log content to AI chat assistant.
   *
   * **Flow:**
   * 1. Switch editor to chat mode
   * 2. Paste log content as user message
   * 3. Auto-submit to AI
   *
   * **Feedback:** Brief "sent" indicator (3 seconds).
   */
  sendToAI(): void;

  /**
   * Whether sendToAI was recently triggered.
   */
  sentToAI$: Queryable<boolean>;

  /**
   * Disabled state for copy/sendToAI buttons.
   *
   * **Disabled when:** No content to copy.
   */
  actionsDisabled$: Queryable<DisabledState>;
}

/**
 * Table output view model.
 *
 * Shows query results in a sortable data table.
 */
export interface TableOutputVM {
  /**
   * Current table status.
   *
   * **States:**
   * - `"idle"`: No query run yet
   * - `"running"`: Query in progress, show skeleton/spinner
   * - `"success"`: Results available
   * - `"empty"`: Query succeeded but returned zero rows
   * - `"notApplicable"`: Query type doesn't return tabular data (define, undefine)
   * - `"error"`: Query failed
   */
  status$: Queryable<TableStatus>;

  /**
   * Message to show for non-success states.
   *
   * **Messages:**
   * - idle: "Run a query to see results"
   * - running: "Running query..."
   * - empty: "No results found"
   * - notApplicable: "This query type does not return tabular data"
   * - error: "Query failed: {errorMessage}"
   */
  statusMessage$: Queryable<string | null>;

  /**
   * Column definitions.
   * Empty array if status is not "success".
   */
  columns$: Queryable<TableColumnVM[]>;

  /**
   * Row data.
   * Empty array if status is not "success" or no rows returned.
   *
   * **Limit:** Max 1000 rows displayed. Shows warning if truncated.
   */
  rows$: Queryable<TableRowVM[]>;

  /**
   * Whether results were truncated due to row limit.
   */
  isTruncated$: Queryable<boolean>;

  /**
   * Total row count before truncation.
   * Used to show "Showing 1000 of 5432 rows".
   */
  totalRowCount$: Queryable<number>;

  /**
   * Current sort state.
   */
  sort$: Queryable<{ column: string; direction: "asc" | "desc" } | null>;

  /**
   * Updates sort state.
   *
   * **Behavior:**
   * - Click column: Sort ascending
   * - Click same column: Toggle to descending
   * - Click same column again: Remove sort
   *
   * **Visual:** Arrow indicator on sorted column header.
   */
  setSort(column: string | null, direction?: "asc" | "desc"): void;
}

export type TableStatus = "idle" | "running" | "success" | "empty" | "notApplicable" | "error";

/**
 * Table column definition.
 */
export interface TableColumnVM {
  /** Column key (variable name from query) */
  key: string;

  /**
   * Display label for column header.
   * Usually the TypeQL variable name (e.g., "$person", "$name").
   */
  label: string;

  /**
   * Whether this column is currently sorted.
   */
  isSorted$: Queryable<boolean>;

  /**
   * Current sort direction for this column.
   * `null` if not sorted.
   */
  sortDirection$: Queryable<"asc" | "desc" | null>;
}

/**
 * Table row data.
 */
export interface TableRowVM {
  /** Unique key for React rendering */
  key: string;

  /**
   * Cell values by column key.
   * Values are pre-formatted as display strings.
   */
  cells: Record<string, string>;
}

/**
 * Graph output view model.
 *
 * Shows query results as an interactive node graph.
 */
export interface GraphOutputVM {
  /**
   * Current graph status.
   *
   * **States:**
   * - `"idle"`: No query run yet
   * - `"running"`: Query in progress
   * - `"success"`: Graph rendered
   * - `"empty"`: Query returned no graph data
   * - `"notApplicable"`: Query type doesn't produce graph (fetch queries)
   * - `"error"`: Rendering failed
   */
  status$: Queryable<GraphStatus>;

  /**
   * Message for non-success states.
   */
  statusMessage$: Queryable<string | null>;

  /**
   * Ref setter for the canvas container element.
   * The graph library (Sigma, vis.js, etc.) renders into this element.
   */
  setCanvasRef(element: HTMLElement | null): void;

  /**
   * Zoom controls.
   */
  zoom: {
    /** Current zoom level (1.0 = 100%) */
    level$: Queryable<number>;

    /**
     * Zooms in by 25%.
     * Max zoom: 400%
     */
    zoomIn(): void;

    /**
     * Zooms out by 25%.
     * Min zoom: 25%
     */
    zoomOut(): void;

    /**
     * Resets to 100% and centers the graph.
     */
    reset(): void;
  };

  /**
   * Currently selected node.
   * `null` if no node is selected.
   */
  selectedNode$: Queryable<GraphNodeVM | null>;

  /**
   * Currently hovered node.
   * `null` if not hovering over any node.
   */
  hoveredNode$: Queryable<GraphNodeVM | null>;
}

export type GraphStatus = "idle" | "running" | "success" | "empty" | "notApplicable" | "error";

/**
 * Graph node representation.
 */
export interface GraphNodeVM {
  /** Unique key */
  key: string;

  /**
   * Display label for the node.
   */
  label: string;

  /**
   * Node type for visual styling.
   *
   * **Shapes:**
   * - entity: Rectangle
   * - relation: Diamond
   * - attribute: Oval/ellipse
   */
  type: "entity" | "relation" | "attribute";

  /**
   * Additional details for tooltip/panel display.
   * Key-value pairs of attribute names and values.
   */
  details: Record<string, string>;
}

/**
 * Raw JSON output view model.
 *
 * Shows the unformatted query response as JSON.
 */
export interface RawOutputVM {
  /**
   * Pretty-printed JSON content.
   * Empty string if no query has run.
   *
   * **Format:** 2-space indentation, syntax highlighted.
   */
  content$: Queryable<string>;

  /**
   * Whether there is content to display.
   */
  hasContent$: Queryable<boolean>;

  /**
   * Copies raw JSON to clipboard.
   */
  copy(): void;

  /**
   * Whether copy was recently successful.
   */
  copySuccess$: Queryable<boolean>;
}
