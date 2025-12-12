/**
 * Query history bar view model.
 *
 * Compact bar at the bottom showing recent query executions.
 * Expandable to show full history list.
 */

import type { Queryable } from "../../../types";
import type { IconComponent } from "../../../types";

/**
 * Query history bar VM.
 *
 * **Collapsed state:**
 * ```
 * ┌─────────────────────────────────────────────────────┐
 * │ ✓ match $p isa person...  2s ago  (245ms)    [▼]   │
 * └─────────────────────────────────────────────────────┘
 * ```
 *
 * **Expanded state:**
 * ```
 * ┌─────────────────────────────────────────────────────┐
 * │ History                                       [▲]   │
 * ├─────────────────────────────────────────────────────┤
 * │ ✓ match $p isa person...       2s ago  (245ms)     │
 * │ ✓ define person sub entity...  5m ago  (123ms)     │
 * │ ✗ match $x isa invalid...      1h ago  (45ms)  [!] │
 * └─────────────────────────────────────────────────────┘
 * ```
 */
export interface QueryHistoryBarVM {
  /**
   * Whether the history bar is expanded.
   *
   * **Default:** Collapsed (shows only latest entry).
   * **Persistence:** Expansion state is session-only.
   */
  isExpanded$: Queryable<boolean>;

  /**
   * Toggles between expanded and collapsed states.
   *
   * **Animation:** Smooth height transition (200ms).
   * **Keyboard:** Enter/Space toggles when bar is focused.
   */
  toggle(): void;

  /**
   * Latest history entry (shown in collapsed state).
   * `null` if no queries have been run this session.
   *
   * **Empty state:** Shows "No recent queries" when null.
   */
  latest$: Queryable<HistoryEntryVM | null>;

  /**
   * All history entries (shown when expanded).
   *
   * **Order:** Most recent first.
   * **Limit:** ~50 entries, oldest dropped when exceeded.
   */
  entries$: Queryable<HistoryEntryVM[]>;

  /**
   * Whether the history list is empty.
   */
  isEmpty$: Queryable<boolean>;

  /**
   * Clears all history entries.
   * Shows confirmation dialog first.
   */
  clear(): void;
}

/**
 * Individual history entry.
 */
export interface HistoryEntryVM {
  /** Unique key for React rendering */
  key: string;

  /**
   * Type of history action.
   *
   * - `"query"`: Query execution
   * - `"transaction"`: Transaction operation (open, commit, close)
   */
  type: "query" | "transaction";

  /**
   * Status indicator icon.
   *
   * **Icons:**
   * - success: Green checkmark
   * - error: Red X (clickable for details)
   * - running: Spinner (only for current in-progress item)
   */
  statusIcon: IconComponent;

  /**
   * Status type for styling.
   */
  status: "success" | "error" | "running";

  /**
   * Truncated query/action summary.
   *
   * **Format:**
   * - Query: First 40 chars of query text, "..." if truncated
   * - Transaction: "Open transaction", "Commit", "Close"
   */
  summary: string;

  /**
   * Full query text (for queries).
   * `null` for transaction entries.
   */
  fullQueryText: string | null;

  /**
   * Relative time display.
   *
   * **Format:** "2s ago", "5m ago", "1h ago", "2d ago"
   * **Updates:** Reactively updates as time passes.
   */
  timeAgo$: Queryable<string>;

  /**
   * Absolute timestamp for tooltip.
   * @example "Jan 15, 2024 10:30:45 AM"
   */
  timestampDisplay: string;

  /**
   * Execution duration.
   *
   * **Format:** "123ms", "1.2s", "1m 23s"
   * `null` if still running or duration not tracked.
   */
  durationDisplay: string | null;

  /**
   * Loads this query into the editor.
   * Only available for query-type entries.
   *
   * **Behavior:**
   * - Sets editor content to full query text
   * - Does NOT affect saved query state (loads as scratch)
   * - Does NOT prompt about unsaved changes
   */
  loadInEditor(): void;

  /**
   * Shows error details in a popover.
   * Only available for error status entries.
   *
   * **Popover content:**
   * - Error type
   * - Error message
   * - Stack trace (if available)
   */
  showErrorDetails(): void;

  /**
   * Error message (for error entries).
   * `null` for success entries.
   */
  errorMessage: string | null;
}
